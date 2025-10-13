<script lang="ts">
  import { Dialog } from "bits-ui"
  export let open: boolean
</script>

<Dialog.Root bind:open>
  <slot />
</Dialog.Root>
