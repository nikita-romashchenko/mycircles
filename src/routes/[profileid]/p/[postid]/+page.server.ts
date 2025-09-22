import type { PageServerLoad } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import { MediaItem } from "$lib/models/MediaItem"
import type { Post as PostType, Profile as ProfileType } from "$lib/types"
import { Profile } from "$lib/models/Profile"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

/**
 * Loads all posts for a profile by profileId slug.
 */
export const load: PageServerLoad = async ({ params, parent }) => {
  const { profileid, postid } = params
  const parentData = await parent()
  const session = parentData.session

  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postid)) {
      return { posts: [], error: "Invalid post ID" }
    }

    // Fetch post
    const post = await Post.findById(postid).populate({
      path: "mediaItems",
      select: "url", // only get URLs, exclude metadata
    })
    if (!post) {
      return { posts: [], error: "Post not found" }
    }

    // Fetch profile
    const profile = await Profile.findById(profileid).select("-privateKey")
    if (!profile) {
      return { posts: [], error: "Profile not found" }
    }

    console.log(`ExpectedPost: ${post}`)

    return {
      post: JSON.parse(JSON.stringify(post)) as PostType,
      profile: JSON.parse(JSON.stringify(profile)) as ProfileType,
      isOwnProfile: session?.user?.profileId === profileid,
    }
  } catch (err: any) {
    console.error("Error loading posts:", err)
    return { posts: [], error: err.message }
  }
}
