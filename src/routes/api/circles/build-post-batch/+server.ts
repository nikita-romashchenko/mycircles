import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { CirclesConverter } from "@aboutcircles/sdk-utils"

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
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

    // Amount to transfer: 10 CRC per post
    const crcAmount = 10
    const attoAmount = CirclesConverter.circlesToAttoCircles(crcAmount)

    console.log(`Building transfer transaction for post:`)
    console.log(`- To: ${toAddress}`)
    console.log(`- Amount to transfer: ${crcAmount} CRC`)

    // Use the build-transfer endpoint
    const response = await fetch("/api/circles/build-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toAddress,
        amount: attoAmount.toString()
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to build transfer")
    }

    const { transactions } = await response.json()

    console.log(`Built batch transaction with ${transactions.length} transaction steps`)

    // Return array of transactions with summary for backward compatibility
    return json({
      success: true,
      transactions,
      summary: {
        toAddress: toAddress.toLowerCase(),
        totalAmount: crcAmount,
        transferredAmount: crcAmount,
        transactionCount: transactions.length,
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
