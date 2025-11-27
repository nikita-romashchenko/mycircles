<script lang="ts">
  import { signIn } from "@auth/sveltekit/client"
  import Safe from "@safe-global/protocol-kit"
  import { browser } from "$app/environment"
  import { ethers } from "ethers"
  import { storeAuthData } from "$lib/utils/authStorage"

  const API_ENDPOINTS = {
    CHALLENGE: "/api/auth/challenge",
    SAFES: "/api/safes",
  }

  let showSafeForm = false
  let walletAddress = ""
  let safes: string[] = []
  let selectedSafe = ""
  let loading = false
  let error = ""
  let challenge: any = null

  async function loadSafes() {
    if (!walletAddress) {
      error = "Please connect MetaMask first"
      return
    }

    loading = true
    error = ""

    try {
      const response = await fetch(API_ENDPOINTS.SAFES, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "getSafesForOwner",
          ownerAddress: walletAddress,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch safes")
      }

      safes = data.safes || []

      if (safes.length === 0) {
        error = "No safes found for this wallet address"
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load safes"
      safes = []
    } finally {
      loading = false
    }
  }

  async function connectMetaMask() {
    if (!browser || !(window as any).ethereum) {
      error = "MetaMask not found. Please install MetaMask."
      return
    }

    loading = true
    error = ""

    try {
      const ethereum = (window as any).ethereum
      const accounts = await ethereum.request({ method: "eth_requestAccounts" })
      if (accounts.length > 0) {
        walletAddress = accounts[0]
        await loadSafes()
      } else {
        error = "No accounts found in MetaMask"
      }
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to connect to MetaMask"
    } finally {
      loading = false
    }
  }

  function handleMetaMaskLogin() {
    showSafeForm = true
    connectMetaMask()
  }

  async function generateChallenge() {
    loading = true
    error = ""

    try {
      const response = await fetch(API_ENDPOINTS.CHALLENGE)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate challenge")
      }

      challenge = data
      return challenge
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to generate challenge"
      return null
    } finally {
      loading = false
    }
  }

  async function signChallengeAndAuthenticate() {
    if (!selectedSafe) {
      error = "Please select a safe"
      return
    }

    if (!walletAddress) {
      error = "Please connect MetaMask"
      return
    }

    loading = true
    error = ""

    try {
      // Step 1: Generate challenge if not already done
      if (!challenge) {
        await generateChallenge()
        if (!challenge) return
      }

      let signature: string
      let walletOwner: string
      let protocolKit

      // For MetaMask, create Safe instance with MetaMask provider
      if (!browser || !(window as any).ethereum) {
        throw new Error("MetaMask not available")
      }

      const eip1193Provider = (window as any).ethereum
      const provider = new ethers.BrowserProvider(eip1193Provider)
      const signer = await provider.getSigner()

      walletOwner = signer.address

      protocolKit = await Safe.init({
        provider: eip1193Provider,
        signer: walletOwner,
        safeAddress: selectedSafe,
      })

      const safeMessage = await protocolKit.createMessage(challenge.message)
      const signedSafeMessage = await protocolKit.signMessage(safeMessage)
      signature = signedSafeMessage.encodedSignatures()

      // Step 2: Authenticate with the signed challenge
      const result = await signIn("credentials", {
        message: challenge.message,
        signature: signature,
        walletOwner: walletOwner,
        safeAddress: selectedSafe.toLowerCase(),
        authMethod: "metamask",
        redirect: false,
      })

      if (result?.error) {
        error = "Authentication failed: " + result.error
      } else if (result?.ok) {
        // Store auth data
        storeAuthData({
          sessionType: "metamask",
          safeAddress: selectedSafe,
        })
        window.location.href = "/protected"
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Sign in failed"
    } finally {
      loading = false
    }
  }

  function resetForm() {
    showSafeForm = false
    walletAddress = ""
    safes = []
    selectedSafe = ""
    error = ""
    loading = false
    challenge = null
  }
</script>

<div class="signin-container">
  <div class="signin-card">
    <div class="logo-section">
      <h1 class="app-title">Sign in</h1>
      <p class="subtitle">Welcome back to MyCircles</p>
    </div>

    {#if !showSafeForm}
      <div class="auth-methods">
        <button class="metamask-button" onclick={handleMetaMaskLogin}>
          Sign in with MetaMask
        </button>
      </div>
    {:else}
      <div class="safe-form">
        <button class="back-button" onclick={resetForm}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Back to login options
        </button>

        <div class="form-section">
          <div class="connected-wallet">
            <div class="form-label">Connected Wallet</div>
            <div class="wallet-address">{walletAddress}</div>
          </div>
        </div>

        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        {#if safes.length > 0}
          <div class="form-section">
            <label for="safeSelect" class="form-label">Select Safe</label>
            <select
              id="safeSelect"
              bind:value={selectedSafe}
              class="form-select"
            >
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
                onclick={signChallengeAndAuthenticate}
                disabled={loading || !selectedSafe || !walletAddress}
              >
                {loading ? "Authenticating..." : "Sign in with Safe"}
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
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
  }

  .signin-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
    padding: 2.5rem;
    width: 420px;
    min-width: 420px;
  }

  .logo-section {
    margin-bottom: 2rem;
  }

  .app-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
    font-weight: 400;
  }

  .auth-methods {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .safe-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .back-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: #6b7280;
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0.5rem 0;
    transition: color 0.15s ease;
  }

  .back-button:hover {
    color: #374151;
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

  .form-select {
    padding: 0.75rem 0.875rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.95rem;
    background: white;
    transition: all 0.15s ease;
  }

  .form-select:focus {
    outline: none;
    border-color: #6b7280;
    box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
  }

  .signin-button {
    padding: 0.75rem 1rem;
    background: #1f2937;
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    margin-top: 0.5rem;
  }

  .signin-button:hover:not(:disabled) {
    background: #111827;
  }

  .signin-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    padding: 0.75rem 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
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
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    color: #374151;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .metamask-button:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .connected-wallet {
    padding: 1rem;
    background: #f9fafb;
    border: 1px solid #d1d5db;
    border-radius: 8px;
  }

  .wallet-address {
    font-family: monospace;
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    color: #374151;
    margin-top: 0.5rem;
    word-break: break-all;
    overflow-wrap: break-word;
  }

  @media (max-width: 480px) {
    .signin-card {
      padding: 2rem 1.5rem;
      margin: 0.5rem;
      width: calc(100vw - 2rem);
      min-width: unset;
    }

    .app-title {
      font-size: 1.5rem;
    }
  }
</style>
