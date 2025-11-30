<script lang="ts">
  import { page } from "$app/state"
  import { signIn } from "@auth/sveltekit/client"
  import HomeIcon from "@lucide/svelte/icons/home"
  import UserIcon from "@lucide/svelte/icons/user"
  import LogIn from "@lucide/svelte/icons/log-in"

  // Derive safeAddress and pathname from page state (note: page without $ prefix)
  const safeAddress = $derived(page.data.session?.user?.safeAddress)
  const pathname = $derived(page.url.pathname)
  const isLoggedIn = $derived(!!page.data.session)
  const isOnSigninPage = $derived(pathname.startsWith('/signin'))

  // Navigation items for logged out users
  const loggedOutItems = [
    {
      title: "Feed",
      url: "/",
      icon: HomeIcon,
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
      title: "Profile",
      url: `/${safeAddress}`,
      icon: UserIcon,
    }
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
          class:text-primary={pathname === item.url}
          aria-label={item.title}
        >
          <item.icon class="h-6 w-6" />
        </a>
      {:else if 'action' in item && item.action}
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
