<script lang="ts">
  import type { Post as PostType } from "$lib/types"
  import { page } from "$app/stores"
  import PostCard from "$components/Post/PostCard.svelte"
  import { browser } from "$app/environment"
  import { globalState } from "$lib/stores/state.svelte"

  const DEFAULT_LIMIT = 10

  let posts = $state<PostType[]>([])
  let loading = $state(false)
  let allLoaded = $state(false)
  let isLoggedIn = $state(false)
  let initialPostsLoaded = $state(false)

  let skip = $derived(posts.length)

  // Sync with page data
  $effect(() => {
    posts = $page.data.posts
    isLoggedIn = $page.data.isLoggedIn
    globalState.relations = $page.data.relationsWithProfiles
  })

  // Load initial posts after page renders (non-blocking)
  $effect(() => {
    if (browser && !initialPostsLoaded) {
      initialPostsLoaded = true
      loadInitialPosts()
    }
  })

  async function loadInitialPosts() {
    if (loading) return
    loading = true

    try {
      const str = `/api/posts?skip=0&limit=${DEFAULT_LIMIT}`
      console.log("Loading initial posts from:", str)
      const res = await fetch(str)
      const data = await res.json()

      console.log("Initial posts loaded:", data)

      if (res.ok && data.posts && data.posts.length > 0) {
        posts = data.posts
        allLoaded = data.posts.length < DEFAULT_LIMIT
      } else {
        allLoaded = true
      }
    } catch (err) {
      console.error("Error loading initial posts:", err)
    } finally {
      loading = false
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

  let sentinel = $state<HTMLDivElement>()

  $effect(() => {
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: "200px" }, // trigger slightly before reaching bottom
    )

    observer.observe(sentinel)

    return () => observer.disconnect()
  })
</script>

<main class="flex-1 max-w-4xl mx-auto p-4">
  <h1 class="text-3xl font-bold mb-6">All Posts</h1>

  {#if posts.length === 0 && !loading && initialPostsLoaded}
    <p class="text-gray-500">No posts available.</p>
  {/if}

  <div class="space-y-3">
    {#each posts as post}
      <PostCard {post} />
    {/each}
  </div>
  <div bind:this={sentinel} class="h-8"></div>

  {#if loading}
    <p class="text-center mt-4 text-gray-500">Loading...</p>
  {/if}

  {#if allLoaded && posts.length > 0}
    <p class="text-center mt-4 text-gray-500">No more posts</p>
  {/if}
</main>
