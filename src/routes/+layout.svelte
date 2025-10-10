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

<!-- <div class="container">
  <Header />

  <slot />
  <Footer />
</div> -->

<Sidebar.Provider>
  <CustomSidebar />
  <!-- <AppSidebar /> -->
  <Sidebar.Inset>
    <header
      class="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear"
    >
      <div class="flex items-center gap-2 px-4">
        <Sidebar.Trigger class="-ml-1" />
        <Separator
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
        </Breadcrumb.Root>
      </div>
    </header>
    <!-- <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div class="grid auto-rows-min gap-4 md:grid-cols-3">
        <div class="bg-muted/50 aspect-video rounded-xl"></div>
        <div class="bg-muted/50 aspect-video rounded-xl"></div>
        <div class="bg-muted/50 aspect-video rounded-xl"></div>
      </div>
      <div
        class="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min"
      ></div>
    </div> -->
    <div class="flex flex-col justify-center items-center py-5">
      <slot />
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>

<!-- <style>
  :global(body) {
    font-family:
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      "Helvetica Neue",
      Arial,
      "Noto Sans",
      sans-serif,
      "Apple Color Emoji",
      "Segoe UI Emoji",
      "Segoe UI Symbol",
      "Noto Color Emoji";
    padding: 0 1rem 0rem 1rem;
    max-width: 768px;
    margin: 0 auto;
    background: #fff;
    color: #333;
  }
  :global(li),
  :global(p) {
    line-height: 1.5rem;
  }
  :global(a) {
    font-weight: 500;
  }
  :global(hr) {
    border: 1px solid #ddd;
  }
  :global(iframe) {
    background: #ccc;
    border: 1px solid #ccc;
    height: 10rem;
    width: 100%;
    border-radius: 0.5rem;
    filter: invert(1);
  }
  .container {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;
  }
</style> -->
