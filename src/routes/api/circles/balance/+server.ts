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

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const session = await locals.auth()

    if (!session?.user?.profileId) {
      return json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the current user's profile to get their safe address
    const userProfile = await Profile.findById(session.user.profileId)

    if (!userProfile || !userProfile.safeAddress) {
      return json(
        { error: "User profile not found or not fully configured" },
        { status: 400 }
      )
    }

    // Initialize SDK
    const sdk = new Sdk()

    // Get total token balance
    const totalBalance = await sdk.rpc.balance.getTotalBalance(
      userProfile.safeAddress as `0x${string}`
    )

    console.log(`Total balance for ${userProfile.safeAddress}: ${totalBalance.toString()}`)

    return json({
      success: true,
      totalBalance: totalBalance.toString(),
      address: userProfile.safeAddress,
    })
  } catch (err: any) {
    console.error("Error getting total balance:", err)
    console.error("Error stack:", err.stack)
    return json(
      { error: err.message || "Failed to get total balance" },
      { status: 500 }
    )
  }
}
