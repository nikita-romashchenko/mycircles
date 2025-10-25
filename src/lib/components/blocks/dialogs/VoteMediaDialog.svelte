<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index"
  import { Input } from "$lib/components/ui/input"
  import { Button } from "$lib/components/ui/button"
  import Label from "$lib/components/ui/label/label.svelte"
  import { avatarStore } from "$lib/stores/circlesAvatar.svelte"

  interface Props {
    open?: boolean
    type: "upVote" | "downVote" | null
    postId: string | null
    targetAddress: string | null
    profileOwnerAddress: string | null
    onSubmit?: (postId: string, type: "upVote" | "downVote", balanceChange: number) => void
  }

  let { open = $bindable(true), type, postId, targetAddress, profileOwnerAddress, onSubmit }: Props = $props()

  let balanceChange = $state("")
  let error = $state("")
  let maxFlow = $state<string | null>(null)
  let loadingMaxFlow = $state(false)
  let displayMaxFlow = $state<string | null>(null)
  let hasInsufficientFlow = $state(false)

  // Fetch max flow when dialog opens (only for upvotes)
  $effect(() => {
    if (open && targetAddress && type === "upVote") {
      fetchMaxFlow()
    }
  })

  async function fetchMaxFlow() {
    if (!targetAddress || !profileOwnerAddress) return

    loadingMaxFlow = true
    try {
      // Get avatar from store
      const avatar = avatarStore.getAvatar()
      if (!avatar) {
        console.error("Avatar not initialized")
        hasInsufficientFlow = true
        return
      }

      console.log(`🔍 Calculating max flow to ${targetAddress} using only tokens from ${profileOwnerAddress}`)

      // Use only tokens from the profile owner's address
      const options = {
        useWrappedBalances: true, // Use wrapped tokens (ERC20)
        fromTokens: [profileOwnerAddress as `0x${string}`] // Only use this specific token
      }

      // Get max transferable amount using SDK
      const maxFlowRaw = await avatar.transfer.getMaxAmountAdvanced(
        targetAddress as `0x${string}`,
        options
      )

      maxFlow = maxFlowRaw

      // Convert from 18 decimals to human-readable format
      const maxFlowBigInt = BigInt(maxFlow)
      const divisor = BigInt(10 ** 18)
      const wholePart = maxFlowBigInt / divisor

      // Only display if >= 1 CRC
      if (wholePart >= 1n) {
        // Show whole number only, no decimals
        displayMaxFlow = wholePart.toString()
        hasInsufficientFlow = false
      } else {
        displayMaxFlow = null
        hasInsufficientFlow = true
      }

      console.log(`✅ Max flow calculated: ${displayMaxFlow} CRC`)
    } catch (err) {
      console.error("Error fetching max flow:", err)
      hasInsufficientFlow = true
    } finally {
      loadingMaxFlow = false
    }
  }

  function handleSubmit() {
    if (!balanceChange || !type || !postId) {
      error = "Please enter a balance value"
      return
    }

    const balanceChangeNum = Number(balanceChange)
    if (isNaN(balanceChangeNum) || balanceChangeNum === 0) {
      error = "Please enter a valid number greater than 0"
      return
    }

    // Close modal immediately for optimistic UI
    open = false

    // Call the parent's submit handler
    onSubmit?.(postId, type, balanceChangeNum)

    // Reset form
    balanceChange = ""
    error = ""
    maxFlow = null
    displayMaxFlow = null
    hasInsufficientFlow = false
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      // Reset form when dialog is closed
      balanceChange = ""
      error = ""
      maxFlow = null
      displayMaxFlow = null
      hasInsufficientFlow = false
    }
  }
</script>

<Dialog.Root onOpenChange={handleOpenChange} bind:open>
  <Dialog.Content class="max-h-[90vh] overflow-auto">
    <Dialog.Header>
      <Dialog.Title>{type === "upVote" ? "Upvote" : "Downvote"}</Dialog.Title>
    </Dialog.Header>
    <div class="flex flex-col gap-4 p-4">
      {#if type === "upVote"}
        {#if loadingMaxFlow}
          <p class="text-sm text-gray-500">Loading max flow...</p>
        {:else if displayMaxFlow}
          <div class="bg-blue-50 border border-blue-200 rounded p-3">
            <p class="text-sm font-semibold text-blue-900">Max Transferable Amount</p>
            <p class="text-lg font-bold text-blue-700">{displayMaxFlow} CRC</p>
          </div>
        {:else if hasInsufficientFlow}
          <div class="bg-red-50 border border-red-200 rounded p-3">
            <p class="text-sm font-semibold text-red-900">Insufficient Balance</p>
            <p class="text-sm text-red-700">You have not enough CRC of this person to vote</p>
          </div>
        {/if}
      {:else}
        <div class="bg-gray-50 border border-gray-200 rounded p-3">
          <p class="text-sm text-gray-700">Downvoting will decrease the post balance without sending tokens</p>
        </div>
      {/if}

      <Label for="balanceChange">Balance</Label>
      <Input
        type="number"
        id="balanceChange"
        bind:value={balanceChange}
        placeholder="Enter balance amount"
        disabled={type === "upVote" && hasInsufficientFlow}
      />

      {#if error}
        <p class="text-red-500 text-sm">{error}</p>
      {/if}

      <div class="flex flex-col items-center justify-center mt-4">
        <Button
          onclick={handleSubmit}
          disabled={!balanceChange || (type === "upVote" && hasInsufficientFlow)}
        >
          Submit
        </Button>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
