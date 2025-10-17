<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index"
  import { superForm } from "sveltekit-superforms"
  import { Input } from "$lib/components/ui/input"
  import { Button } from "$lib/components/ui/button"
  import Label from "$lib/components/ui/label/label.svelte"

  import type { voteSchema } from "$lib/validation/schemas"
  import type { Infer, SuperValidated } from "sveltekit-superforms"

  interface Props {
    open?: boolean
    pageForm: SuperValidated<Infer<voteSchema>>
  }

  let { open = $bindable(true), pageForm }: Props = $props()
  const { form, errors, enhance, reset } = superForm(pageForm)

  function handleOpenChange(value: boolean) {
    if (!value) {
      // Reset the form when the dialog is closed
      reset()
      console.log("form reset in VoteDialog:", $form)
    }
  }
</script>

<Dialog.Root onOpenChange={handleOpenChange} bind:open>
  <Dialog.Content class="max-h-[90vh] overflow-auto">
    <Dialog.Header>
      <Dialog.Title>Vote</Dialog.Title>
      <!-- <Dialog.Description>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Ratione
        expedita ad quod illo, et illum amet vitae modi distinctio mollitia non
        nesciunt nemo earum repellat atque maiores quas obcaecati tenetur.
      </Dialog.Description> -->
    </Dialog.Header>
    <form
      use:enhance
      enctype="multipart/form-data"
      method="POST"
      action="?/vote"
      class="flex flex-col gap-4 p-4"
    >
      <input type="hidden" name="postId" bind:value={$form.postId} />
      <input type="hidden" name="type" bind:value={$form.type} />
      <Label for="balanceChange">Balance</Label>
      <Input
        type="text"
        name="balanceChange"
        id="balanceChange"
        bind:value={$form.balanceChange}
        placeholder="balance"
      />

      <div class="flex flex-col items-center justify-center mt-4">
        <Button disabled={$form.balanceChange === 0} type="submit"
          >Submit</Button
        >
      </div>
    </form>
  </Dialog.Content>
</Dialog.Root>
