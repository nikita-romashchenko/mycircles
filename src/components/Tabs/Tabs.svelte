<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index"
  import ImageIcon from "@lucide/svelte/icons/image"
  import type { CirclesRpcProfile, Relation } from "$lib/types"

  let activeTab = $state(0)
  interface Props {
    tabs?: string[]
    contents?: {
      relation: Relation
      profile: CirclesRpcProfile | null
    }[][]
    onLinkClick: () => void
  }

  let { tabs = [], contents = [[], [], []], onLinkClick }: Props = $props()
</script>

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

  <div class="p-2 md:p-4 h-[28vh] overflow-auto w-full min-w-0">
    {#if contents[activeTab]}
      {#if contents[activeTab].length === 0}
        <p class="text-gray-500">No data found.</p>
      {:else}
        {#each contents[activeTab] as relation}
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
                <span class="text-gray-500 text-xs md:text-sm truncate block"
                  >{relation.profile.address}</span
                >
              </div>
            </a>
          {/if}
        {/each}
      {/if}
    {/if}
  </div>
</div>
