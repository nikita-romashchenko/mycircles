<script lang="ts">
  import { superForm } from "sveltekit-superforms"
  import Modal from "$components/Modal/Modal.svelte"
  import { enhance } from "$app/forms"

  export let open = false
  export let form: any

  // If you need, you can destructure fields:
  const { fields, errors } = form

  function handleSelectLocation(selected: any) {
    form.data.location = selected
  }
</script>

<Modal bind:open>
  <form use:enhance={form} method="POST">
    <input
      type="file"
      accept="image/*,video/*"
      {...fields?.media}
      class="w-full aspect-square object-cover rounded border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer text-gray-300"
    />
    {#if errors?.file}
      <p class="error">{errors.file[0]}</p>
    {/if}

    <input type="text" placeholder="Caption" {...fields?.caption} />
    {#if errors.caption}
      <p class="error">{errors.caption[0]}</p>
    {/if}

    <select {...fields?.visibility}>
      <option value="public">Public</option>
      <option value="private">Private</option>
      <option value="friends">Friends</option>
    </select>
    {#if errors?.visibility}
      <p class="error">{errors.visibility[0]}</p>
    {/if}

    <!-- location dropdown here -->
    <button type="submit">Upload</button>
  </form>
</Modal>
