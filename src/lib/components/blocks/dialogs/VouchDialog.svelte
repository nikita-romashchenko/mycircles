<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index"
  import { Button } from "$lib/components/ui/button"
  import { Input } from "$lib/components/ui/input"
  import Label from "$lib/components/ui/label/label.svelte"
  import { CirclesConverter } from "@aboutcircles/sdk-utils"
  import { avatarStore } from "$lib/stores/safe4337.svelte"
  import { Sdk } from "@aboutcircles/sdk"
  import { hubV2Abi } from "@aboutcircles/sdk-abis"
  import { encodeFunctionData } from "viem"
  import { page } from "$app/stores"
  import type { TokenBalance, Profile } from "@aboutcircles/sdk-types"
  import * as Avatar from "$lib/components/ui/avatar"
  import ImageIcon from "@lucide/svelte/icons/image"

  interface Props {
    open?: boolean
    maxFlowAmount: string | null // in atto-circles
    recipientAddress: string
    recipientName: string
  }

  let {
    open = $bindable(false),
    maxFlowAmount,
    recipientAddress,
    recipientName,
  }: Props = $props()

  let amount = $state("")
  let isTransferring = $state(false)
  let error = $state<string | null>(null)
  let tokenBalances = $state<TokenBalance[]>([])
  let selectedToken = $state<TokenBalance | null>(null)
  let isLoadingBalances = $state(false)
  let tokenProfiles = $state<Map<string, Profile | null>>(new Map())

  // Fetch token balances when dialog opens
  $effect(() => {
    if (open && tokenBalances.length === 0) {
      loadTokenBalances()
    }
  })

  async function loadTokenBalances() {
    isLoadingBalances = true
    error = null

    try {
      const session = $page.data.session
      if (!session?.user?.safeAddress) {
        throw new Error("User session not found.")
      }

      const fromAddress =
        session.user.safeAddress.toLowerCase() as `0x${string}`

      // Initialize SDK to get RPC access
      const sdk = new Sdk()

      // Get token balances from RPC
      const balances = await sdk.rpc.balance.getTokenBalances(fromAddress)

      // Filter to only ERC1155 tokens with balance >= 1 CRC
      const MIN_BALANCE = CirclesConverter.circlesToAttoCircles(1)
      const filteredBalances = balances.filter(
        (token) => token.isErc1155 && token.attoCircles >= MIN_BALANCE,
      )

      console.log(
        `Found ${filteredBalances.length} ERC1155 Circles tokens with >= 1 CRC`,
      )

      // Get profiles for all token owners
      const tokenOwners = [
        ...new Set(filteredBalances.map((t) => t.tokenOwner)),
      ]
      if (tokenOwners.length > 0) {
        const profiles =
          await sdk.rpc.profile.getProfileByAddressBatch(tokenOwners)

        // Build profile map with full profile objects (for images)
        const profileMap = new Map<string, Profile | null>()
        profiles.forEach((profile, index) => {
          const address = tokenOwners[index].toLowerCase()
          profileMap.set(address, profile)
        })
        tokenProfiles = profileMap
      }

      tokenBalances = filteredBalances
    } catch (err: any) {
      console.error("Error loading token balances:", err)
      error = err.message || "Failed to load token balances"
    } finally {
      isLoadingBalances = false
    }
  }

  async function handleVouch() {
    error = null

    if (!selectedToken) {
      error = "Please select a token"
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      error = "Please enter a valid amount"
      return
    }

    const amountNum = parseFloat(amount)
    const maxNum = Number(
      CirclesConverter.attoCirclesToCircles(selectedToken.attoCircles),
    )

    if (amountNum > maxNum) {
      error = `Amount cannot exceed ${maxNum.toFixed(2)} CRC`
      return
    }

    isTransferring = true

    try {
      // Get the avatar from the store
      const avatar = avatarStore.getAvatar()
      if (!avatar) {
        throw new Error("Avatar not initialized. Please refresh the page.")
      }

      const session = $page.data.session
      if (!session?.user?.safeAddress) {
        throw new Error("User session not found.")
      }

      const fromAddress =
        session.user.safeAddress.toLowerCase() as `0x${string}`
      const toAddr = recipientAddress.toLowerCase() as `0x${string}`
      const transferAmount = CirclesConverter.circlesToAttoCircles(amountNum)

      console.log(`🎁 Vouching ${amountNum} CRC to ${recipientName}...`)

      // Initialize SDK to get hub address
      const sdk = new Sdk()
      const hubAddress = sdk.core.config.v2HubAddress as `0x${string}`

      // Build ERC1155 safeTransferFrom transaction
      const data = encodeFunctionData({
        abi: hubV2Abi,
        functionName: "safeTransferFrom",
        args: [
          fromAddress,
          toAddr,
          selectedToken.tokenId,
          transferAmount,
          "0x",
        ],
      })

      const transaction = {
        to: hubAddress,
        data,
        value: BigInt(0),
      }

      // Execute the transaction using Safe4337Runner
      const runner = (avatar as any).runner
      if (!runner || !runner.sendTransaction) {
        throw new Error("Runner not available. Please refresh the page.")
      }

      const receipt = await runner.sendTransaction([transaction] as any)

      console.log(
        `✅ Vouch transaction successful. Hash: ${receipt.transactionHash}`,
      )

      // Send notification to recipient
      try {
        const senderName = session.user.name ||
                          `${session.user.safeAddress.slice(0, 6)}...${session.user.safeAddress.slice(-4)}`

        await fetch("/api/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientId: recipientAddress.toLowerCase(),
            type: "vouch",
            amount: amountNum.toFixed(2),
            message: `${senderName} vouched for you with ${amountNum.toFixed(2)} CRC`,
          }),
        })
      } catch (notifErr) {
        console.error("Failed to send notification:", notifErr)
        // Don't block the UI if notification fails
      }

      // Reset and close on success
      amount = ""
      selectedToken = null
      tokenBalances = []
      tokenProfiles = new Map()
      open = false
    } catch (err: any) {
      console.error("Error vouching:", err)
      error = err.message || "Failed to send vouch"
    } finally {
      isTransferring = false
    }
  }

  function setMaxAmount() {
    if (selectedToken) {
      amount = Number(
        CirclesConverter.attoCirclesToCircles(selectedToken.attoCircles),
      ).toFixed(2)
    }
  }

  // Reset on close
  function handleOpenChange(value: boolean) {
    if (!value) {
      amount = ""
      selectedToken = null
      tokenBalances = []
      tokenProfiles = new Map()
      error = null
    }
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Vouch for {recipientName}</Dialog.Title>
      <Dialog.Description>
        Select a Circles token and amount to send.
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-4 py-4">
      {#if isLoadingBalances}
        <p class="text-sm text-gray-500 text-center">
          Loading your Circles tokens...
        </p>
      {:else if tokenBalances.length === 0}
        <p class="text-sm text-gray-500 text-center">
          No Circles tokens available to transfer.
        </p>
      {:else}
        <!-- Token Selection -->
        <div class="flex flex-col gap-2">
          <Label>Select Token</Label>
          <div
            class="flex flex-col gap-2 max-h-96 overflow-y-auto border rounded-md p-2"
          >
            {#each tokenBalances as token}
              {@const tokenBalance = Number(
                CirclesConverter.attoCirclesToCircles(token.attoCircles),
              ).toFixed(2)}
              {@const ownerProfile = tokenProfiles.get(
                token.tokenOwner.toLowerCase(),
              )}
              {@const ownerName =
                ownerProfile?.name ||
                `${token.tokenOwner.slice(0, 6)}...${token.tokenOwner.slice(-4)}`}
              <button
                type="button"
                class="flex items-center gap-2 p-3 border rounded-md hover:bg-muted transition-colors {selectedToken?.tokenId ===
                token.tokenId
                  ? 'border-primary bg-primary/10'
                  : 'border-border'}"
                onclick={() => {
                  selectedToken = token
                  amount = ""
                }}
                disabled={isTransferring}
              >
                <span class="text-sm font-medium">
                  {tokenBalance}
                </span>
                <Avatar.Root class="w-8 h-8 rounded-full border">
                  <Avatar.Fallback
                    class="w-8 h-8 rounded-full object-cover bg-black"
                  >
                    <ImageIcon class="w-4 h-4 text-white" />
                  </Avatar.Fallback>
                  {#if ownerProfile?.previewImageUrl}
                    <Avatar.Image
                      src={ownerProfile.previewImageUrl}
                      alt={ownerName}
                      class="w-8 h-8 rounded-full object-cover"
                    />
                  {/if}
                </Avatar.Root>
                <span class="text-sm text-gray-500">
                  {ownerName}
                </span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Amount Input -->
        {#if selectedToken}
          <div class="flex flex-col gap-2">
            <Label for="amount">Amount (CRC)</Label>
            <div class="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={Number(
                  CirclesConverter.attoCirclesToCircles(
                    selectedToken.attoCircles,
                  ),
                )}
                bind:value={amount}
                placeholder="0.0"
                disabled={isTransferring}
              />
              <Button
                variant="outline"
                onclick={setMaxAmount}
                disabled={isTransferring}
              >
                Max
              </Button>
            </div>
            <p class="text-xs text-gray-500">
              Available: {Number(
                CirclesConverter.attoCirclesToCircles(
                  selectedToken.attoCircles,
                ),
              ).toFixed(2)} CRC
            </p>
          </div>
        {/if}
      {/if}

      {#if error}
        <p class="text-sm text-red-600">{error}</p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button
        onclick={handleVouch}
        disabled={isTransferring ||
          !selectedToken ||
          !amount ||
          parseFloat(amount) <= 0}
        class="w-full"
      >
        {#if isTransferring}
          Sending...
        {:else}
          Vouch {amount ? `${amount} CRC` : ""}
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
