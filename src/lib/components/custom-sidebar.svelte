<script lang="ts" module>
  import { page } from "$app/state"
  import HomeIcon from "@lucide/svelte/icons/home"
  import { signIn } from "@auth/sveltekit/client"

  // This is sample data.
  const data = {
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
        ],
      },
    ],
  }
</script>

<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index"
  import type { ComponentProps } from "svelte"
  import NavUserCustom from "./nav-user-custom.svelte"
  import LogIn from "@lucide/svelte/icons/log-in"

  let {
    ref = $bindable(null),
    collapsible = "icon",
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props()
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
    {#if page.data.session?.user}
      <NavUserCustom user={page.data.session?.user} />
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
