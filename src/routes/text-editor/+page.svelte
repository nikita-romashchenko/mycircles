<script lang="ts">
  import { page } from "$app/state"
  import { RichTextComposer } from "svelte-lexical"
  import { theme } from "svelte-lexical/dist/themes/default"
  import { OnChangePlugin } from "svelte-lexical"
  import CaptionEditor from "$lib/components/blocks/svelte-lexical/caption-editor/caption-editor.svelte"
  import type { EditorState } from "lexical"

  let editorContent = $state<any>()
  let hiddenInput: HTMLInputElement

  const handleChange = (editorState: EditorState) => {
    console.log("Editor state changed:", editorState)
    const json = JSON.stringify(editorState)
    console.log("JSON:", json)
    if (hiddenInput) {
      hiddenInput.value = JSON.stringify(json)
    }
  }
</script>

{#if page.data.session}
  <RichTextComposer {theme} />

  <CaptionEditor {theme} onChange={handleChange} />

  <input type="hidden" bind:this={hiddenInput} name="content" />

  <!-- 
  <input
    type="hidden"
    bind:this={hiddenInput}
    name="content"
    value={JSON.stringify(editorContent)}
  /> -->

  {#if editorContent}
    <pre>{JSON.stringify(editorContent, null, 2)}</pre>
  {/if}
{:else}
  <h1>Access Denied</h1>
{/if}
