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

export async function PUT({ locals }: RequestEvent) {
  const session = await locals.auth()

  if (!session || !session.user || !session.user.safeAddress) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await Notification.updateMany(
      {
        recipientId: session.user.safeAddress,
        read: false,
      },
      { read: true },
    )

    return json(
      { message: "All notifications marked as read", count: result.modifiedCount },
      { status: 200 },
    )
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}
