<script lang="ts">
  import { page } from "$app/state"
  import { RichTextComposer } from "svelte-lexical"
  import { theme } from "svelte-lexical/dist/themes/default"
</script>

{#if page.data.session}
  <RichTextComposer {theme} />
{:else}
  <h1>Access Denied</h1>
{/if}
