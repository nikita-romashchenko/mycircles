<script lang="ts">
  import type {
    Post as PostType,
    CirclesRpcProfile,
    Relation,
  } from "$lib/types"
  import { page } from "$app/stores"
  import { onMount } from "svelte"
  import { browser } from "$app/environment"
  import { invalidate } from "$app/navigation"
  import PostCard from "$components/Post/PostCard.svelte"
  import { Button } from "$lib/components/ui/button"
  import * as Avatar from "$lib/components/ui/avatar/index"
  import UploadMediaDialog from "$lib/components/blocks/dialogs/UploadMediaDialog.svelte"
  import RelationsDialog from "$lib/components/blocks/dialogs/RelationsDialog.svelte"
  import VoteMediaDialog from "$lib/components/blocks/dialogs/VoteMediaDialog.svelte"
  import ImageIcon from "@lucide/svelte/icons/image"
  import { Item } from "$lib/components/ui/breadcrumb"
  import TrustButton from "$lib/components/blocks/TrustButton.svelte"

  const limit = 1
  const ITEMS_PER_LOAD = 20

  let posts = $state<PostType[]>([])
  let profile = $state<CirclesRpcProfile | null>(null)
  let isOwnProfile = $state<boolean>(false)
  let isRpcProfile = $state<boolean>(false)
  let error = $state<string | null>(null)

  let form = $state($page.data.form)

  let relationsModalOpen = $state(false)
  let uploadModalOpen = $state(false)
  let voteModalOpen = $state(false)
  let contents = $state<
    {
      relation: Relation
      profile: CirclesRpcProfile | null
    }[][]
  >([[], [], []])
  let allRelations = $state<Relation[][]>([[], [], []]) // Store all relations without profiles
  let loadedCounts = $state([0, 0, 0]) // Track how many profiles loaded per tab
  let loading = $state(false)
  let loadingRelations = $state(true)
  let loadingMoreProfiles = $state(false)
  let allLoaded = $state(false)
  let sentinel = $state<HTMLDivElement>()
  let votePostId = $state<any>(undefined)
  let voteType = $state<any>(undefined)
  let voteTargetAddress = $state<any>(undefined)
  let isDescriptionExpanded = $state(false)
  let isTrusted = $state(false)

  const MAX_DESCRIPTION_LENGTH = 150

  let skip = $derived(posts.length)

  // Sync with page data
  $effect(() => {
    profile = $page.data.profile as CirclesRpcProfile | null
    posts = $page.data.posts as PostType[]
    isOwnProfile = $page.data.isOwnProfile as boolean
    isRpcProfile = $page.data.isRpcProfile as boolean
    error = $page.data.error as string | null
    form = $page.data.form
  })

  // Debug logging
  $effect(() => {
    console.log("profile:", $page.data.profile)
    console.log("posts:", posts)
    console.log("page.data.posts:", $page.data.posts)
    console.log("isRpcProfile:", isRpcProfile)
    console.log("error:", error)
  })

  async function loadMore() {
    if (loading) return
    loading = true

    try {
      // All profiles are now RPC profiles, use address field
      const address = (profile as CirclesRpcProfile).address

      const str = `/api/posts/user?address=${address}&skip=${skip}&limit=${limit}`
      console.log("Fetching more posts from:", str)
      const res = await fetch(
        `/api/posts/user?address=${address}&skip=${skip}&limit=${limit}`,
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

  $effect(() => {
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: "200px" }, // trigger slightly before reaching bottom
    )

    observer.observe(sentinel)

    return () => observer.disconnect()
  })

  const handleVote = async (postId: string, type: "upVote" | "downVote") => {
    console.log("Voting on post:", postId, "Type:", type)

    // Find the post to get target address
    const post = posts.find((p) => p._id === postId)
    voteTargetAddress = post?.postedToAddress || post?.creatorAddress

    // Open the vote dialog
    voteModalOpen = true
    // Set the form values
    votePostId = postId
    voteType = type
  }

  const handleVoteSubmit = async (
    postId: string,
    type: "upVote" | "downVote",
    balanceChange: number,
  ) => {
    // Optimistically update the post balance
    const postIndex = posts.findIndex((p) => p._id === postId)
    if (postIndex !== -1) {
      const oldBalance = posts[postIndex].balance
      posts[postIndex].balance =
        type === "upVote"
          ? oldBalance + balanceChange
          : oldBalance - balanceChange
    }

    try {
      const response = await fetch("/api/posts/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          type,
          balanceChange,
        }),
      })

      if (!response.ok) {
        // Revert on error
        if (postIndex !== -1) {
          posts[postIndex].balance =
            type === "upVote"
              ? posts[postIndex].balance - balanceChange
              : posts[postIndex].balance + balanceChange
        }
        console.error("Vote failed")
      }
    } catch (err) {
      // Revert on error
      if (postIndex !== -1) {
        posts[postIndex].balance =
          type === "upVote"
            ? posts[postIndex].balance - balanceChange
            : posts[postIndex].balance + balanceChange
      }
      console.error("Error submitting vote:", err)
    }
  }

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

  function sortRelations(
    items: { relation: Relation; profile: CirclesRpcProfile | null }[],
  ) {
    return [...items].sort((a, b) => {
      // Example 1: prioritize items that actually have profiles
      if (a.profile && !b.profile) return -1
      if (!a.profile && b.profile) return 1

      // Example 2: sort alphabetically by displayName if both have profiles
      if (a.profile && b.profile) {
        return a.profile.address.localeCompare(b.profile.address)
      }

      // Example 3: fallback (keep original order)
      return 0
    })
  }

  async function fetchRelations(address: string) {
    try {
      const res = await fetch(`/api/circles/relations?address=${address}`)
      if (!res.ok) throw new Error("Failed to fetch relations")

      const data: Relation[] = await res.json()

      // Check if we trust this profile (if not our own profile)
      if (!isOwnProfile && $page.data.session?.user?.safeAddress) {
        const currentUserAddress = $page.data.session.user.safeAddress
        const trustRelation = data.find(
          (item) =>
            item.relationItem.objectAvatar.toLowerCase() ===
              currentUserAddress.toLowerCase() &&
            (item.relationItem.relation === "trustedBy" ||
              item.relationItem.relation === "mutuallyTrusts"),
        )
        isTrusted = !!trustRelation
      }

      // Sort relations by type (but don't fetch profiles yet)
      const mutuals = data.filter(
        (item) => item.relationItem.relation === "mutuallyTrusts",
      )
      const trustedBy = data.filter(
        (item) => item.relationItem.relation === "trustedBy",
      )
      const trusts = data.filter(
        (item) => item.relationItem.relation === "trusts",
      )

      // Store all relations without profiles
      if (isOwnProfile) {
        allRelations = [mutuals, trustedBy, trusts]
      } else {
        // Merge mutuals into trustedBy and trusts for non-own profiles
        const trustedByWithMutuals = [...trustedBy, ...mutuals]
        const trustsWithMutuals = [...trusts, ...mutuals]
        allRelations = [trustedByWithMutuals, trustsWithMutuals]
      }

      // Initialize contents arrays with empty profiles
      contents = allRelations.map((tabRelations) =>
        tabRelations.map((relation) => ({
          relation,
          profile: null,
        })),
      )

      // Load initial batch of profiles for each tab
      loadedCounts = [0, 0, 0]
      await Promise.all(
        allRelations.map((_, tabIndex) => loadMoreRelationProfiles(tabIndex)),
      )
    } catch (err) {
      console.error("Error fetching relations:", err)
    } finally {
      loadingRelations = false
    }
  }

  async function loadMoreRelationProfiles(tabIndex: number) {
    if (loadingMoreProfiles) return
    if (loadedCounts[tabIndex] >= allRelations[tabIndex].length) return

    loadingMoreProfiles = true
    try {
      const start = loadedCounts[tabIndex]
      const end = Math.min(
        start + ITEMS_PER_LOAD,
        allRelations[tabIndex].length,
      )
      const relationsToLoad = allRelations[tabIndex].slice(start, end)

      // Extract addresses to fetch
      const addresses = relationsToLoad.map(
        (item) => item.relationItem.objectAvatar,
      )

      // Fetch profiles for this batch
      const profilesResponse = await fetch("/api/circles/batchProfiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addresses }),
      })
      const { profiles } = (await profilesResponse.json()) as {
        profiles: (CirclesRpcProfile | null)[]
      }

      // Build a quick lookup map from address → profile
      const profileMap = new Map(
        profiles.map((p) => [p?.address.toLowerCase(), p]),
      )

      // Update contents with loaded profiles
      for (let i = start; i < end; i++) {
        const relation = allRelations[tabIndex][i]
        const profile =
          profileMap.get(relation.relationItem.objectAvatar.toLowerCase()) ||
          null
        contents[tabIndex][i] = { relation, profile }
      }

      // Update loaded count
      loadedCounts[tabIndex] = end
    } catch (err) {
      console.error("Error loading more profiles:", err)
    } finally {
      loadingMoreProfiles = false
    }
  }
  async function handleTrust() {
    if (!profile) return

    try {
      const response = await fetch("/api/circles/trust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetAddress: (profile as CirclesRpcProfile).address,
        }),
      })

      console.log("handleTrust: ", response.ok)

      if (response.ok) {
        // Refresh relations to update counts
        await fetchRelations((profile as CirclesRpcProfile).address)
        isTrusted = true
      }
    } catch (err) {
      console.error("Error trusting user:", err)
    }
  }

  async function handleUntrust() {
    if (!profile) return

    try {
      const response = await fetch("/api/circles/untrust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetAddress: (profile as CirclesRpcProfile).address,
        }),
      })
      console.log("handleUntrust: ", response.ok)

      if (response.ok) {
        // Refresh relations to update counts
        await fetchRelations((profile as CirclesRpcProfile).address)
        isTrusted = false
      }
    } catch (err) {
      console.error("Error untrusting user:", err)
    }
  }

  $effect(() => {
    console.log("Form:", form)
  })

  $effect(() => {
    // All profiles are now RPC profiles
    if (browser && profile) {
      const address = (profile as CirclesRpcProfile).address
      if (address) {
        fetchRelations(address)
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
    <div class="flex flex-col">
      <div
        class="flex flex-col items-center justify-center md:flex-row md:items-start md:justify-start mx-auto gap-6"
      >
        <div class="flex flex-col items-center">
          <Avatar.Root class="relative w-24 h-24 rounded-full object-cover">
            <Avatar.Fallback class="w-24 h-24 rounded-full object-cover"
              ><ImageIcon /></Avatar.Fallback
            >
            <Avatar.Image
              src={(profile as CirclesRpcProfile).previewImageUrl}
              alt="@shadcn"
              class="w-24 h-24 rounded-full object-cover"
            />
          </Avatar.Root>
          {#if !isOwnProfile && $page.data.session?.user?.safeAddress && !loadingRelations}
            <TrustButton
              class="mt-2"
              {isTrusted}
              onTrust={handleTrust}
              onUntrust={handleUntrust}
            />
          {/if}
        </div>

        <div class="flex flex-col text-center md:text-left gap-1 md:w-[320px]">
          <p>{(profile as CirclesRpcProfile).name || "Anonymous"}</p>
          {#if isOwnProfile}
            <span class="text-xs text-blue-500">(Your Profile)</span>
          {/if}
          <hr />
          {#if (profile as CirclesRpcProfile).description}
            {@const description =
              (profile as CirclesRpcProfile).description || ""}
            {@const isTooLong = description.length > MAX_DESCRIPTION_LENGTH}
            {@const displayText = isDescriptionExpanded
              ? description
              : isTooLong
                ? description.slice(0, MAX_DESCRIPTION_LENGTH) + "..."
                : description}
            <div class="text-gray-500 text-xs break-words max-w-xs">
              <p class="transition-all duration-300">
                {displayText}
              </p>
              {#if isTooLong}
                <button
                  onclick={() =>
                    (isDescriptionExpanded = !isDescriptionExpanded)}
                  class="text-blue-500 hover:text-blue-700 text-xs mt-1"
                >
                  {isDescriptionExpanded ? "Show less" : "Show more"}
                </button>
              {/if}
            </div>
          {/if}
        </div>

        <button
          onclick={openRelationsModal}
          class="flex flex-row gap-6 cursor-pointer"
        >
          {#if isOwnProfile}
            <div class="flex flex-col">
              <p>mutuals</p>
              <p>{contents[0]?.length || 0}</p>
            </div>
            <div class="flex flex-col">
              <p>trusters</p>
              <p>{contents[1]?.length || 0}</p>
            </div>
            <div class="flex flex-col">
              <p>trustouts</p>
              <p>{contents[2]?.length || 0}</p>
            </div>
          {:else}
            <div class="flex flex-col">
              <p>trusters</p>
              <p>{contents[0]?.length || 0}</p>
            </div>
            <div class="flex flex-col">
              <p>trustouts</p>
              <p>{contents[1]?.length || 0}</p>
            </div>
          {/if}
        </button>
      </div>
      <hr class="mt-4 hidden md:block" />
    </div>

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
          <PostCard onVote={handleVote} {post} />
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
      tabs={isOwnProfile
        ? ["mutuals", "trusters", "trustouts"]
        : ["trusters", "trustouts"]}
      onLoadMore={loadMoreRelationProfiles}
      {loadedCounts}
      totalCounts={allRelations.map((tab) => tab.length)}
      {loadingMoreProfiles}
    />
    <UploadMediaDialog pageForm={form} bind:open={uploadModalOpen} />
    <VoteMediaDialog
      postId={votePostId}
      type={voteType}
      targetAddress={voteTargetAddress}
      onSubmit={handleVoteSubmit}
      bind:open={voteModalOpen}
    />
  {/if}
{/if}
