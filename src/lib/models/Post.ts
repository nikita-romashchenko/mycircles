import mongoose from "mongoose"

const PostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: true,
  },
  type: { type: String, enum: ["image", "video", "album"], required: true },
  caption: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  mediaItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "MediaItem" }], // references
  visibility: {
    type: String,
    enum: ["public", "private", "friends"],
    default: "public",
  },
})

export const Post = mongoose.models.Post || mongoose.model("Post", PostSchema)
