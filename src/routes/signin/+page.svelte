<script lang="ts">
  import { signIn } from '@auth/sveltekit/client';
  import { goto } from '$app/navigation';

  export let data;

  // Private key login variables
  let privateKey = '';
  let isPrivateKeyLoading = false;
  let privateKeyError = '';

  // Handle private key authentication - simplified flow
  async function handlePrivateKeyLogin() {
    if (!privateKey.trim()) {
      privateKeyError = 'Please enter your private key';
      return;
    }

    isPrivateKeyLoading = true;
    privateKeyError = '';

    try {
      console.log('Authenticating with private key...');

      // Use Auth.js signIn with credentials provider (it will auto-discover and use first Safe)
      const result = await signIn('safe-pk', {
        privateKey,
        redirect: false
      });

      console.log('Auth.js signIn result:', result);

      if (result?.ok) {
        console.log('Authentication successful, redirecting...');
        goto('/protected');
      } else {
        console.error('Authentication failed:', result?.error);
        privateKeyError = 'Authentication failed: ' + (result?.error || 'No Safe wallets found for this private key');
      }
    } catch (err) {
      console.error('Error in private key authentication:', err);
      privateKeyError = err instanceof Error ? err.message : 'Authentication failed';
    } finally {
      isPrivateKeyLoading = false;
    }
  }
</script>

<div class="signin-container">
  <h1>Safe Wallet Sign In</h1>
  <p class="subtitle">Enter your private key to automatically sign in with your first Safe wallet</p>

  {#if privateKeyError}
    <div class="error-message">
      {privateKeyError}
    </div>
  {/if}

  <!-- Private Key Input Section -->
  <div class="form-group">
    <label for="privateKey">Private Key</label>
    <input
      type="password"
      id="privateKey"
      bind:value={privateKey}
      placeholder="0x..."
      class:error={privateKeyError}
      disabled={isPrivateKeyLoading}
      on:keydown={(e) => e.key === 'Enter' && handlePrivateKeyLogin()}
    />
    <p class="helper-text">
      We'll automatically connect to your first Safe wallet
    </p>
  </div>

  <button
    type="button"
    on:click={handlePrivateKeyLogin}
    disabled={isPrivateKeyLoading || !privateKey.trim()}
    class="safe-login-btn"
  >
    {isPrivateKeyLoading ? '🔄 Signing In...' : '🔐 Sign In with Private Key'}
  </button>
</div>

<style>
  .signin-container {
    max-width: 500px;
    margin: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .signin-container h1 {
    text-align: center;
    color: #1f2937;
    margin: 0;
    font-size: 2rem;
    font-weight: 600;
  }

  .subtitle {
    text-align: center;
    color: #6b7280;
    margin: 0;
    font-size: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
  }

  .error-message {
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .helper-text {
    font-size: 0.75rem;
    color: #6b7280;
    margin: 0;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: border-color 0.2s ease;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  input.error {
    border-color: #dc2626;
  }

  input:disabled {
    background-color: #f9fafb;
    cursor: not-allowed;
  }


  .safe-login-btn {
    width: 100%;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .safe-login-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .safe-login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

</style>
