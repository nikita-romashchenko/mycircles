<script lang="ts">
  import type { Post } from "$lib/types"

  interface Props {
    post: Post;
    showActions?: boolean;
  }

  let { post, showActions = true }: Props = $props();

  let liked = false
  let reposted = false

  async function handleLike() {
    if (!liked) {
      try {
        await fetch("/api/interactions/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: post._id }),
        })
      } catch (err) {
        console.error("Error liking post", err)
      }
    } else {
      try {
        await fetch("/api/interactions/like", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: post._id }),
        })
      } catch (err) {
        console.error("Error unliking post", err)
      }
    }

    liked = !liked
  }

  let mainMedia = $derived(post?.mediaItems?.[0])
</script>

{#if post}
  <article
    class="max-w-3xl mx-auto my-4 border rounded-lg bg-white shadow-sm overflow-hidden"
  >
    <header
      class="flex justify-between items-center px-4 py-2 text-gray-700 text-sm"
    >
      <div class="font-medium">{post.userId}</div>
      <time datetime={post.createdAt}
        >{new Date(post.createdAt).toLocaleString()}</time
      >
    </header>

    <section>
      <!-- TODO: Add video support -->
      <!-- {#if post.type === "video"}
        {#if mainMedia}
          <video
            class="w-full rounded-md"
            controls
            playsinline
            preload="metadata"
            poster={mainMedia.poster}
          >
            <source src={mainMedia.url} type="video/mp4" />
          </video>
        {/if} -->
      <!-- TODO: Think of a better way to add alt to img for better SEO / indexing -->
      {#if post.type === "image"}
        {#if mainMedia}
          <a href="/{post.userId}/p/{post._id}">
            <img
              class="w-full cursor-pointer"
              src={mainMedia.url}
              alt={post.caption ?? "Post image"}
              loading="lazy"
            />
          </a>
        {/if}
      {:else if post.type === "album"}
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {#each post.mediaItems as m}
            <img
              class="w-full h-32 object-cover cursor-pointer"
              src={m.url}
              alt={post.caption ?? "Album image"}
              loading="lazy"
            />
          {/each}
        </div>
      {/if}
    </section>

    {#if post.caption}
      <section class="px-4 pt-4 pb-4 text-gray-800">
        <p>{post.caption}</p>
      </section>
    {/if}
  </article>
{/if}
