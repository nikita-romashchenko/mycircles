<script lang="ts">
  import type { Post as PostType } from "$lib/types"
  import { page } from "$app/stores"
  import PostCard from "$components/Post/PostCard.svelte"
  import { onMount } from "svelte"

  let posts: PostType[] = []
  const limit = 5
  let loading = false
  let allLoaded = false

  $: posts = $page.data.posts
  $: skip = posts.length

  async function loadMore() {
    if (loading) return
    loading = true

    try {
      const res = await fetch(`/api/posts?skip=${skip}&limit=${limit}`)
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
      <PostCard {post} />
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
