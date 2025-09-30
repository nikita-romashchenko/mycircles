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
  const skip = Number(url.searchParams.get("skip")) || 0
  const limit = Number(url.searchParams.get("limit")) || 5
  const session = await locals.auth()

  try {
    if (session && session.user && session.user.safeAddress) {
      console.log("SESSION: User is fully authorized.")
      const result = await getPersonalizedFeed(limit, skip, session)
      return json(
        {
          posts: result.posts as PostType[],
          skip,
          limit,
        },
        { status: 200 },
      )
    }

    console.log("SESSION: No valid session / user / userSafeAddress")
    const result = await getPublicFeed(limit, skip)
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
