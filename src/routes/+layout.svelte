<script lang="ts">
  import "../app.css"
  import AuthDataManager from "$lib/components/AuthDataManager.svelte"
  import BottomNav from "$lib/components/ui/bottom-nav.svelte"
  import { avatarStore } from "$lib/stores/circlesAvatar.svelte"
  import { initializeSafeBrowserRunner } from "$lib/stores/safeBrowserRunner.svelte"
  import { page } from "$app/stores"
  import { browser } from "$app/environment"

  let { data }: { data: any } = $props()

  // Initialize avatar and SafeBrowserRunner when user is logged in
  // Track only the safeAddress to avoid unnecessary re-initializations
  $effect(() => {
    if (!browser) return

    const safeAddress = $page.data.session?.user?.safeAddress
    if (safeAddress) {
      console.log('🔄 Initializing avatar for user:', safeAddress)
      avatarStore.initialize(safeAddress)

      // Initialize SafeBrowserRunner for batch transactions
      initializeSafeBrowserRunner(safeAddress)
        .then(() => {
          console.log('✅ SafeBrowserRunner initialized for user:', safeAddress)
        })
        .catch((err) => {
          console.error('❌ Failed to initialize SafeBrowserRunner:', err)
        })
    } else {
      console.log('🔄 No session, resetting avatar')
      avatarStore.reset()
    }
  })
</script>

<AuthDataManager />

<div class="no-scrollbar overflow-y-auto h-full pb-16">
  <slot />
</div>
<BottomNav />
