import type { PageServerLoad } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import { MediaItem } from "$lib/models/MediaItem"
import type { Post as PostType, Profile as ProfileType, CirclesRpcProfile } from "$lib/types"
import { Profile } from "$lib/models/Profile"
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

    // Fetch profile by safeAddress from local database
    const profile = await Profile.findOne({ safeAddress: profileid }).select("-privateKey")

    if (!profile) {
      // Profile not found in local database, try fetching from Circles RPC
      console.log(`Profile not found in database for address: ${profileid}, fetching from Circles RPC...`)
      const rpcProfile = await fetchCirclesProfile(profileid)

      if (!rpcProfile) {
        // Profile not found anywhere
        return {
          posts: [],
          error: "Sorry, no such profile found",
          profile: null,
          isOwnProfile: false
        }
      }

      // Profile found in RPC
      const circlesProfile: CirclesRpcProfile = {
        ...rpcProfile,
        isRpcProfile: true
      }

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
        isOwnProfile: false,
        isRpcProfile: true
      }
    }

    // Profile found in local database
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
      profile: JSON.parse(JSON.stringify(profile)) as ProfileType,
      isOwnProfile: session?.user?.profileId === profile._id.toString(),
      isRpcProfile: false
    }
  } catch (err: any) {
    console.error("Error loading posts:", err)
    return { posts: [], error: err.message }
  }
}
