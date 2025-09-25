import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import type { PageServerLoad } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import { Profile } from "$lib/models/Profile"
import { MediaItem } from "$lib/models/MediaItem"
import type { Post as PostType, Profile as ProfileType } from "$lib/types"
import { superValidate } from "sveltekit-superforms"
import { zod } from "sveltekit-superforms/adapters"
import { z } from "zod"
import { message } from "sveltekit-superforms"
import { fail } from "@sveltejs/kit"
import { uploadMediaSchema } from "$lib/validation/schemas"
import sizeOf from "image-size"
import exifr from "exifr"
import sharp from "sharp"
// TODO remove temporary HEIC/HEIF support later
// @ts-ignore
import heicConvert from "heic-convert"
import { randomUUID } from "crypto"
import { processMedia, ProcessMediaError } from "$lib/utils/mediaUploadUtils"

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

/**
 * Loads all posts for a profile by profileId slug.
 */
export const load: PageServerLoad = async ({ params, parent, depends }) => {
  depends("posts")

  const { profileid } = params
  const parentData = await parent()
  const session = parentData.session
  const form = await superValidate(zod(uploadMediaSchema))

  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(profileid)) {
      return { posts: [], error: "Invalid profile ID" }
    }

    // Check if profile exists
    const profile = await Profile.findById(profileid).select("-privateKey")
    if (!profile) {
      return { posts: [], error: "Profile not found" }
    }

    console.log(`ExpectedProfile: ${profile}`)

    // Fetch posts
    const posts = await Post.find({ userId: profile._id })
      .sort({ createdAt: -1 }) // newest first
      .populate({
        path: "mediaItems",
        select: "url", // only get URLs, exclude metadata
      })

    console.log(`ExpectedPosts: ${posts}`)

    return {
      posts: JSON.parse(JSON.stringify(posts)) as PostType[],
      profile: JSON.parse(JSON.stringify(profile)) as ProfileType,
      isOwnProfile: session?.user?.profileId === profileid,
      form,
    }
  } catch (err: any) {
    console.error("Error loading posts:", err)
    return { posts: [], error: err.message }
  }
}

//Posting form data action
export const actions = {
  default: async ({ request, locals }) => {
    const form = await superValidate(request, zod(uploadMediaSchema))
    console.log("Form: ", form)

    if (!form.valid) {
      console.log("Form Errors: ", form.errors)
      return fail(400, { form })
    }
    console.log("Form data is valid:", form.data)

    // TODO: Do something with the validated form.data
    try {
      const session = await locals.auth()
      const formData = await request.formData()
      const media = formData.getAll("media") as File[]

      if (media.length === 0) {
        return new Response(JSON.stringify({ error: "No file uploaded" }), {
          status: 400,
        })
      }

      const result = await processMedia(formData)

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: "Media processing failed" }),
          {
            status: 500,
          },
        )
      }

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

      return message(form, "Form posted successfully!")
    } catch (err: any) {
      console.error("Upload error:", err)
      if (err instanceof ProcessMediaError) {
        return fail(400, { form, error: err.message })
      }
      return message(form, "Upload failed. Please try again later.", {
        status: 500,
      })
    }
  },
}
