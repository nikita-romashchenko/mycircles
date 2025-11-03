import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Notification } from "$lib/models/Notification"
import { json } from "@sveltejs/kit"
import type { RequestEvent } from "./$types"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

export async function GET({ locals }: RequestEvent) {
  const session = await locals.auth()

  if (!session || !session.user || !session.user.safeAddress) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const testNotifications = [
      {
        recipientId: "0xc7d3df890952a327af94d5ba6fdc1bf145188a1b",
        senderId: "test-sender-1",
        type: "post_on_profile",
        postId: "6901fe1e93ba0cd8e2a1ee46",
        message: "John posted on your profile",
        read: false,
      },
      {
        recipientId: "0xc7d3df890952a327af94d5ba6fdc1bf145188a1b",
        senderId: "test-sender-2",
        type: "vote",
        postId: "6901fe1e93ba0cd8e2a1ee46",
        message: "Sarah upvoted your post",
        read: false,
      },
      {
        recipientId: "0xc7d3df890952a327af94d5ba6fdc1bf145188a1b",
        senderId: "test-sender-3",
        type: "post_on_profile",
        postId: "6901fe1e93ba0cd8e2a1ee46",
        message: "Mike posted on your profile",
        read: true,
      },
      {
        recipientId: "0xc7d3df890952a327af94d5ba6fdc1bf145188a1b",
        senderId: "test-sender-4",
        type: "vote",
        postId: "6901fe1e93ba0cd8e2a1ee46",
        message: "Emma downvoted your post",
        read: false,
      },
      {
        recipientId: "0xc7d3df890952a327af94d5ba6fdc1bf145188a1b",
        senderId: "test-sender-5",
        type: "post_on_profile",
        postId: "6901fe1e93ba0cd8e2a1ee46",
        message: "Alex posted on your profile",
        read: true,
      },
    ]

    const created = await Notification.insertMany(testNotifications)

    return json(
      {
        message: "Test notifications created",
        count: created.length,
        notifications: created,
      },
      { status: 201 },
    )
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}
