<script lang="ts">
  import type {
    Post as PostType,
    Profile as ProfileType,
    Relation,
  } from "$lib/types"
  import { page } from "$app/stores"
  import { onMount } from "svelte"
  import RelationsModal from "$components/Modal/RelationsModal/RelationsModal.svelte"

  let open = false
  let posts: PostType[] | [] = $page.data.posts || []
  let profile: ProfileType = $page.data.profile
  let file: any
  let contents: Relation[][] = [[], [], []]

  onMount(async () => {
    try {
      const res = await fetch(
        `/api/circles/relations?address=${profile.safeAddress}`,
      )
      if (!res.ok) throw new Error("Failed to fetch relations")

      const data: Relation[] = await res.json()
      const mutuals = data.filter(
        (item: any) => item.relation === "mutuallyTrusts",
      )
      const trustedBy = data.filter(
        (item: any) => item.relation === "trustedBy",
      )
      const trusts = data.filter((item: any) => item.relation === "trusts")
      contents = [mutuals || [], trustedBy || [], trusts || []]
    } catch (err) {
      console.error("Error fetching relations:", err)
    }
  })

  const openModal = () => {
    open = true
  }

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

  async function fetchRelations() {}
</script>

<!-- TODO: add something like a spinner if no profile or error screen -->
{#if profile}
  <div>
    <!-- User info section -->
    <div class="flex flex-row gap-6">
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
      <button on:click={openModal} class="flex flex-row gap-6 cursor-pointer">
        <div class="flex flex-col">
          <p>mutuals</p>
          <p>{contents[0].length}</p>
        </div>
        <div class="flex flex-col">
          <p>trusted by</p>
          <p>{contents[1].length}</p>
        </div>
        <div class="flex flex-col">
          <p>trusts</p>
          <p>{contents[2].length}</p>
        </div>
      </button>
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
  </div>

  <RelationsModal bind:open {contents} />{/if}
