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
  let showBatchTransaction = $state(false)
  let batchTransactions = $state<any[]>([])
  let batchSummary = $state<any>(null)
  let isExecutingBatch = $state(false)
  let batchError = $state<string | null>(null)

  async function buildBatchTransaction() {
    if (!profileAddress) return

    try {
      batchError = null
      isExecutingBatch = true
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
      if (data.success) {
        batchTransactions = data.transactions
        batchSummary = data.summary
        showBatchTransaction = true
        console.log("✅ Batch transaction built:", data)
      } else {
        throw new Error(data.error || "Failed to build batch transaction")
      }
    } catch (err: any) {
      console.error("Error building batch transaction:", err)
      batchError = err.message || "Failed to build batch transaction"
    } finally {
      isExecutingBatch = false
    }
  }

  async function executeBatchTransaction() {
    try {
      batchError = null
      isExecutingBatch = true

      const { getRunner } = await import("$lib/stores/safeBrowserRunner.svelte")

      const runner = getRunner()
      if (!runner) {
        throw new Error("SafeBrowserRunner not initialized. Please refresh the page.")
      }

      console.log(`Executing batch transaction with ${batchTransactions.length} operations`)

      // Send all transactions as one batch (user signs once)
      const receipt = await runner.sendTransaction(batchTransactions as any)

      console.log("✅ Batch transaction executed:", receipt.transactionHash)
      showBatchTransaction = false
      triggerPostReload()
      invalidate("posts")
      open = false
    } catch (err: any) {
      console.error("Error executing batch transaction:", err)
      batchError = err.message || "Failed to execute batch transaction"
    } finally {
      isExecutingBatch = false
    }
  }

  const { form, errors, enhance, reset } = superForm(pageForm, {
    onResult: ({ result }) => {
      isSubmitting = false
      console.log("Form submission result:", result)
      if (result.type === "success") {
        console.log("✅ Post created successfully!")
        submitError = null
        // Build batch transaction if posting to a profile
        if (profileAddress) {
          buildBatchTransaction()
        } else {
          // If no profile address, just close the dialog
          triggerPostReload()
          invalidate("posts")
          open = false
        }
      } else if (result.type === "failure") {
        console.error("❌ Post creation failed:", result)
        submitError = result.data?.error || "Failed to create post"
      } else if (result.type === "redirect") {
        console.log("Redirecting to:", result.location)
      }
    },
    onError: ({ result }) => {
      console.error("❌ Form error:", result)
      submitError = "An unexpected error occurred"
      isSubmitting = false
    },
  })
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
      console.log("form reset in UploadMediaDialog:", $form)
    } else {
      // Clear error when opening dialog
      submitError = null
    }
  }
</script>

<Dialog.Root onOpenChange={handleOpenChange} bind:open>
  <!-- <Dialog.Trigger>Open</Dialog.Trigger> -->
  <Dialog.Content class="max-h-[90vh] overflow-auto">
    <Dialog.Header>
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
      use:enhance={{
        onSubmit: () => {
          isSubmitting = true
        },
      }}
      action="?/upload"
      enctype="multipart/form-data"
      method="POST"
      class="flex flex-col gap-4 p-4"
    >
      <!-- Text editor -->
      <Label for="caption">Text</Label>
      <CaptionEditor
        bind:this={captionEditorRef}
        {theme}
        onChange={handleEditorChange}
      />
      <Input type="hidden" name="caption" bind:value={$form.caption} />
      {#if $errors.caption}
        <p class="error">{$errors.caption[0]}</p>
      {/if}

      <!-- Media upload -->
      <Label for="media">Media</Label>
      <div
        class="relative w-full h-40 border-2 border-dashed border-gray-300 rounded overflow-hidden cursor-pointer flex items-center justify-center"
      >
        <Input
          type="file"
          multiple
          name="media"
          accept="image/*,video/*"
          bind:files={$files}
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {#if $files.length > 0}
          <div class="absolute inset-0 p-2 grid grid-cols-3 gap-2 overflow-auto">
            {#each previews as src, i}
              <!-- TODO: this is not good for accessibility -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
              <img
                {src}
                alt="Uploaded media"
                class="w-full aspect-square object-cover rounded border hover:grayscale-50 transition-all"
                loading="lazy"
                onclick={() => removeFile(i)}
                title="Click to remove"
              />
            {/each}
          </div>
        {:else}
          <span class="text-gray-400 z-10 pointer-events-none"
            >Click to select photos</span
          >
        {/if}
      </div>
      {#if $errors.media}
        <p class="error">{$errors.media[0]}</p>
      {/if}

      <!-- Upload button -->
      <div class="flex flex-col items-center justify-center mt-4">
        <Button
          disabled={(!$form.caption && $form.media.length === 0) || isSubmitting}
          type="submit">{isSubmitting ? "Creating..." : "Upload"}</Button
        >
      </div>
    </form>

    <!-- Batch Transaction Modal -->
    {#if showBatchTransaction && batchSummary}
      <div class="border-t pt-4 mt-4">
        <div class="mb-4 p-3 bg-blue-50 border border-blue-300 rounded">
          <h3 class="font-semibold text-blue-900 mb-2">Complete Your Post</h3>
          <p class="text-sm text-blue-800 mb-3">
            Sign the transaction to finalize your post and transfer CRC tokens.
          </p>

          <!-- Transaction Summary -->
          <div class="bg-white rounded p-3 mb-3 text-sm">
            <p class="font-semibold mb-2">Transaction Summary:</p>
            <div class="space-y-1 text-gray-700">
              <p>• Total Amount: <span class="font-mono">{batchSummary.totalAmount} CRC</span></p>
              <p>• To Address: <span class="font-mono text-xs">{batchSummary.toAddress.slice(0, 6)}...{batchSummary.toAddress.slice(-4)}</span></p>
              <p>• Wrapped (30%): <span class="font-mono">{batchSummary.wrappedAmount} CRC</span></p>
              <p>• Unwrapped (70%): <span class="font-mono">{batchSummary.unwrappedAmount} CRC</span></p>
              <p>• Steps: <span class="font-mono">{batchSummary.transactionCount}</span></p>
            </div>
          </div>

          {#if batchError}
            <div class="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              <p class="font-semibold">Error:</p>
              <p>{batchError}</p>
            </div>
          {/if}

          <div class="flex gap-2">
            <Button
              onclick={executeBatchTransaction}
              disabled={isExecutingBatch}
              class="bg-blue-600 hover:bg-blue-700"
            >
              {isExecutingBatch ? "Processing..." : "Sign & Execute"}
            </Button>
            <Button
              onclick={() => {
                showBatchTransaction = false
                triggerPostReload()
                invalidate("posts")
                open = false
              }}
              disabled={isExecutingBatch}
              variant="outline"
            >
              Skip for Now
            </Button>
          </div>
        </div>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
