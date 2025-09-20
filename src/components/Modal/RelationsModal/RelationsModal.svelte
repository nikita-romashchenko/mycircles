<script lang="ts">
  import Modal from "$components/Modal/Modal.svelte"
  import Tabs from "$components/Tabs/Tabs.svelte"
  import type { Relation } from "$lib/types"

  export let open = false
  // export let safeAddress = ""
  export let contents: Relation[][] = [[], [], []] // mutuals, trusted by, trusts

  // $: if (open) {
  //   fetchRelations()
  // }
</script>

<Modal bind:open>
  <Tabs tabs={["mutuals", "trusted by", "trusts"]} {contents} />
</Modal>
