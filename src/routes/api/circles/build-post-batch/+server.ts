import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Profile } from "$lib/models/Profile"
import { Sdk } from "@aboutcircles/sdk"
import { TransferBuilder } from "@aboutcircles/sdk-transfers"
import { CirclesConverter } from "@aboutcircles/sdk-utils"

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
    const { toAddress } = body

    if (!toAddress) {
      return json({ error: "Missing 'toAddress' parameter" }, { status: 400 })
    }

    // Get the current user's profile to get their safe address
    const userProfile = await Profile.findById(session.user.profileId)

    if (!userProfile || !userProfile.safeAddress) {
      return json(
        { error: "User profile not found or not fully configured" },
        { status: 400 }
      )
    }

    const fromAddress = userProfile.safeAddress.toLowerCase() as `0x${string}`
    const toAddr = toAddress.toLowerCase() as `0x${string}`

    // Initialize SDK
    const sdk = new Sdk()
    const transferBuilder = new TransferBuilder(sdk.core)

    // Amount to transfer: 10 CRC per post
    const crcAmount = 10
    const attoAmount = CirclesConverter.circlesToAttoCircles(crcAmount)

    console.log(`Building transfer transaction for post:`)
    console.log(`- From: ${fromAddress}`)
    console.log(`- To: ${toAddr}`)
    console.log(`- Amount to transfer: ${crcAmount} CRC`)

    // Build transfer transaction
    // User transfers 10 CRC to the profile they want to post on
    const transferTxs = await transferBuilder.constructAdvancedTransfer(
      fromAddress,
      toAddr,
      attoAmount,
      {
        useWrappedBalances: true,
      }
    )

    console.log(`Built transfer transaction for ${CirclesConverter.attoCirclesToCircles(attoAmount)} CRC to ${toAddr}`)

    // Return the transfer transactions
    const allTransactions = transferTxs

    console.log(`Built batch transaction with ${allTransactions.length} transaction steps`)

    // Return array of transactions to be batched by runner on frontend
    return json({
      success: true,
      transactions: allTransactions.map((tx) => ({
        to: tx.to,
        data: tx.data,
        value: (tx.value ?? BigInt(0)).toString(),
      })),
      summary: {
        fromAddress,
        toAddress: toAddr,
        totalAmount: CirclesConverter.attoCirclesToCircles(attoAmount),
        transferredAmount: CirclesConverter.attoCirclesToCircles(attoAmount),
        transactionCount: allTransactions.length,
      },
    })
  } catch (err: any) {
    console.error("Error building batch transaction:", err)
    return json(
      { error: err.message || "Failed to build batch transaction" },
      { status: 500 }
    )
  }
}
