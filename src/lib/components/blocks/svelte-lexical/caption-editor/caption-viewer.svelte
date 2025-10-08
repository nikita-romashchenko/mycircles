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
  import { truncateLexicalJson, countLexicalCharacters } from "$lib/utils/post"
  import Button from "$lib/components/ui/button/button.svelte"

  let { theme, captionJSONstring } = $props()
  const parsed = JSON.parse(captionJSONstring)
  const charCount = countLexicalCharacters(parsed)
  const previewCharLimit = 200
  const preview = truncateLexicalJson(parsed, previewCharLimit)
  const initialConfig = {
    namespace: "CaptionViewer",
    theme,
    editable: false,
    onError: (error: any) => console.error(error),
  }
  let isUsingPreview = $state(false)
  let previewMode = $state(false)
  let composer: any

  export function getEditor() {
    return composer.getEditor()
  }

  onMount(() => {
    console.log("entering onMount")
    if (composer && captionJSONstring) {
      if (charCount <= previewCharLimit) {
        isUsingPreview = false
        previewMode = false
        setEditorState(parsed)
      } else {
        isUsingPreview = true
        previewMode = true
        setEditorState(preview)
      }
    }
  })

  const setEditorState = (state: any) => {
    const editor: LexicalEditor = composer.getEditor()
    const editorState = editor.parseEditorState(state)
    editor.setEditorState(editorState)
  }
</script>

<Composer {initialConfig} bind:this={composer}>
  <ContentEditable className={"!min-h-auto"} />
  {#if isUsingPreview}
    {#if previewMode}
      <Button
        variant="ghost"
        onclick={() => {
          previewMode = false
          setEditorState(parsed)
        }}
      >
        Read more
      </Button>
    {:else}
      <Button
        variant="ghost"
        onclick={() => {
          previewMode = true
          setEditorState(preview)
        }}
      >
        Show less
      </Button>
    {/if}
  {/if}
</Composer>
