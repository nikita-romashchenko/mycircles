<script lang="ts">
  import { run, createBubbler, preventDefault } from "svelte/legacy"

  const bubble = createBubbler()
  import { superForm, filesProxy } from "sveltekit-superforms"
  import Modal from "$components/Modal/Modal.svelte"
  import type { SuperValidated, Infer } from "sveltekit-superforms"
  import type { UploadMediaSchema } from "$lib/validation/schemas"

  interface Props {
    open?: boolean
    pageForm: SuperValidated<Infer<UploadMediaSchema>>
  }

  let { open = $bindable(true), pageForm }: Props = $props()
  const { form, errors, enhance } = superForm(pageForm)
  const files = filesProxy(form, "media")

  let search = ""
  let results: any[] = []
  let previews = $derived(
    user?.name
      ? user.name
          .split(" ")
          .map((word) => word[0])
          .slice(0, 2) // take first 2 words (first + surname)
          .join("")
          .toUpperCase()
      : "",
  )

  // Reactive update when files change
  // run(() => {
  //   if ($files.length > 0) {
  //     previews = Array.from($files).map((file: File) =>
  //       URL.createObjectURL(file),
  //     )
  //   }
  // })

  function removeFile(index: number) {
    const arr = Array.from($files)
    arr.splice(index, 1) // remove the clicked file
    files.set(arr) // update the filesProxy store
  }

  async function fetchLocations() {
    if (!search) return
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&addressdetails=1&limit=10`,
    )
    results = await res.json()
  }

  // function selectLocation(result: {
  //   display_name: string
  //   lat: string
  //   lon: string
  // }) {
  //   $form.location = {
  //     displayName: result.display_name,
  //     lat: result.lat,
  //     lon: result.lon,
  //   }

  //   // clear search results
  //   results = []
  //   search = result.display_name
  // }

  function selectLocation(result: string) {
    $form.location = result

    // clear search results
    results = []
    search = result
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
    <!-- svelte-ignore a11y_no_static_element_interactions -->

    <div
      class="relative w-full h-40 border-2 border-dashed border-gray-300 rounded overflow-hidden cursor-pointer flex items-center justify-center"
      ondragover={preventDefault(bubble("dragover"))}
      ondrop={preventDefault(bubble("drop"))}
    >
      <input
        type="file"
        multiple
        name="media"
        accept="image/*,video/*"
        bind:files={$files}
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      {#if $files.length > 0}
        <div class="absolute inset-0 p-2 grid grid-cols-3 gap-2 overflow-auto">
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
