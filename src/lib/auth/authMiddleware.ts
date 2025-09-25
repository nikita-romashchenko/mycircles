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
