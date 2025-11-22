<script lang="ts">
  import type {
    Post as PostType,
    CirclesRpcProfile,
    Relation,
  } from "$lib/types"
  import { page as pageStore } from "$app/stores"
  import { browser } from "$app/environment"
  import PostCard from "$components/Post/PostCard.svelte"
  import { Button } from "$lib/components/ui/button"
  import * as Avatar from "$lib/components/ui/avatar/index"
  import UploadMediaDialog from "$lib/components/blocks/dialogs/UploadMediaDialog.svelte"
  import RelationsDialog from "$lib/components/blocks/dialogs/RelationsDialog.svelte"
  import ImageIcon from "@lucide/svelte/icons/image"
  import TrustButton from "$lib/components/blocks/TrustButton.svelte"
  import { avatarStore } from "$lib/stores/circlesAvatar.svelte"
  import { postReloadStore } from "$lib/stores/postReload.svelte"
  import { DEFAULT_LIMIT } from "$lib/constants"

  // Subscribe to reload signals
  let reloadSignal = $derived.by(() => {
    // This is a derived that will update whenever the store changes
    $postReloadStore
    return $postReloadStore
  })

  const ITEMS_PER_LOAD = 20

  let posts = $state<PostType[]>([])

  // Use derived values to read from page data (avoid state sync loops)
  let profile = $derived(($pageStore.data.profile as CirclesRpcProfile | null))
  let isOwnProfile = $derived(!!($pageStore.data.isOwnProfile as boolean))
  let isRpcProfile = $derived(!!($pageStore.data.isRpcProfile as boolean))
  let error = $derived(($pageStore.data.error as string | null))

  let form = $state($pageStore.data.form)

  let relationsModalOpen = $state(false)
  let uploadModalOpen = $state(false)
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
  let isDescriptionExpanded = $state(false)
  let isTrusted = $state(false)
  let maxReplenishableAmount = $state<string | null>(null)
  let maxReplenishableLoading = $state(false)
  let maxFlow = $state<string | null>(null)
  let maxFlowLoading = $state(false)

  const MAX_DESCRIPTION_LENGTH = 150

  let skip = $derived(posts.length)
  let initialPostsLoaded = $state(false)
  let lastProfileAddress = $state<string | null>(null)
  let lastProcessedSignal = $state(0)

  // Track profile address changes to reset loading flag
  $effect.pre(() => {
    const newAddress = ($pageStore.data.profile as CirclesRpcProfile | null)?.address

    if (newAddress && newAddress !== lastProfileAddress) {
      lastProfileAddress = newAddress
      initialPostsLoaded = false
    }
  })

  // Load initial posts after page renders (non-blocking)
  $effect(() => {
    if (browser && profile && !initialPostsLoaded && isRpcProfile) {
      initialPostsLoaded = true
      loadInitialPosts()
    }
  })

  // Watch for post reload signals (e.g., after upload)
  $effect(() => {
    // Only trigger when signal value changes (increases), not on every render
    if (browser && profile && reloadSignal > lastProcessedSignal && initialPostsLoaded) {
      console.log("Post reload signal received, reloading posts...", reloadSignal)
      lastProcessedSignal = reloadSignal // Mark this signal as processed
      initialPostsLoaded = false
      loadInitialPosts()
    }
  })

  async function loadInitialPosts() {
    if (!profile || loading) return
    loading = true

    try {
      const address = (profile as CirclesRpcProfile).address
      const str = `/api/posts/user?address=${address}&skip=0&limit=${ITEMS_PER_LOAD}`
      console.log("Loading initial posts from:", str)
      const res = await fetch(str)
      const data = await res.json()

      console.log("Initial posts loaded:", data)

      if (res.ok && data.posts && data.posts.length > 0) {
        posts = data.posts
        allLoaded = data.posts.length < ITEMS_PER_LOAD
      } else {
        allLoaded = true
      }
    } catch (err) {
      console.error("Error loading initial posts:", err)
    } finally {
      loading = false
    }
  }

  // Debug logging
  $effect(() => {
    console.log("profile:", $pageStore.data.profile)
    console.log("posts:", posts)
    console.log("pageStore.data.posts:", $pageStore.data.posts)
    console.log("isRpcProfile:", isRpcProfile)
    console.log("error:", error)
  })

  $effect(() => {
    console.log("Posts updated:", posts)
  })

  async function loadMore() {
    if (loading) return
    loading = true

    try {
      // All profiles are now RPC profiles, use address field
      const address = (profile as CirclesRpcProfile).address

      const str = `/api/posts/user?address=${address}&skip=${skip}&limit=${DEFAULT_LIMIT}`
      console.log("Fetching more posts from:", str)
      const res = await fetch(str)
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

  async function fetchRelations(address: string, skipTrustCheck = false) {
    try {
      const res = await fetch(`/api/circles/relations?address=${address}`)
      if (!res.ok) throw new Error("Failed to fetch relations")

      const data: Relation[] = await res.json()

      // Check if we trust this profile using the avatarStore (if not our own profile)
      // Skip this check if we just performed a trust/untrust action (to avoid race conditions)
      if (!skipTrustCheck && !isOwnProfile && $pageStore.data.session?.user?.safeAddress) {
        await checkTrustStatusFromAvatar(address)
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
  async function fetchMaxReplenishableAmount(toAddress: string) {
    if (!toAddress) return

    try {
      maxReplenishableLoading = true
      const url = `/api/circles/max-replenishable-amount?to=${encodeURIComponent(toAddress)}`
      console.log(`Fetching max replenishable amount to: ${toAddress}`)
      const res = await fetch(url)

      if (!res.ok) {
        console.error("Failed to fetch max replenishable amount:", res.statusText)
        return
      }

      const data = await res.json()
      if (data.success) {
        maxReplenishableAmount = data.maxReplenishableAmount
        console.log(`✅ Max replenishable amount: ${data.maxReplenishableAmount}`)
        console.log(`  - Max flow: ${data.maxFlow}, Current balance: ${data.currentBalance}`)
      } else {
        console.error("Max replenishable amount error:", data.error)
      }
    } catch (err) {
      console.error("Error fetching max replenishable amount:", err)
    } finally {
      maxReplenishableLoading = false
    }
  }

  async function fetchMaxFlowToAvatar(toAddress: string) {
    if (!toAddress) return

    try {
      maxFlowLoading = true
      const url = `/api/circles/max-flow?to=${encodeURIComponent(toAddress)}`
      console.log(`Fetching max flow to avatar: ${toAddress}`)
      const res = await fetch(url)

      if (!res.ok) {
        console.error("Failed to fetch max flow:", res.statusText)
        return
      }

      const data = await res.json()
      if (data.success) {
        maxFlow = data.maxFlow
        console.log(`✅ Max flow to avatar: ${data.maxFlow}`)
      } else {
        console.error("Max flow error:", data.error)
      }
    } catch (err) {
      console.error("Error fetching max flow:", err)
    } finally {
      maxFlowLoading = false
    }
  }

  async function checkTrustStatusFromAvatar(targetAddress: string) {
    try {
      // Wait for avatar to be ready with retry logic
      let retries = 0
      const maxRetries = 10 // Wait up to 5 seconds

      while (!avatarStore.isReady && retries < maxRetries) {
        console.log(`Avatar not ready yet, waiting... (attempt ${retries + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 500))
        retries++
      }

      const avatar = avatarStore.getAvatar()
      if (!avatar) {
        console.warn("Avatar not initialized after waiting, cannot check trust status")
        // Don't set isTrusted, leave it as default (false)
        return
      }

      // Check trust status using the SDK
      isTrusted = await avatar.trust.isTrusting(targetAddress as `0x${string}`)
      console.log(`✅ Trust status for ${targetAddress}: ${isTrusted}`)
    } catch (err) {
      console.error("Error checking trust status from avatar:", err)
      // Don't set isTrusted on error, leave it as default (false)
    }
  }

  async function waitForAvatar(maxWaitTime: number = 10000): Promise<any> {
    const startTime = Date.now()
    while (Date.now() - startTime < maxWaitTime) {
      const avatar = avatarStore.getAvatar()
      if (avatar) return avatar
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error("Avatar initialization timeout")
  }

  async function handleTrust() {
    if (!profile) return

    try {
      const targetAddress = (profile as CirclesRpcProfile).address

      // Wait for avatar to be ready (with timeout)
      console.log("⏳ Waiting for avatar to be ready...")
      const avatar = await waitForAvatar()

      if (!avatar) {
        const error = avatarStore.initError
        alert(error || "Avatar not ready. Please try again.")
        return
      }

      console.log(`🔵 Trusting ${targetAddress}...`)

      // Add trust using the SDK
      const receipt = await avatar.trust.add(targetAddress as `0x${string}`)
      console.log(`✅ Trust transaction successful. Hash: ${receipt.transactionHash}`)

      // Update UI state
      isTrusted = true

      // Refresh relations to update counts (skip trust check to avoid race condition)
      await fetchRelations(targetAddress, true)
    } catch (err: any) {
      console.error("Error trusting user:", err)
      alert(`Failed to trust: ${err.message || 'Please try again.'}`)
    }
  }

  async function handleUntrust() {
    if (!profile) return

    try {
      const targetAddress = (profile as CirclesRpcProfile).address

      // Wait for avatar to be ready (with timeout)
      console.log("⏳ Waiting for avatar to be ready...")
      const avatar = await waitForAvatar()

      if (!avatar) {
        const error = avatarStore.initError
        alert(error || "Avatar not ready. Please try again.")
        return
      }

      console.log(`🔴 Untrusting ${targetAddress}...`)

      // Remove trust using the SDK
      const receipt = await avatar.trust.remove(targetAddress as `0x${string}`)
      console.log(`✅ Untrust transaction successful. Hash: ${receipt.transactionHash}`)

      // Update UI state
      isTrusted = false

      // Refresh relations to update counts (skip trust check to avoid race condition)
      await fetchRelations(targetAddress, true)
    } catch (err: any) {
      console.error("Error untrusting user:", err)
      alert(`Failed to untrust: ${err.message || 'Please try again.'}`)
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
        // Fetch max replenishable amount for this token
        fetchMaxReplenishableAmount(address)
        // Fetch max flow from current user to this profile
        fetchMaxFlowToAvatar(address)
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
          {#if !isOwnProfile && $pageStore.data.session?.user?.safeAddress && !loadingRelations}
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

    <!-- Max Flow and Max Replenishable Amount section -->
    {#if $pageStore.data.session?.user?.safeAddress && !isOwnProfile && (maxFlow || maxFlowLoading || maxReplenishableAmount || maxReplenishableLoading)}
      <div class="mt-6 flex flex-col items-center justify-center gap-4 px-4">
        <!-- Max Flow to Avatar -->
        {#if maxFlow || maxFlowLoading}
          <div class="flex flex-col items-center justify-center gap-2">
            <p class="text-sm text-gray-600">Max flow to this avatar:</p>
            {#if maxFlowLoading}
              <p class="text-gray-500">Loading...</p>
            {:else if maxFlow}
              <p class="text-lg font-semibold text-blue-600">
                {Number(maxFlow) / 1e18 > 1e15 ? '∞' : (Number(maxFlow) / 1e18).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
            {/if}
          </div>
        {/if}

        <!-- Max Replenishable Amount -->
        {#if maxReplenishableAmount || maxReplenishableLoading}
          <div class="flex flex-col items-center justify-center gap-2">
            <p class="text-sm text-gray-600">Max replenishable amount:</p>
            {#if maxReplenishableLoading}
              <p class="text-gray-500">Loading...</p>
            {:else if maxReplenishableAmount}
              <p class="text-lg font-semibold text-green-600">
                {Number(maxReplenishableAmount) / 1e18 > 1e15 ? '∞' : (Number(maxReplenishableAmount) / 1e18).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
            {/if}
          </div>
        {/if}
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
      tabs={isOwnProfile
        ? ["mutuals", "trusters", "trustouts"]
        : ["trusters", "trustouts"]}
      onLoadMore={loadMoreRelationProfiles}
      {loadedCounts}
      totalCounts={allRelations.map((tab) => tab.length)}
      {loadingMoreProfiles}
      {isOwnProfile}
    />
    <UploadMediaDialog pageForm={form} bind:open={uploadModalOpen} profileAddress={profile?.address} />
  {/if}
{/if}
