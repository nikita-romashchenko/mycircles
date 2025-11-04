import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Notification } from "$lib/models/Notification"
import type { RequestEvent } from "./$types"
import { json } from "@sveltejs/kit"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

export async function GET({ request, locals }: RequestEvent) {
  const session = await locals.auth()

  if (!session || !session.user || !session.user.safeAddress) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const skip = Number(url.searchParams.get("skip")) || 0
  const limit = Number(url.searchParams.get("limit")) || 10

  try {
    const notifications = await Notification.find({
      recipientId: session.user.safeAddress,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    return json({ notifications, skip, limit }, { status: 200 })
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}

export async function POST({ request, locals }: RequestEvent) {
  const session = await locals.auth()

  if (!session || !session.user || !session.user.safeAddress) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { recipientId, type, postId, message } = body

    // Validate required fields
    if (!recipientId || !type) {
      return json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate type
    if (type !== "post_on_profile" && type !== "vote") {
      return json({ error: "Invalid notification type" }, { status: 400 })
    }

    // Create notification
    const notification = await Notification.create({
      recipientId,
      senderId: session.user.safeAddress,
      type,
      postId,
      message,
      read: false,
    })

    return json({ success: true, notification }, { status: 201 })
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}
