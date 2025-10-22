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

<div>
  <!-- Tab headers -->
  <div class="flex border-b">
    {#each tabs as tab, i}
      <button
        type="button"
        class="px-4 py-2 -mb-px border-b-2 text-sm font-medium
               {i === activeTab
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
        onclick={() => (activeTab = i)}
      >
        {tab}
      </button>
    {/each}
  </div>

  <div class="p-4 h-[28vh] overflow-auto">
    {#if contents[activeTab]}
      {#if contents[activeTab].length === 0}
        <p class="text-gray-500">No data found.</p>
      {:else}
        {#each contents[activeTab] as relation}
          {#if !relation.profile}{:else}
            <a
              href={`/${relation.profile.address}`}
              class="my-2 flex flex-row gap-4 items-center border border-gray-300 rounded-md p-2"
              onclick={() => onLinkClick?.()}
            >
              <Avatar.Root class="rounded-full object-cover">
                <Avatar.Fallback class="rounded-full object-cover"
                  ><ImageIcon /></Avatar.Fallback
                >
                <Avatar.Image
                  src={relation.profile.previewImageUrl}
                  alt={`${relation.profile.name}'s avatar`}
                  class="rounded-full object-cover"
                />
              </Avatar.Root>
              <div class="flex flex-col gap-2">
                <span>{relation.profile.name}</span>
                <hr />
                <span class="text-gray-500 text-sm truncate"
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
