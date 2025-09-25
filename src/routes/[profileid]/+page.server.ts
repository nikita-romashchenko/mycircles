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
  default: async ({ request }) => {
    const form = await superValidate(request, zod(uploadMediaSchema))
    console.log(form)

    if (!form.valid) {
      return fail(400, { form })
    }

    // TODO: Do something with the validated form.data

    return message(form, "Form posted successfully!")
  },
}
