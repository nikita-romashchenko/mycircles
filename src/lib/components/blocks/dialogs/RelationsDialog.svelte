<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog"
  import { superForm, filesProxy } from "sveltekit-superforms"

  import type { UploadMediaSchema } from "$lib/validation/schemas"
  import type { Infer, SuperValidated } from "sveltekit-superforms"
  import type { CirclesRpcProfile, Relation } from "$lib/types"
  import Tabs from "$components/Tabs/Tabs.svelte"

  interface Props {
    open?: boolean
    onLinkClick: () => void
    contents?: {
      relation: Relation
      profile: CirclesRpcProfile | null
    }[][]
    tabs?: string[]
  }

  let {
    open = $bindable(false),
    onLinkClick,
    contents = [[], [], []],
    tabs = ["mutuals", "trusters", "trustouts"],
  }: Props = $props()
</script>

<Dialog.Root bind:open>
  <!-- <Dialog.Trigger>Open</Dialog.Trigger> -->
  <Dialog.Content class="h-[40vh] max-h-[90vh] w-full max-w-full">
    <Dialog.Header>
      <Dialog.Title>Relations</Dialog.Title>
      <!-- <Dialog.Description>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Ratione
        expedita ad quod illo, et illum amet vitae modi distinctio mollitia non
        nesciunt nemo earum repellat atque maiores quas obcaecati tenetur.
      </Dialog.Description> -->
    </Dialog.Header>
    <div class="min-w-0 w-full">
      <Tabs {tabs} {contents} {onLinkClick} />
    </div>
  </Dialog.Content>
</Dialog.Root>
