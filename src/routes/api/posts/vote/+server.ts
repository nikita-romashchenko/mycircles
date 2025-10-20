import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth()

    if (!session?.user?.profileId) {
      return json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { postId, type, balanceChange } = body

    // Validate required fields
    if (!postId || !type || balanceChange === undefined) {
      return json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate type
    if (type !== "upVote" && type !== "downVote") {
      return json({ error: "Invalid vote type" }, { status: 400 })
    }

    // Find Target Post
    const targetPost = await Post.findById(postId)
    if (!targetPost) {
      return json({ error: "Post not found" }, { status: 404 })
    }

    // Update balance
    const balanceChangeNum = Number(balanceChange)
    if (isNaN(balanceChangeNum)) {
      return json({ error: "Invalid balance change value" }, { status: 400 })
    }

    if (type === "upVote") {
      targetPost.balance += balanceChangeNum
    } else {
      targetPost.balance -= balanceChangeNum
    }

    console.log(`Updating post ${postId} balance to ${targetPost.balance}`)

    await targetPost.save()

    return json({
      success: true,
      message: "Vote submitted successfully",
      balance: targetPost.balance
    })
  } catch (err: any) {
    console.error("Error processing vote:", err)
    return json(
      { error: err.message || "Failed to process vote" },
      { status: 500 }
    )
  }
}
