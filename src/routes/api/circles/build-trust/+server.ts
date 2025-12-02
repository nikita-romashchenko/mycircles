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

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth()

    if (!session?.user?.profileId) {
      return json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { targetAddress, action } = body

    if (!targetAddress || !action) {
      return json({ error: "Missing required parameters" }, { status: 400 })
    }

    if (action !== "trust" && action !== "untrust") {
      return json({ error: "Invalid action. Must be 'trust' or 'untrust'" }, { status: 400 })
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
    const toAddress = targetAddress.toLowerCase() as `0x${string}`

    // Initialize SDK
    const sdk = new Sdk()

    console.log(`Building ${action} transaction:`)
    console.log(`- From: ${fromAddress}`)
    console.log(`- To: ${toAddress}`)

    // Build trust/untrust transaction
    let transactions

    if (action === "trust") {
      transactions = await sdk.avatar.trust.buildAddTransaction(
        fromAddress,
        toAddress
      )
    } else {
      transactions = await sdk.avatar.trust.buildRemoveTransaction(
        fromAddress,
        toAddress
      )
    }

    console.log(`Built ${action} transaction`)

    // Return array of transactions
    return json({
      success: true,
      transactions: Array.isArray(transactions) ? transactions.map((tx) => ({
        to: tx.to,
        data: tx.data,
        value: (tx.value ?? BigInt(0)).toString(),
      })) : [{
        to: transactions.to,
        data: transactions.data,
        value: (transactions.value ?? BigInt(0)).toString(),
      }],
    })
  } catch (err: any) {
    console.error(`Error building trust transaction:`, err)
    return json(
      { error: err.message || "Failed to build trust transaction" },
      { status: 500 }
    )
  }
}
