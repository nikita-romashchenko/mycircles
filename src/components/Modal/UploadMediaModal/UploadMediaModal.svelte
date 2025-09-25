<script lang="ts">
  import { superForm, filesProxy } from "sveltekit-superforms"
  import Modal from "$components/Modal/Modal.svelte"
  import type { SuperValidated, Infer } from "sveltekit-superforms"
  import type { UploadMediaSchema } from "$lib/validation/schemas"

  export let open = false
  export let pageForm: SuperValidated<Infer<UploadMediaSchema>>

  const { form, errors, enhance } = superForm(pageForm)

  // function handleSelectLocation(selected: any) {
  //   form.data.location = selected
  // }

  const files = filesProxy(form, "media")

  // Reactive array of preview URLs
  let previews: string[] = []

  // Reactive update when files change
  $: if ($files.length > 0) {
    previews = Array.from($files).map((file: File) => URL.createObjectURL(file))
  }

  function removeFile(index: number) {
    const arr = Array.from($files)
    arr.splice(index, 1) // remove the clicked file
    files.set(arr) // update the filesProxy store
  }
</script>

<Modal bind:open>
  <form
    use:enhance
    enctype="multipart/form-data"
    method="POST"
    class="flex flex-col gap-4 p-4"
  >
    <label for="media">Media</label>
    <!-- Drop zone container -->
    <!-- TODO: this is not good for accessibility -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->

    <div
      class="relative w-full h-40 border-2 border-dashed border-gray-300 rounded overflow-hidden cursor-pointer flex items-center justify-center"
      on:dragover|preventDefault
      on:drop|preventDefault
    >
      <!-- File input covers the whole div -->
      <input
        type="file"
        multiple
        accept="image/*,video/*"
        bind:files={$files}
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <!-- Preview container fills the drop zone -->
      {#if $files.length > 0}
        <div class="absolute inset-0 p-2 grid grid-cols-3 gap-2 overflow-auto">
          {#each previews as src, i}
            <!-- TODO: this is not good for accessibility -->
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <img
              {src}
              alt="Uploaded media"
              class="w-full aspect-square object-cover rounded border hover:grayscale-50 transition-all"
              loading="lazy"
              on:click={() => removeFile(i)}
              title="Click to remove"
            />
          {/each}
        </div>
      {:else}
        <!-- Placeholder text dead center -->
        <span class="text-gray-400 z-10"
          >Drag & drop files here or click to select</span
        >
      {/if}
    </div>
    {#if $errors.media}
      <p class="error">{$errors.media[0]}</p>
    {/if}

    <label for="caption">Caption</label>
    <input
      type="text"
      name="caption"
      bind:value={$form.caption}
      placeholder="caption"
    />
    {#if $errors.caption}
      <p class="error">{$errors.caption[0]}</p>
    {/if}

    <label for="visibility">Visibility</label>
    <select name="visibility" bind:value={$form.visibility}>
      <option value="public">Public</option>
      <option value="private">Private</option>
      <option value="friends">Friends</option>
    </select>
    {#if $errors.visibility}
      <p class="error">{$errors.visibility[0]}</p>
    {/if}

    <!-- location dropdown here -->
    <label for="location">Location</label>
    <input
      type="text"
      name="location"
      bind:value={$form.location}
      placeholder="location"
    />
    {#if $errors.location}
      <p class="error">{$errors.location[0]}</p>
    {/if}
    <div class="flex flex-col items-center justify-center mt-4">
      <button type="submit" class="rounded-md bg-blue-500 text-white p-2"
        >Upload</button
      >
    </div>
  </form>
</Modal>
