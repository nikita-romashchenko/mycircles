<script lang="ts">
  import {
    BoldButton,
    Divider,
    ItalicButton,
    UnderlineButton,
    StrikethroughButton,
    FormatCodeButton,
    DropDownAlign,
    FontFamilyDropDown,
    FontSizeDropDown,
    Toolbar,
    BlockFormatDropDown,
    ParagraphDropDownItem,
    HeadingDropDownItem,
    NumberDropDrownItem,
    BulletDropDrownItem,
    CheckDropDrownItem,
    QuoteDropDrownItem,
  } from "svelte-lexical"
</script>

<Toolbar>
  {#snippet children({ editor, activeEditor, blockType })}
    <BoldButton />
    <ItalicButton />
    <UnderlineButton />
    <StrikethroughButton />
    <FormatCodeButton />
  {/snippet}
</Toolbar>
