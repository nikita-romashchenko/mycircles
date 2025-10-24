<script lang="ts">
  import { Button } from "$lib/components/ui/button"
  import UserCheck from "@lucide/svelte/icons/user-check"
  import UserPlus from "@lucide/svelte/icons/user-plus"

  import { cn } from "$lib/utils"

  interface Props {
    isTrusted: boolean
    onTrust: () => Promise<void>
    onUntrust: () => Promise<void>
    class?: string
  }

  let {
    isTrusted = false,
    onTrust,
    onUntrust,
    class: className,
  }: Props = $props()
  let loading = $state(false)

  async function handleClick() {
    loading = true
    try {
      if (isTrusted) {
        await onUntrust()
        isTrusted = false
      } else {
        await onTrust()
        isTrusted = true
      }
    } catch (err) {
      console.error("Error toggling trust:", err)
    } finally {
      loading = false
    }
  }
</script>

<Button
  onclick={handleClick}
  disabled={loading}
  variant={isTrusted ? "ghost" : "ghost"}
  class={cn(
    `gap-2 ${isTrusted ? "text-red-500 border-red-500" : ""}`,
    className,
  )}
>
  {#if loading}
    Loading...
  {:else if isTrusted}
    <UserCheck class="w-4 h-4" />
    Untrust
  {:else}
    <UserPlus class="w-4 h-4" />
    Trust
  {/if}
</Button>
