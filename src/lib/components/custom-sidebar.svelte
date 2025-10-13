<script lang="ts" module>
  import AudioWaveformIcon from "@lucide/svelte/icons/audio-waveform"
  import CommandIcon from "@lucide/svelte/icons/command"
  import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end"
  import { page } from "$app/state"
  import HomeIcon from "@lucide/svelte/icons/home"
  import { SignIn, SignOut } from "@auth/sveltekit/components"

  // This is sample data.
  const data = {
    versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
    teams: [
      {
        name: "Acme Inc",
        logo: GalleryVerticalEndIcon,
        plan: "Enterprise",
      },
      {
        name: "Acme Corp.",
        logo: AudioWaveformIcon,
        plan: "Startup",
      },
      {
        name: "Evil Corp.",
        logo: CommandIcon,
        plan: "Free",
      },
    ],
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
  import NavMain from "./nav-main.svelte"
  import NavProjects from "./nav-projects.svelte"
  import NavUser from "./nav-user.svelte"
  import TeamSwitcher from "./team-switcher.svelte"
  import * as Sidebar from "$lib/components/ui/sidebar/index"
  import type { ComponentProps } from "svelte"
  import NavUserCustom from "./nav-user-custom.svelte"

  let {
    ref = $bindable(null),
    collapsible = "icon",
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props()
</script>

<Sidebar.Root {collapsible} {...restProps}>
  <Sidebar.Header>
    <TeamSwitcher teams={data.teams} />
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
    {:else}{/if}
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>
