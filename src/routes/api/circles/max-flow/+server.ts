import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Profile } from "$lib/models/Profile"
import { Sdk } from "@aboutcircles/sdk"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const session = await locals.auth()

    if (!session?.user?.profileId) {
      return json({ error: "Unauthorized" }, { status: 401 })
    }

    const toAddress = url.searchParams.get("to")

    if (!toAddress) {
      return json({ error: "Missing 'to' address parameter" }, { status: 400 })
    }

    // Get the current user's profile to get their safe address
    const userProfile = await Profile.findById(session.user.profileId)

    if (!userProfile || !userProfile.safeAddress) {
      return json(
        { error: "User profile not found or not fully configured" },
        { status: 400 }
      )
    }

    // Initialize SDK with RPC endpoint to access advanced pathfinding
    const sdk = new Sdk()

    // Use advanced pathfinding: find max flow from current user to the target avatar
    // Include wrapped token balances in the calculation
    const maxFlow = await sdk.rpc.pathfinder.findMaxFlow({
      from: userProfile.safeAddress as `0x${string}`,
      to: toAddress as `0x${string}`,
      useWrappedBalances: true,
    })

    console.log(`Max flow from ${userProfile.safeAddress} to ${toAddress}: ${maxFlow.toString()}`)

    return json({
      success: true,
      maxFlow: maxFlow.toString(),
      from: userProfile.safeAddress,
      to: toAddress,
    })
  } catch (err: any) {
    console.error("Error getting max flow:", err)
    return json(
      { error: err.message || "Failed to get max flow" },
      { status: 500 }
    )
  }
}
