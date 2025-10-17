<script lang="ts">
  import { run } from "svelte/legacy"

  import type {
    Post as PostType,
    Profile as ProfileType,
    CirclesRpcProfile,
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
  let profile: ProfileType | CirclesRpcProfile | null
  let isOwnProfile: boolean
  let isRpcProfile: boolean = false
  let error: string | null = null

  let form = $page.data.form
  let relationsModalOpen = false
  let uploadModalOpen = false
  let contents: Relation[][] = [[], [], []]
  let loading = false
  let allLoaded = false
  let sentinel: HTMLDivElement

  $: profile = $page.data.profile as ProfileType | CirclesRpcProfile | null
  $: posts = $page.data.posts as PostType[]
  $: skip = posts.length
  $: isOwnProfile = $page.data.isOwnProfile as boolean
  $: isRpcProfile = $page.data.isRpcProfile as boolean
  $: error = $page.data.error as string | null
  $: console.log("posts:", posts)
  $: console.log("page.data.posts:", $page.data.posts)
  $: console.log("isRpcProfile:", isRpcProfile)
  $: console.log("error:", error)

  async function loadMore() {
    if (loading || isRpcProfile) return // Don't load more for RPC profiles
    loading = true

    try {
      const profileId = (profile as ProfileType)._id
      const str = `/api/posts/user?userid=${profileId}&skip=${skip}&limit=${limit}`
      console.log("Fetching more posts from:", str)
      const res = await fetch(
        `/api/posts/user?userid=${profileId}&skip=${skip}&limit=${limit}`,
      )
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
    if (browser && profile && !isRpcProfile) {
      const safeAddr = (profile as ProfileType).safeAddress
      if (safeAddr) {
        fetchRelations(safeAddr)
      }
    } else if (browser && profile && isRpcProfile) {
      const rpcAddr = (profile as CirclesRpcProfile).address
      if (rpcAddr) {
        fetchRelations(rpcAddr)
      }
    }
  })
</script>

<!-- Error screen -->
{#if error}
  <div class="w-full max-w-3xl">
    <div class="flex flex-col items-center justify-center p-8 text-center">
      <p class="text-2xl text-gray-600 mb-4">{error}</p>
    </div>
  </div>
{:else if profile}
  <div class="w-full max-w-3xl">
    <!-- User info section -->
    {#if isOwnProfile}
      <div class="flex flex-col items-center justify-center md:flex-row gap-6">
        <img
          alt="User avatar"
          src={$page.data?.session?.user?.image}
          class="w-24 h-24 rounded-full object-cover"
        />
        <div class="flex flex-col text-center md:text-left">
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
      <div class="flex flex-col items-center justify-center md:flex-row gap-6">
        <img
          alt="User avatar"
          src={isRpcProfile
            ? ((profile as CirclesRpcProfile).previewImageUrl || "https://picsum.photos/200")
            : ((profile as ProfileType).avatarImageUrl || "https://picsum.photos/200")}
          class="w-24 h-24 rounded-full object-cover"
        />
        <div class="flex flex-col text-center md:text-left gap-1">
          <p>{isRpcProfile ? ((profile as CirclesRpcProfile).name || "Anonymous") : (profile as ProfileType).name}</p>
          {#if !isRpcProfile}
            <p class="text-gray-500">@{(profile as ProfileType).username}</p>
          {/if}
          <hr />
          <p class="text-gray-500 text-xs break-all">
            {isRpcProfile ? (profile as CirclesRpcProfile).address : (profile as ProfileType)._id}
          </p>
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

    <!-- User posts section -->
    <div class="flex-1 mx-auto p-4 w-full">
      {#if posts.length === 0}
        <p class="text-center mt-4 text-gray-500">No posts available</p>
      {/if}

      <div class="space-y-8">
        {#each posts as post (post._id)}
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
    </div>
  </div>

  {#if browser}
    <RelationsDialog
      bind:open={relationsModalOpen}
      onLinkClick={handleLinkClick}
      {contents}
    />
    <UploadMediaDialog pageForm={form} bind:open={uploadModalOpen} />
  {/if}
{/if}
