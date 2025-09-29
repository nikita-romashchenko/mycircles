// src/routes/api/interactions/[type]/+server.ts
import { json, error } from "@sveltejs/kit"
import { Interaction } from "$lib/models/Interaction"
import { Post } from "$lib/models/Post"
import mongoose, { type ObjectId } from "mongoose"
import { env } from "$env/dynamic/private"
import { CirclesData, CirclesRpc } from "@circles-sdk/data"
import { Profiles } from "@circles-sdk/profiles"
import { Profile } from "$lib/models/Profile"

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

export async function getFilteredRelationsWithProfiles(address: string) {
  const rpc = new CirclesRpc("https://rpc.aboutcircles.com/")
  const circlesData = new CirclesData(rpc)

  try {
    // Get aggregated relations
    const relations = await circlesData.getAggregatedTrustRelations(
      address.toLowerCase() as `0x${string}`,
      2,
    )

    // Extract objectAvatars
    const objectAvatars = relations.map((item) => item.objectAvatar)
    const profiles = await Profile.find(
      { safeAddress: { $in: objectAvatars } },
      { safeAddress: 1, username: 1, _id: 1 },
    ).lean<ProfileDoc[]>()

    const mappedProfiles = profiles.map((p) => ({
      safeAddress: p.safeAddress,
      username: p.username,
      profileId: p._id.toString(),
    }))

    // Build lookup map
    const profileMap = Object.fromEntries(
      mappedProfiles.map((p) => [p.safeAddress, p]),
    )

    // Attach profile to relations and filter out missing profiles
    const relationsWithProfiles = relations.map((item) => ({
      relationItem: item,
      profile: profileMap[item.objectAvatar],
    }))
    // .filter((item) => item.profile) // remove relations with no profile

    return relationsWithProfiles
  } catch (err: any) {
    console.error("Error fetching relations with profiles:", err.message)
    return []
  }
}
