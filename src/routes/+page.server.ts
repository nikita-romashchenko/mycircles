import type { PageServerLoad } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import { MediaItem } from "$lib/models/MediaItem"
import type { Post as PostType } from "$lib/types"
import { Interaction } from "$lib/models/Interaction"
import { getFilteredRelationsWithProfiles } from "$lib/server/relations"
import { getPersonalizedFeed, getPublicFeed } from "$lib/server/posts"

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
    //TODO: use constants instead of hardcoded values
    const limit = Number(5)
    const skip = Number(0)

    if (session && session.user && session.user.safeAddress) {
      console.log("SESSION: User is fully authorized.")
      const result = await getPersonalizedFeed(limit, skip, session)
      return {
        posts: result.posts as PostType[],
        skip,
        limit,
        relationsWithProfiles: result.relationsWithProfiles,
      }
    }

    console.log("SESSION: No valid session / user / userSafeAddress")
    const result = await getPublicFeed(limit, skip)
    return {
      posts: result.posts as PostType[],
      relationsWithProfiles: [],
      skip,
      limit,
    }
  } catch (err: any) {
    console.error("Error loading posts:", err)
    return { posts: [], error: err.message }
  }
}
