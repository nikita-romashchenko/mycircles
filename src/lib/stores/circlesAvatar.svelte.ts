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

import { Core } from '@circles-sdk/core';
import { HumanAvatar } from '@circles-sdk/sdk';
import { SafeContractRunner } from '@circles-sdk/runner';
import { createPublicClient, http } from 'viem';
import { gnosis } from 'viem/chains';
import { getAuthData } from '$lib/utils/authStorage';
import { browser } from '$app/environment';
import { PUBLIC_RPC_URL } from '$env/static/public';

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

      // Wait for auth data to be available (with retry logic)
      let authData = getAuthData();
      let retries = 0;
      const maxRetries = 20; // Wait up to 10 seconds for private key

      while (!authData?.privateKey && retries < maxRetries) {
        console.log(`⏳ Waiting for private key... (attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        authData = getAuthData();
        retries++;
      }

      if (!authData?.privateKey) {
        throw new Error('No private key found in session storage after waiting. Please sign in again.');
      }

      console.log('🔄 Initializing Circles avatar for user:', safeAddress);

      // Initialize Core SDK
      const core = new Core();

      // Create public client
      const publicClient = createPublicClient({
        chain: gnosis,
        transport: http(PUBLIC_RPC_URL),
      });

      // Create Safe contract runner
      const runner = new SafeContractRunner(
        publicClient,
        authData.privateKey as `0x${string}`,
        PUBLIC_RPC_URL,
        safeAddress as `0x${string}`
      );
      await runner.init();

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
