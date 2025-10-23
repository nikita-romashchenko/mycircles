<script lang="ts">
  import { run } from "svelte/legacy"

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

  const limit = 1

  let posts: PostType[] = []
  let profile: CirclesRpcProfile | null
  let isOwnProfile: boolean
  let isRpcProfile: boolean = false
  let error: string | null = null

  let form = $page.data.form

  let relationsModalOpen = false
  let uploadModalOpen = false
  let voteModalOpen = false
  let contents: {
    relation: Relation
    profile: CirclesRpcProfile | null
  }[][] = [[], [], []]
  let loading = false
  let allLoaded = false
  let sentinel: HTMLDivElement
  let votePostId: any
  let voteType: any
  let voteTargetAddress: any
  let isDescriptionExpanded = false

  const MAX_DESCRIPTION_LENGTH = 100

  $: profile = $page.data.profile as CirclesRpcProfile | null
  $: posts = $page.data.posts as PostType[]
  $: skip = posts.length
  $: isOwnProfile = $page.data.isOwnProfile as boolean
  $: isRpcProfile = $page.data.isRpcProfile as boolean
  $: error = $page.data.error as string | null
  $: console.log("profile:", $page.data.profile)
  $: console.log("posts:", posts)
  $: console.log("page.data.posts:", $page.data.posts)
  $: console.log("isRpcProfile:", isRpcProfile)
  $: console.log("error:", error)

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

      // Extract addresses of related users
      const relationAddresses = data.map(
        (item) => item.relationItem.objectAvatar,
      )

      // Fetch all their profiles
      const profilesResponse = await fetch("/api/circles/batchProfiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addresses: relationAddresses }),
      })
      const { profiles } = (await profilesResponse.json()) as {
        profiles: (CirclesRpcProfile | null)[]
      }

      // Build a quick lookup map from address → profile
      const profileMap = new Map(
        profiles.map((p) => [p?.address.toLowerCase(), p]),
      )

      // Helper to get profile by address (fallback null if missing)
      const getProfile = (address: string) =>
        profileMap.get(address.toLowerCase()) || null

      // Sort relations + attach profiles
      const mutuals = sortRelations(
        data
          .filter((item) => item.relationItem.relation === "mutuallyTrusts")
          .map((item) => ({
            relation: item,
            profile: getProfile(item.relationItem.objectAvatar),
          })),
      )

      const trustedBy = sortRelations(
        data
          .filter((item) => item.relationItem.relation === "trustedBy")
          .map((item) => ({
            relation: item,
            profile: getProfile(item.relationItem.objectAvatar),
          })),
      )

      const trusts = sortRelations(
        data
          .filter((item) => item.relationItem.relation === "trusts")
          .map((item) => ({
            relation: item,
            profile: getProfile(item.relationItem.objectAvatar),
          })),
      )

      // If viewing own profile, show 3 tabs with mutuals separate
      // If viewing someone else's profile, show 2 tabs with mutuals included in both
      if (isOwnProfile) {
        contents = [mutuals, trustedBy, trusts]
      } else {
        // Merge mutuals into trustedBy and trusts for non-own profiles
        const trustedByWithMutuals = sortRelations([...trustedBy, ...mutuals])
        const trustsWithMutuals = sortRelations([...trusts, ...mutuals])
        contents = [trustedByWithMutuals, trustsWithMutuals]
      }
    } catch (err) {
      console.error("Error fetching relations:", err)
    }
  }
  run(() => {
    console.log("Form:", form)
  })

  run(() => {
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
        <div class="relative flex flex-col items-center">
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
            <!-- {@const description =
              "Lorem, ipsum dolor sit amet consectetur adipisicing elit. Vel repellat quis, voluptate nam commodi iste nihil nesciunt ad eum inventore eveniet excepturi corrupti obcaecati itaque ipsa libero cumque porro molestiae?"} -->
            {@const isTooLong = description.length > MAX_DESCRIPTION_LENGTH}
            <div class="text-gray-500 text-xs break-words max-w-xs">
              <p
                class="transition-all duration-300 {isDescriptionExpanded
                  ? ''
                  : 'line-clamp-3'}"
              >
                {description}
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
