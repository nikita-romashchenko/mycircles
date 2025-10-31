<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog"
  import * as Avatar from "$lib/components/ui/avatar/index"
  import * as Tooltip from "$lib/components/ui/tooltip"
  import ImageIcon from "@lucide/svelte/icons/image"
  import CircleHelp from "@lucide/svelte/icons/circle-help"
  import type { CirclesRpcProfile, Relation } from "$lib/types"
  import { onMount } from "svelte"

  interface Props {
    open?: boolean
    onLinkClick: () => void
    contents?: {
      relation: Relation
      profile: CirclesRpcProfile | null
    }[][]
    tabs?: string[]
    onLoadMore?: (tabIndex: number) => Promise<void>
    loadedCounts?: number[]
    totalCounts?: number[]
    loadingMoreProfiles?: boolean
  }

  let {
    open = $bindable(false),
    onLinkClick,
    contents = [[], [], []],
    tabs = ["mutuals", "trusters", "trustouts"],
    onLoadMore,
    loadedCounts = [0, 0, 0],
    totalCounts = [0, 0, 0],
    loadingMoreProfiles = false,
  }: Props = $props()

  let activeTab = $state(0)
  let sentinel = $state<HTMLDivElement | null>(null)
  let scrollContainer = $state<HTMLDivElement | null>(null)
  let observers: IntersectionObserver[] = []

  // Get displayed items for current tab (only show items with loaded profiles)
  let displayedItems = $derived(
    contents[activeTab]?.slice(0, loadedCounts[activeTab]) || [],
  )
  let hasMore = $derived(loadedCounts[activeTab] < totalCounts[activeTab])

  async function loadMore(tabIndex: number) {
    if (onLoadMore && !loadingMoreProfiles) {
      await onLoadMore(tabIndex)
    }
  }

  // Setup observer for sentinel
  $effect(() => {
    // Cleanup existing observers
    observers.forEach((obs) => obs.disconnect())
    observers = []

    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore) {
          loadMore(activeTab)
        }
      },
      { rootMargin: "100px" },
    )

    observer.observe(sentinel)
    observers.push(observer)

    return () => {
      observer.disconnect()
    }
  })

  // Reset scroll position when switching tabs
  $effect(() => {
    // Track activeTab to trigger when it changes
    activeTab
    if (scrollContainer) {
      scrollContainer.scrollTop = 0
    }
  })
</script>

<Dialog.Root bind:open>
  <!-- <Dialog.Trigger>Open</Dialog.Trigger> -->
  <Dialog.Content class="h-[70vh] md:h-[40vh] max-h-[90vh] w-full max-w-full">
    <Dialog.Header>
      <div class="flex items-center gap-2">
        <Dialog.Title>Relations</Dialog.Title>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <CircleHelp class="w-4 h-4 text-gray-500 hover:text-gray-700" />
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p class="max-w-xs text-sm">
                Mutuals: People who trust each other<br />
                Trusters: People who trust you<br />
                Trustouts: People you trust
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </Dialog.Header>
    <div class="w-full min-w-0">
      <!-- Tab headers -->
      <div class="flex border-b">
        {#each tabs as tab, i}
          <button
            type="button"
            class="px-2 md:px-4 py-2 -mb-px border-b-2 text-xs md:text-sm font-medium whitespace-nowrap
                   {i === activeTab
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            onclick={() => (activeTab = i)}
          >
            {tab}
          </button>
        {/each}
      </div>

      <!-- Tab content -->
      <div
        bind:this={scrollContainer}
        class="p-2 md:p-4 h-[58vh] md:h-[28vh] overflow-auto w-full min-w-0"
      >
        {#if contents[activeTab]}
          {#if contents[activeTab].length === 0}
            <p class="text-gray-500">No data found.</p>
          {:else}
            {#each displayedItems as relation}
              {#if !relation.profile}{:else}
                <a
                  href={`/${relation.profile.address}`}
                  class="my-2 flex flex-row gap-2 md:gap-4 items-center border border-gray-300 rounded-md p-2 w-full overflow-hidden"
                  onclick={() => onLinkClick?.()}
                >
                  <Avatar.Root
                    class="rounded-full object-cover flex-shrink-0 w-10 h-10 md:w-12 md:h-12"
                  >
                    <Avatar.Fallback class="rounded-full object-cover"
                      ><ImageIcon /></Avatar.Fallback
                    >
                    <Avatar.Image
                      src={relation.profile.previewImageUrl}
                      alt={`${relation.profile.name}'s avatar`}
                      class="rounded-full object-cover"
                    />
                  </Avatar.Root>
                  <div
                    class="flex flex-col gap-1 md:gap-2 min-w-0 flex-1 overflow-hidden"
                  >
                    <span class="truncate text-sm md:text-base"
                      >{relation.profile.name}</span
                    >
                    <hr class="w-full" />
                    <span
                      class="text-gray-500 text-xs md:text-sm truncate block"
                      >{relation.profile.address}</span
                    >
                  </div>
                </a>
              {/if}
            {/each}

            <!-- Sentinel for infinite scroll -->
            <div bind:this={sentinel} class="h-4"></div>

            {#if loadingMoreProfiles}
              <p class="text-center text-gray-500 text-sm">Loading more...</p>
            {:else if hasMore}
              <p class="text-center text-gray-500 text-sm">
                Scroll for more...
              </p>
            {:else if displayedItems.length > 0}
              <p class="text-center text-gray-500 text-sm">All loaded</p>
            {/if}
          {/if}
        {/if}
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
