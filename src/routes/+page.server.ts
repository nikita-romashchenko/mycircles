import type { PageServerLoad } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import type { Post as PostType } from "$lib/types"
import { getPersonalizedFeed, getPublicFeed } from "$lib/server/posts"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Add Search Params for limit and skip
export const load: PageServerLoad = async ({ parent, depends }) => {
  depends("posts")

  try {
    const parentData = await parent()
    const session = parentData.session
    //TODO: use constants instead of hardcoded values
    const limit = Number(5)
    const skip = Number(0)

    // Return immediately without loading posts - they will be loaded client-side
    console.log(
      "SESSION:",
      session && session.user && session.user.safeAddress
        ? "User is fully authorized."
        : "No valid session / user / userSafeAddress",
    )

    return {
      posts: [],
      isLoggedIn: !!(session && session.user && session.user.safeAddress),
      skip,
      limit,
      relationsWithProfiles: [],
    }
  } catch (err: any) {
    console.error("Error loading page:", err)
    return { posts: [], error: err.message, isLoggedIn: false }
  }
}
