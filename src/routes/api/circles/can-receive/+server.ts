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

    const fromAddress = url.searchParams.get("from")

    if (!fromAddress) {
      return json({ error: "Missing 'from' address parameter" }, { status: 400 })
    }

    // Get the current user's profile to get their safe address (recipient)
    const userProfile = await Profile.findById(session.user.profileId)

    if (!userProfile || !userProfile.safeAddress) {
      return json(
        { error: "User profile not found or not fully configured" },
        { status: 400 }
      )
    }

    // Initialize SDK with RPC endpoint to access advanced pathfinding
    const sdk = new Sdk()

    // Use advanced pathfinding: find max flow from the sender to current user (recipient)
    // Do NOT include wrapped token balances in the calculation
    const maxFlow = await sdk.rpc.pathfinder.findMaxFlow({
      from: fromAddress as `0x${string}`,
      to: userProfile.safeAddress as `0x${string}`,
      useWrappedBalances: false,
    })

    console.log(`Max flow from ${fromAddress} to ${userProfile.safeAddress}: ${maxFlow.toString()}`)

    return json({
      success: true,
      maxFlow: maxFlow.toString(),
      from: fromAddress,
      to: userProfile.safeAddress,
    })
  } catch (err: any) {
    console.error("Error getting max flow:", err)
    return json(
      { error: err.message || "Failed to get max flow" },
      { status: 500 }
    )
  }
}
