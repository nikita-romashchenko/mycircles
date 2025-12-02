import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Profile } from "$lib/models/Profile"
import { Sdk } from "@aboutcircles/sdk"
import { TransferBuilder } from "@aboutcircles/sdk-transfers"

// Connect to MongoDB
await mongoose
  .connect(env.MONGODB_URI || "mongodb://localhost:27017/mycircles")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth()

    if (!session?.user?.profileId) {
      return json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { toAddress, amount } = body

    if (!toAddress || !amount) {
      return json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get the current user's profile
    const userProfile = await Profile.findById(session.user.profileId)

    if (!userProfile || !userProfile.safeAddress) {
      return json(
        { error: "User profile not found or not fully configured" },
        { status: 400 }
      )
    }

    const fromAddress = userProfile.safeAddress.toLowerCase() as `0x${string}`
    const toAddr = toAddress.toLowerCase() as `0x${string}`
    const attoAmount = BigInt(amount)

    // Initialize SDK
    const sdk = new Sdk()
    const transferBuilder = new TransferBuilder(sdk.core)

    console.log(`Building transfer transaction:`)
    console.log(`- From: ${fromAddress}`)
    console.log(`- To: ${toAddr}`)
    console.log(`- Amount: ${attoAmount} atto-circles`)

    // Build transfer transaction using advanced transfer
    const transferTxs = await transferBuilder.constructAdvancedTransfer(
      fromAddress,
      toAddr,
      attoAmount,
      {
        useWrappedBalances: true,
      }
    )

    console.log(`Built transfer with ${transferTxs.length} transaction steps`)

    // Return array of transactions
    return json({
      success: true,
      transactions: transferTxs.map((tx) => ({
        to: tx.to,
        data: tx.data,
        value: (tx.value ?? BigInt(0)).toString(),
      })),
    })
  } catch (err: any) {
    console.error("Error building transfer transaction:", err)
    return json(
      { error: err.message || "Failed to build transfer transaction" },
      { status: 500 }
    )
  }
}
