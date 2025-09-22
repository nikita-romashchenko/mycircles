<script lang="ts">
  import { page } from "$app/stores"
  import type { Post as PostType } from "$lib/types"
  import type { Profile as ProfileType } from "$lib/types"

  $: post = $page.data.post as PostType
  $: profile = $page.data.profile as ProfileType
  $: isOwnProfile = $page.data.isOwnProfile as boolean
</script>

<div class="max-w-xl mx-auto p-4">
  <!-- User info -->
  <div class="flex items-center gap-3 mb-4">
    {#if isOwnProfile}
      <img
        src={$page.data.session?.user.image}
        alt={`${profile.username}'s avatar`}
        class="w-12 h-12 rounded-full object-cover"
      />
    {:else}
      <img
        src={profile.avatarImageUrl || "https://picsum.photos/200"}
        alt={`${profile.username ?? profile.name}'s avatar`}
        class="w-12 h-12 rounded-full object-cover"
      />
    {/if}
    <div>
      <h2 class="font-semibold text-lg">{profile.name}</h2>
      <p class="text-gray-500 text-sm">@{profile.username}</p>
    </div>
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
        <!-- svelte-ignore a11y-media-has-caption -->
        <video src={post.mediaItems[0].url} controls class="w-full" />
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
      <p class="p-3 text-sm">{post.caption}</p>
    {/if}

    <!-- Post meta -->
    <div
      class="flex justify-between items-center px-3 py-2 text-gray-500 text-sm border-t"
    >
      <span>{post.likesCount} likes</span>
      <span>{post.repostsCount} reposts</span>
      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
    </div>
  </div>
</div>
