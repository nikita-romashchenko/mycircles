import type { PageServerLoad } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import type { Post as PostType, CirclesRpcProfile } from "$lib/types"
import { Interaction } from "$lib/models/Interaction"
import { fetchCirclesProfile } from "$lib/utils/circlesRpc"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

/**
 * Loads a single post by ID and the profile it belongs to.
 */
export const load: PageServerLoad = async ({ params, parent, depends }) => {
  depends("like")

  const { postid } = params

  const parentData = await parent()
  const session = parentData.session

  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postid)) {
      return { error: "Invalid post ID" }
    }

    // Fetch post
    const post = await Post.findById(postid)
      .populate({
        path: "mediaItems",
        select: "url",
      })
      .populate({
        path: "userId",
        select: "name username safeAddress",
      })

    if (!post) {
      return { error: "Post not found" }
    }

    // Determine which address to fetch profile for
    // If posted to someone else's profile, use postedToAddress
    // Otherwise use creatorAddress
    const profileAddress = post.postedToAddress || post.creatorAddress
    const normalizedAddress = profileAddress?.toLowerCase()

    if (!normalizedAddress) {
      return { error: "Post has no associated address" }
    }

    // Fetch profile data ONLY from Circles RPC
    console.log(`Fetching profile data from Circles RPC for address: ${normalizedAddress}`)
    const rpcProfile = await fetchCirclesProfile(normalizedAddress)

    if (!rpcProfile) {
      // Profile not found on Circles network
      return {
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
    console.error("Error loading post:", err)
    return { error: err.message }
  }
}
