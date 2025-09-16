<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { signUpSchema } from '$lib/validation/schemas';
  import { page } from '$app/stores';
  import { SignIn } from "@auth/sveltekit/components"


  export let data;

  // Initialize superForm
  const { form, errors, enhance, submitting } = superForm(data.form, {
    validators: zodClient(signUpSchema)
  });

</script>

<div class="signup-container">
  <h1>Sign Up</h1>

  <!-- TODO: add sign up form -->
  <form method="POST" use:enhance>
    <button type="submit" disabled={$submitting}>
      {$submitting ? 'Submitting...' : 'Submit'}
    </button>
  </form>

  <hr />

  <!-- OAuth buttons -->
  <SignIn provider="google">Continue with Google</SignIn>
  <SignIn provider="apple">Continue with Apple</SignIn>
</div>

<style>
  .signup-container {
    max-width: 400px;
    margin: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  button {
    padding: 0.5rem;
    cursor: pointer;
  }

  hr {
    margin: 1rem 0;
  }
</style>
