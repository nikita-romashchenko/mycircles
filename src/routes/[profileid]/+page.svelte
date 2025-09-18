<script lang="ts">
  import { page } from "$app/stores"
  import { onMount } from "svelte"

  let posts = $page.data.posts || []
  let profile = $page.data.profile || undefined

  let file: any

  async function handleUpload(e: Event) {
    file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()
    console.log("File uploaded at:", data.mediaItem.url)
  }
</script>

<!-- User info section -->
<div class="container flex flex-row gap-6">
  <img
    alt="User avatar"
    src={$page.data?.session?.user?.image}
    class="rounded-2xl"
  />
  <div class="flex flex-col">
    <p>{$page.data.session?.user.name}</p>
    <p class="text-gray-500">@{$page.data.session?.user.username}</p>
    <hr />
    <p class="text-gray-500">{$page.data.session?.user.profileId}</p>
  </div>
  <div class="flex flex-col">
    <p>followers</p>
    <p>{Math.floor(Math.random() * 1000)}</p>
  </div>
  <div class="flex flex-col">
    <p>following</p>
    <p>{Math.floor(Math.random() * 1000)}</p>
  </div>
</div>
<!-- Upload bttn section -->
<div class="my-4 flex flex-row justify-center items-center">
  <div class="flex flex-col items-center justify-center mt-4">
    <input
      id="file-upload"
      type="file"
      class="hidden"
      on:change={handleUpload}
    />
    <label
      for="file-upload"
      class="cursor-pointer bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
    >
      Upload File
    </label>
    {#if file}
      <p class="mt-2 text-gray-700 text-sm">Selected: {file.name}</p>
    {/if}
  </div>
</div>
<!-- User posts section -->
<div class="grid grid-cols-3 gap-4">
  {#each posts as post}
    {#if post.mediaItems.length > 0}
      <!-- TODO: Replace with Post svelte component so that it accepts post variable and displays image/video/album correctly-->
      <img
        class="w-full aspect-square object-cover rounded"
        src={post.mediaItems[0].url}
        alt={`Post ${post._id}`}
      />
    {/if}
  {/each}
</div>
