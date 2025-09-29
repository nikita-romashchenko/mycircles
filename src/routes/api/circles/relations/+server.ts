// src/routes/api/interactions/[type]/+server.ts
import { json, error } from "@sveltejs/kit"
import { Interaction } from "$lib/models/Interaction"
import { Post } from "$lib/models/Post"
import type { RequestEvent } from "./$types"
import mongoose, { type ObjectId } from "mongoose"
import { env } from "$env/dynamic/private"
import { CirclesData, CirclesRpc } from "@circles-sdk/data"
import { Profiles } from "@circles-sdk/profiles"
import { Profile } from "$lib/models/Profile"
import { getFilteredRelationsWithProfiles } from "$lib/server/relations"
import type { Relation } from "$lib/types"

interface ProfileDoc {
  _id: ObjectId
  safeAddress: string
  username: string
}

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

export async function GET({ request, params, locals }: RequestEvent) {
  const rpc = new CirclesRpc("https://rpc.aboutcircles.com/")
  const circlesData = new CirclesData(rpc)

  const url = new URL(request.url)
  const address = url.searchParams.get("address")

  if (!address) {
    return json(
      { success: false, error: "No address provided" },
      { status: 400 },
    )
  }

  try {
    const relationsWithProfiles =
      await getFilteredRelationsWithProfiles(address)
    return json(relationsWithProfiles as Relation[], { status: 200 })
  } catch (err: any) {
    return json({ error: err.message }, { status: 400 })
  }
}
