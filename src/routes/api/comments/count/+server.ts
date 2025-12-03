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

// GET - Get comment count for a post
export async function GET({ url }: RequestEvent) {
  const postId = url.searchParams.get("postId")

  if (!postId) {
    return json({ error: "Missing postId" }, { status: 400 })
  }

  try {
    const count = await Comment.countDocuments({
      postId,
      isDeleted: false,
    })

    return json({ count }, { status: 200 })
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}
