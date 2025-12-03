<script lang="ts">
  import "../app.css"
  import AuthDataManager from "$lib/components/AuthDataManager.svelte"
  import BottomNav from "$lib/components/ui/bottom-nav.svelte"
  import CommentsDialog from "$components/Post/CommentsDialog.svelte"
  import { avatarStore } from "$lib/stores/safe4337.svelte"
  import { page } from "$app/stores"
  import { browser } from "$app/environment"

  let { data }: { data: any } = $props()

  // Initialize avatar with Safe4337Runner when user is logged in
  // This provides gasless transactions through account abstraction
  $effect(() => {
    if (!browser) return

    const safeAddress = $page.data.session?.user?.safeAddress
    if (safeAddress) {
      console.log('🔄 Initializing Safe 4337 avatar for user:', safeAddress)
      avatarStore.initialize(safeAddress)
    } else {
      console.log('🔄 No session, clearing avatar')
      avatarStore.clear()
    }
  })
</script>

<AuthDataManager />

<div class="no-scrollbar overflow-y-auto h-full pb-16">
  <slot />
</div>
<BottomNav />

<!-- Single shared comments dialog for all posts -->
<CommentsDialog />
