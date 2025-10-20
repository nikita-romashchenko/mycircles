import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Profile } from "$lib/models/Profile"

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

    // Use direct RPC call to find path and get max flow
    const rpcUrl = "https://rpc.circlesubi.network/"
    const rpcResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 0,
        method: "circlesV2_findPath",
        params: [
          {
            Source: userProfile.safeAddress,
            Sink: toAddress,
            TargetFlow: "99999999999999999999999999999999999",
            WithWrap: true
          },
        ],
      }),
    })

    if (!rpcResponse.ok) {
      throw new Error(`RPC request failed: ${rpcResponse.statusText}`)
    }

    const rpcData = await rpcResponse.json()

    if (rpcData.error) {
      throw new Error(`RPC error: ${rpcData.error.message || "Unknown error"}`)
    }

    // Extract max flow from the result
    const maxFlow = rpcData.result?.maxFlow || "0"

    return json({
      success: true,
      maxFlow: maxFlow,
      from: userProfile.safeAddress,
      to: toAddress,
    })
  } catch (err: any) {
    console.error("Error getting max transferable amount:", err)
    return json(
      { error: err.message || "Failed to get max transferable amount" },
      { status: 500 }
    )
  }
}
