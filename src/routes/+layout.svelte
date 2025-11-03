<script lang="ts">
  import "../app.css"
  import Header from "$components/header.svelte"
  import Footer from "$components/footer.svelte"
  import AuthDataManager from "$lib/components/AuthDataManager.svelte"
  import * as Sidebar from "$lib/components/ui/sidebar/index"
  import CustomSidebar from "$lib/components/custom-sidebar.svelte"
  import AppSidebar from "$lib/components/app-sidebar.svelte"
  import { Separator } from "$lib/components/ui/separator"
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index"
  import Bell from "@lucide/svelte/icons/bell"
  import { onMount } from "svelte"
  import { goto } from "$app/navigation"
  import { Badge } from "$lib/components/ui/badge/index"
  import {
    unreadNotificationsCount,
    fetchUnreadCount,
  } from "$lib/stores/notifications.svelte"

  export let data: any

  function handleBellClick() {
    goto("/notifications")
  }

  onMount(() => {
    fetchUnreadCount()
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  })
</script>

<AuthDataManager />

<Sidebar.Provider>
  <CustomSidebar />
  <Sidebar.Inset>
    <header
      class="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear"
    >
      <div class="flex items-center justify-between w-full gap-2 px-4">
        <Sidebar.Trigger class="-ml-1 fixed z-50" />
        <button
          on:click={handleBellClick}
          class="fixed top-4 right-4 z-50 p-2 rounded-full hover:bg-gray-100 bg-white border transition cursor-pointer {$unreadNotificationsCount >
          0
            ? 'text-red-600'
            : 'text-gray-600'}"
        >
          <Bell size={24} />
          {#if $unreadNotificationsCount > 0}
            <Badge
              variant="destructive"
              class="absolute -top-1 -right-1 rounded-full min-w-5 h-5 flex items-center justify-center px-1"
            >
              {$unreadNotificationsCount}
            </Badge>
          {/if}
        </button>
      </div>
    </header>
    <div class="flex flex-col justify-center items-center py-5">
      <slot />
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>

<!-- <div>
  <Header />
  <slot />
  <Footer />
</div> -->
