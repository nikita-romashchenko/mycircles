<script lang="ts">
  import type { Relation } from "$lib/types"

  let activeTab = $state(0)
  interface Props {
    tabs?: string[]
    contents?: Relation[][]
    onLinkClick: () => void
  }

  let { tabs = [], contents = [[], [], []], onLinkClick }: Props = $props()
</script>

<div class="w-full">
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
          {#if !relation.profile}
            <div
              class="my-2 flex flex-row gap-4 items-center opacity-60 border border-gray-300 rounded-md p-2"
            >
              <!-- TODO: Add actual user avatars -->
              <img
                alt="User avatar"
                src="https://picsum.photos/200"
                class="w-8 h-8 rounded-full grayscale"
                loading="lazy"
              />
              <div class="flex flex-col gap-2 text-gray-400">
                <span>{relation.relationItem.objectAvatar}</span>
              </div>
            </div>
          {:else}
            <a
              href={`/${relation.profile.profileId}`}
              class="my-2 flex flex-row gap-4 items-center border border-gray-300 rounded-md p-2"
              onclick={() => onLinkClick?.()}
            >
              <!-- TODO: Add actual user avatars -->
              <img
                alt="User avatar"
                src="https://picsum.photos/200"
                class="w-8 h-8 rounded-full"
                loading="lazy"
              />
              <div class="flex flex-col gap-2">
                <span>{relation.profile.username}</span>
                <hr />
                <span class="text-gray-500 text-sm"
                  >{relation.profile.safeAddress}</span
                >
              </div>
            </a>
          {/if}
        {/each}
      {/if}
    {/if}
  </div>
</div>
