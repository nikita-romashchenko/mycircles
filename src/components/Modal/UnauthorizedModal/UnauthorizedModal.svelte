<script lang="ts">
  import Modal from "$components/Modal/Modal.svelte"

  export let open = false
</script>

<Modal bind:open>
  <div class="p-6 flex flex-col items-center text-center gap-4">
    <h2 class="text-xl font-semibold text-gray-800">You need to sign in</h2>
    <p class="text-gray-600">Please log in or create an account to continue.</p>

    <div class="flex gap-4 mt-4">
      <a
        href="/signin"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Sign In
      </a>
      <a
        href="/signup"
        class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
      >
        Sign Up
      </a>
    </div>
  </div>
</Modal>
