import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import { Profile } from "$lib/models/Profile"
import { MediaItem } from "$lib/models/MediaItem"
import type { Post as PostType, Profile as ProfileType } from "$lib/types"
import {
  superValidate,
  type Infer,
  type SuperValidated,
} from "sveltekit-superforms"
import { zod } from "sveltekit-superforms/adapters"
import { z } from "zod"
import { uploadMediaSchema } from "$lib/validation/schemas"
import sizeOf from "image-size"
import exifr from "exifr"
import sharp from "sharp"
// TODO remove temporary HEIC/HEIF support later
// @ts-ignore
import heicConvert from "heic-convert"
import { randomUUID } from "crypto"

export class ProcessMediaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProcessMediaError"
  }
}

interface ProcessedMedia {
  processedBuffer: Buffer
  fileName: string
  contentType: string
  fileUrl: string
}

const s3 = new S3Client({
  endpoint: env.MINIO_ENDPOINT,
  region: env.AWS_REGION,
  forcePathStyle: true, // required for MinIO
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY_ID,
    secretAccessKey: env.MINIO_SECRET_ACCESS_KEY,
  },
})

//  form: SuperValidated<Infer<typeof uploadMediaSchema>>,
const processImage = async (image: File) => {
  const ext = image.name.split(".").pop()?.toLowerCase()
  const fileName = `${randomUUID()}.jpeg`

  const arrayBuffer = await image.arrayBuffer()
  let buffer = Buffer.from(arrayBuffer)

  // TODO: remove temporary HEIC/HEIF support later
  if (ext === "heic" || ext === "heif") {
    console.log("Converting HEIC/HEIF to JPEG via heic-convert")
    buffer = await heicConvert({
      buffer,
      format: "JPEG",
      quality: 1.0,
    })
  }

  const processedBuffer = await sharp(buffer, { limitInputPixels: false }) // HEIC input
    .jpeg({ quality: 80 })
    .toBuffer()

  return { processedBuffer, fileName, contentType: "image/jpeg" }
}

export const processMedia = async (formData: FormData) => {
  try {
    const media = formData.getAll("media") as File[]
    const bucket = env.MINIO_BUCKET || "uploads"

    let processedMedia: ProcessedMedia[] = []
    let type: "image" | "video" | "album" = "image"
    if (media.length > 1) {
      type = "album"
      for (const file of media) {
        if (file.type.startsWith("image/")) {
          const result = await processImage(file)
          const uploadParams = {
            Bucket: bucket,
            Key: result.fileName,
            Body: result.processedBuffer,
            ContentType: result.contentType,
          }

          // Upload to MinIO
          await s3.send(new PutObjectCommand(uploadParams))
          const fileUrl = `${env.MINIO_ENDPOINT}/${bucket}/${result.fileName}`

          processedMedia.push({ ...result, fileUrl })
        } else if (file.type.startsWith("video/")) {
          // TODO: handle video processing
          type = "video"
          throw new ProcessMediaError("Video albums are not supported yet.")
        }
      }
    }

    if (media.length === 1) {
      if (media[0].type.startsWith("image/")) {
        type = "image"
        const result = await processImage(media[0])
        const uploadParams = {
          Bucket: bucket,
          Key: result.fileName,
          Body: result.processedBuffer,
          ContentType: result.contentType,
        }

        // Upload to MinIO
        await s3.send(new PutObjectCommand(uploadParams))
        const fileUrl = `${env.MINIO_ENDPOINT}/${bucket}/${result.fileName}`

        processedMedia.push({ ...result, fileUrl })
      } else if (media[0].type.startsWith("video/")) {
        // TODO: handle video processing
        type = "video"
        throw new ProcessMediaError("Video albums are not supported yet.")
      } else {
        throw new Error(`Unsupported file type: ${media[0].name}`)
      }
    }

    return { success: true, type, processedMedia }
  } catch (err) {
    // If it’s not already a ProcessMediaError, wrap it
    if (!(err instanceof ProcessMediaError)) {
      throw new ProcessMediaError(
        err instanceof Error ? err.message : String(err),
      )
    }
    throw err
  }
}
