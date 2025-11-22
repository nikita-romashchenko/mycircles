import { Sdk } from "@aboutcircles/sdk"
import { TransferBuilder } from "@aboutcircles/sdk-transfers"
import { CirclesConverter } from "@aboutcircles/sdk-utils"
import type { Core } from "@aboutcircles/sdk-core"

/**
 * Builds a batch transaction for posting on someone's profile
 *
 * Transaction flow:
 * 1. Get 10 CRC from the profile being posted to
 * 2. Wrap 30% (3 CRC) and transfer to receiver address
 * 3. Transfer 70% (7 CRC) as ERC1155 to the profile (unwrapped)
 */
export async function buildPostBatchTransaction(
  fromAddress: string,          // Current user (creator)
  toAddress: string,            // Profile we're posting to
  receiverAddress: string,      // Where wrapped tokens go
  crcAmount: number = 10        // Amount of CRC to transfer (default 10)
) {
  try {
    const sdk = new Sdk()
    const attoAmount = CirclesConverter.circlesToAttoCircles(crcAmount)
    const wrappedPercentage = 0.3 // 30%
    const wrappedAmount = BigInt(Math.floor(Number(attoAmount) * wrappedPercentage))
    const unwrappedAmount = attoAmount - wrappedAmount

    console.log(`Building batch transaction:`)
    console.log(`- From: ${fromAddress}`)
    console.log(`- To: ${toAddress}`)
    console.log(`- Total CRC: ${crcAmount}`)
    console.log(`- Wrapped (30%): ${CirclesConverter.attoCirclesToCircles(wrappedAmount)}`)
    console.log(`- Unwrapped (70%): ${CirclesConverter.attoCirclesToCircles(unwrappedAmount)}`)

    // Create transfer builder
    const transferBuilder = new TransferBuilder(sdk.core)

    // Build transaction to get tokens from the profile to ourselves
    const getTxs = await transferBuilder.constructAdvancedTransfer(
      toAddress as `0x${string}`,
      fromAddress as `0x${string}`,
      attoAmount,
      {
        useWrappedBalances: true,
      }
    )

    // Build transaction to transfer wrapped amount to receiver
    const wrapAndTransferTxs = await transferBuilder.constructAdvancedTransfer(
      fromAddress as `0x${string}`,
      receiverAddress as `0x${string}`,
      wrappedAmount,
      {
        useWrappedBalances: true,
        // toTokens: [toAddress], // Optional: specify which token to use
      }
    )

    // Build transaction to transfer unwrapped amount back to profile
    const transferUnwrappedTxs = await transferBuilder.constructAdvancedTransfer(
      fromAddress as `0x${string}`,
      toAddress as `0x${string}`,
      unwrappedAmount,
      {
        useWrappedBalances: true,
      }
    )

    // Combine all transactions
    const allTransactions = [
      ...getTxs,
      ...wrapAndTransferTxs,
      ...transferUnwrappedTxs,
    ]

    console.log(`Built batch transaction with ${allTransactions.length} steps`)

    return {
      success: true,
      transactions: allTransactions.map((tx) => ({
        to: tx.to,
        data: tx.data,
        value: tx.value.toString(),
      })),
      summary: {
        fromAddress,
        toAddress,
        receiverAddress,
        totalAmount: CirclesConverter.attoCirclesToCircles(attoAmount),
        wrappedAmount: CirclesConverter.attoCirclesToCircles(wrappedAmount),
        unwrappedAmount: CirclesConverter.attoCirclesToCircles(unwrappedAmount),
      },
    }
  } catch (err: any) {
    console.error("Error building batch transaction:", err)
    return {
      success: false,
      error: err.message || "Failed to build batch transaction",
    }
  }
}
