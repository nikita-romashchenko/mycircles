import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Comment } from "$lib/models/Comment"
import type { RequestEvent } from "./$types"
import { json } from "@sveltejs/kit"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// GET - Fetch comments for a post
export async function GET({ url }: RequestEvent) {
  const postId = url.searchParams.get("postId")

  if (!postId) {
    return json({ error: "Missing postId" }, { status: 400 })
  }

  try {
    const comments = await Comment.find({
      postId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean()

    return json({ comments }, { status: 200 })
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}

// POST - Create a new comment
export async function POST({ request, locals }: RequestEvent) {
  const session = await locals.auth()

  if (!session || !session.user || !session.user.safeAddress) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { postId, content } = body

    if (!postId || !content) {
      return json({ error: "Missing required fields" }, { status: 400 })
    }

    if (content.length > 1000) {
      return json({ error: "Comment too long (max 1000 characters)" }, { status: 400 })
    }

    const comment = await Comment.create({
      postId,
      authorAddress: session.user.safeAddress.toLowerCase(),
      content,
    })

    return json({ success: true, comment }, { status: 201 })
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}
