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

export async function PUT({ request, locals }: RequestEvent) {
  const session = await locals.auth()

  if (!session || !session.user || !session.user.safeAddress) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { notificationId } = await request.json()

    if (!notificationId) {
      return json({ error: "Notification ID is required" }, { status: 400 })
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipientId: session.user.safeAddress,
      },
      { read: true },
      { new: true },
    )

    if (!notification) {
      return json({ error: "Notification not found" }, { status: 404 })
    }

    return json({ notification }, { status: 200 })
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}
