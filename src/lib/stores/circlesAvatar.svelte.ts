/**
 * Circles Avatar Store (Client-side)
 *
 * This store manages the HumanAvatar instance for the currently logged-in user.
 * It initializes the avatar using credentials from localStorage and session data.
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { avatarStore } from '$lib/stores/circlesAvatar.svelte';
 *   import { page } from '$app/stores';
 *
 *   // Initialize avatar on mount
 *   $effect(() => {
 *     const session = $page.data.session;
 *     if (session?.user?.safeAddress) {
 *       avatarStore.initialize(session.user.safeAddress);
 *     }
 *   });
 *
 *   // Use the avatar
 *   async function updateProfile() {
 *     const avatar = avatarStore.getAvatar();
 *     if (avatar) {
 *       await avatar.profile.update({ name: 'New Name' });
 *     }
 *   }
 * </script>
 * ```
 */

import { HumanAvatar } from '@aboutcircles/sdk';
import { SafeContractRunner } from '@aboutcircles/sdk-runner';
import { Core } from '@aboutcircles/sdk-core';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { gnosis } from 'viem/chains';
import { getAuthData } from '$lib/utils/authStorage';
import { browser } from '$app/environment';
import { PUBLIC_RPC_URL } from '$env/static/public';
import Safe from '@safe-global/protocol-kit';

class CirclesAvatarStore {
  private avatar = $state<HumanAvatar | null>(null);
  private isInitializing = $state(false);
  private error = $state<string | null>(null);
  private currentSafeAddress = $state<string | null>(null);

  /**
   * Initialize the avatar for the current user
   * @param safeAddress - The safe address from the session
   */
  async initialize(safeAddress: string): Promise<void> {
    // Don't reinitialize if already initialized for this safe
    if (this.avatar && this.currentSafeAddress === safeAddress.toLowerCase()) {
      return;
    }

    // Don't initialize multiple times concurrently
    if (this.isInitializing) {
      return;
    }

    if (!browser) {
      this.error = 'Avatar can only be initialized in browser';
      return;
    }

    try {
      this.isInitializing = true;
      this.error = null;

      console.log('🔄 Initializing Circles avatar for user:', safeAddress);

      // Get auth data (which contains session type)
      const authData = getAuthData();

      if (!authData) {
        throw new Error('No authentication data found. Please sign in again.');
      }

      // Only MetaMask is supported now
      if (authData.sessionType !== 'metamask') {
        throw new Error('Only MetaMask authentication is supported.');
      }

      // Check if MetaMask is available
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      console.log('🔄 Initializing with MetaMask...');

      // Initialize Core SDK
      const core = new Core();

      // Create public client with viem
      const publicClient = createPublicClient({
        chain: gnosis,
        transport: http(PUBLIC_RPC_URL),
      });

      // Use MetaMask as the signer
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      console.log('📝 MetaMask signer address:', signerAddress);

      // Create a viem wallet client using MetaMask provider
      // This ensures transactions are sent through MetaMask, not a static RPC
      const walletClient = createWalletClient({
        chain: gnosis,
        transport: custom(ethereum)
      });

      console.log('✅ Wallet client created for MetaMask');

      // Create the runner with MetaMask's transport for transaction signing
      const runner = new SafeContractRunner(
        publicClient,
        signerAddress as `0x${string}`,
        ethereum, // Pass MetaMask provider instead of RPC URL
        safeAddress as `0x${string}`
      );

      // Initialize the runner
      try {
        await runner.init(safeAddress as `0x${string}`);
        console.log('✅ SafeContractRunner initialized with MetaMask');
      } catch (initErr) {
        console.warn('⚠️  SafeContractRunner init warning (may still work):', initErr);
      }

      // Create HumanAvatar instance
      this.avatar = new HumanAvatar(safeAddress as `0x${string}`, core, runner);
      this.currentSafeAddress = safeAddress.toLowerCase();

      console.log('✅ Circles avatar initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Circles avatar:', err);
      this.error = err instanceof Error ? err.message : 'Failed to initialize avatar';
      this.avatar = null;
      this.currentSafeAddress = null;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Get the current avatar instance
   * @returns HumanAvatar instance or null if not initialized
   */
  getAvatar(): HumanAvatar | null {
    return this.avatar;
  }

  /**
   * Check if avatar is currently being initialized
   */
  get initializing(): boolean {
    return this.isInitializing;
  }

  /**
   * Get any initialization error
   */
  get initError(): string | null {
    return this.error;
  }

  /**
   * Check if avatar is ready to use
   */
  get isReady(): boolean {
    return this.avatar !== null && !this.isInitializing;
  }

  /**
   * Reset the avatar (useful on logout)
   */
  reset(): void {
    this.avatar = null;
    this.currentSafeAddress = null;
    this.error = null;
    this.isInitializing = false;
    console.log('🔄 Avatar store reset');
  }
}

// Export singleton instance
export const avatarStore = new CirclesAvatarStore();
