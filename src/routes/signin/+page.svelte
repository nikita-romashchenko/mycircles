<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { signInSchema } from '$lib/validation/schemas';
  import { page } from '$app/stores';
  import { SignIn } from "@auth/sveltekit/components"

  export let data;

  // Initialize superForm
  const { form, errors, enhance, submitting } = superForm(data.form, {
    validators: zodClient(signInSchema)
  });

</script>

<div class="signin-container">
  <h1>Sign In</h1>

  <form method="POST" use:enhance>
    <!-- Email -->
    <div class="form-group">
      <label for="email">Email</label>
      <input
        type="email"
        id="email"
        name="email"
        bind:value={$form.email}
        class:error={$errors.email}
        required
      />
      {#if $errors.email}
        <p class="error">{$errors.email[0]}</p>
      {/if}
    </div>

    <!-- Password -->
    <div class="form-group">
      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        name="password"
        bind:value={$form.password}
        class:error={$errors.password}
        required
      />
      {#if $errors.password}
        <p class="error">{$errors.password[0]}</p>
      {/if}
    </div>

    <button type="submit" disabled={$submitting}>
      {$submitting ? 'Submitting...' : 'Submit'}
    </button>
  </form>

  <hr />

  <!-- OAuth buttons -->
  <SignIn provider="google">
    <div slot="submitButton" class="buttonPrimary">Continue with Google</div>
  </SignIn>
  <SignIn provider="apple">Continue with Apple</SignIn>
</div>

<style>
  .signin-container {
    max-width: 400px;
    margin: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .error {
    color: red;
    font-size: 0.85rem;
  }

  button {
    padding: 0.5rem;
    cursor: pointer;
  }

  hr {
    margin: 1rem 0;
  }
</style>
