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
  <Sidebar.Inset>
    <header
      class="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear"
    >
      <div class="flex items-center gap-2 px-4">
        <Sidebar.Trigger class="-ml-1 fixed" />
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
