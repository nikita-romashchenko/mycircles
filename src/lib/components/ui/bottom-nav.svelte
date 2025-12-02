<script lang="ts">
  import { page } from "$app/state"
  import { signIn } from "@auth/sveltekit/client"
  import HomeIcon from "@lucide/svelte/icons/home"
  import MapIcon from "@lucide/svelte/icons/map"
  import UserIcon from "@lucide/svelte/icons/user"
  import LogIn from "@lucide/svelte/icons/log-in"
  import BellIcon from "@lucide/svelte/icons/bell"
  import { Badge } from "$lib/components/ui/badge/index"
  import { unreadNotificationsCount, fetchUnreadCount } from "$lib/stores/notifications.svelte"

  // Derive safeAddress and pathname from page state (note: page without $ prefix)
  const safeAddress = $derived(page.data.session?.user?.safeAddress)
  const pathname = $derived(page.url.pathname)
  const isLoggedIn = $derived(!!page.data.session)
  const isOnSigninPage = $derived(pathname.startsWith("/signin"))

  // Fetch unread notifications count when logged in
  $effect(() => {
    if (isLoggedIn) {
      fetchUnreadCount()
    }
  })

  // Refresh count when navigating away from notifications page
  $effect(() => {
    if (isLoggedIn && pathname !== "/notifications") {
      fetchUnreadCount()
    }
  })

  // Periodically refresh notification count every 20 seconds
  $effect(() => {
    if (!isLoggedIn) return

    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 20000) // 20 seconds

    return () => clearInterval(interval)
  })

  // Navigation items for logged out users
  const loggedOutItems = [
    {
      title: "Feed",
      url: "/",
      icon: HomeIcon,
    },
    {
      title: "Map",
      url: "/map",
      icon: MapIcon,
    },
    {
      title: "Sign in",
      icon: LogIn,
      action: () => signIn(),
    },
  ]

  // Navigation items for logged in users (reactive)
  const loggedInItems = $derived([
    {
      title: "Feed",
      url: "/",
      icon: HomeIcon,
    },
    {
      title: "Map",
      url: "/map",
      icon: MapIcon,
    },
    {
      title: "Profile",
      url: `/${safeAddress}`,
      icon: UserIcon,
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: BellIcon,
      hasBadge: true,
    },
  ])

  const navItems = $derived(isLoggedIn ? loggedInItems : loggedOutItems)
</script>

<nav
  class="DESKTOP_VIEWPORT fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
>
  <div class="h-16 flex items-center justify-around px-2">
    {#each navItems as item (item.title)}
      {#if item.url}
        <!-- Navigation link -->
        <a
          href={item.url}
          class="flex items-center justify-center px-4 py-2 rounded-lg transition-colors hover:bg-accent"
          class:text-primary={item.url === '/' ? pathname === '/' : pathname.startsWith(item.url)}
          aria-label={item.title}
        >
          <div class="relative">
            <item.icon class="h-6 w-6" />
            {#if "hasBadge" in item && item.hasBadge && $unreadNotificationsCount > 0}
              <Badge
                variant="default"
                class="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-1 text-xs"
              >
                {$unreadNotificationsCount}
              </Badge>
            {/if}
          </div>
        </a>
      {:else if "action" in item && item.action}
        <!-- Action button -->
        <button
          onclick={item.action}
          class="flex items-center justify-center px-4 py-2 rounded-lg transition-colors hover:bg-accent cursor-pointer"
          class:text-primary={item.title === "Sign in" && isOnSigninPage}
          aria-label={item.title}
        >
          <item.icon class="h-6 w-6" />
        </button>
      {/if}
    {/each}
  </div>
</nav>
