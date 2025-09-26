<script lang="ts">
  import Modal from "$components/Modal/Modal.svelte"
  import Tabs from "$components/Tabs/Tabs.svelte"
  import type { Post as PostType } from "$lib/types"

  interface Props {
    open?: boolean;
    post: PostType;
  }

  let { open = $bindable(false), post }: Props = $props();
</script>

<Modal bind:open></Modal>
