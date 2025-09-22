import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import type { Post as PostType } from "$lib/types"
import type { RequestEvent } from "./$types"
import { json } from "@sveltejs/kit"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

export async function GET({ request, params, locals }: RequestEvent) {
  const url = new URL(request.url)
  const skip = Number(url.searchParams.get("skip")) || 0
  const limit = Number(url.searchParams.get("limit")) || 5

  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "mediaItems",
        select: "url",
      })

    console.log("Fetched posts:", posts.length)

    return json(
      {
        posts: JSON.parse(JSON.stringify(posts)) as PostType[],
        skip,
        limit,
      },
      { status: 200 },
    )
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}
