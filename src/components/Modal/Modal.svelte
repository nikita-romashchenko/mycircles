<script lang="ts">
  interface Props {
    open?: boolean;
    children?: import('svelte').Snippet;
  }

  let { open = $bindable(false), children }: Props = $props();

  const close = () => {
    open = false
  }
</script>

{#if open}
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <div class="fixed inset-0 bg-black opacity-60"></div>

    <div
      class="relative bg-white rounded-xl shadow-lg p-4 max-w-[600px] max-h-[600px] overflow-auto z-10"
    >
      <button
        type="button"
        class="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        aria-label="Close modal"
        onclick={close}
      >
        ✕
      </button>

      {@render children?.()}
    </div>
  </div>
{/if}
