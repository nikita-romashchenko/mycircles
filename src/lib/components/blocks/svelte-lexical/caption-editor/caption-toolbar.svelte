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
  } from "svelte-lexical"
</script>

<Toolbar>
  {#snippet children({ editor, activeEditor, blockType })}
    <div class="flex flex-col">
      <div class="flex flex-row">
        <FontFamilyDropDown />
        <FontSizeDropDown />
        <Divider />
        <BoldButton />
        <ItalicButton />
        <UnderlineButton />
      </div>
      <div class="flex flex-row">
        <StrikethroughButton />
        <FormatCodeButton />
        <Divider />
        <DropDownAlign />
      </div>
    </div>
  {/snippet}
</Toolbar>
