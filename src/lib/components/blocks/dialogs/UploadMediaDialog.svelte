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
  let uploadPromise = $state<Promise<any> | null>(null)
  let wasOpen = $state(false)

  // Balance and cost information
  let maxReplenishableAmount = $state<string | null>(null)
  let loadingBalance = $state(false)
  let showBalanceDetails = $state(false)
  const POST_COST_CRC = 5 // Cost per post in CRC
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
      uploadPromise = null
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

  async function buildAndExecuteBatchTransaction(formData: FormData) {
    if (!profileAddress) return

    try {
      batchError = null
      isExecutingBatch = true

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

      // Immediately execute the transaction
      const { getRunner } = await import("$lib/stores/safeBrowserRunner.svelte")

      const runner = getRunner()
      if (!runner) {
        throw new Error("SafeBrowserRunner not initialized. Please refresh the page.")
      }

      console.log(`Executing batch transaction with ${batchTransactions.length} operations`)

      // Send all transactions as one batch (user signs once)
      const receipt = await runner.sendTransaction(batchTransactions as any)

      console.log("✅ Batch transaction executed:", receipt.transactionHash)

      // Wait for upload to complete in the background
      if (uploadPromise) {
        await uploadPromise
      }

      // Reset states before closing
      isSubmitting = false
      isExecutingBatch = false

      // Close dialog and refresh
      triggerPostReload()
      invalidate("posts")
      open = false

    } catch (err: any) {
      console.error("Error executing batch transaction:", err)
      batchError = err.message || "Failed to execute batch transaction"
      submitError = err.message
      isSubmitting = false
      isExecutingBatch = false
    }
  }

  const { form, errors, enhance, reset } = superForm(pageForm, {
    onResult: ({ result }) => {
      console.log("Form submission result:", result)
      if (result.type === "success") {
        console.log("✅ Post created successfully!")
        submitError = null
        // Upload completed, transaction should already be processed
        // If no profileAddress, close the dialog here
        if (!profileAddress) {
          isSubmitting = false
          triggerPostReload()
          invalidate("posts")
          open = false
        }
      } else if (result.type === "failure") {
        console.error("❌ Post creation failed:", result)
        submitError = result.data?.error || "Failed to create post"
        isSubmitting = false
        isExecutingBatch = false
      } else if (result.type === "redirect") {
        console.log("Redirecting to:", result.location)
      }
    },
    onError: ({ result }) => {
      console.error("❌ Form error:", result)
      submitError = "An unexpected error occurred"
      isSubmitting = false
      isExecutingBatch = false
    },
  })

  async function handleSubmit(event: SubmitEvent) {
    console.log("handleSubmit called, profileAddress:", profileAddress)
    // Only intercept if posting to a profile
    if (!profileAddress) {
      console.log("No profileAddress, letting superform handle it")
      return // Let superform handle it
    }

    event.preventDefault()
    console.log("Setting isSubmitting to true")

    const formElement = event.target as HTMLFormElement
    const formData = new FormData(formElement)

    isSubmitting = true
    submitError = null

    // Start the upload in the background
    uploadPromise = fetch(formElement.action, {
      method: 'POST',
      body: formData
    }).then(async (res) => {
      const contentType = res.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await res.json()
        if (data.type === 'success') {
          console.log("✅ Post created successfully!")
        } else if (data.type === 'failure') {
          throw new Error(data.data?.error || "Failed to create post")
        }
      }
    }).catch((err) => {
      console.error("Upload error:", err)
      submitError = err.message
      isSubmitting = false
      throw err
    })

    // Build and execute transaction immediately (don't wait for upload)
    await buildAndExecuteBatchTransaction(formData)
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
      uploadPromise = null
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
    {#if submitError}
      <div class="mx-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
        <p class="font-semibold">Error:</p>
        <p>{submitError}</p>
      </div>
    {/if}
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

      {#if batchError}
        <div class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          <p class="font-semibold">Transaction Error:</p>
          <p>{batchError}</p>
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
                  There are {(Number(maxReplenishableAmount) / 1e18).toLocaleString('en-US', { maximumFractionDigits: 2 })} personal CRC of this user available to you, the post costs {POST_COST_CRC} CRC which results in {availablePosts} {availablePosts === 1 ? 'post' : 'posts'} possible to make on this user page.
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
