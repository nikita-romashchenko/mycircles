import { json, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { sessionManager } from './SessionManager';

/**
 * Middleware to require authentication for API routes
 */
export function requireAuth(event: RequestEvent) {
  try {
    return sessionManager.requireAuth(event.cookies);
  } catch (error) {
    throw json({ error: 'Authentication required' }, { status: 401 });
  }
}

/**
 * Middleware to optionally get session if available
 */
export function getOptionalSession(event: RequestEvent) {
  return sessionManager.getSession(event.cookies);
}

/**
 * Middleware to require signature verification for sensitive operations
 */
export async function requireSignatureAuth(
  event: RequestEvent,
  signature: string,
  message: string
) {
  const session = requireAuth(event);

  const isValid = await sessionManager.verifyUserSignature(
    event.cookies,
    signature,
    message
  );

  if (!isValid) {
    throw json({ error: 'Invalid signature' }, { status: 403 });
  }

  return session;
}

/**
 * Helper to redirect unauthenticated users to login
 */
export function redirectToLogin(url: URL) {
  if (!url.pathname.startsWith('/safe-login')) {
    throw redirect(302, '/safe-login');
  }
}