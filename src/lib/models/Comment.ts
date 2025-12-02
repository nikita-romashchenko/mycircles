import mongoose from "mongoose"

const CommentSchema = new mongoose.Schema({
  // Reference to the post this comment belongs to
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },

  // Author address (matching Post's address-based pattern)
  authorAddress: {
    type: String,
    required: true,
    lowercase: true, // Auto-normalize to lowercase
  },

  // Comment content
  content: {
    type: String,
    required: true,
    maxlength: 1000, // Adjust as needed
  },

  // Engagement metrics
  likesCount: {
    type: Number,
    default: 0,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // Optional: soft delete for moderation
  isDeleted: {
    type: Boolean,
    default: false,
  },
})

// Compound indexes for efficient queries
// Index for fetching recent comments on a post (posts list page - rotating comments)
CommentSchema.index({ postId: 1, createdAt: -1 })

// Index for fetching most liked comments on a post (individual post page)
CommentSchema.index({ postId: 1, likesCount: -1, createdAt: -1 })

// Index for finding all comments by a user
CommentSchema.index({ authorAddress: 1, createdAt: -1 })

// Index for efficient filtering of non-deleted comments
CommentSchema.index({ postId: 1, isDeleted: 1, createdAt: -1 })

export const Comment =
  mongoose.models.Comment || mongoose.model("Comment", CommentSchema)
