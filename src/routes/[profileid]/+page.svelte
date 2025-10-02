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
  import PostCard from "$components/Post/PostCard.svelte"
  import { Button } from "$lib/components/ui/button"
  import UploadMediaDialog from "$lib/components/blocks/dialogs/UploadMediaDialog.svelte"
  import RelationsDialog from "$lib/components/blocks/dialogs/RelationsDialog.svelte"

  const limit = 1

  let posts: PostType[] = []
  let profile: ProfileType
  let isOwnProfile: boolean

  let form = $page.data.form
  let relationsModalOpen = false
  let uploadModalOpen = false
  let contents: Relation[][] = [[], [], []]
  let loading = false
  let allLoaded = false
  let sentinel: HTMLDivElement

  $: profile = $page.data.profile as ProfileType
  $: posts = $page.data.posts as PostType[]
  $: skip = posts.length
  $: isOwnProfile = $page.data.isOwnProfile as boolean
  $: console.log("posts:", posts)
  $: console.log("page.data.posts:", $page.data.posts)

  async function loadMore() {
    if (loading) return
    loading = true

    try {
      const str = `/api/posts/user?userid=${profile._id}&skip=${skip}&limit=${limit}`
      console.log("Fetching more posts from:", str)
      const res = await fetch(
        `/api/posts/user?userid=${profile._id}&skip=${skip}&limit=${limit}`,
      )
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
        <div class="flex flex-col items-center justify-center mt-4">
          <!-- svelte-ignore a11y_consider_explicit_label -->
          <Button
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
          </Button>
        </div>
      </div>
    {/if}

    <!-- User posts section -->
    <div class="flex-1 max-w-4xl mx-auto p-4">
      {#if posts.length === 0}
        <p class="text-gray-500">No posts available.</p>
      {/if}

      <div class="space-y-8">
        {#each posts as post (post._id)}
          <PostCard {post} session={$page.data.session} />
        {/each}
      </div>
      <div bind:this={sentinel} class="h-8"></div>

      {#if loading}
        <p class="text-center mt-4 text-gray-500">Loading...</p>
      {/if}

      {#if allLoaded}
        <p class="text-center mt-4 text-gray-500">No more posts</p>
      {/if}
    </div>
  </div>

  <!-- <RelationsModal
    bind:open={relationsModalOpen}
    onLinkClick={handleLinkClick}
    {contents}
  /> -->

  <RelationsDialog
    bind:open={relationsModalOpen}
    onLinkClick={handleLinkClick}
    {contents}
  />
  <!-- <UploadMediaModal pageForm={form} bind:open={uploadModalOpen} /> -->
  <UploadMediaDialog pageForm={form} bind:open={uploadModalOpen} />
{/if}
