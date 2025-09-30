<script lang="ts">
  import "../app.css"
  import Header from "$components/header.svelte"
  import Footer from "$components/footer.svelte"
  import AuthDataManager from "$lib/components/AuthDataManager.svelte"
  import { onMount } from "svelte"
  import { globalState } from "$lib/stores/globalState.svelte"
  import { globalState as reactiveState } from "$lib/stores/state.svelte"

  export let data: any

  // onMount(() => {
  //   // set data
  //   console.log(
  //     "Setting relation data in global state:",
  //     data.relationsWithProfiles,
  //   )
  //   globalState.setMyRelationData(data.relationsWithProfiles)

  //   console.log(
  //     "Current relation data in global state:",
  //     globalState.myRelationData,
  //   )

  //   // start timer (e.g., 5s)
  //   console.log("Starting timer to clear relation data in 10s")
  //   const timer = setTimeout(() => {
  //     console.log("Clearing relation data from global state")
  //     globalState.clearMyRelationData()
  //     console.log(
  //       "Current relation data in global state:",
  //       globalState.myRelationData,
  //     )
  //   }, 10000)

  onMount(() => {
    // set data
    console.log(
      "Setting relation data in global state:",
      reactiveState.relations,
    )
    reactiveState.relations = data.relationsWithProfiles

    console.log(
      "Current relation data in global state:",
      reactiveState.relations,
    )

    // start timer (e.g., 5s)
    console.log("Starting timer to clear relation data in 10s")
    const timer = setTimeout(() => {
      console.log("Clearing relation data from global state")
      reactiveState.relations = []
      console.log(
        "Current relation data in global state:",
        reactiveState.relations,
      )
    }, 10000)

    // cleanup
    return () => clearTimeout(timer)
  })
</script>

<AuthDataManager />

<div class="container">
  <Header />
  {#if globalState.myRelationData}
    <div class="relations-debug">
      <h3>Relation Data (Debug)</h3>
      <pre>{JSON.stringify(globalState.myRelationData, null, 2)}</pre>
    </div>
  {:else}
    <p>No relations loaded</p>
  {/if}

  {#if reactiveState.relations.length > 0}
    <div class="relations-debug">
      <h3>Relation Data (Debug)</h3>
      <pre>{JSON.stringify(reactiveState.relations, null, 2)}</pre>
    </div>
  {:else}
    <p>No relations loaded</p>
  {/if}
  <slot />
  <Footer />
</div>

<style>
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
</style>
