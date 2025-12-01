/**
 * Universal Circles Avatar Store (Client-side)
 *
 * This is the SINGLE source of truth for avatar initialization.
 * Uses Safe4337Runner for gasless transactions with account abstraction.
 *
 * This store manages the HumanAvatar instance for the currently logged-in user.
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { avatarStore } from '$lib/stores/safe4337.svelte';
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
import { browser } from '$app/environment';
import { Safe4337Runner } from '$lib/runners/Safe4337Runner';
import { HumanAvatar } from '@aboutcircles/sdk';
import { Core } from '@aboutcircles/sdk-core';
import { createPublicClient, http } from 'viem';
import { gnosis } from 'viem/chains';
import { PUBLIC_RPC_URL } from '$env/static/public';

class CirclesAvatarStore {
  private avatar = $state<HumanAvatar | null>(null);
  private isInitializing = $state(false);
  public initError = $state<string | null>(null);
  private currentSafeAddress = $state<string | null>(null);

  /**
   * Check if avatar is ready to use
   */
  get isReady(): boolean {
    return this.avatar !== null && !this.isInitializing;
  }

  /**
   * Get the current avatar instance
   */
  getAvatar(): HumanAvatar | null {
    return this.avatar;
  }

  /**
   * Initialize the avatar with Safe4337Runner for sponsored transactions
   *
   * @param safeAddress - The user's Safe wallet address
   */
  async initialize(safeAddress: string): Promise<void> {
    if (!browser) return;

    // If already initialized for this address, don't re-initialize
    if (this.currentSafeAddress === safeAddress && this.avatar) {
      console.log('✅ Avatar already initialized for', safeAddress);
      return;
    }

    // If currently initializing, don't start another
    if (this.isInitializing) {
      console.log('⏳ Avatar initialization already in progress');
      return;
    }

    this.isInitializing = true;
    this.initError = null;

    try {
      console.log('🔧 Initializing Safe 4337 Avatar...', { safeAddress });

      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error('MetaMask not found. Please install MetaMask.');
      }

      // Create public client
      const publicClient = createPublicClient({
        chain: gnosis,
        transport: http(PUBLIC_RPC_URL),
      });

      // Create Safe4337Runner for sponsored transactions
      const runner = new Safe4337Runner(
        publicClient,
        ethereum,
        safeAddress as `0x${string}`,
        'https://api.pimlico.io/v2/100/rpc?apikey=pim_2Zdnmr93fLfjgqHF9cDqKb',
        {
          isSponsored: true,
          paymasterUrl: 'https://api.pimlico.io/v2/100/rpc?apikey=pim_2Zdnmr93fLfjgqHF9cDqKb'
        },
        {
          safe4337ModuleAddress: '0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226'
        },
        '0.3.0'
      );

      // Initialize the runner
      await runner.init();

      // Initialize Core SDK
      const core = new Core();

      // Create HumanAvatar with Safe4337Runner
      const avatar = new HumanAvatar(safeAddress as `0x${string}`, core, runner);

      this.avatar = avatar;
      this.currentSafeAddress = safeAddress;
      this.initError = null;

      console.log('✅ Safe 4337 Avatar initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to initialize avatar:', error);
      this.initError = errorMessage;
      this.avatar = null;
      this.currentSafeAddress = null;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Clear the current avatar instance
   */
  clear(): void {
    this.avatar = null;
    this.currentSafeAddress = null;
    this.initError = null;
  }

  /**
   * Refresh the avatar after a transaction to prevent nonce issues
   * The Safe4337Pack caches nonce internally, so we need to recreate it
   */
  async refresh(): Promise<void> {
    if (!this.currentSafeAddress) {
      console.warn('No safe address to refresh');
      return;
    }

    console.log('🔄 Refreshing avatar to clear nonce cache...');
    const safeAddress = this.currentSafeAddress;

    // Clear current instance
    this.avatar = null;
    this.currentSafeAddress = null;

    // Re-initialize with the same address
    await this.initialize(safeAddress);
  }
}

// Export a single instance of the store
export const avatarStore = new CirclesAvatarStore();

// Legacy exports for backward compatibility (to be removed)
export const getSafe4337Avatar = () => avatarStore.getAvatar();
export const initializeSafe4337Avatar = (safeAddress: string) => avatarStore.initialize(safeAddress);
