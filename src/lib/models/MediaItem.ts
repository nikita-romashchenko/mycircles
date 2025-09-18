import mongoose from "mongoose"

const MediaItemSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  url: { type: String, required: true },
  metadata: {
    originalName: String,
    fileName: String,
    size: Number,
    mimeType: String,
    bucket: String,
    key: String,
    width: Number,
    height: Number,
    duration: Number, // for video/audio
  },
})

export const MediaItem =
  mongoose.models.MediaItem || mongoose.model("MediaItem", MediaItemSchema)
