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
import {
  processAndUploadMedia,
  ProcessMediaError,
} from "$lib/utils/mediaUploadUtils"
import { Interaction } from "$lib/models/Interaction"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

const s3 = new S3Client({
  endpoint: env.MINIO_ENDPOINT,
  region: "auto",
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
  const limit = Number(2)
  const skip = Number(0)

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

    // Fetch posts
    const posts = await Post.find({ userId: profile._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "mediaItems",
        select: "url",
      })

    // collect all post IDs
    const postIds = posts.map((p) => p._id)

    // fetch all likes by this user for these posts
    const interactions = session?.user
      ? await Interaction.find({
          userId: session.user.profileId,
          postId: { $in: postIds },
          type: "like",
        }).lean()
      : []

    // make a Set for quick lookup
    const likedPostIds = new Set(interactions.map((i) => i.postId.toString()))

    // add `liked` property to each post
    const postsWithLikes = posts.map((p) => ({
      ...p.toObject(),
      isLiked: likedPostIds.has(p._id.toString()),
    }))

    return {
      posts: JSON.parse(JSON.stringify(postsWithLikes)) as PostType[],
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
    const formData = await request.formData()
    const form = await superValidate(formData, zod(uploadMediaSchema))
    console.log("Form: ", form)

    if (!form.valid) {
      console.log("Form Errors: ", form.errors)
      return fail(400, { form })
    }
    console.log("Form data is valid:", form.data)

    // TODO: Do something with the validated form.data
    try {
      const session = await locals.auth()
      const media = formData.getAll("media") as File[]

      if (media.length === 0) {
        return new Response(JSON.stringify({ error: "No file uploaded" }), {
          status: 400,
        })
      }

      const result = await processAndUploadMedia(formData)
      console.log("Media processing result:", result)

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: "Media processing failed" }),
          {
            status: 500,
          },
        )
      }

      const { type, processedMedia } = result

      // Save Post
      const userId = session?.user.profileId
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        })
      }

      const postDoc = await Post.create({
        userId,
        type: type,
        caption: formData.get("caption") || "",
        mediaItems: [], // will populate after creating MediaItem
      })

      const bucket = env.MINIO_BUCKET || "uploads"
      // Save MediaItem
      // TODO: Handle videos
      // TODO: optimize with all-or-nothing MongoDB transaction and promise.all for media uploads
      if (type === "album" || type === "image") {
        for (const file of processedMedia) {
          const mediaItem = await MediaItem.create({
            postId: postDoc._id,
            url: file.fileUrl,
            metadata: {
              originalName: file.originalName,
              fileName: file.fileName,
              size: file.buffer.length,
              mimeType: file.mimeType,
              bucket,
              key: file.fileName,
              width: file.width,
              height: file.height,
              exif: file.exifData,
            },
          })

          // Link MediaItem to Post
          postDoc.mediaItems.push(mediaItem._id)
          await postDoc.save()
        }
      } else if (type === "video") {
        throw new Error("Video posts are not supported yet.")
      }
      console.log("Post created with ID:", postDoc._id)

      return message(form, "Form posted successfully!")
    } catch (err: any) {
      if (err instanceof ProcessMediaError) {
        return fail(400, { form, error: err.message })
      }

      return fail(500, {
        form,
        error: "Upload failed. Please try again later.",
      })
    }
  },
}
