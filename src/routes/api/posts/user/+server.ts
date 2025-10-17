import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import type { Post as PostType } from "$lib/types"
import type { RequestEvent } from "./$types"
import { json } from "@sveltejs/kit"
import { Interaction } from "$lib/models/Interaction"
import { getPublicFeed, getPersonalizedFeed } from "$lib/server/posts"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

export async function GET({ request, params, locals }: RequestEvent) {
  const url = new URL(request.url)
  //TODO: use constants instead of hardcoded values
  const userId = url.searchParams.get("userid")
  const skip = Number(url.searchParams.get("skip")) || 0
  const limit = Number(url.searchParams.get("limit")) || 5
  const session = await locals.auth()

  try {
    const posts = await Post.find({
      $or: [
        { userId: userId, postedTo: { $exists: false } },
        { userId: { $ne: userId }, postedTo: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "userId",
        select: "name username safeAddress",
      })
      .populate({
        path: "postedTo",
        select: "name username safeAddress",
      })
      .populate({
        path: "mediaItems",
        select: "url",
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
    return json(
      {
        posts: postsWithLikes as PostType[],
        skip,
        limit,
      },
      { status: 200 },
    )
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}
