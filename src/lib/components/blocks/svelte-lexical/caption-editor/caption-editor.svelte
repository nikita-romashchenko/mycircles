<script lang="ts">
  import {
    AutoFocusPlugin,
    CheckListPlugin,
    Composer,
    ContentEditable,
    HeadingNode,
    HorizontalRulePlugin,
    ListItemNode,
    ListNode,
    ListPlugin,
    PlaceHolder,
    QuoteNode,
    RichTextPlugin,
    SharedHistoryPlugin,
    ToolbarRichText,
    HorizontalRuleNode,
    OnChangePlugin,
  } from "svelte-lexical"
  import CaptionToolbar from "./caption-toolbar.svelte"

  let { theme, onChange } = $props()
  let composer: any
  const initialConfig = {
    namespace: "CaptionEditor",
    theme,
    nodes: [HeadingNode, ListNode, ListItemNode, QuoteNode, HorizontalRuleNode],
    onError: (error: any) => {
      throw error
    },
  }
  export function getEditor() {
    return composer.getEditor()
  }
  export function clear() {
    const editor = composer.getEditor()
    // Create an empty state and set it
    const emptyState = editor.parseEditorState({
      root: {
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [], // completely empty paragraph
            direction: "ltr",
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        version: 1,
      },
    })
    editor.setEditorState(emptyState)
  }
</script>

<Composer {initialConfig} bind:this={composer}>
  <div class="editor-shell svelte-lexical !m-0 [&_.toolbar]:!h-auto">
    <CaptionToolbar />
    <div class="editor-container">
      <div class="editor-scroller">
        <div class="editor">
          <ContentEditable />
          <PlaceHolder>Enter rich text...</PlaceHolder>
        </div>
      </div>
      <AutoFocusPlugin />
      <RichTextPlugin />
      <SharedHistoryPlugin />
      <ListPlugin />
      <CheckListPlugin />
      <HorizontalRulePlugin />
      <OnChangePlugin
        {onChange}
        ignoreHistoryMergeTagChange={true}
        ignoreSelectionChange={true}
      />
    </div>
  </div>
</Composer>
