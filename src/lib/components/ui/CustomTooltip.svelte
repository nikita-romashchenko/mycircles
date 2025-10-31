<script lang="ts">
  import { onMount } from "svelte"

  interface Props {
    content: string
    children: any
  }

  let { content, children }: Props = $props()

  let showTooltip = $state(false)
  let isMobile = $state(false)
  let tooltipElement = $state<HTMLDivElement | null>(null)
  let triggerElement = $state<HTMLButtonElement | null>(null)
  let tooltipPosition = $state({ left: "50%", transform: "translateX(-50%)" })
  let positionBelow = $state(false)

  onMount(() => {
    // Detect if device is mobile (touch-enabled)
    isMobile = window.matchMedia("(pointer: coarse)").matches

    // Close tooltip when clicking outside on mobile
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobile &&
        showTooltip &&
        tooltipElement &&
        triggerElement &&
        !tooltipElement.contains(event.target as Node) &&
        !triggerElement.contains(event.target as Node)
      ) {
        showTooltip = false
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  })

  $effect(() => {
    if (showTooltip && tooltipElement && triggerElement) {
      // Adjust position to prevent overflow
      const tooltipRect = tooltipElement.getBoundingClientRect()
      const triggerRect = triggerElement.getBoundingClientRect()
      const viewportWidth = window.innerWidth

      // Check if tooltip overflows the top of viewport
      if (tooltipRect.top < 8) {
        positionBelow = true
      } else {
        positionBelow = false
      }

      // Check if tooltip overflows on the right
      if (tooltipRect.right > viewportWidth - 8) {
        tooltipPosition = { left: "auto", transform: "none" }
        tooltipElement.style.right = "0"
        tooltipElement.style.left = "auto"
      }
      // Check if tooltip overflows on the left
      else if (tooltipRect.left < 8) {
        tooltipPosition = { left: "0", transform: "none" }
        tooltipElement.style.left = "0"
        tooltipElement.style.right = "auto"
      }
      // Center it if no overflow
      else {
        tooltipPosition = { left: "50%", transform: "translateX(-50%)" }
        tooltipElement.style.left = "50%"
        tooltipElement.style.right = "auto"
      }
    }
  })

  function toggleTooltip() {
    if (isMobile) {
      showTooltip = !showTooltip
    }
  }

  function handleMouseEnter() {
    if (!isMobile) {
      showTooltip = true
    }
  }

  function handleMouseLeave() {
    if (!isMobile) {
      showTooltip = false
    }
  }
</script>

<div class="relative inline-block">
  <button
    bind:this={triggerElement}
    type="button"
    onclick={toggleTooltip}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
  >
    {@render children()}
  </button>

  {#if showTooltip}
    <div
      bind:this={tooltipElement}
      class="absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg
             w-max max-w-[95vw]
             {positionBelow ? 'top-full mt-2' : 'bottom-full mb-2'}"
      style="left: {tooltipPosition.left}; transform: {tooltipPosition.transform};"
    >
      {@html content}
    </div>
  {/if}
</div>
