<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog"
  import { superForm, filesProxy, fieldProxy } from "sveltekit-superforms"
  import { Input } from "$lib/components/ui/input"
  import { Button } from "$lib/components/ui/button"
  import Label from "$lib/components/ui/label/label.svelte"
  import { theme } from "svelte-lexical/dist/themes/default"
  import CaptionEditor from "../svelte-lexical/caption-editor/caption-editor.svelte"

  import type { UploadMediaSchema } from "$lib/validation/schemas"
  import type { Infer, SuperValidated } from "sveltekit-superforms"
  import type { EditorState } from "lexical"

  interface Props {
    open?: boolean
    pageForm: SuperValidated<Infer<UploadMediaSchema>>
  }

  let { open = $bindable(true), pageForm }: Props = $props()
  const { form, errors, enhance, reset } = superForm(pageForm)
  console.log("form initial values:", $form)
  const files = filesProxy(form, "media")
  const caption = fieldProxy(form, "caption")

  let captionEditorRef: any
  let search = ""
  let results: any[] = []
  let previews = $derived(
    $files.length > 0
      ? Array.from($files).map((file: File) => URL.createObjectURL(file))
      : [],
  )

  let showMedia = $state(false)
  let showCaption = $state(false)
  let showLocation = $state(false)

  function removeFile(index: number) {
    const arr = Array.from($files)
    arr.splice(index, 1) // remove the clicked file
    //TODO: possibly need $ syntax here
    files.set(arr) // update the filesProxy store
  }

  function handleEditorChange(editorState: EditorState) {
    console.log("Editor state changed:", editorState)
    const json = editorState.toJSON()
    console.log("JSON:", json)
    const jsonString = JSON.stringify(json)
    console.log("jsonString:", jsonString)
    $caption = jsonString
  }

  function toggleField(field: "media" | "caption" | "location", show: boolean) {
    // hide/show the field
    if (field === "media") showMedia = show
    if (field === "caption") showCaption = show
    if (field === "location") showLocation = show

    // if hiding -> reset that field in the form
    if (!show) {
      if (field === "media") $form.media = []
      if (field === "caption") {
        captionEditorRef.clear()
        $form.caption = ""
      }
      if (field === "location") $form.location = undefined
    }
    console.log(`form toggle ${field} ${show}:`, $form)
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      // Reset the form when the dialog is closed
      reset()
      showMedia = false
      showCaption = false
      showLocation = false
      console.log("form reset in UploadMediaDialog:", $form)
    }
  }
</script>

<Dialog.Root onOpenChange={handleOpenChange} bind:open>
  <!-- <Dialog.Trigger>Open</Dialog.Trigger> -->
  <Dialog.Content class="max-h-[90vh] overflow-auto">
    <Dialog.Header>
      <Dialog.Title>Upload media</Dialog.Title>
      <!-- <Dialog.Description>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Ratione
        expedita ad quod illo, et illum amet vitae modi distinctio mollitia non
        nesciunt nemo earum repellat atque maiores quas obcaecati tenetur.
      </Dialog.Description> -->
    </Dialog.Header>
    <form
      use:enhance
      enctype="multipart/form-data"
      method="POST"
      class="flex flex-col gap-4 p-4"
    >
      <!-- Drop zone container -->
      <!-- TODO: this is not good for accessibility -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      {#if showMedia}
        <Button
          class={"text-blue-500"}
          variant={"ghost"}
          onclick={() => toggleField("media", false)}>− Remove media</Button
        >
        <Label for="media">Media</Label>

        <div
          class="relative w-full h-40 border-2 border-dashed border-gray-300 rounded overflow-hidden cursor-pointer flex items-center justify-center"
        >
          <Input
            type="file"
            multiple
            name="media"
            accept="image/*,video/*"
            bind:files={$files}
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {#if $files.length > 0}
            <div
              class="absolute inset-0 p-2 grid grid-cols-3 gap-2 overflow-auto"
            >
              {#each previews as src, i}
                <!-- TODO: this is not good for accessibility -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <img
                  {src}
                  alt="Uploaded media"
                  class="w-full aspect-square object-cover rounded border hover:grayscale-50 transition-all"
                  loading="lazy"
                  onclick={() => removeFile(i)}
                  title="Click to remove"
                />
              {/each}
            </div>
          {:else}
            <span class="text-gray-400 z-10"
              >Drag & drop files here or click to select</span
            >
          {/if}
        </div>
        {#if $errors.media}
          <p class="error">{$errors.media[0]}</p>
        {/if}
      {:else}
        <Button
          class={"text-blue-500"}
          variant={"ghost"}
          onclick={() => toggleField("media", true)}>+ Add media</Button
        >{/if}

      {#if showCaption}
        <Button
          class={"text-blue-500"}
          variant={"ghost"}
          onclick={() => toggleField("caption", false)}>− Remove text</Button
        >
        <Label for="caption">Caption</Label>
        <CaptionEditor
          bind:this={captionEditorRef}
          {theme}
          onChange={handleEditorChange}
        />
      {:else}
        <Button
          class={"text-blue-500"}
          variant={"ghost"}
          onclick={() => toggleField("caption", true)}>+ Add text</Button
        >{/if}

      <Input type="hidden" name="caption" bind:value={$form.caption} />
      {#if $errors.caption}
        <p class="error">{$errors.caption[0]}</p>
      {/if}

      <!-- <Label for="caption">Caption</Label>
      <Input
        type="text"
        name="caption"
        bind:value={$form.caption}
        placeholder="caption"
      />
      {#if $errors.caption}
        <p class="error">{$errors.caption[0]}</p>
      {/if} -->

      <!-- <Label for="visibility">Visibility</Label>
      <select name="visibility" bind:value={$form.visibility}>
        <option value="public">Public</option>
        <option value="private">Private</option>
        <option value="friends">Friends</option>
      </select>
      {#if $errors.visibility}
        <p class="error">{$errors.visibility[0]}</p>
      {/if} -->

      <!-- location dropdown here -->
      {#if showLocation}
        <Button
          class={"text-blue-500"}
          variant={"ghost"}
          onclick={() => toggleField("location", false)}
          >− Remove location</Button
        >
        <Label for="location">Location</Label>
        <Input
          type="text"
          name="location"
          bind:value={$form.location}
          placeholder="location"
        />
        {#if $errors.location}
          <p class="error">{$errors.location[0]}</p>
        {/if}
      {:else}
        <Button
          class={"text-blue-500"}
          variant={"ghost"}
          onclick={() => toggleField("location", true)}>+ Add location</Button
        >{/if}

      {#if !(!showMedia && !showCaption && !showLocation)}
        <div class="flex flex-col items-center justify-center mt-4">
          <Button
            disabled={!$form.caption && $form.media.length === 0}
            type="submit">Upload</Button
          >
        </div>
      {/if}
    </form>
  </Dialog.Content>
</Dialog.Root>
