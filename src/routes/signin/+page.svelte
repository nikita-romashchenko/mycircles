<script lang="ts">
  import { SignIn } from "@auth/sveltekit/components"
  import { signIn } from '@auth/sveltekit/client';
  import Safe from '@safe-global/protocol-kit';
  import { browser } from '$app/environment';
  import { ethers } from 'ethers';
  import { PUBLIC_RPC_URL } from '$env/static/public';
  import { storeAuthData } from '$lib/utils/authStorage';

  const API_ENDPOINTS = {
    CHALLENGE: '/api/auth/challenge',
    SAFES: '/api/safes'
  };

  type AuthMethod = 'private-key' | 'metamask';

  let showSafeForm = false;
  let authMethod: AuthMethod = 'private-key';
  let privateKey = '';
  let walletAddress = '';
  let safes: string[] = [];
  let selectedSafe = '';
  let loading = false;
  let error = '';
  let challenge: any = null;

  async function loadSafes() {
    let targetWalletAddress = '';

    if (authMethod === 'private-key') {
      if (!privateKey.trim()) {
        error = 'Please enter a private key';
        return;
      }
      try {
        const wallet = new ethers.Wallet(privateKey.trim());
        targetWalletAddress = wallet.address;
      } catch (err) {
        error = 'Invalid private key format';
        return;
      }
    } else if (authMethod === 'metamask') {
      if (!walletAddress) {
        error = 'Please connect MetaMask first';
        return;
      }
      targetWalletAddress = walletAddress;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch(API_ENDPOINTS.SAFES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'getSafesForOwner',
          ownerAddress: targetWalletAddress
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch safes');
      }

      safes = data.safes || [];

      if (safes.length === 0) {
        error = 'No safes found for this wallet address';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load safes';
      safes = [];
    } finally {
      loading = false;
    }
  }

  async function connectMetaMask() {
    if (!browser || !(window as any).ethereum) {
      error = 'MetaMask not found. Please install MetaMask.';
      return;
    }

    loading = true;
    error = '';

    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        walletAddress = accounts[0];
        authMethod = 'metamask';
        await loadSafes();
      } else {
        error = 'No accounts found in MetaMask';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to connect to MetaMask';
    } finally {
      loading = false;
    }
  }

  function handleSafeLogin() {
    showSafeForm = true;
    authMethod = 'private-key';
  }

  function handleMetaMaskLogin() {
    showSafeForm = true;
    connectMetaMask();
  }

  async function generateChallenge() {
    loading = true;
    error = '';

    try {
      const response = await fetch(API_ENDPOINTS.CHALLENGE);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate challenge');
      }

      challenge = data;
      return challenge;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to generate challenge';
      return null;
    } finally {
      loading = false;
    }
  }

  async function signChallengeAndAuthenticate() {
    if (!selectedSafe) {
      error = 'Please select a safe';
      return;
    }

    if (authMethod === 'private-key' && !privateKey) {
      error = 'Please enter your private key';
      return;
    }

    if (authMethod === 'metamask' && !walletAddress) {
      error = 'Please connect MetaMask';
      return;
    }

    loading = true;
    error = '';

    try {
      // Step 1: Generate challenge if not already done
      if (!challenge) {
        await generateChallenge();
        if (!challenge) return;
      }

      let signature: string;
      let walletOwner: string;
      let protocolKit;

      if (authMethod === 'private-key') {
        const wallet = new ethers.Wallet(privateKey);
        walletOwner = wallet.address;

        // For private key method, create Safe instance and sign with Safe SDK
        protocolKit = await Safe.init({
          provider: PUBLIC_RPC_URL,
          signer: privateKey,
          safeAddress: selectedSafe
        });

      } else if(authMethod === 'metamask') {
        // For MetaMask, create Safe instance with MetaMask provider
        if (!browser || !(window as any).ethereum) {
          throw new Error('MetaMask not available');
        }

        const eip1193Provider = (window as any).ethereum;
        const provider = new ethers.BrowserProvider(eip1193Provider);
        const signer = await provider.getSigner();

        walletOwner = signer.address;

        protocolKit = await Safe.init({
          provider: eip1193Provider,
          signer: walletOwner,
          safeAddress: selectedSafe
        });
      } else {
        throw new Error('Invalid auth method');
      }   


      const safeMessage = await protocolKit.createMessage(challenge.message);
      const signedSafeMessage = await protocolKit.signMessage(safeMessage);
      signature = signedSafeMessage.encodedSignatures();

      // Step 2: Authenticate with the signed challenge
      const result = await signIn('credentials', {
        message: challenge.message,
        signature: signature,
        walletOwner: walletOwner,
        safeAddress: selectedSafe.toLowerCase(),
        authMethod: authMethod,
        redirect: false,
      });

      if (result?.error) {
        error = 'Authentication failed: ' + result.error;
      } else if (result?.ok) {
        // Store auth data based on auth method
        if (authMethod === 'private-key') {
          storeAuthData({
            sessionType: 'privatekey',
            privateKey: privateKey.trim(),
            safeAddress: selectedSafe
          });
        } else if (authMethod === 'metamask') {
          storeAuthData({
            sessionType: 'metamask',
            safeAddress: selectedSafe
          });
        }
        window.location.href = '/protected';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Sign in failed';
    } finally {
      loading = false;
    }
  }

  function resetForm() {
    showSafeForm = false;
    authMethod = 'private-key';
    privateKey = '';
    walletAddress = '';
    safes = [];
    selectedSafe = '';
    error = '';
    loading = false;
    challenge = null;
  }

  function switchAuthMethod(method: 'private-key' | 'metamask') {
    authMethod = method;
    error = '';
    safes = [];
    selectedSafe = '';
    if (method === 'private-key') {
      walletAddress = '';
    } else {
      privateKey = '';
    }
  }
</script>

<div class="signin-container">
  <div class="signin-card">
    <div class="logo-section">
      <img src="/img/logo.png" alt="MyCircles Logo" class="logo" />
      <h1 class="app-title">MyCircles</h1>
      <p class="subtitle">Welcome back</p>
    </div>

    {#if !showSafeForm}
      <div class="auth-methods">
        <SignIn provider="google" signInPage="signin" className="google-signin">
          <div slot="submitButton" class="google-button">
            <svg width="18" height="18" viewBox="0 0 24 24" class="google-icon">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </div>
        </SignIn>

        <div class="divider">
          <span>or</span>
        </div>

        <button class="safe-key-button" on:click={handleSafeLogin}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <circle cx="12" cy="16" r="1"/>
            <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Sign in with Safe Private Key
        </button>

        <button class="metamask-button" on:click={handleMetaMaskLogin}>
          <svg width="18" height="18" viewBox="0 0 318 318" fill="currentColor">
            <path d="M272.99 44.91L234.48 16.14c-6.37-4.77-15.45-3.43-20.22 2.94L185.47 56.2c-2.99 4-2.24 9.68 1.64 12.75l24.83 19.68c3.88 3.07 9.42 2.4 12.49-1.49l28.79-36.47c4.77-6.37 13.85-7.71 20.22-2.94l29.75 22.27c6.37 4.77 7.71 13.85 2.94 20.22l-36.47 48.62c-2.99 3.99-2.24 9.68 1.64 12.75l30.15 23.88c3.88 3.07 9.42 2.4 12.49-1.49l39.51-49.89c4.77-6.37 13.85-7.71 20.22-2.94l38.51 28.79c6.37 4.77 7.71 13.85 2.94 20.22L272.99 44.91z"/>
          </svg>
          Sign in with MetaMask
        </button>
      </div>
    {:else}
      <div class="safe-form">
        <button class="back-button" on:click={resetForm}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
          Back to login options
        </button>

    {#if authMethod === 'metamask'}
          <div class="form-section">
            <div class="connected-wallet">
              <label class="form-label">Connected Wallet</label>
              <div class="wallet-address">{walletAddress}</div>
              <div class="method-switcher">
                <button class="switch-method-button" on:click={() => switchAuthMethod('private-key')}>
                  Use Private Key Instead
                </button>
              </div>
            </div>
          </div>
        {:else}
          <div class="form-section">
            <label for="privateKey" class="form-label">Private Key</label>
            <input
              id="privateKey"
              type="password"
              placeholder="Enter your private key (0x...)"
              bind:value={privateKey}
              class="form-input"
            />
            <div class="method-switcher">
              <button class="switch-method-button" on:click={() => switchAuthMethod('metamask')}>
                Use MetaMask Instead
              </button>
            </div>
            <button
              class="load-safes-button"
              on:click={loadSafes}
              disabled={loading || !privateKey.trim()}
            >
              {loading ? 'Loading...' : 'Load Available Safes'}
            </button>
          </div>
        {/if}

        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        {#if safes.length > 0}
          <div class="form-section">
            <label for="safeSelect" class="form-label">Select Safe</label>
            <select id="safeSelect" bind:value={selectedSafe} class="form-select">
              <option value="">Choose a Safe...</option>
              {#each safes as safe}
                <option value={safe}>
                  {safe.slice(0, 6)}...{safe.slice(-4)}
                </option>
              {/each}
            </select>

            {#if selectedSafe}
              <button
                class="signin-button"
                on:click={signChallengeAndAuthenticate}
                disabled={loading || !selectedSafe || (authMethod === 'private-key' && !privateKey) || (authMethod === 'metamask' && !walletAddress)}
              >
                {loading ? 'Authenticating...' : 'Sign in with Safe'}
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .signin-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .signin-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 24px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.1),
      0 1px 0 rgba(255, 255, 255, 0.5) inset;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 2.5rem;
    width: 100%;
    max-width: 420px;
    animation: slideUp 0.6s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .logo-section {
    text-align: center;
    margin-bottom: 2rem;
  }

  .logo {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    margin-bottom: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .app-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    color: #64748b;
    font-size: 1rem;
    margin: 0;
    font-weight: 400;
  }

  .auth-methods {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  :global(.google-signin) {
    width: 100% !important;
  }

  .google-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.875rem 1rem;
    background: #fff;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .google-button:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .google-icon {
    flex-shrink: 0;
  }

  .divider {
    position: relative;
    text-align: center;
    margin: 0.5rem 0;
  }

  .divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #e2e8f0;
    z-index: 1;
  }

  .divider span {
    background: rgba(255, 255, 255, 0.95);
    padding: 0 1rem;
    color: #64748b;
    font-size: 0.875rem;
    position: relative;
    z-index: 2;
  }

  .safe-key-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.875rem 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .safe-key-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .safe-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .back-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: #64748b;
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0.5rem 0;
    transition: color 0.2s ease;
  }

  .back-button:hover {
    color: #475569;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .form-input,
  .form-select {
    padding: 0.875rem 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 0.95rem;
    background: #fff;
    transition: all 0.2s ease;
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-input::placeholder {
    color: #9ca3af;
  }

  .load-safes-button {
    padding: 0.875rem 1rem;
    background: #3b82f6;
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 0.5rem;
  }

  .load-safes-button:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .load-safes-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .signin-button {
    padding: 0.875rem 1rem;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 0.5rem;
  }

  .signin-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  }

  .signin-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    padding: 0.75rem 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
    color: #dc2626;
    font-size: 0.875rem;
  }

  .metamask-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.875rem 1rem;
    background: linear-gradient(135deg, #f6851b 0%, #e2761b 100%);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .metamask-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(246, 133, 27, 0.4);
  }

  .connected-wallet {
    padding: 1rem;
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
  }

  .wallet-address {
    font-family: monospace;
    font-size: 0.875rem;
    padding: 0.5rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #374151;
    margin-top: 0.5rem;
  }

  .method-switcher {
    margin-top: 0.75rem;
    text-align: center;
  }

  .switch-method-button {
    background: none;
    border: none;
    color: #3b82f6;
    font-size: 0.875rem;
    cursor: pointer;
    text-decoration: underline;
    transition: color 0.2s ease;
  }

  .switch-method-button:hover {
    color: #2563eb;
  }

  @media (max-width: 480px) {
    .signin-card {
      padding: 2rem 1.5rem;
      margin: 1rem;
      border-radius: 20px;
    }

    .app-title {
      font-size: 1.75rem;
    }
  }
</style>