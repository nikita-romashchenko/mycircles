<script lang="ts">
  import Modal from "$components/Modal/Modal.svelte"
  import Tabs from "$components/Tabs/Tabs.svelte"
  import type { Relation } from "$lib/types"


  // export let safeAddress = ""
  interface Props {
    open?: boolean;
    onLinkClick: () => void;
    contents?: Relation[][];
  }

  let { open = $bindable(false), onLinkClick, contents = [[], [], []] }: Props = $props();

  // $: if (open) {
  //   fetchRelations()
  // }
</script>

<Modal bind:open>
  <Tabs tabs={["mutuals", "trusted by", "trusts"]} {contents} {onLinkClick} />
</Modal>
