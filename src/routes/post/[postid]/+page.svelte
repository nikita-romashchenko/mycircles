<script lang="ts">
  import { page } from "$app/stores"
  import PostCard from "$components/Post/PostCard.svelte"
  import type { Post as PostType, CirclesRpcProfile } from "$lib/types"

  let basePost = $derived($page.data.post as PostType)
  let profile = $derived($page.data.profile as CirclesRpcProfile)
  let isOwnProfile = $derived($page.data.isOwnProfile as boolean)
  let post = $derived(basePost)
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
  <PostCard {post} />
</div>
