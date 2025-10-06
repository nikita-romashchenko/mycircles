<script lang="ts">
  import {
    Composer,
    ContentEditable,
    RichTextPlugin,
    ToolbarRichText,
  } from "svelte-lexical"
  import type { SerializedEditorState, LexicalEditor } from "lexical"
  import { onMount } from "svelte"
  import CaptionToolbar from "./caption-toolbar.svelte"

  let { theme, captionJSONstring } = $props()
  let composer: any
  const initialConfig = {
    namespace: "CaptionViewer",
    theme,
    editable: false,
    onError: (error: any) => console.error(error),
  }
  export function getEditor() {
    return composer.getEditor()
  }

  onMount(() => {
    console.log("entering onMount")
    if (composer && captionJSONstring) {
      console.log("setting captionJSONstring:", captionJSONstring)
      const editor: LexicalEditor = composer.getEditor()
      const editorState = editor.parseEditorState(captionJSONstring)
      editor.setEditorState(editorState)
    }
  })
</script>

<Composer {initialConfig} bind:this={composer}>
  <ContentEditable />
</Composer>
