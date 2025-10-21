import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import type { Post as PostType } from "$lib/types"
import type { RequestEvent } from "./$types"
import { json } from "@sveltejs/kit"
import { Interaction } from "$lib/models/Interaction"
import {
  getPublicFeed,
  getPersonalizedFeed,
  getProfileFeed,
} from "$lib/server/posts"
import { DEFAULT_LIMIT, DEFAULT_SKIP } from "$lib/constants"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

export async function GET({ request, params, locals }: RequestEvent) {
  const url = new URL(request.url)
  //TODO: use constants instead of hardcoded values
  const userAddress =
    url.searchParams.get("address") || url.searchParams.get("userid") // Support both for backward compatibility
  const skip = Number(url.searchParams.get("skip")) || DEFAULT_SKIP
  const limit = Number(url.searchParams.get("limit")) || DEFAULT_LIMIT
  const session = await locals.auth()

  if (!userAddress) {
    return json(
      { error: "Missing address or userid parameter" },
      { status: 400 },
    )
  }

  // Normalize address to lowercase
  const normalizedAddress = userAddress.toLowerCase()

  try {
    const result = await getProfileFeed(normalizedAddress, session, limit, skip)
    if (result.error) {
      throw new Error(result.error)
    }

    return json(
      {
        posts: result.posts as PostType[],
        skip,
        limit,
      },
      { status: 200 },
    )
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}
