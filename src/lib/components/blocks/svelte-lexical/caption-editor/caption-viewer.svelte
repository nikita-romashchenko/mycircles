<script lang="ts">
  import { Composer, RichTextPlugin } from "svelte-lexical"

  let { captionJSONstring } = $props()
  let composer: any
  const initialConfig = {
    namespace: "CaptionViewer",
    theme: {},
    editable: false,
    onError: (error: any) => console.error(error),
    editorState: (editor: any) => {
      // Load the saved state
      const state = editor.parseEditorState(captionJSONstring)
      editor.setEditorState(state)
    },
  }
  export function getEditor() {
    return composer.getEditor()
  }
</script>

<Composer {initialConfig} bind:this={composer}>
  <RichTextPlugin />
</Composer>
