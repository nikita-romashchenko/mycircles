import type { PageServerLoad } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import { MediaItem } from "$lib/models/MediaItem"
import { Profile } from "$lib/models/Profile"
import type { Post as PostType, Profile as ProfileType } from "$lib/types"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

/**
 * Loads all posts for a profile by profileId slug.
 */
export const load: PageServerLoad = async ({ params }) => {
  try {
    const { profileid } = params

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
    }
  } catch (err: any) {
    console.error("Error loading posts:", err)
    return { posts: [], error: err.message }
  }
}
