import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema({
  recipientId: { type: String, required: true }, // who gets notified
  senderId: { type: String }, // who caused the notification
  type: { type: String, enum: ["post_on_profile", "vote"], required: true },
  postId: { type: String },
  message: { type: String }, // e.g., "John posted on your profile"
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

export const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema)
