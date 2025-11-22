/**
 * Store to manage the SafeBrowserRunner instance
 * Initializes the runner once and reuses it throughout the app
 */
import { writable } from 'svelte/store'
import type { SafeBrowserRunner } from '@aboutcircles/sdk-runner'

// Store for the runner instance
const runnerStore = writable<SafeBrowserRunner | null>(null)

/**
 * Initialize the SafeBrowserRunner once
 * @param safeAddress - The user's Safe wallet address
 * @returns The initialized SafeBrowserRunner instance
 */
export async function initializeSafeBrowserRunner(
  safeAddress: string
): Promise<SafeBrowserRunner> {
  const { SafeBrowserRunner } = await import('@aboutcircles/sdk-runner')
  const { gnosis } = await import('viem/chains')

  const ethereum = (window as any).ethereum
  if (!ethereum) {
    throw new Error('MetaMask not found. Please install MetaMask.')
  }

  const runner = await SafeBrowserRunner.create(
    'https://rpc.gnosischain.com',
    ethereum,
    safeAddress as `0x${string}`,
    gnosis
  )

  runnerStore.set(runner)
  return runner
}

/**
 * Get the initialized SafeBrowserRunner instance
 * @returns The SafeBrowserRunner instance or null if not initialized
 */
export function getRunner(): SafeBrowserRunner | null {
  let runner: SafeBrowserRunner | null = null
  runnerStore.subscribe((value) => {
    runner = value
  })()
  return runner
}

/**
 * Get the runner store for reactive updates
 */
export function getRunnerStore() {
  return runnerStore
}
