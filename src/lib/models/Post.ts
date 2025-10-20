import mongoose from "mongoose"
import { required } from "zod/v4-mini"

const PostSchema = new mongoose.Schema({
  // New fields using safeAddress (lowercase)
  creatorAddress: {
    type: String,
    required: true,
    lowercase: true, // Auto-normalize to lowercase
  },
  postedToAddress: {
    type: String,
    required: false,
    lowercase: true, // Auto-normalize to lowercase
  },
  postedToProfile: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
  },

  // Old fields - kept for migration/backward compatibility (will be deprecated)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: false, // Made optional for migration
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

PostSchema.virtual("creatorProfile", {
  ref: "Profile",
  localField: "creatorAddress", // field in Post
  foreignField: "safeAddress", // field in Profile
  justOne: true, // because one profile per address
})

PostSchema.set("toObject", { virtuals: true })
PostSchema.set("toJSON", { virtuals: true })

// Indexes for efficient queries using new address fields
PostSchema.index({ creatorAddress: 1, createdAt: -1 })
PostSchema.index({ postedToAddress: 1, createdAt: -1 })
PostSchema.index({ creatorAddress: 1, postedToAddress: 1 })

export const Post = mongoose.models.Post || mongoose.model("Post", PostSchema)
