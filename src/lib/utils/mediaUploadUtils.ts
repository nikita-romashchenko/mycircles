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
  buffer: Buffer
  fileName: string
  originalName: string
  contentType: string
  fileUrl: string
  width: number | undefined
  height: number | undefined
  exifData: Record<string, any> | undefined
  mimeType: string
}

interface UploadParams {
  Bucket: string
  Key: string
  Body: Buffer<ArrayBufferLike>
  ContentType: string
}

const s3 = new S3Client({
  endpoint: env.MINIO_ENDPOINT,
  region: "auto",
  forcePathStyle: true, // required for MinIO
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY_ID,
    secretAccessKey: env.MINIO_SECRET_ACCESS_KEY,
  },
})

const isImage = (file: File) =>
  file.type.startsWith("image/") ||
  file.type === "application/octet-stream" ||
  file.name.toLowerCase().endsWith(".heic") ||
  file.name.toLowerCase().endsWith(".heif")

const isVideo = (file: File) => file.type.startsWith("video/")

const getMediaType = (files: File[]): "image" | "video" | "album" => {
  if (files.length === 0) throw new ProcessMediaError("No files provided")
  if (files.length > 1) return "album"

  const file = files[0]
  if (isImage(file)) return "image"
  if (isVideo(file)) return "video"

  throw new ProcessMediaError(`Unsupported file type: ${file.name}`)
}

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

  // Extract image dimensions
  let width: number | undefined
  let height: number | undefined
  try {
    const dimensions = sizeOf(buffer)
    width = dimensions.width
    height = dimensions.height
  } catch (err) {
    console.warn("Could not get image dimensions", err)
  }

  // Extract EXIF metadata (optional)
  let exifData: Record<string, any> | undefined
  try {
    exifData = await exifr.parse(buffer)
  } catch (err) {
    console.warn("Could not extract EXIF data", err)
  }

  return {
    processedBuffer,
    buffer,
    fileName,
    originalName: image.name,
    contentType: "image/jpeg",
    width,
    height,
    exifData,
    mimeType: image.type,
  }
}

export const processAndUploadMedia = async (formData: FormData) => {
  try {
    const media = formData.getAll("media") as File[]
    const bucket = env.MINIO_BUCKET || "uploads"
    const type: "image" | "video" | "album" = getMediaType(media)

    console.log(
      `MEDIA: length ${media.length} | media[0] type: ${media[0].type}`,
    )

    const uploadPromises = media.map(async (file) => {
      if (isImage(file)) {
        const result = await processImage(file)

        const uploadParams = {
          Bucket: bucket,
          Key: result.fileName,
          Body: result.processedBuffer,
          ContentType: result.contentType,
        }

        await s3.send(new PutObjectCommand(uploadParams))
        const fileUrl = `${env.MINIO_PUBLIC_ENDPOINT}/${result.fileName}`
        return { ...result, fileUrl }
      } else if (isVideo(file)) {
        throw new ProcessMediaError("Video files are not supported yet.")
      } else {
        throw new Error(`Unsupported file type: ${file.name}`)
      }
    })

    const processedMedia = await Promise.all(uploadPromises)

    return { success: true, type, processedMedia }
  } catch (err) {
    if (err instanceof Error) {
      console.error("Raw media processing error:", err.message)
      console.error(err.stack)
      throw new ProcessMediaError(err.message)
    } else {
      // Unknown type, just convert to string
      console.error("Raw media processing error (unknown type):", err)
      throw new ProcessMediaError(String(err))
    }
  }
}
