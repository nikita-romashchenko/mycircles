import mongoose from "mongoose"
import { required } from "zod/v4-mini"

const PostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: true,
  },
  postedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: false,
  },
  balance: { type: Number, default: 0, required: true },
  type: {
    type: String,
    enum: ["image", "video", "album", "text"],
    required: true,
  },
  caption: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  mediaItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "MediaItem" }], // references
  visibility: {
    type: String,
    enum: ["public", "private", "friends"],
    default: "public",
  },
  likesCount: { type: Number, default: 0 },
  repostsCount: { type: Number, default: 0 },
  location: { type: Object },
})

export const Post = mongoose.models.Post || mongoose.model("Post", PostSchema)
