<script lang="ts" module>
  import HomeIcon from "@lucide/svelte/icons/home"
  import UserIcon from "@lucide/svelte/icons/user"
</script>

<script lang="ts">
  import { page } from "$app/state"
  import * as Sidebar from "$lib/components/ui/sidebar/index"
  import type { ComponentProps } from "svelte"
  import NavUserCustom from "./nav-user-custom.svelte"
  import { signIn, signOut } from "@auth/sveltekit/client"
  import LogIn from "@lucide/svelte/icons/log-in"
  import LogOut from "@lucide/svelte/icons/log-out"

  let {
    ref = $bindable(null),
    collapsible = "icon",
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props()

  // Derive safeAddress and data from page state
  const safeAddress = $derived(page.data.session?.user?.safeAddress)

  const data = $derived({
    navMain: [
      {
        title: "Navigation",
        url: "#",
        items: [
          {
            title: "Home",
            url: "/",
            isActive: true,
            icon: HomeIcon,
          },
          ...(page.data.session
            ? [
                {
                  title: "Profile",
                  url: `/${safeAddress}`,
                  isActive: true,
                  icon: UserIcon,
                },
              ]
            : []),
        ],
      },
    ],
  })
</script>

<Sidebar.Root {collapsible} {...restProps}>
  <Sidebar.Header>
    <Sidebar.MenuItem>
      <Sidebar.MenuButton>
        {#snippet child({ props })}
          <a href="/" {...props}>
            <span class="text-lg font-medium">MyCircles</span>
          </a>
        {/snippet}
      </Sidebar.MenuButton>
    </Sidebar.MenuItem>
  </Sidebar.Header>
  <Sidebar.Content>
    {#each data.navMain as group (group.title)}
      <Sidebar.Group>
        <Sidebar.GroupLabel>{group.title}</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each group.items as item (item.title)}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton isActive={item.isActive}>
                  {#snippet child({ props })}
                    <a href={item.url} {...props}>
                      {#if item.icon}
                        <item.icon />
                      {/if}
                      <span>{item.title}</span>
                    </a>
                  {/snippet}
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/each}
  </Sidebar.Content>
  <Sidebar.Footer>
    <!-- <NavUser user={data.user} /> -->
    {#if page.data.session}
      <Sidebar.Menu>
        <Sidebar.MenuItem onclick={() => signOut()}>
          <Sidebar.MenuButton class="cursor-pointer">
            {#snippet child({ props })}
              <div {...props}>
                <LogOut />
                <span>Sign out</span>
              </div>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    {:else}
      <Sidebar.Menu>
        <Sidebar.MenuItem onclick={() => signIn()}>
          <Sidebar.MenuButton class="cursor-pointer">
            {#snippet child({ props })}
              <div {...props}>
                <LogIn />
                <span>Sign in</span>
              </div>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    {/if}
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>
