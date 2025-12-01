<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index"
  import { superForm, filesProxy, fieldProxy } from "sveltekit-superforms"
  import { Input } from "$lib/components/ui/input"
  import { Button } from "$lib/components/ui/button"
  import Label from "$lib/components/ui/label/label.svelte"
  import { theme } from "svelte-lexical/dist/themes/default"
  import CaptionEditor from "../svelte-lexical/caption-editor/caption-editor.svelte"
  import { invalidate } from "$app/navigation"
  import { triggerPostReload } from "$lib/stores/postReload.svelte"
  import { page } from "$app/stores"
  import ImageIcon from "@lucide/svelte/icons/image"
  import XIcon from "@lucide/svelte/icons/x"
  import { avatarStore } from "$lib/stores/safe4337.svelte"

  import type { UploadMediaSchema } from "$lib/validation/schemas"
  import type { Infer, SuperValidated } from "sveltekit-superforms"
  import type { EditorState } from "lexical"

  interface Props {
    open?: boolean
    pageForm: SuperValidated<Infer<UploadMediaSchema>>
    profileAddress?: string
  }

  let { open = $bindable(true), pageForm, profileAddress }: Props = $props()
  let isSubmitting = $state(false)
  let submitError = $state<string | null>(null)
  let batchTransactions = $state<any[]>([])
  let batchSummary = $state<any>(null)
  let isExecutingBatch = $state(false)
  let batchError = $state<string | null>(null)
  let wasOpen = $state(false)

  // Balance and cost information
  let maxReplenishableAmount = $state<string | null>(null)
  let loadingBalance = $state(false)
  let showBalanceDetails = $state(false)
  const POST_COST_CRC = 10 // Cost per post in CRC (transferred to profile owner)
  let availablePosts = $derived(
    maxReplenishableAmount
      ? Math.floor(Number(maxReplenishableAmount) / 1e18 / POST_COST_CRC)
      : 0
  )

  // Fetch balance information
  async function fetchBalanceInfo() {
    if (!profileAddress) return

    loadingBalance = true
    try {
      const res = await fetch(`/api/circles/max-replenishable-amount?to=${encodeURIComponent(profileAddress)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          maxReplenishableAmount = data.maxReplenishableAmount
          console.log(`Available balance: ${Number(maxReplenishableAmount) / 1e18} CRC, Can make ${availablePosts} posts`)
        }
      }
    } catch (err) {
      console.error("Error fetching balance:", err)
    } finally {
      loadingBalance = false
    }
  }

  // Reset all states when dialog transitions from closed to open
  $effect(() => {
    if (open && !wasOpen) {
      console.log("Dialog opened, resetting states. Current state:", { isSubmitting, isExecutingBatch })
      isSubmitting = false
      isExecutingBatch = false
      submitError = null
      batchError = null
      console.log("States after reset:", { isSubmitting, isExecutingBatch })

      // Fetch balance info when posting to a profile
      if (profileAddress) {
        fetchBalanceInfo()
      }
    }
    wasOpen = open
  })

  // Debug logging for state changes
  $effect(() => {
    console.log("isSubmitting changed to:", isSubmitting)
  })

  $effect(() => {
    console.log("isExecutingBatch changed to:", isExecutingBatch)
  })

  async function buildAndExecuteBatchTransaction(formData: FormData): Promise<string> {
    if (!profileAddress) throw new Error("No profile address provided")

    isExecutingBatch = true

    try {
      // Build the transaction
      const res = await fetch("/api/circles/build-post-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toAddress: profileAddress }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to build batch transaction")
      }

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to build batch transaction")
      }

      batchTransactions = data.transactions
      batchSummary = data.summary
      console.log("✅ Batch transaction built:", data)

      // Execute the transaction using Safe4337 avatar
      const avatar = avatarStore.getAvatar()
      if (!avatar) {
        throw new Error("Avatar not initialized. Please refresh the page.")
      }

      console.log(`Executing batch transaction with ${batchTransactions.length} operations`)

      // Get the runner from the avatar and send all transactions as one batch (user signs once)
      const runner = (avatar as any).runner // Access the runner from the avatar
      if (!runner || !runner.sendTransaction) {
        throw new Error("Runner not available. Please refresh the page.")
      }

      const receipt = await runner.sendTransaction(batchTransactions as any)

      console.log("✅ Batch transaction executed:", receipt.transactionHash)
      isExecutingBatch = false

      return receipt.transactionHash

    } catch (err: any) {
      console.error("Error executing batch transaction:", err)
      isExecutingBatch = false
      throw err // Re-throw to be handled by caller
    }
  }

  const { form, errors, enhance, reset } = superForm(pageForm, {
    onSubmit: ({ cancel }) => {
      // Always cancel superform submission - we handle all submissions manually
      console.log("Cancelling superform submission - will handle manually")
      cancel()
    },
    onError: ({ result }) => {
      console.error("❌ Form error:", result)
      submitError = "An unexpected error occurred"
      isSubmitting = false
      isExecutingBatch = false
    },
  })

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    console.log("handleSubmit called, profileAddress:", profileAddress)

    const formElement = event.target as HTMLFormElement
    const formData = new FormData(formElement)

    isSubmitting = true
    submitError = null
    batchError = null  // Clear previous batch errors

    try {
      // All posts require a transaction (costs 10 CRC transferred to profile owner)
      if (!profileAddress) {
        throw new Error("No profile address found")
      }

      console.log("Executing transaction for post (transfers 10 CRC to profile owner)")
      const txHash = await buildAndExecuteBatchTransaction(formData)
      console.log("Transaction successful, now uploading post with tx hash:", txHash)
      formData.append('transactionHash', txHash)

      // Upload the post
      const res = await fetch(formElement.action, {
        method: 'POST',
        body: formData
      })

      const contentType = res.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await res.json()
        if (data.type === 'success') {
          console.log("✅ Post created successfully!")

          // Reset states and close dialog
          isSubmitting = false
          isExecutingBatch = false

          // Refresh and close
          triggerPostReload()
          invalidate("posts")
          open = false
        } else if (data.type === 'failure') {
          throw new Error(data.data?.error || "Failed to create post")
        }
      }
    } catch (err: any) {
      console.error("Error during post creation:", err)
      submitError = err.message || "Failed to create post"
      isSubmitting = false
      isExecutingBatch = false
    }
  }
  console.log("form initial values:", $form)
  const files = filesProxy(form, "media")
  const caption = fieldProxy(form, "caption")

  let captionEditorRef: any
  let previews = $derived(
    $files.length > 0
      ? Array.from($files).map((file: File) => URL.createObjectURL(file))
      : [],
  )

  function removeFile(index: number) {
    const arr = Array.from($files)
    arr.splice(index, 1) // remove the clicked file
    //TODO: possibly need $ syntax here
    files.set(arr) // update the filesProxy store
  }

  function handleEditorChange(editorState: EditorState) {
    console.log("Editor state changed:", editorState)
    const json = editorState.toJSON()
    console.log("JSON:", json)

    // Check if the editor is actually empty (only has empty paragraphs)
    const isEmpty = json.root.children.every((child: any) => {
      return !child.children || child.children.length === 0
    })

    if (isEmpty) {
      $caption = ""
    } else {
      const jsonString = JSON.stringify(json)
      console.log("jsonString:", jsonString)
      $caption = jsonString
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      // Reset the form when the dialog is closed
      reset()
      submitError = null
      isSubmitting = false
      isExecutingBatch = false
      batchError = null
      console.log("form reset in UploadMediaDialog:", $form)
    } else {
      // Clear error when opening dialog
      submitError = null
      isSubmitting = false
      isExecutingBatch = false
      batchError = null
    }
  }
</script>

<Dialog.Root onOpenChange={handleOpenChange} bind:open>
  <!-- <Dialog.Trigger>Open</Dialog.Trigger> -->
  <Dialog.Content class="DESKTOP_VIEWPORT !fixed !top-0 !translate-y-0 !left-[50%] !-translate-x-[50%] h-[100dvh] w-full !rounded-none z-[60] overflow-auto flex flex-col">
    <Dialog.Header class="w-full">
      <Dialog.Title>Create Post</Dialog.Title>
      <!-- <Dialog.Description>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Ratione
        expedita ad quod illo, et illum amet vitae modi distinctio mollitia non
        nesciunt nemo earum repellat atque maiores quas obcaecati tenetur.
      </Dialog.Description> -->
    </Dialog.Header>
    <form
      use:enhance
      onsubmit={handleSubmit}
      action="?/upload"
      enctype="multipart/form-data"
      method="POST"
      class="flex flex-col gap-4 p-4 pt-2 w-full"
    >
      <!-- Text editor -->
      <CaptionEditor
        bind:this={captionEditorRef}
        {theme}
        onChange={handleEditorChange}
      />
      <Input type="hidden" name="caption" bind:value={$form.caption} />
      {#if $errors.caption}
        <p class="error">{$errors.caption[0]}</p>
      {/if}

      <!-- Media upload and Post button on same line -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <label
            for="media-upload"
            class="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
            title="Add media"
          >
            <ImageIcon class="w-5 h-5 text-gray-600" />
            <span class="text-sm text-gray-600">Add Media</span>
          </label>
          <Input
            id="media-upload"
            type="file"
            multiple
            name="media"
            accept="image/*,video/*"
            bind:files={$files}
            class="hidden"
          />
          {#if $files.length > 0}
            <span class="text-sm text-gray-600">{$files.length} file{$files.length === 1 ? '' : 's'} selected</span>
          {/if}
        </div>

        <!-- Post button -->
        <Button
          disabled={(!$form.caption && $form.media.length === 0) || isSubmitting || isExecutingBatch}
          type="submit">
          {#if isExecutingBatch}
            Signing Transaction...
          {:else if isSubmitting}
            Processing...
          {:else}
            Post
          {/if}
        </Button>
      </div>

      <!-- Media previews (if any files selected) -->
      {#if $files.length > 0}
        <div class="grid grid-cols-4 gap-2">
          {#each previews as src, i}
            <div class="relative group">
              <img
                {src}
                alt="Uploaded media"
                class="w-full aspect-square object-cover rounded border"
                loading="lazy"
              />
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 rounded-full p-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                onclick={() => removeFile(i)}
                title="Remove"
              >
                <XIcon class="w-3 h-3 text-white" />
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if $errors.media}
        <p class="error">{$errors.media[0]}</p>
      {/if}

      {#if batchError || submitError}
        <div class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          <p class="font-semibold">Error:</p>
          <p>{batchError || submitError}</p>
        </div>
      {/if}

      <!-- Balance and cost information (only shown when posting to a profile) -->
      {#if profileAddress}
        <div class="mt-4">
          {#if loadingBalance}
            <p class="text-xs text-gray-500">Loading balance...</p>
          {:else if maxReplenishableAmount}
            <div class="text-xs text-gray-500">
              <p>
                You can publish {availablePosts} {availablePosts === 1 ? 'post' : 'posts'} on this page.
                <button
                  type="button"
                  onclick={() => showBalanceDetails = !showBalanceDetails}
                  class="text-gray-500 hover:text-gray-700 underline ml-1"
                >
                  {showBalanceDetails ? 'show less' : 'read more'}
                </button>
              </p>
              {#if showBalanceDetails}
                <p class="mt-2">
                  Each post costs {POST_COST_CRC} CRC. Through your network of trust, you can send up to {(Number(maxReplenishableAmount) / 1e18).toLocaleString('en-US', { maximumFractionDigits: 2 })} CRC to this user, allowing you to create {availablePosts} {availablePosts === 1 ? 'post' : 'posts'}.
                </p>
              {/if}
              {#if availablePosts === 0}
                <p class="mt-2 text-yellow-700">
                  ⚠️ Insufficient balance to make a post. You need at least {POST_COST_CRC} CRC.
                </p>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </form>
  </Dialog.Content>
</Dialog.Root>
