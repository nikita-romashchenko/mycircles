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
  import VouchDialog from "$lib/components/blocks/dialogs/VouchDialog.svelte"
  import * as Dialog from "$lib/components/ui/dialog/index"
  import ImageIcon from "@lucide/svelte/icons/image"
  import PenSquare from "@lucide/svelte/icons/pen-square"
  import HandHeart from "@lucide/svelte/icons/hand-heart"
  import Settings from "@lucide/svelte/icons/settings"
  import TrustButton from "$lib/components/blocks/TrustButton.svelte"
  import { avatarStore } from "$lib/stores/safe4337.svelte"
  import { postReloadStore } from "$lib/stores/postReload.svelte"
  import { DEFAULT_LIMIT } from "$lib/constants"
  import { Sdk } from "@aboutcircles/sdk"
  import { CirclesConverter } from "@aboutcircles/sdk-utils"

  // Subscribe to reload signals
  let reloadSignal = $derived.by(() => {
    // This is a derived that will update whenever the store changes
    $postReloadStore
    return $postReloadStore
  })

  const ITEMS_PER_LOAD = 20

  let posts = $state<PostType[]>([])

  // Use derived values to read from page data (avoid state sync loops)
  let profile = $derived($pageStore.data.profile as CirclesRpcProfile | null)
  let isOwnProfile = $derived(!!($pageStore.data.isOwnProfile as boolean))
  let isRpcProfile = $derived(!!($pageStore.data.isRpcProfile as boolean))
  let error = $derived($pageStore.data.error as string | null)

  let form = $state($pageStore.data.form)

  let relationsModalOpen = $state(false)
  let uploadModalOpen = $state(false)
  let vouchModalOpen = $state(false)
  let balanceDialogOpen = $state(false)
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
  let canReceiveAmount = $state<string | null>(null)
  let loadingCanReceive = $state(false)
  let totalBalance = $state<string | null>(null)
  let loadingBalance = $state(false)
  let issuanceAmount = $state<string | null>(null)
  let loadingIssuance = $state(false)
  let loadingMint = $state(false)
  let tokenBalances = $state<any[]>([])
  let tokenProfiles = $state<Map<string, CirclesRpcProfile | null>>(new Map())
  let loadingTokens = $state(false)

  const MAX_DESCRIPTION_LENGTH = 150

  let skip = $derived(posts.length)
  let initialPostsLoaded = $state(false)
  let lastProfileAddress = $state<string | null>(null)
  let lastProcessedSignal = $state(0)

  // Track profile address changes to reset loading flag
  $effect.pre(() => {
    const newAddress = ($pageStore.data.profile as CirclesRpcProfile | null)
      ?.address

    if (newAddress && newAddress !== lastProfileAddress) {
      lastProfileAddress = newAddress
      initialPostsLoaded = false
      posts = [] // Clear old posts when switching profiles
      allLoaded = false // Reset load state
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
    if (
      browser &&
      profile &&
      reloadSignal > lastProcessedSignal &&
      initialPostsLoaded
    ) {
      console.log(
        "Post reload signal received, reloading posts...",
        reloadSignal,
      )
      lastProcessedSignal = reloadSignal // Mark this signal as processed
      initialPostsLoaded = false
      loadInitialPosts()
    }
  })

  // Avatar is automatically initialized in +layout.svelte
  // No need for separate initialization here

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

  async function fetchCanReceiveAmount(fromAddress: string) {
    if (isOwnProfile) return // Don't fetch for own profile

    loadingCanReceive = true
    try {
      const res = await fetch(`/api/circles/can-receive?from=${fromAddress}`)
      if (!res.ok) throw new Error("Failed to fetch can-receive amount")

      const data = await res.json()
      canReceiveAmount = data.maxFlow
      console.log(`Can receive from ${fromAddress}: ${canReceiveAmount}`)
    } catch (err) {
      console.error("Error fetching can-receive amount:", err)
      canReceiveAmount = null
    } finally {
      loadingCanReceive = false
    }
  }

  async function fetchTotalBalance() {
    if (!isOwnProfile) return // Only fetch for own profile

    loadingBalance = true
    try {
      const res = await fetch(`/api/circles/balance`)
      if (!res.ok) throw new Error("Failed to fetch total balance")

      const data = await res.json()
      totalBalance = data.totalBalance
      console.log(`Total balance: ${totalBalance}`)
    } catch (err) {
      console.error("Error fetching total balance:", err)
      totalBalance = null
    } finally {
      loadingBalance = false
    }
  }

  async function fetchIssuanceAmount() {
    if (!isOwnProfile) return // Only fetch for own profile

    loadingIssuance = true
    try {
      const res = await fetch(`/api/circles/issuance`)
      if (!res.ok) throw new Error("Failed to fetch issuance amount")

      const data = await res.json()
      issuanceAmount = data.issuance
      console.log(`Issuance amount: ${issuanceAmount}`)
    } catch (err) {
      console.error("Error fetching issuance amount:", err)
      issuanceAmount = null
    } finally {
      loadingIssuance = false
    }
  }

  async function fetchRelations(address: string, skipTrustCheck = false) {
    try {
      const res = await fetch(`/api/circles/relations?address=${address}`)
      if (!res.ok) throw new Error("Failed to fetch relations")

      const data: Relation[] = await res.json()

      // Check if we trust this profile using the avatarStore (if not our own profile)
      // Skip this check if we just performed a trust/untrust action (to avoid race conditions)
      if (
        !skipTrustCheck &&
        !isOwnProfile &&
        $pageStore.data.session?.user?.safeAddress
      ) {
        await checkTrustStatusFromAvatar(address)
      }

      // Fetch can-receive amount for non-own profiles
      if (!isOwnProfile && $pageStore.data.session?.user?.safeAddress) {
        await fetchCanReceiveAmount(address)
      }

      // Fetch balance and issuance for own profile
      if (isOwnProfile && $pageStore.data.session?.user?.safeAddress) {
        await Promise.all([fetchTotalBalance(), fetchIssuanceAmount()])
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
  async function checkTrustStatusFromAvatar(targetAddress: string) {
    try {
      // Wait for avatar to be ready with retry logic
      let retries = 0
      const maxRetries = 10 // Wait up to 5 seconds

      while (!avatarStore.isReady && retries < maxRetries) {
        console.log(
          `Avatar not ready yet, waiting... (attempt ${retries + 1}/${maxRetries})`,
        )
        await new Promise((resolve) => setTimeout(resolve, 500))
        retries++
      }

      const avatar = avatarStore.getAvatar()
      if (!avatar) {
        console.warn(
          "Avatar not initialized after waiting, cannot check trust status",
        )
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
      await new Promise((resolve) => setTimeout(resolve, 100))
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
      console.log(
        `✅ Trust transaction successful. Hash: ${receipt.transactionHash}`,
      )

      // Update UI state
      isTrusted = true

      // Refresh relations to update counts (skip trust check to avoid race condition)
      await fetchRelations(targetAddress, true)
    } catch (err: any) {
      console.error("Error trusting user:", err)
      alert(`Failed to trust: ${err.message || "Please try again."}`)
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
      console.log(
        `✅ Untrust transaction successful. Hash: ${receipt.transactionHash}`,
      )

      // Update UI state
      isTrusted = false

      // Refresh relations to update counts (skip trust check to avoid race condition)
      await fetchRelations(targetAddress, true)
    } catch (err: any) {
      console.error("Error untrusting user:", err)
      alert(`Failed to untrust: ${err.message || "Please try again."}`)
    }
  }

  async function handleMint() {
    if (!isOwnProfile) return

    loadingMint = true
    try {
      // Wait for avatar to be ready (with timeout)
      console.log("⏳ Waiting for avatar to be ready...")
      const avatar = await waitForAvatar()

      if (!avatar) {
        const error = avatarStore.initError
        alert(error || "Avatar not ready. Please try again.")
        return
      }

      console.log("✅ Using Safe 4337 Avatar for sponsored mint transaction")
      console.log("💎 Minting personal tokens...")

      // Mint tokens using the SDK
      const receipt = await avatar.personalToken.mint()
      console.log(
        `✅ Mint transaction successful. Hash: ${receipt.transactionHash}`,
      )

      // Refresh issuance and balance
      await Promise.all([fetchIssuanceAmount(), fetchTotalBalance()])
    } catch (err: any) {
      console.error("Error minting tokens:", err)
      alert(`Failed to mint: ${err.message || "Please try again."}`)
    } finally {
      loadingMint = false
    }
  }

  async function openBalanceDialog() {
    if (!isOwnProfile) return

    balanceDialogOpen = true

    // Load token balances if opening dialog for the first time
    if (tokenBalances.length === 0) {
      await loadTokenBalances()
    }
  }

  async function loadTokenBalances() {
    if (!$pageStore.data.session?.user?.safeAddress) return

    loadingTokens = true
    try {
      const fromAddress =
        $pageStore.data.session.user.safeAddress.toLowerCase() as `0x${string}`

      // Initialize SDK to get RPC access
      const sdk = new Sdk()

      // Get token balances from RPC
      const balances = await sdk.rpc.balance.getTokenBalances(fromAddress)

      // Filter to only ERC1155 tokens with balance >= 1 CRC
      const MIN_BALANCE = CirclesConverter.circlesToAttoCircles(1)
      const filteredBalances = balances.filter(
        (token) => token.isErc1155 && token.attoCircles >= MIN_BALANCE,
      )

      console.log(
        `Found ${filteredBalances.length} ERC1155 Circles tokens with >= 1 CRC`,
      )

      // Get profiles for all token owners
      const tokenOwners = [
        ...new Set(filteredBalances.map((t) => t.tokenOwner)),
      ]
      if (tokenOwners.length > 0) {
        const profiles =
          await sdk.rpc.profile.getProfileByAddressBatch(tokenOwners)

        // Build profile map
        const profileMap = new Map<string, CirclesRpcProfile | null>()
        profiles.forEach((profile, index) => {
          const address = tokenOwners[index].toLowerCase()
          profileMap.set(address, profile)
        })
        tokenProfiles = profileMap
      }

      tokenBalances = filteredBalances
    } catch (err: any) {
      console.error("Error loading token balances:", err)
    } finally {
      loadingTokens = false
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
      <!-- Banner background -->
      <div class="relative w-full h-26 bg-gray-200">
        <!-- Profile picture overlapping banner - centered -->
        <div class="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <Avatar.Root
            class="w-32 h-32 rounded-full border-4 border-background"
          >
            <Avatar.Fallback
              class="w-32 h-32 rounded-full object-cover bg-gray-200"
            >
              <ImageIcon class="w-12 h-12 text-gray-400" />
            </Avatar.Fallback>
            <Avatar.Image
              src={(profile as CirclesRpcProfile).previewImageUrl}
              alt={(profile as CirclesRpcProfile).name}
              class="w-32 h-32 rounded-full object-cover"
            />
          </Avatar.Root>

          <!-- Balance/Trust score overlapping profile picture -->
          {#if !isOwnProfile && $pageStore.data.session?.user?.safeAddress && canReceiveAmount !== null && !loadingCanReceive}
            {@const amountInCrc = (parseFloat(canReceiveAmount) / 1e18).toFixed(
              1,
            )}
            {@const amount = parseFloat(amountInCrc)}
            {@const trustLevel =
              amount < 100 ? "🪨" : amount < 1000 ? "🟡" : "💎"}
            <div
              class="absolute left-1/2 -translate-x-1/2"
              style="top: 115px; background-color: #fff7f6; padding: 5px 10px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
            >
              <p
                class="text-xl font-bold flex items-center gap-1"
                style="color: #191568;"
              >
                <span>{trustLevel}</span>
                <span>{amountInCrc}</span>
              </p>
            </div>
          {/if}

          {#if isOwnProfile && totalBalance !== null && !loadingBalance}
            {@const balanceInCrc = (parseFloat(totalBalance) / 1e18).toFixed(1)}
            <button
              onclick={openBalanceDialog}
              class="absolute left-1/2 -translate-x-1/2 cursor-pointer hover:scale-105 transition-transform"
              style="top: 115px; background-color: #fff7f6; padding: 5px 10px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
            >
              <p
                class="text-xl font-bold flex items-center gap-1"
                style="color: #191568;"
              >
                <span>💰</span>
                <span>{balanceInCrc}</span>
              </p>
            </button>
          {/if}
        </div>
      </div>

      <!-- User info below banner - centered -->
      <div class="flex flex-col items-center text-center px-4 pt-24">
        <div class="flex flex-col gap-1">
          <p class="text-xl font-bold">
            {(profile as CirclesRpcProfile).name || "Anonymous"}
          </p>
        </div>

        {#if (profile as CirclesRpcProfile).description}
          <!-- {@const description =
            (profile as CirclesRpcProfile).description || ""} -->
          {@const description =
            (profile as CirclesRpcProfile).description || ""}
          {@const isTooLong = description.length > MAX_DESCRIPTION_LENGTH}
          {@const displayText = isDescriptionExpanded
            ? description
            : isTooLong
              ? description.slice(0, MAX_DESCRIPTION_LENGTH) + "..."
              : description}
          <div class="text-gray-700 text-sm font-normal break-words mt-2">
            <p class="transition-all duration-300">
              {displayText}
            </p>
            {#if isTooLong}
              <button
                onclick={() => (isDescriptionExpanded = !isDescriptionExpanded)}
                class="text-primary hover:text-primary/80 text-sm mt-1"
              >
                {isDescriptionExpanded ? "Show less" : "Show more"}
              </button>
            {/if}
          </div>
        {/if}

        <button
          onclick={openRelationsModal}
          class="flex flex-row gap-3 cursor-pointer mt-2"
        >
          {#if isOwnProfile}
            <div class="flex flex-row gap-1 justify-center items-center">
              <p class="text-gray-500 text-sm">mutuals</p>
              <p class="font-semibold">{contents[0]?.length || 0}</p>
            </div>
            <div class="flex flex-row gap-1 justify-center items-center">
              <p class="text-gray-500 text-sm">trusters</p>
              <p class="font-semibold">{contents[1]?.length || 0}</p>
            </div>
            <div class="flex flex-row gap-1 justify-center items-center">
              <p class="text-gray-500 text-sm">trustouts</p>
              <p class="font-semibold">{contents[2]?.length || 0}</p>
            </div>
          {:else}
            <div class="flex flex-row gap-1 justify-center items-center">
              <p class="text-gray-500 text-sm">trusters</p>
              <p class="font-semibold">{contents[0]?.length || 0}</p>
            </div>
            <div class="flex flex-row gap-1 justify-center items-center">
              <p class="text-gray-500 text-sm">trustouts</p>
              <p class="font-semibold">{contents[1]?.length || 0}</p>
            </div>
          {/if}
        </button>

        {#if !isOwnProfile && $pageStore.data.session?.user?.safeAddress && !loadingRelations}
          <div class="flex flex-row gap-2 mt-2 w-full">
            <TrustButton
              {isTrusted}
              onTrust={handleTrust}
              onUntrust={handleUntrust}
              class="text-sm flex-1"
            />
            <Button
              onclick={() => (vouchModalOpen = true)}
              variant="default"
              class="text-sm flex-1 gap-2"
            >
              <HandHeart class="w-4 h-4" />
              Vouch
            </Button>
          </div>
        {/if}

        {#if isOwnProfile && $pageStore.data.session?.user?.safeAddress && !loadingIssuance}
          <div class="flex flex-row gap-2 mt-2 w-full">
            <Button
              onclick={() => (window.location.href = "/settings")}
              variant="outline"
              size="icon"
              class="h-9 w-9"
              aria-label="Settings"
            >
              <Settings />
            </Button>
            <Button
              onclick={handleMint}
              variant="default"
              class="text-sm flex-1 gap-2"
              disabled={loadingMint ||
                !issuanceAmount ||
                parseFloat(issuanceAmount) === 0}
            >
              {#if loadingMint}
                Creating...
              {:else if issuanceAmount && parseFloat(issuanceAmount) > 0}
                Create {(parseFloat(issuanceAmount) / 1e18).toFixed(1)} CRC
              {:else}
                No CRC to Create
              {/if}
            </Button>
          </div>
        {/if}
      </div>
      <hr class="mt-4" />
    </div>

    <!-- User posts section -->
    <div class="flex-1 mx-auto p-4 w-full">
      {#if posts.length === 0 && !loading && initialPostsLoaded}
        <p class="text-center mt-4 text-gray-500">No posts available</p>
      {/if}

      <div class="space-y-3">
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

    {#if !isOwnProfile && profile}
      <VouchDialog
        bind:open={vouchModalOpen}
        maxFlowAmount={canReceiveAmount}
        recipientAddress={(profile as CirclesRpcProfile).address}
        recipientName={(profile as CirclesRpcProfile).name || "this person"}
      />
    {/if}

    {#if isOwnProfile}
      <Dialog.Root bind:open={balanceDialogOpen}>
        <Dialog.Content class="sm:max-w-lg">
          <Dialog.Header>
            <Dialog.Title>Your Circles Tokens</Dialog.Title>
            <Dialog.Description>
              View all your Circles tokens and balances.
            </Dialog.Description>
          </Dialog.Header>

          <div class="flex flex-col gap-4 py-4">
            {#if loadingTokens}
              <p class="text-sm text-gray-500 text-center">
                Loading your tokens...
              </p>
            {:else if tokenBalances.length === 0}
              <p class="text-sm text-gray-500 text-center">
                No Circles tokens available.
              </p>
            {:else}
              <div
                class="flex flex-col gap-2 max-h-96 overflow-y-auto border rounded-md p-2"
              >
                {#each tokenBalances as token}
                  {@const tokenBalance = Number(
                    CirclesConverter.attoCirclesToCircles(token.attoCircles),
                  ).toFixed(2)}
                  {@const ownerProfile = tokenProfiles.get(
                    token.tokenOwner.toLowerCase(),
                  )}
                  {@const ownerName =
                    ownerProfile?.name ||
                    `${token.tokenOwner.slice(0, 6)}...${token.tokenOwner.slice(-4)}`}
                  <div
                    class="flex items-center gap-2 p-3 border rounded-md hover:bg-gray-50"
                  >
                    <span class="text-sm font-medium">
                      {tokenBalance}
                    </span>
                    <Avatar.Root class="w-8 h-8 rounded-full border">
                      <Avatar.Fallback
                        class="w-8 h-8 rounded-full object-cover bg-black"
                      >
                        <ImageIcon class="w-4 h-4 text-white" />
                      </Avatar.Fallback>
                      {#if ownerProfile?.previewImageUrl}
                        <Avatar.Image
                          src={ownerProfile.previewImageUrl}
                          alt={ownerName}
                          class="w-8 h-8 rounded-full object-cover"
                        />
                      {/if}
                    </Avatar.Root>
                    <span class="text-sm text-gray-500">
                      {ownerName}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </Dialog.Content>
      </Dialog.Root>
    {/if}

    <!-- Only show upload dialog and button for other profiles (not own profile) -->
    {#if !isOwnProfile}
      <UploadMediaDialog
        pageForm={form}
        bind:open={uploadModalOpen}
        profileAddress={profile?.address}
      />

      <!-- Floating upload button -->
      {#if $pageStore.data.session}
        <div
          class="DESKTOP_VIEWPORT fixed bottom-20 left-0 right-0 z-40 flex justify-end px-6"
        >
          <button
            onclick={openUploadMediaModal}
            class="w-14 h-14 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary/90 transition-colors"
            aria-label="Create post"
          >
            <PenSquare class="w-6 h-6 text-white" />
          </button>
        </div>
      {/if}
    {/if}
  {/if}
{/if}
