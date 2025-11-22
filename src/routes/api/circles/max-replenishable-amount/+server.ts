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

    const toTokenAddress = url.searchParams.get("to")

    if (!toTokenAddress) {
      return json({ error: "Missing 'to' (token address) parameter" }, { status: 400 })
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

    // Use advanced pathfinding: find max replenishable amount from current user to themselves
    // Only counting flows in the target user's Circles token (toTokens)
    // Include wrapped token balances in the calculation
    const maxFlow = await sdk.rpc.pathfinder.findMaxFlow({
      from: userProfile.safeAddress as `0x${string}`,
      to: userProfile.safeAddress as `0x${string}`,
      toTokens: [toTokenAddress as `0x${string}`],
      useWrappedBalances: true,
    })

    // Get current token balances for the user
    const tokenBalances = await sdk.rpc.balance.getTokenBalances(userProfile.safeAddress as `0x${string}`)

    // Find the balance for the specific token and sum both regular and wrapped amounts
    const tokenBalance = tokenBalances.find(
      (balance) => balance.tokenAddress.toLowerCase() === toTokenAddress.toLowerCase()
    )

    // Sum both attoCircles (ERC1155/demurrage) and attoCrc (wrapped/inflationary)
    const currentBalance = (tokenBalance?.attoCircles || 0n) + (tokenBalance?.attoCrc || 0n)

    // Total replenishable amount = max flow + current balance
    const totalReplenishableAmount = maxFlow + currentBalance

    console.log(`Max flow: ${maxFlow.toString()}, Current balance: ${currentBalance.toString()}, Total: ${totalReplenishableAmount.toString()}`)
    console.log(`Max replenishable amount for token ${toTokenAddress} from ${userProfile.safeAddress}: ${totalReplenishableAmount.toString()}`)

    return json({
      success: true,
      maxFlow: maxFlow.toString(),
      currentBalance: currentBalance.toString(),
      maxReplenishableAmount: totalReplenishableAmount.toString(),
      from: userProfile.safeAddress,
      tokenAddress: toTokenAddress,
    })
  } catch (err: any) {
    console.error("Error getting max replenishable amount:", err)
    return json(
      { error: err.message || "Failed to get max replenishable amount" },
      { status: 500 }
    )
  }
}
