// src/routes/api/interactions/[type]/+server.ts
import { json, error } from "@sveltejs/kit"
import { Interaction } from "$lib/models/Interaction"
import { Post } from "$lib/models/Post"
import type { RequestEvent } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"

const VALID_TYPES = ["like", "repost"]

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

export async function POST({ request, params, locals }: RequestEvent) {
  const session = await locals.auth()
  const userId = session?.user.profileId
  const { postId } = await request.json()
  const type = params.type // "like" or "repost"

  if (!session) {
    throw error(401, "Unauthorized")
  }

  if (!VALID_TYPES.includes(type)) {
    throw error(400, "Invalid interaction type")
  }

  try {
    const interaction = await Interaction.findOneAndUpdate(
      { userId, postId, type },
      {},
      { upsert: true, new: true },
    )

    // Only increment counter if the interaction was newly created
    if (interaction.isNew) {
      const counterField = type === "like" ? "likesCount" : "repostsCount"
      await Post.findByIdAndUpdate(postId, { $inc: { [counterField]: 1 } })
    }

    return json({ success: true }, { status: 201 })
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 400 })
  }
}

export async function DELETE({ request, params, locals }: RequestEvent) {
  const session = await locals.auth()
  const userId = session?.user.profileId
  const { postId } = await request.json()
  const type = params.type

  if (!session) {
    throw error(401, "Unauthorized")
  }

  if (!VALID_TYPES.includes(type)) {
    throw error(400, "Invalid interaction type")
  }

  try {
    const deleted = await Interaction.findOneAndDelete({ userId, postId, type })
    if (deleted) {
      const counterField = type === "like" ? "likesCount" : "repostsCount"
      await Post.findByIdAndUpdate(postId, { $inc: { [counterField]: -1 } })
    }

    return json({ success: true })
  } catch (err: any) {
    return json({ success: false, error: err.message }, { status: 400 })
  }
}
