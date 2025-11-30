<script lang="ts">
  import { signOut } from "@auth/sveltekit/client"
  import { Button } from "$lib/components/ui/button"
  import LogOut from "@lucide/svelte/icons/log-out"

  async function handleSignOut() {
    await signOut()
  }
</script>

<div class="w-full max-w-3xl mx-auto p-6">
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold mb-2">Settings</h1>
      <p class="text-gray-500 text-sm">Manage your account settings and preferences</p>
    </div>

    <hr />

    <!-- Sign Out Section -->
    <div class="flex flex-col gap-4">
      <div>
        <h2 class="text-lg font-semibold mb-1">Account</h2>
        <p class="text-gray-500 text-sm">Sign out of your account</p>
      </div>

      <Button
        onclick={handleSignOut}
        variant="destructive"
        class="gap-2 w-fit"
      >
        <LogOut class="w-4 h-4" />
        Sign Out
      </Button>
    </div>

    <hr />

    <!-- Placeholder for future settings -->
    <div class="flex flex-col gap-4">
      <div>
        <h2 class="text-lg font-semibold mb-1">Additional Settings</h2>
        <p class="text-gray-500 text-sm">More settings coming soon...</p>
      </div>
    </div>
  </div>
</div>
