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

export async function GET({ locals }: RequestEvent) {
  const session = await locals.auth()

  if (!session || !session.user || !session.user.safeAddress) {
    return json({ count: 0 }, { status: 200 })
  }

  try {
    const count = await Notification.countDocuments({
      recipientId: session.user.safeAddress,
      read: false,
    })

    return json({ count }, { status: 200 })
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}
