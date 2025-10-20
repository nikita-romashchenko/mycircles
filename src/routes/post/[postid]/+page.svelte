<script lang="ts">
  import { page } from "$app/stores"
  import PostCard from "$components/Post/PostCard.svelte"
  import VoteMediaDialog from "$lib/components/blocks/dialogs/VoteMediaDialog.svelte"
  import type { Post as PostType, CirclesRpcProfile } from "$lib/types"
  import { browser } from "$app/environment"

  let voteModalOpen = false
  let votePostId: any
  let voteType: any
  let voteTargetAddress: any
  let localPost = $state<PostType | null>(null)

  $: basePost = $page.data.post as PostType
  $: profile = $page.data.profile as CirclesRpcProfile
  $: isOwnProfile = $page.data.isOwnProfile as boolean

  // Use local post for optimistic updates, fallback to base post
  $: post = localPost || basePost
  $: voteTargetAddress = post?.postedToAddress || post?.creatorAddress

  // Reset local post when base post changes
  $effect(() => {
    if (basePost && (!localPost || localPost._id !== basePost._id)) {
      localPost = { ...basePost }
    }
  })

  const handleVote = async (postId: string, type: "upVote" | "downVote") => {
    console.log("Voting on post:", postId, "Type:", type)
    votePostId = postId
    voteType = type
    voteModalOpen = true
  }

  const handleVoteSubmit = async (postId: string, type: "upVote" | "downVote", balanceChange: number) => {
    if (!localPost) return

    // Store old balance for revert
    const oldBalance = localPost.balance

    // Optimistically update the post balance
    localPost.balance = type === "upVote"
      ? oldBalance + balanceChange
      : oldBalance - balanceChange

    try {
      const response = await fetch("/api/posts/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          type,
          balanceChange,
        }),
      })

      if (!response.ok) {
        // Revert on error
        localPost.balance = oldBalance
        console.error("Vote failed")
      }
    } catch (err) {
      // Revert on error
      localPost.balance = oldBalance
      console.error("Error submitting vote:", err)
    }
  }
</script>

<div class="max-w-xl mx-auto p-4">
  <!-- User info -->
  <div class="flex items-center gap-3 mb-4">
    <a href="/{profile.address}" class="flex items-center gap-3">
      <img
        src={profile.previewImageUrl || "https://picsum.photos/200"}
        alt={`${profile.name || 'Anonymous'}'s avatar`}
        class="w-12 h-12 rounded-full object-cover"
      />
      <div>
        <h2 class="font-semibold text-lg">{profile.name || "Anonymous"}</h2>
        {#if isOwnProfile}
          <p class="text-blue-500 text-sm">(Your Profile)</p>
        {/if}
      </div>
    </a>
  </div>

  <!-- Post -->
  <PostCard onVote={handleVote} {post} />
</div>

{#if browser}
  <VoteMediaDialog
    postId={votePostId}
    type={voteType}
    targetAddress={voteTargetAddress}
    onSubmit={handleVoteSubmit}
    bind:open={voteModalOpen}
  />
{/if}
