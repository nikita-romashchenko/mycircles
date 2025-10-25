import { json } from "@sveltejs/kit"
import type { RequestEvent } from "./$types"
import { createAvatarFromSession } from "$lib/server/circlesAvatar"

export async function POST({ request, locals }: RequestEvent) {
  try {
    const session = await locals.auth()

    if (!session?.user?.safeAddress) {
      return json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { targetAddress } = await request.json()

    if (!targetAddress) {
      return json({ success: false, error: "Target address is required" }, { status: 400 })
    }

    // Validate address format
    if (!targetAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return json({ success: false, error: "Invalid target address format" }, { status: 400 })
    }

    console.log(`🔵 Trust: ${session.user.safeAddress} trusting ${targetAddress}`)

    // Create avatar for the current user
    const avatar = await createAvatarFromSession(session.user.safeAddress)

    // Add trust using the SDK
    const receipt = await avatar.trust.add(targetAddress as `0x${string}`)

    console.log(`✅ Trust transaction successful. Hash: ${receipt.transactionHash}`)

    return json({
      success: true,
      transactionHash: receipt.transactionHash
    }, { status: 200 })
  } catch (err: any) {
    console.error("Trust operation error:", err)
    return json({ success: false, error: err.message }, { status: 500 })
  }
}
