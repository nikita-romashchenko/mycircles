<script lang="ts">
  import type { Post as PostType } from "$lib/types"
  import { page } from "$app/stores"
  import PostCard from "$components/Post/PostCard.svelte"
  import { onMount } from "svelte"

  let posts: PostType[] = $state($page.data.posts)
  const limit = 5
  let loading = $state(false)
  let allLoaded = $state(false)

  let skip = $derived(posts.length)

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

  let sentinel: HTMLDivElement = $state()

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
      <!-- <div class="rounded-lg p-4 shadow-md">
        <div class="mb-2 text-gray-600 text-sm">
          <a href={`/${post.userId}`} class="text-blue-600"
            >User ID: {post.userId}</a
          >
          &middot;
          <span>Created: {formatDate(post.createdAt)}</span>
        </div>

        <div class="mb-4 space-y-2">
          {#each post.mediaItems as media}
            <img
              src={media.url}
              alt="Post media"
              class="w-full max-h-96 object-cover rounded-md"
            />
          {/each}
        </div>

        {#if post.caption}
          <p class="text-gray-800">{post.caption}</p>
        {/if}
      </div> -->
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

<!-- <style>
  main {
    flex: 1;
  }
</style> -->
