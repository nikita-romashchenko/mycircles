import { browser } from '$app/environment';

export type AuthSessionType = 'metamask' | 'privatekey' | 'oauth2';

export interface AuthStorageData {
  sessionType: AuthSessionType;
  privateKey?: string;
  safeAddress?: string;
  timestamp: number;
}

const AUTH_STORAGE_KEY = 'mycircles_auth';
const STORAGE_EXPIRES = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Store authentication data in localStorage
 */
export function storeAuthData(data: {
  sessionType: AuthSessionType;
  privateKey?: string;
  safeAddress?: string;
}): void {
  if (!browser) return;

  const storageData: AuthStorageData = {
    ...data,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(storageData));
  } catch (error) {
    console.error('Failed to store auth data:', error);
  }
}

/**
 * Retrieve authentication data from localStorage
 */
export function getAuthData(): AuthStorageData | null {
  if (!browser) return null;

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    const data: AuthStorageData = JSON.parse(stored);

    // Check if data has expired
    if (Date.now() - data.timestamp > STORAGE_EXPIRES) {
      clearAuthData();
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to retrieve auth data:', error);
    clearAuthData(); // Clear corrupted data
    return null;
  }
}

/**
 * Clear authentication data from localStorage
 */
export function clearAuthData(): void {
  if (!browser) return;

  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear auth data:', error);
  }
}

/**
 * Check if user has stored auth data
 */
export function hasStoredAuthData(): boolean {
  return getAuthData() !== null;
}