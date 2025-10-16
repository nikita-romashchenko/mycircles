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

  export let data: any
</script>

<AuthDataManager />

<Sidebar.Provider>
  <CustomSidebar />
  <!-- <AppSidebar /> -->
  <Sidebar.Inset>
    <!-- <Header /> -->
    <header
      class="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear"
    >
      <div class="flex items-center gap-2 px-4">
        <Sidebar.Trigger class="-ml-1 fixed" />
        <!-- <Separator
          orientation="vertical"
          class="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb.Root>
          <Breadcrumb.List>
            <Breadcrumb.Item class="hidden md:block">
              <Breadcrumb.Link href="#"
                >Building Your Application</Breadcrumb.Link
              >
            </Breadcrumb.Item>
            <Breadcrumb.Separator class="hidden md:block" />
            <Breadcrumb.Item>
              <Breadcrumb.Page>Data Fetching</Breadcrumb.Page>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root> -->
      </div>
    </header>
    <div class="flex flex-col justify-center items-center py-5">
      <slot />
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>
