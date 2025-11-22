/**
 * Store to signal when posts should be reloaded
 * Used to notify profile pages when new posts are uploaded
 */
import { writable } from 'svelte/store'

// Simple writable store for reload signals
export const postReloadStore = writable(0)

/**
 * Trigger a post reload by incrementing the signal
 */
export function triggerPostReload() {
  postReloadStore.update(n => n + 1)
}
