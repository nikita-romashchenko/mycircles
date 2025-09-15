<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { zodClient } from 'sveltekit-superforms/adapters';
    import { registrationSchema } from '$lib/validation/schemas';

    export let data;

    const { form, errors, enhance, submitting } = superForm(data.form, {
        validators: zodClient(registrationSchema),
        onUpdated({ form }) {
            if (form.valid) {
                // Force page refresh to update session
                window.location.href = '/';
            }
        }
    });
</script>

<div class="register-container">
    <h1>Complete Your Profile</h1>
    {#if $form.email}
        <p>Email: {$form.email}</p>
    {/if}

    <form method="POST" use:enhance>
        <input type="hidden" name="email" bind:value={$form.email} />

        <div class="form-group">
            <label for="username">Choose a username</label>
            <input
                type="text"
                id="username"
                name="username"
                bind:value={$form.username}
                class:error={$errors.username}
            />
            {#if $errors.username}
                <p class="error">{$errors.username[0]}</p>
            {/if}
        </div>

        <button type="submit" disabled={$submitting}>
            {$submitting ? 'Creating profile...' : 'Complete Registration'}
        </button>
    </form>
</div>

<style>
    .register-container {
        max-width: 400px;
        margin: 2rem auto;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .form-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
    }

    input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    input.error {
        border-color: #e74c3c;
    }

    .error {
        color: #e74c3c;
        margin: 0.5rem 0;
        font-size: 0.875rem;
    }

    button {
        width: 100%;
        padding: 0.75rem;
        background-color: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    button:disabled {
        background-color: #95a5a6;
        cursor: not-allowed;
    }
</style>