import type { PageServerLoad } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import { MediaItem } from "$lib/models/MediaItem"
import type { Post as PostType, CirclesRpcProfile } from "$lib/types"
import { Interaction } from "$lib/models/Interaction"
import { fetchCirclesProfile } from "$lib/utils/circlesRpc"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

/**
 * Loads all posts for a profile by profileId slug.
 */
export const load: PageServerLoad = async ({ params, parent, depends }) => {
  depends("like")

  const { profileid, postid } = params
  // Normalize address to lowercase for consistent lookups
  const normalizedAddress = profileid.toLowerCase()

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

    // Fetch profile data ONLY from Circles RPC (don't use local DB for profile data)
    console.log(`Fetching profile data from Circles RPC for address: ${normalizedAddress}`)
    const rpcProfile = await fetchCirclesProfile(normalizedAddress)

    if (!rpcProfile) {
      // Profile not found on Circles network
      return {
        posts: [],
        error: "Sorry, no such profile found",
        profile: null,
        isOwnProfile: false,
        isRpcProfile: false
      }
    }

    // Create profile object from RPC data only
    const circlesProfile: CirclesRpcProfile = {
      ...rpcProfile,
      isRpcProfile: true
    }

    // Check if this is the current user's profile by comparing addresses
    const isOwnProfile = session?.user?.safeAddress?.toLowerCase() === normalizedAddress

    const interaction = await Interaction.findOne({
      userId: session?.user?.profileId,
      postId: post._id,
      type: "like",
    })

    console.log(`ExpectedPost: ${post}`)

    return {
      post: {
        ...JSON.parse(JSON.stringify(post)),
        isLiked: !!interaction,
      } as PostType,
      profile: circlesProfile as any,
      isOwnProfile,
      isRpcProfile: true
    }
  } catch (err: any) {
    console.error("Error loading posts:", err)
    return { posts: [], error: err.message }
  }
}
