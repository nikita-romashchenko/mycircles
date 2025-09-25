<script lang="ts">
  import { run } from "svelte/legacy"

  import type {
    Post as PostType,
    Profile as ProfileType,
    Relation,
  } from "$lib/types"
  import { page } from "$app/stores"
  import { onMount } from "svelte"
  import RelationsModal from "$components/Modal/RelationsModal/RelationsModal.svelte"
  import UploadMediaModal from "$components/Modal/UploadMediaModal/UploadMediaModal.svelte"
  import { browser } from "$app/environment"
  import { invalidate } from "$app/navigation"

  let form = $page.data.form
  let relationsModalOpen = $state(false)
  let uploadModalOpen = $state(false)
  let file: any = $state()
  let contents: Relation[][] = $state([[], [], []])

  // RelationsModal state
  const openRelationsModal = () => {
    relationsModalOpen = true
  }

  const handleLinkClick = () => {
    relationsModalOpen = false
  }

  // UploadMediaModal state
  const openUploadMediaModal = () => {
    console.log("Opening upload modal")
    uploadModalOpen = true
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
    await invalidate("posts")
  }

  function sortRelations(relations: Relation[]): Relation[] {
    return [...relations].sort((a, b) => {
      if (a.profile && !b.profile) return -1
      if (!a.profile && b.profile) return 1
      return 0
    })
  }

  async function fetchRelations(address: string) {
    try {
      const res = await fetch(`/api/circles/relations?address=${address}`)
      if (!res.ok) throw new Error("Failed to fetch relations")

      const data: Relation[] = await res.json()
      const mutuals = sortRelations(
        data.filter((item) => item.relationItem.relation === "mutuallyTrusts"),
      )
      const trustedBy = sortRelations(
        data.filter((item) => item.relationItem.relation === "trustedBy"),
      )
      const trusts = sortRelations(
        data.filter((item) => item.relationItem.relation === "trusts"),
      )
      contents = [mutuals || [], trustedBy || [], trusts || []]
    } catch (err) {
      console.error("Error fetching relations:", err)
    }
  }
  run(() => {
    console.log("Form:", form)
  })
  let posts = $derived($page.data.posts as PostType[])
  let profile = $derived($page.data.profile as ProfileType)
  let isOwnProfile = $derived($page.data.isOwnProfile as boolean)
  run(() => {
    if (browser && profile?.safeAddress) {
      fetchRelations(profile.safeAddress)
    }
  })
</script>

<!-- TODO: add something like a spinner if no profile or error screen -->
{#if profile}
  <div>
    <!-- User info section -->
    {#if isOwnProfile}
      <div class="flex flex-row gap-6">
        <img
          alt="User avatar"
          src={$page.data?.session?.user?.image}
          class="w-24 h-24 rounded-full object-cover"
        />
        <div class="flex flex-col">
          <p>{$page.data.session?.user.name}</p>
          <p class="text-gray-500">@{$page.data.session?.user.username}</p>
          <hr />
          <p class="text-gray-500">{$page.data.session?.user.profileId}</p>
        </div>
        <button
          onclick={openRelationsModal}
          class="flex flex-row gap-6 cursor-pointer"
        >
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
    {:else}
      <div class="flex flex-row gap-6">
        <img
          alt="User avatar"
          src={profile.avatarImageUrl || "https://picsum.photos/200"}
          class="w-24 h-24 rounded-full object-cover"
        />
        <div class="flex flex-col">
          <p>{profile.name}</p>
          <p class="text-gray-500">@{profile.username}</p>
          <hr />
          <p class="text-gray-500">{profile._id}</p>
        </div>
        <button
          onclick={openRelationsModal}
          class="flex flex-row gap-6 cursor-pointer"
        >
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
    {/if}

    <!-- Upload bttn section -->
    {#if isOwnProfile}
      <div class="mt-4 flex flex-row justify-center items-center gap-10">
        <!-- TODO: Remove old upload functionality -->
        <div class="flex flex-col items-center justify-center mt-4">
          <input
            id="file-upload"
            type="file"
            class="hidden"
            onchange={handleUpload}
          />
          <label
            for="file-upload"
            class="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </label>
          <!-- <label
            for="file-upload"
            class="cursor-pointer bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
          >
            Upload File
          </label> -->
          {#if file}
            <p class="mt-2 text-gray-700 text-sm">Selected: {file.name}</p>
          {/if}
        </div>
        <div class="flex flex-col items-center justify-center mt-4">
          <!-- svelte-ignore a11y_consider_explicit_label -->
          <button
            class="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            onclick={openUploadMediaModal}
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>
    {/if}

    <!-- User posts section -->
    <div class="mt-4 grid grid-cols-3 gap-4">
      {#if isOwnProfile}
        <div
          class="w-full aspect-square object-cover rounded border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer text-gray-300"
        >
          <svg
            class="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
      {/if}

      {#each posts as post}
        {#if post.mediaItems.length > 0}
          <!-- TODO: Replace with Post svelte component so that it accepts post variable and displays image/video/album correctly-->
          <a href="/{post.userId}/p/{post._id}">
            <img
              class="w-full aspect-square object-cover rounded"
              src={post.mediaItems[0].url}
              alt={`Post ${post._id}`}
            />
          </a>
        {/if}
      {/each}
    </div>
  </div>

  <RelationsModal
    bind:open={relationsModalOpen}
    onLinkClick={handleLinkClick}
    {contents}
  />
  <UploadMediaModal pageForm={form} bind:open={uploadModalOpen} />
{/if}
