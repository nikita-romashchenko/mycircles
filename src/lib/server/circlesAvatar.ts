/**
 * Circles Avatar Server Utilities
 *
 * Provides server-side avatar initialization for API routes using user credentials
 * from the database or provided private key.
 *
 * Usage in API routes:
 * ```typescript
 * import { createAvatarFromSession, createAvatarFromPrivateKey } from '$lib/server/circlesAvatar';
 *
 * export async function POST({ request, locals }) {
 *   const session = await locals.auth();
 *   if (!session?.user?.safeAddress) {
 *     return json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *
 *   // Option 1: Create avatar from session (fetches private key from database)
 *   const avatar = await createAvatarFromSession(session.user.safeAddress);
 *
 *   // Option 2: Create avatar from provided private key
 *   const avatar = await createAvatarFromPrivateKey(privateKey, safeAddress);
 *
 *   // Use the avatar
 *   const profile = await avatar.profile.get();
 *   return json({ profile });
 * }
 * ```
 */

import { HumanAvatar } from '@aboutcircles/sdk';
import { SafeContractRunner } from '@aboutcircles/sdk-runner';
import { Core } from '@aboutcircles/sdk-core';
import { createPublicClient, http } from 'viem';
import { gnosis } from 'viem/chains';
import { RPC_URL } from '$env/static/private';
import { Profile } from '$lib/models/Profile';

/**
 * Creates a HumanAvatar instance from a private key and safe address
 *
 * @param privateKey - The private key (with or without 0x prefix)
 * @param safeAddress - The safe address (with or without 0x prefix)
 * @returns Promise<HumanAvatar> - The initialized avatar instance
 * @throws Error if initialization fails
 */
export async function createAvatarFromPrivateKey(
  privateKey: string,
  safeAddress: string
): Promise<HumanAvatar> {
  // Ensure proper hex format
  const formattedPrivateKey = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;
  const formattedSafeAddress = (safeAddress.startsWith('0x') ? safeAddress : `0x${safeAddress}`) as `0x${string}`;

  console.log(`🔄 Creating Circles avatar for Safe: ${formattedSafeAddress}`);

  // Initialize Core SDK
  const core = new Core();

  // Create public client
  const publicClient = createPublicClient({
    chain: gnosis,
    transport: http(RPC_URL),
  });

  // Create Safe contract runner
  const runner = new SafeContractRunner(
    publicClient,
    formattedPrivateKey,
    RPC_URL,
    formattedSafeAddress
  );
  await runner.init();

  // Create HumanAvatar instance
  const avatar = new HumanAvatar(formattedSafeAddress, core, runner);

  console.log(`✅ Avatar created for Safe: ${formattedSafeAddress}`);

  return avatar;
}

/**
 * Creates a HumanAvatar instance using credentials from the database
 * Fetches the private key from the Profile model
 *
 * @param safeAddress - The safe address from the session
 * @returns Promise<HumanAvatar> - The initialized avatar instance
 * @throws Error if profile not found or private key missing
 */
export async function createAvatarFromSession(safeAddress: string): Promise<HumanAvatar> {
  // Fetch profile with private key
  const profile = await Profile.findOne({
    safeAddress: { $regex: new RegExp(`^${safeAddress}$`, 'i') }
  });

  if (!profile) {
    throw new Error(`Profile not found for safe address: ${safeAddress}`);
  }

  if (!profile.privateKey) {
    throw new Error(`No private key found for safe address: ${safeAddress}`);
  }

  return createAvatarFromPrivateKey(profile.privateKey, safeAddress);
}

/**
 * Cache for avatar instances to avoid recreating them on every request
 * Key format: "safeAddress:privateKeyHash"
 */
const avatarCache = new Map<string, { avatar: HumanAvatar; createdAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Creates or retrieves a cached HumanAvatar instance
 * Useful for reducing initialization overhead in high-traffic scenarios
 *
 * @param privateKey - The private key
 * @param safeAddress - The safe address
 * @returns Promise<HumanAvatar> - The avatar instance (cached or new)
 */
export async function getCachedAvatar(
  privateKey: string,
  safeAddress: string
): Promise<HumanAvatar> {
  const cacheKey = `${safeAddress.toLowerCase()}:${privateKey.slice(0, 10)}`;
  const cached = avatarCache.get(cacheKey);

  // Return cached avatar if still valid
  if (cached && (Date.now() - cached.createdAt) < CACHE_TTL) {
    console.log(`✨ Using cached avatar for: ${safeAddress}`);
    return cached.avatar;
  }

  // Create new avatar and cache it
  const avatar = await createAvatarFromPrivateKey(privateKey, safeAddress);
  avatarCache.set(cacheKey, {
    avatar,
    createdAt: Date.now()
  });

  // Clean up expired cache entries
  cleanCache();

  return avatar;
}

/**
 * Clean up expired cache entries
 */
function cleanCache(): void {
  const now = Date.now();
  for (const [key, value] of avatarCache.entries()) {
    if (now - value.createdAt > CACHE_TTL) {
      avatarCache.delete(key);
    }
  }
}

/**
 * Clear the avatar cache (useful for testing or when credentials change)
 */
export function clearAvatarCache(): void {
  avatarCache.clear();
  console.log('🧹 Avatar cache cleared');
}
