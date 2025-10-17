<script lang="ts">
  import { invalidate } from "$app/navigation"
  import { page } from "$app/stores"
  import CaptionViewer from "$lib/components/blocks/svelte-lexical/caption-editor/caption-viewer.svelte"
  import { Button } from "$lib/components/ui/button"
  import type { Post as PostType, CirclesRpcProfile } from "$lib/types"
  import { theme } from "svelte-lexical/dist/themes/default"

  let liked = $state($page.data.post?.isLiked)

  let post = $derived($page.data.post as PostType)
  let profile = $derived($page.data.profile as CirclesRpcProfile)
  let isOwnProfile = $derived($page.data.isOwnProfile as boolean)

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

      invalidate("like")
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

      invalidate("like")
    }

    liked = !liked
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
  <div class="border rounded-lg overflow-hidden shadow-sm">
    {#if post.type === "image"}
      {#if post.mediaItems.length > 0}
        <img
          src={post.mediaItems[0].url}
          alt="Post"
          class="w-full object-cover"
        />
      {/if}
    {:else if post.type === "video"}
      {#if post.mediaItems.length > 0}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video src={post.mediaItems[0].url} controls class="w-full"></video>
      {/if}
    {:else if post.type === "album"}
      <div class="grid grid-cols-2 gap-2 p-2">
        {#each post.mediaItems as media}
          <img
            src={media.url}
            alt="Album"
            class="w-full h-40 object-cover rounded"
          />
        {/each}
      </div>
    {/if}

    <!-- Caption -->
    {#if post.caption}
      <div class="p-2">
        <CaptionViewer {theme} captionJSONstring={post.caption} />
      </div>
    {/if}

    <!-- Post meta -->
    <div
      class="flex justify-between items-center px-3 py-2 text-gray-500 text-sm border-t"
    >
      {#if liked}
        <Button onclick={handleLike}>Liked</Button>
      {:else}
        <Button variant={"outline"} onclick={handleLike}>Like</Button>
      {/if}

      <span>{post.likesCount} likes</span>
      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
    </div>
  </div>
</div>
