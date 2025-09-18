import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import type { RequestHandler } from "./$types"
import { env } from "$env/dynamic/private"
import { randomUUID } from "crypto"
import { Post } from "$lib/models/Post"
import { MediaItem } from "$lib/models/MediaItem"
import mongoose from "mongoose"
import sizeOf from "image-size"
import exifr from "exifr"
import sharp from "sharp"
// TODO remove temporary HEIC/HEIF support later
// @ts-ignore
import heicConvert from "heic-convert"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

const s3 = new S3Client({
  endpoint: env.MINIO_ENDPOINT,
  region: env.AWS_REGION,
  forcePathStyle: true, // required for MinIO
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY_ID,
    secretAccessKey: env.MINIO_SECRET_ACCESS_KEY,
  },
})

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth()
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
      })
    }

    // Generate UUID filename
    const ext = file.name.split(".").pop()?.toLowerCase()
    const fileName = `${randomUUID()}.jpeg`

    const arrayBuffer = await file.arrayBuffer()
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

    const bucket = env.MINIO_BUCKET || "uploads"
    const uploadParams = {
      Bucket: bucket,
      Key: fileName,
      Body: processedBuffer,
      ContentType: "image/jpeg",
    }

    // Upload to MinIO
    await s3.send(new PutObjectCommand(uploadParams))

    const fileUrl = `${env.MINIO_ENDPOINT}/${bucket}/${fileName}`

    // Save Post
    const userId = session?.user.profileId
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      })
    }

    const postDoc = await Post.create({
      userId,
      type: "image",
      caption: formData.get("caption") || "",
      mediaItems: [], // will populate after creating MediaItem
    })

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

    // Save MediaItem
    const mediaItem = await MediaItem.create({
      postId: postDoc._id,
      url: fileUrl,
      metadata: {
        originalName: file.name,
        fileName,
        size: buffer.length,
        mimeType: file.type,
        bucket,
        key: fileName,
        width,
        height,
        exif: exifData,
      },
    })

    // Link MediaItem to Post
    postDoc.mediaItems.push(mediaItem._id)
    await postDoc.save()

    return new Response(
      JSON.stringify({
        success: true,
        post: postDoc,
        mediaItem,
      }),
      { status: 201 },
    )
  } catch (err: any) {
    console.error("Upload error:", err)
    return new Response(
      JSON.stringify({ error: "Upload failed", details: err.message }),
      { status: 500 },
    )
  }
}
