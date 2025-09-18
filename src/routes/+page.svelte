<script lang="ts">
  import type { Post as PostType } from "$lib/types"
  import { page } from "$app/stores"

  let posts: PostType[] | [] = $page.data.posts || []

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString()
</script>

<main class="flex-1 max-w-4xl mx-auto p-4">
  <h1 class="text-3xl font-bold mb-6">All Posts</h1>

  {#if posts.length === 0}
    <p class="text-gray-500">No posts available.</p>
  {/if}

  <div class="space-y-8">
    {#each posts as post}
      <div class="border rounded-lg p-4 shadow-sm">
        <div class="mb-2 text-gray-600 text-sm">
          <span>User ID: {post.userId}</span> &middot;
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
      </div>
    {/each}
  </div>
</main>

<!-- <style>
  main {
    flex: 1;
  }
</style> -->
