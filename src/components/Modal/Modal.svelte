<script lang="ts">
  import { onMount } from "svelte"
  export let open = false

  const close = () => {
    open = false
  }

  // Disable scroll when modal is open
  onMount(() => {
    return () => {
      document.body.style.overflow = ""
    }
  })

  $: document.body.style.overflow = open ? "hidden" : ""
</script>

{#if open}
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <div class="fixed inset-0 bg-black bg-opacity-60"></div>

    <div
      class="relative bg-white rounded-xl shadow-lg p-4 max-w-full max-h-full overflow-auto z-10"
    >
      <button
        type="button"
        class="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        aria-label="Close modal"
        on:click={close}
      >
        ✕
      </button>

      <slot />
    </div>
  </div>
{/if}
