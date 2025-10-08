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
