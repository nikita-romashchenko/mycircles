import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import { MediaItem } from "$lib/models/MediaItem"
import type { Post as PostType } from "$lib/types"
import { Interaction } from "$lib/models/Interaction"
import { getFilteredRelationsWithProfiles } from "$lib/server/relations"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

export async function getPublicFeed(limit: number, skip: number) {
  try {
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
        select: "name username safeAddress",
      })

    //TODO: Check if throws "Cannot stringify arbitrary non-POJOs" without .stringify()
    // return {
    //   posts: JSON.parse(JSON.stringify(postsWithLikes)) as PostType[],
    //   skip,
    //   limit,
    // }
    return {
      posts: JSON.parse(JSON.stringify(posts)) as PostType[],
    }
  } catch (err: any) {
    console.error("Error loading public feed posts:", err)
    return { posts: [], skip, limit, error: err.message }
  }
}

export async function getPersonalizedFeed(
  limit: number,
  skip: number,
  session: any,
) {
  try {
    if (!session && !session.user && !session.user.safeAddress) {
      throw new Error("getPersonalizedFeed | Invalid session or user data")
    }

    const relationsWithProfiles = await getFilteredRelationsWithProfiles(
      session.user.safeAddress,
    )

    const filteredRelations = relationsWithProfiles.filter(
      (item) =>
        item.relationItem.relation === "mutuallyTrusts" ||
        item.relationItem.relation === "trusts",
    )

    // Get allowed addresses from filtered relations (normalize to lowercase)
    // Use objectAvatar (the address we trust) regardless of whether they have a profile
    const allowedAddresses = filteredRelations.map((fp) => fp.relationItem.objectAvatar.toLowerCase())

    console.log("Allowed User Addresses:", allowedAddresses)

    const posts = await Post.find({
      $and: [
        {
          $or: [
            { creatorAddress: { $in: allowedAddresses } },
            { postedToAddress: { $in: allowedAddresses } }
          ]
        },
        { creatorAddress: { $ne: session.user.safeAddress.toLowerCase() } }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "mediaItems",
        select: "url",
      })
      .populate({
        path: "userId",
        select: "name username safeAddress",
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
      relationsWithProfiles,
    }
  } catch (err: any) {
    console.error("Error loading posts:", err)
    return { posts: [], relationsWithProfiles: [], error: err.message }
  }
}
