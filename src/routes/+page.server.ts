import type { PageServerLoad } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import { MediaItem } from "$lib/models/MediaItem"
import type { Post as PostType } from "$lib/types"
import { Interaction } from "$lib/models/Interaction"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Add Search Params for limit and skip
export const load: PageServerLoad = async ({ parent }) => {
  try {
    const parentData = await parent()
    const session = parentData.session
    const limit = Number(5)
    const skip = Number(0)

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "mediaItems",
        select: "url",
      })
      .populate({
        path: "userId",
        select: "name username",
      })

    console.log("Fetched posts:", posts.length)

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
      skip,
      limit,
    }
  } catch (err: any) {
    console.error("Error loading posts:", err)
    return { posts: [], error: err.message }
  }
}
