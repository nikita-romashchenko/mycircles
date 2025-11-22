import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import mongoose from "mongoose"
import { env } from "$env/dynamic/private"
import { Profile } from "$lib/models/Profile"
import { Sdk } from "@aboutcircles/sdk"
import { TransferBuilder } from "@aboutcircles/sdk-transfers"
import { CirclesConverter } from "@aboutcircles/sdk-utils"
import type { CirclesType } from "@aboutcircles/sdk-types"
import { Interface } from "ethers"

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

    const burnerAddress = env.BURNER_ADDRESS
    
    if (!burnerAddress) {
      return json({ error: "Burner address not configured" }, { status: 500 })
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
    const burner = burnerAddress.toLowerCase() as `0x${string}`

    // Initialize SDK
    const sdk = new Sdk()
    const transferBuilder = new TransferBuilder(sdk.core)

    // Amount to transfer: 10 CRC
    const crcAmount = 10
    const attoAmount = CirclesConverter.circlesToAttoCircles(crcAmount)

    // Calculate wrapped (30%) and unwrapped (70%) amounts
    const wrappedAmount = attoAmount * 10n / 30n;
    const unwrappedAmount = attoAmount - wrappedAmount

    // Convert wrapped amount from demurrage to inflationary (actual token amount)
    // This is the actual amount of wrapped tokens that will be transferred
    const wrappedAmountInflationary = CirclesConverter.attoCirclesToAttoStaticCircles(
      wrappedAmount
    )

    console.log(`Building batch transaction for post:`)
    console.log(`- From: ${fromAddress}`)
    console.log(`- To: ${toAddr}`)
    console.log(`- Burner: ${burner}`)
    console.log(`- Total CRC: ${crcAmount}`)
    console.log(`- Wrapped (30% demurrage): ${CirclesConverter.attoCirclesToCircles(wrappedAmount)} CRC`)
    console.log(`- Wrapped (30% inflationary): ${CirclesConverter.attoCirclesToCircles(wrappedAmountInflationary)} CRC`)
    console.log(`- Unwrapped (70%): ${CirclesConverter.attoCirclesToCircles(unwrappedAmount)} CRC`)

    // Build transactions
    // User pays to post: transfer 10 CRC total from user account
    // Split: 3 CRC wrapped (ERC20 direct transfer) to burner, 7 CRC unwrapped to profile

    // 0. Get enough tokens on the account first
    console.log("wrap", attoAmount)
    const replenishTokensForTransferTxs = await transferBuilder.constructAdvancedTransfer(
      fromAddress,
      fromAddress,
      attoAmount,
      {
        useWrappedBalances: true,
        toTokens: [toAddr]
      }
    )

    // 1. Wrap the 30% amount using SDK core
    // The wrap transaction converts demurrage tokens to wrapped (inflationary) tokens
    // CirclesType: 0 = Demurrage, 1 = Inflation
    const CirclesType_Inflationary = 1 // CirclesType.Demurrage

    // Get the wrapper address for the target profile's demurrage wrapper
    const wrappedTokenAddress = await sdk.core.liftERC20.erc20Circles(
      CirclesType_Inflationary,
      toAddr // Get wrapper address for the profile we're posting to
    )
    // @todo throw error if there wrapped token address is zero
    // Wrap the 30% amount - wrapping the target profile's tokens
    const wrapTokensTx = sdk.core.hubV2.wrap(
      toAddr, // Avatar to wrap (the profile's tokens)
      wrappedAmount, // Amount to wrap (demurrage amount)
      CirclesType_Inflationary // Wrap as demurrage (will become inflationary ERC20)
    )

    const erc20Interface = new Interface([
      "function transfer(address to, uint256 amount) public returns (bool)",
    ])

    const wrappedTransferTx = {
      to: wrappedTokenAddress,
      data: erc20Interface.encodeFunctionData("transfer", [
        burner,
        wrappedAmountInflationary.toString(), // Use inflationary amount for actual transfer
      ]),
      value: BigInt(0),
    }

    // 3. Direct ERC1155 safeTransferFrom for unwrapped amount (70%)
    // Transfer the profile's personal token (ERC1155) through HubV2
    const erc1155Interface = new Interface([
      "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) external",
    ])

    // The token ID is the profile's address converted to uint256(uint160(toAddress))
    const tokenId = BigInt(toAddr) // Converts address to uint256
    //@todo the calculations of the wrapped token are worong but thats fine
    const unwrappedTransferTx = {
      to: sdk.core.hubV2.address, // HubV2 contract address - handles ERC1155 transfers
      data: erc1155Interface.encodeFunctionData("safeTransferFrom", [
        fromAddress,
        toAddr,
        tokenId, // Token ID is the profile address
        unwrappedAmount.toString(),
        "0x", // Empty data
      ]),
      value: BigInt(0),
    }

    // Combine all transactions in order
    const allTransactions = [
      ...replenishTokensForTransferTxs,
      wrapTokensTx,
      wrappedTransferTx,
      unwrappedTransferTx
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
        burnerAddress: burner,
        totalAmount: CirclesConverter.attoCirclesToCircles(attoAmount),
        wrappedAmountDemurrage: CirclesConverter.attoCirclesToCircles(wrappedAmount),
        wrappedAmountInflationary: CirclesConverter.attoCirclesToCircles(wrappedAmountInflationary),
        unwrappedAmount: CirclesConverter.attoCirclesToCircles(unwrappedAmount),
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
