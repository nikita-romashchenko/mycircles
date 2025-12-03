import type { PageServerLoad } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import { MediaItem } from "$lib/models/MediaItem"
import type { Post as PostType, CirclesRpcProfile } from "$lib/types"
import { superValidate } from "sveltekit-superforms"
import { zod } from "sveltekit-superforms/adapters"
import { message } from "sveltekit-superforms"
import { fail } from "@sveltejs/kit"
import { uploadMediaSchema } from "$lib/validation/schemas"
import {
  processAndUploadMedia,
  ProcessMediaError,
} from "$lib/utils/mediaUploadUtils"
import { Interaction } from "$lib/models/Interaction"
import { fetchCirclesProfile } from "$lib/utils/circlesRpc"
import { Profile } from "$lib/models/Profile"
import { getProfileFeed } from "$lib/server/posts"
import { DEFAULT_LIMIT, DEFAULT_SKIP } from "$lib/constants"
import { Notification } from "$lib/models/Notification"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

/**
 * Loads all posts for a profile by profileId slug.
 */
export const load: PageServerLoad = async ({ params, parent, depends }) => {
  depends("posts")

  const { profileid } = params
  // Normalize address to lowercase for consistent lookups
  const normalizedAddress = profileid.toLowerCase()

  const parentData = await parent()
  const session = parentData.session
  const form = await superValidate(zod(uploadMediaSchema))

  try {
    // Fetch profile data ONLY from Circles RPC (don't use local DB for profile data)
    // This is fast and should not block the page render
    console.log(
      `Fetching profile data from Circles RPC for address: ${normalizedAddress}`,
    )
    const rpcProfile = await fetchCirclesProfile(normalizedAddress)
    console.log(`rpcProfile: `)
    console.log(rpcProfile)

    if (!rpcProfile) {
      // Profile not found on Circles network
      return {
        posts: [],
        error: "Sorry, no such profile found",
        profile: null,
        isOwnProfile: false,
        isRpcProfile: false,
        form,
      }
    }

    // Create profile object from RPC data only
    const circlesProfile: CirclesRpcProfile = {
      ...rpcProfile,
      isRpcProfile: true,
    }

    // Check if this is the current user's profile by comparing addresses
    const isOwnProfile =
      session?.user?.safeAddress?.toLowerCase() === normalizedAddress

    // Return profile immediately without waiting for posts
    // Posts will be loaded on the client side after page renders
    return {
      posts: [],
      profile: circlesProfile as any,
      isOwnProfile,
      isRpcProfile: true,
      form,
    }
  } catch (err: any) {
    console.error("Error loading profile:", err)
    return { posts: [], error: err.message, isRpcProfile: false }
  }
}

//Posting form data action
export const actions = {
  upload: async ({ request, locals, params }) => {
    const formData = await request.formData()
    const form = await superValidate(formData, zod(uploadMediaSchema))
    let type: "image" | "video" | "album" | "text"
    let processedMedia: any[] = []

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
      const caption = formData.get("caption") as string
      const transactionHash = formData.get("transactionHash") as string | null

      console.log(`Upload attempt - caption: ${caption ? "yes" : "no"}, media files: ${media.length}, txHash: ${transactionHash || "none"}`)

      // Filter empty files
      const validMedia = media.filter((file) => file.size > 0)

      // Check that at least one type of content is provided
      if (!caption && validMedia.length === 0) {
        return fail(400, {
          form,
          error: "Please add either text or media to create a post"
        })
      }

      // Process media only if files are provided
      if (validMedia.length > 0) {
        try {
          // Create a new FormData with only valid files for processing
          const mediaFormData = new FormData()
          for (const file of validMedia) {
            mediaFormData.append("media", file)
          }
          mediaFormData.append("caption", caption || "")

          const result = await processAndUploadMedia(mediaFormData)
          console.log("Media processing result:", result)
          if (!result.success) {
            return fail(500, {
              form,
              error: "Media processing failed"
            })
          }
          type = result.type
          processedMedia = result.processedMedia
        } catch (mediaErr: any) {
          console.error("Media upload error:", mediaErr)
          return fail(400, {
            form,
            error: mediaErr.message || "Failed to process media. Please try again."
          })
        }
      } else {
        // Text-only post
        type = "text"
        console.log("Creating text-only post")
      }

      // Get creator's safe address from session
      const creatorAddress = session?.user?.safeAddress?.toLowerCase()
      if (!creatorAddress) {
        return new Response(
          JSON.stringify({
            error: "Unauthorized - No safe address in session",
          }),
          {
            status: 401,
          },
        )
      }

      // Normalize the target profile address
      // NOTE: We allow posting to any address, even if it doesn't exist in our local database.
      // This enables posting to RPC-only profiles (users on Circles network but not registered locally).
      const normalizedTargetAddress = params.profileid.toLowerCase()

      const postToAddress =
        creatorAddress !== normalizedTargetAddress
          ? normalizedTargetAddress
          : undefined

      // Require transaction hash for ALL posts (costs 5 CRC)
      if (!transactionHash) {
        return fail(400, {
          form,
          error: "Transaction required to create a post. Please try again."
        })
      }

      let circlesProfile: CirclesRpcProfile | null = null
      if (postToAddress) {
        const rpcProfile = await fetchCirclesProfile(postToAddress)
        if (rpcProfile) {
          circlesProfile = {
            ...rpcProfile,
            isRpcProfile: true,
          }
        }
      }

      console.log("=== POST CREATION DEBUG ===")
      console.log("Creator address:", creatorAddress)
      console.log("Target profile address:", normalizedTargetAddress)
      console.log(
        "Posted to address:",
        postToAddress || "own profile (undefined)",
      )
      console.log("Are they equal?", creatorAddress === normalizedTargetAddress)

      const postDoc = await Post.create({
        // New address-based fields
        creatorAddress: creatorAddress,
        postedToAddress: postToAddress,
        ...(circlesProfile ? { postedToProfile: circlesProfile } : {}),
        ...(transactionHash ? { transactionHash } : {}),
        // Old fields - kept for backward compatibility
        userId: session?.user?.profileId,
        postedTo: undefined, // Will be deprecated
        balance: 0,
        type: type,
        caption: caption || "",
        mediaItems: [], // will populate after creating MediaItem
      })

      console.log("=== POST CREATED ===")
      console.log("Post ID:", postDoc._id)
      console.log("creatorAddress in DB:", postDoc.creatorAddress)
      console.log("postedToAddress in DB:", postDoc.postedToAddress)
      console.log("========================")

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

      // Create notification if posting on someone else's profile
      if (postToAddress && postToAddress !== creatorAddress) {
        try {
          const senderName = session.user.name ||
                            `${creatorAddress.slice(0, 6)}...${creatorAddress.slice(-4)}`

          await Notification.create({
            recipientId: postToAddress,
            senderId: creatorAddress,
            type: "post_on_profile",
            postId: postDoc._id,
            message: `${senderName} posted on your profile`,
            read: false,
          })
          console.log(`Created notification for post on profile ${postToAddress}`)
        } catch (notifErr) {
          console.error("Error creating notification:", notifErr)
          // Don't fail the post if notification creation fails
        }
      }

      return message(form, "Upload media form posted successfully!")
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
