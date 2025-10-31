<script lang="ts">
  import type { Post as PostType } from "$lib/types"
  import { page } from "$app/stores"
  import PostCard from "$components/Post/PostCard.svelte"
  import VoteMediaDialog from "$lib/components/blocks/dialogs/VoteMediaDialog.svelte"
  import { onMount } from "svelte"
  import { globalState } from "$lib/stores/state.svelte"
  import { browser } from "$app/environment"
  import { DEFAULT_LIMIT } from "$lib/constants"

  let posts: PostType[] = []
  let loading = false
  let allLoaded = false
  let voteModalOpen = false
  let votePostId: any
  let voteType: any
  let voteTargetAddress: any

  $: posts = $page.data.posts
  $: relations = $page.data.relationsWithProfiles

  $: skip = posts.length

  onMount(() => {
    // set data
    console.log("Setting relation data in global state:", globalState.relations)
    globalState.relations = relations
    console.log("Current relation data in global state:", globalState.relations)
  })

  const handleVote = async (postId: string, type: "upVote" | "downVote") => {
    console.log("Voting on post:", postId, "Type:", type)

    // Find the post to get target address
    const post = posts.find((p) => p._id === postId)
    voteTargetAddress = post?.postedToAddress || post?.creatorAddress

    voteModalOpen = true
    votePostId = postId
    voteType = type
  }

  const handleVoteSubmit = async (
    postId: string,
    type: "upVote" | "downVote",
    balanceChange: number,
  ) => {
    // Optimistically update the post balance
    const postIndex = posts.findIndex((p) => p._id === postId)
    if (postIndex !== -1) {
      const oldBalance = posts[postIndex].balance
      posts[postIndex].balance =
        type === "upVote"
          ? oldBalance + balanceChange
          : oldBalance - balanceChange
    }

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
        if (postIndex !== -1) {
          posts[postIndex].balance =
            type === "upVote"
              ? posts[postIndex].balance - balanceChange
              : posts[postIndex].balance + balanceChange
        }
        console.error("Vote failed")
      }
    } catch (err) {
      // Revert on error
      if (postIndex !== -1) {
        posts[postIndex].balance =
          type === "upVote"
            ? posts[postIndex].balance - balanceChange
            : posts[postIndex].balance + balanceChange
      }
      console.error("Error submitting vote:", err)
    }
  }

  async function loadMore() {
    if (loading) return
    loading = true

    try {
      const str = `/api/posts?skip=${skip}&limit=${DEFAULT_LIMIT}`
      console.log("Fetching more posts from:", str)
      const res = await fetch(str)
      const data = await res.json()

      console.log("SERVER Fetched posts:", data)
      console.log("SERVER data.success:", data.success)
      console.log("SERVER data.posts.length:", data.posts.length)

      if (!res.ok || !data.posts.length) {
        allLoaded = true
      } else {
        posts = [...posts, ...data.posts]
        allLoaded = false
        console.log("Loaded more posts, total now:", posts.length)
      }
    } catch (err) {
      console.error(err)
    } finally {
      loading = false
    }
  }

  let sentinel: HTMLDivElement

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: "200px" }, // trigger slightly before reaching bottom
    )

    if (sentinel) observer.observe(sentinel)

    return () => observer.disconnect()
  })
</script>

<main class="flex-1 max-w-4xl mx-auto p-4">
  <h1 class="text-3xl font-bold mb-6">All Posts</h1>

  {#if posts.length === 0}
    <p class="text-gray-500">No posts available.</p>
  {/if}

  <div class="space-y-8">
    {#each posts as post}
      <PostCard onVote={handleVote} {post} />
    {/each}
  </div>
  <div bind:this={sentinel} class="h-8"></div>

  {#if loading}
    <p class="text-center mt-4 text-gray-500">Loading...</p>
  {/if}

  {#if allLoaded}
    <p class="text-center mt-4 text-gray-500">No more posts</p>
  {/if}
</main>

{#if browser}
  <VoteMediaDialog
    postId={votePostId}
    type={voteType}
    targetAddress={voteTargetAddress}
    onSubmit={handleVoteSubmit}
    bind:open={voteModalOpen}
  />
{/if}
