import type { PageServerLoad } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Post } from "$lib/models/Post"
import type { Post as PostType } from "$lib/types"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

export const load: PageServerLoad = async () => {
  try {
    // Fetch all posts, newest first
    const posts = await Post.find().sort({ createdAt: -1 }).populate({
      path: "mediaItems",
      select: "url",
    })

    console.log("Fetched posts:", posts.length)

    return {
      posts: JSON.parse(JSON.stringify(posts)) as PostType[],
    }
  } catch (err: any) {
    console.error("Error loading posts:", err)
    return { posts: [], error: err.message }
  }
}
