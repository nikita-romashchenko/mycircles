import mongoose from "mongoose"

const InteractionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: true,
  },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  type: { type: String, enum: ["like", "repost"], required: true },
  createdAt: { type: Date, default: Date.now },
})

// ensure a user can only like/repost once per post
InteractionSchema.index({ userId: 1, postId: 1, type: 1 }, { unique: true })

export const Interaction =
  mongoose.models.Interaction ||
  mongoose.model("Interaction", InteractionSchema)
