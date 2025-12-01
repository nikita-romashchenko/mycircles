<script lang="ts">
  import { signOut } from "@auth/sveltekit/client"
  import { Button } from "$lib/components/ui/button"
  import LogOut from "@lucide/svelte/icons/log-out"
  import { goto } from "$app/navigation"
  import { clearAuthData } from "$lib/utils/authStorage"
  import { avatarStore } from "$lib/stores/safe4337.svelte"

  async function handleSignOut() {
    // Clear auth data from localStorage (including private key)
    clearAuthData()

    // Clear avatar store
    avatarStore.clear()

    // Sign out from auth session
    await signOut({ redirect: false })

    // Redirect to home
    goto('/')
  }
</script>

<div class="w-full max-w-3xl mx-auto p-6">
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold mb-2">Settings</h1>
      <p class="text-gray-500 text-sm">Manage your account settings and preferences</p>
    </div>

    <hr />

    <!-- Placeholder for future settings -->
    <div class="flex flex-col gap-4">
      <div>
        <h2 class="text-lg font-semibold mb-1">Additional Settings</h2>
        <p class="text-gray-500 text-sm">More settings coming soon...</p>
      </div>
    </div>

    <hr />

    <!-- Sign Out Section - Less prominent at bottom -->
    <div class="flex flex-col gap-2 mt-4">
      <Button
        onclick={handleSignOut}
        variant="ghost"
        class="gap-2 w-fit text-gray-500 hover:text-gray-700"
      >
        <LogOut class="w-4 h-4" />
        Sign Out
      </Button>
    </div>
  </div>
</div>
