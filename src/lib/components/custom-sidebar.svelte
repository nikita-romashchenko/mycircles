<script lang="ts" module>
  import AudioWaveformIcon from "@lucide/svelte/icons/audio-waveform"
  import BookOpenIcon from "@lucide/svelte/icons/book-open"
  import BotIcon from "@lucide/svelte/icons/bot"
  import ChartPieIcon from "@lucide/svelte/icons/chart-pie"
  import CommandIcon from "@lucide/svelte/icons/command"
  import FrameIcon from "@lucide/svelte/icons/frame"
  import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end"
  import MapIcon from "@lucide/svelte/icons/map"
  import Settings2Icon from "@lucide/svelte/icons/settings-2"
  import SquareTerminalIcon from "@lucide/svelte/icons/square-terminal"
  import { page } from "$app/state"

  // This is sample data.
  const data = {
    versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
    user: {
      name: "shadcn",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
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
    <!-- <NavMain items={data.navMain} />
    <NavProjects projects={data.projects} /> -->
    <!-- We create a Sidebar.Group for each parent. -->
    {#each data.navMain as group (group.title)}
      <Sidebar.Group>
        <Sidebar.GroupLabel>{group.title}</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each group.items as item (item.title)}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton isActive={item.isActive}>
                  {#snippet child({ props })}
                    <a href={item.url} {...props}>{item.title}</a>
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
    <NavUser user={data.user} />
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>
