<script lang="ts">
  import { page } from "$app/stores"
  import PostCard from "$components/Post/PostCard.svelte"
  import type { Post as PostType, CirclesRpcProfile } from "$lib/types"
  import { Button } from "$lib/components/ui/button"
  import { Textarea } from "$lib/components/ui/textarea/index"
  import { onMount } from "svelte"
  import { Sdk } from "@aboutcircles/sdk"
  import * as Avatar from "$lib/components/ui/avatar/index"
  import ImageIcon from "@lucide/svelte/icons/image"

  let basePost = $derived($page.data.post as PostType)
  let profile = $derived($page.data.profile as CirclesRpcProfile)
  let isOwnProfile = $derived($page.data.isOwnProfile as boolean)
  let post = $derived(basePost)
  let isLoggedIn = $derived(!!$page.data.session)

  interface Comment {
    _id: string
    postId: string
    authorAddress: string
    content: string
    createdAt: string
  }

  let comments = $state<Comment[]>([])
  let commentInput = $state("")
  let isPostingComment = $state(false)
  let isLoadingComments = $state(true)
  let commentProfiles = $state<Map<string, { name: string; image: string }>>(
    new Map(),
  )

  async function fetchComments() {
    try {
      const response = await fetch(`/api/comments?postId=${post._id}`)
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
          console.log("Fetched comment profiles:", profileMap)
        }
      }
    } catch (err) {
      console.error("Error fetching comments:", err)
    } finally {
      isLoadingComments = false
    }
  }

  async function postComment() {
    if (!commentInput.trim() || isPostingComment) return

    isPostingComment = true
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: post._id,
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

  onMount(() => {
    fetchComments()
  })
</script>

<div class="max-w-xl mx-auto p-4">
  <!-- User info -->
  <div class="flex items-center gap-3 mb-4">
    <a href="/{profile.address}" class="flex items-center gap-3">
      <Avatar.Root class="w-10 h-10 rounded-full">
        <Avatar.Fallback>
          <ImageIcon class="w-5 h-5" />
        </Avatar.Fallback>
        <Avatar.Image
          src={profile.previewImageUrl}
          alt={`${profile.name || "Anonymous"}'s avatar`}
          class="rounded-full object-cover"
        />
      </Avatar.Root>
      <div>
        <h2 class="font-semibold text-lg">{profile.name || "Anonymous"}</h2>
        {#if isOwnProfile}
          <p class="text-primary text-sm">(Your Profile)</p>
        {/if}
      </div>
    </a>
  </div>

  <!-- Post -->
  <PostCard {post} />

  <!-- Comments Section -->
  <div class="mt-8">
    <h3 class="text-xl font-semibold mb-4">
      Comments {comments.length > 0 ? `(${comments.length})` : ""}
    </h3>

    <!-- Comment Input (only for logged-in users) -->
    {#if isLoggedIn}
      <div class="mb-6">
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
    {/if}

    <!-- Comments List -->
    {#if isLoadingComments}
      <p class="text-gray-500 text-center py-4">Loading comments...</p>
    {:else if comments.length === 0}
      <p class="text-gray-500 text-center py-4">
        No comments yet. {isLoggedIn ? "Be the first to comment!" : ""}
      </p>
    {:else}
      <div class="space-y-4">
        {#each comments as comment}
          {@const commentProfile = commentProfiles.get(comment.authorAddress)}
          <div class="border rounded-lg p-4">
            <div class="flex items-start gap-3">
              <a href="/{comment.authorAddress}">
                <Avatar.Root class="w-10 h-10 rounded-full">
                  <Avatar.Fallback>
                    <ImageIcon class="w-5 h-5" />
                  </Avatar.Fallback>
                  <Avatar.Image
                    src={commentProfile?.image}
                    alt={commentProfile?.name || "User"}
                    class="rounded-full object-cover"
                  />
                </Avatar.Root>
              </a>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <a
                    href="/{comment.authorAddress}"
                    class="font-semibold hover:underline"
                  >
                    {commentProfile?.name || "Anonymous"}
                  </a>
                  <span class="text-sm text-gray-500">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p class="text-gray-800 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
