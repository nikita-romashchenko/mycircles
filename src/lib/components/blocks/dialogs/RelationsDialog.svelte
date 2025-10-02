<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog"
  import { superForm, filesProxy } from "sveltekit-superforms"

  import type { UploadMediaSchema } from "$lib/validation/schemas"
  import type { Infer, SuperValidated } from "sveltekit-superforms"
  import type { Relation } from "$lib/types"
  import Tabs from "$components/Tabs/Tabs.svelte"

  interface Props {
    open?: boolean
    onLinkClick: () => void
    contents?: Relation[][]
  }

  let {
    open = $bindable(false),
    onLinkClick,
    contents = [[], [], []],
  }: Props = $props()
</script>

<Dialog.Root bind:open>
  <!-- <Dialog.Trigger>Open</Dialog.Trigger> -->
  <Dialog.Content class="h-[40vh] overflow-auto">
    <Dialog.Header>
      <Dialog.Title>Relations</Dialog.Title>
      <!-- <Dialog.Description>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Ratione
        expedita ad quod illo, et illum amet vitae modi distinctio mollitia non
        nesciunt nemo earum repellat atque maiores quas obcaecati tenetur.
      </Dialog.Description> -->
    </Dialog.Header>
    <Tabs tabs={["mutuals", "trusted by", "trusts"]} {contents} {onLinkClick} />
  </Dialog.Content>
</Dialog.Root>
