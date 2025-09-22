<script lang="ts">
  import Modal from "$components/Modal/Modal.svelte"
  import Tabs from "$components/Tabs/Tabs.svelte"
  import type { Post as PostType } from "$lib/types"

  export let open = false
  export let post: PostType
</script>

<Modal bind:open></Modal>
