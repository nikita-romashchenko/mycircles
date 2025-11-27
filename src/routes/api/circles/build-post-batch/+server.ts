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

    // Amount to burn: 1 CRC per post
    const crcAmount = 1
    const attoAmount = CirclesConverter.circlesToAttoCircles(crcAmount)

    console.log(`Building burn transaction for post:`)
    console.log(`- From: ${fromAddress}`)
    console.log(`- Token: ${toAddr}`)
    console.log(`- Amount to burn: ${crcAmount} CRC`)

    // Build transactions
    // User pays to post: burn 1 CRC total from user account
    // This transaction is required for ALL posts (own profile or others)

    // 0. Get enough tokens on the account first (replenish/convert if needed)
    const replenishTokensForTransferTxs = await transferBuilder.constructAdvancedTransfer(
      fromAddress,
      fromAddress,
      attoAmount,
      {
        useWrappedBalances: true,
        toTokens: [toAddr]
      }
    )

    // 1. Burn the tokens using SDK core burn function
    // Burns the specified amount of the profile's personal tokens
    // Convert address to token ID (uint256)
    const tokenId = BigInt(toAddr)

    const burnTx = sdk.core.hubV2.burn(
      tokenId,       // Token ID (profile address as uint256)
      attoAmount,    // Amount to burn
      "0x"          // Empty data
    )

    console.log(`Built burn transaction for ${CirclesConverter.attoCirclesToCircles(attoAmount)} CRC of token ${toAddr}`)

    // Combine all transactions in order
    const allTransactions = [
      ...replenishTokensForTransferTxs,
      burnTx
    ]

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
        burnedAmount: CirclesConverter.attoCirclesToCircles(attoAmount),
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
