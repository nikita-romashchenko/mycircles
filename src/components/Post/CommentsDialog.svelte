<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index"
  import { Button } from "$lib/components/ui/button"
  import { Textarea } from "$lib/components/ui/textarea/index"
  import { Sdk } from "@aboutcircles/sdk"
  import * as Avatar from "$lib/components/ui/avatar/index"
  import ImageIcon from "@lucide/svelte/icons/image"
  import XIcon from "@lucide/svelte/icons/x"
  import { commentsDialog } from "$lib/stores/commentsDialog.svelte"
  import { page } from "$app/stores"

  interface Comment {
    _id: string
    postId: string
    authorAddress: string
    content: string
    createdAt: string
  }

  let dialogState = $state($commentsDialog)
  let isLoggedIn = $derived(!!$page.data.session)

  // Subscribe to store changes
  $effect(() => {
    dialogState = $commentsDialog
  })

  let comments = $state<Comment[]>([])
  let commentInput = $state("")
  let isPostingComment = $state(false)
  let isLoadingComments = $state(true)
  let commentProfiles = $state<Map<string, { name: string; image: string }>>(
    new Map(),
  )

  async function fetchComments() {
    if (!dialogState.postId) return

    isLoadingComments = true
    try {
      const response = await fetch(`/api/comments?postId=${dialogState.postId}`)
      const data = await response.json()

      if (response.ok) {
        comments = data.comments

        // Fetch profiles for comment authors
        const authorAddresses = [
          ...new Set(comments.map((c) => c.authorAddress)),
        ]
        if (authorAddresses.length > 0) {
          const sdk = new Sdk()
          const profiles = await sdk.rpc.profile.getProfileByAddressBatch(
            authorAddresses as `0x${string}`[],
          )

          const profileMap = new Map()
          profiles.forEach((profile, index) => {
            const address = authorAddresses[index].toLowerCase()
            profileMap.set(address, {
              name:
                profile?.name ||
                `${address.slice(0, 6)}...${address.slice(-4)}`,
              image: profile?.previewImageUrl,
            })
          })
          commentProfiles = profileMap
        }
      }
    } catch (err) {
      console.error("Error fetching comments:", err)
    } finally {
      isLoadingComments = false
    }
  }

  async function postComment() {
    if (!commentInput.trim() || isPostingComment || !dialogState.postId) return

    isPostingComment = true
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: dialogState.postId,
          content: commentInput.trim(),
        }),
      })

      if (response.ok) {
        commentInput = ""
        await fetchComments()
      }
    } catch (err) {
      console.error("Error posting comment:", err)
    } finally {
      isPostingComment = false
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  // Fetch comments when dialog opens or postId changes
  $effect(() => {
    if (dialogState.open && dialogState.postId) {
      fetchComments()
    }
  })

  // Reset state when dialog closes
  $effect(() => {
    if (!dialogState.open) {
      comments = []
      commentInput = ""
      commentProfiles = new Map()
    }
  })
</script>

<Dialog.Root open={dialogState.open} onOpenChange={(open) => {
  if (!open) {
    commentsDialog.close()
  }
}}>
  <Dialog.Content
    class="w-screen h-[80vh] max-w-none rounded-t-3xl p-0 flex flex-col fixed bottom-0 top-auto translate-y-0"
    showCloseButton={false}
  >
    <!-- Header with close button -->
    <div class="flex items-center justify-between p-4 border-b">
      <h2 class="text-xl font-semibold">
        Comments {comments.length > 0 ? `(${comments.length})` : ""}
      </h2>
      <button
        onclick={() => commentsDialog.close()}
        class="rounded-full p-2 hover:bg-gray-100 transition-colors"
        aria-label="Close"
      >
        <XIcon class="h-5 w-5" />
      </button>
    </div>

    <!-- Comments content area -->
    <div class="flex-1 overflow-y-auto p-4">
      {#if isLoadingComments}
        <p class="text-gray-500 text-center py-4">Loading comments...</p>
      {:else if comments.length === 0}
        <p class="text-gray-500 text-center py-4">
          No comments yet. {isLoggedIn ? "Be the first to comment!" : ""}
        </p>
      {:else}
        <div class="space-y-3 max-w-2xl mx-auto">
          {#each comments as comment}
            {@const commentProfile = commentProfiles.get(comment.authorAddress)}
            <div class="flex items-start gap-3">
              <a href="/{comment.authorAddress}">
                <Avatar.Root class="w-10 h-10 rounded-full">
                  <Avatar.Fallback>
                    <ImageIcon class="w-5 h-5" />
                  </Avatar.Fallback>
                  <Avatar.Image
                    src={commentProfile?.image}
                    alt={commentProfile?.name || "User"}
                    class="aspect-square size-full rounded-full object-cover"
                  />
                </Avatar.Root>
              </a>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 mb-1">
                  <a
                    href="/{comment.authorAddress}"
                    class="font-semibold text-sm hover:underline"
                  >
                    {commentProfile?.name || "Anonymous"}
                  </a>
                  <span class="text-xs text-gray-400">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p class="text-sm text-gray-900 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Comment input footer (only for logged-in users) -->
    {#if isLoggedIn}
      <div class="border-t p-4 bg-white">
        <div class="max-w-2xl mx-auto">
          <Textarea
            bind:value={commentInput}
            placeholder="Write a comment..."
            class="mb-2 resize-none"
            rows={3}
            maxlength={1000}
            disabled={isPostingComment}
          />
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-500">{commentInput.length}/1000</span>
            <Button
              onclick={postComment}
              disabled={!commentInput.trim() || isPostingComment}
            >
              {isPostingComment ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </div>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
