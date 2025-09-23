import type { RequestEvent } from '@sveltejs/kit';
import { authService, type SessionData } from './AuthService';

export class SessionManager {
  private static instance: SessionManager;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Get session data from HTTP-only cookie
   */
  getSession(cookies: RequestEvent['cookies']): SessionData | null {
    try {
      const token = cookies.get('safe_auth_token');
      if (!token) {
        return null;
      }

      const sessionData = JSON.parse(Buffer.from(token, 'base64').toString());

      // Validate session
      if (!authService.validateSession(sessionData)) {
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Error parsing session:', error);
      return null;
    }
  }

  /**
   * Clear session cookie
   */
  clearSession(cookies: RequestEvent['cookies']): void {
    cookies.delete('safe_auth_token', { path: '/' });
  }

  /**
   * Check if request is from authenticated user
   */
  isAuthenticated(cookies: RequestEvent['cookies']): boolean {
    return this.getSession(cookies) !== null;
  }

  /**
   * Get safe address from session
   */
  getSafeAddress(cookies: RequestEvent['cookies']): string | null {
    const session = this.getSession(cookies);
    return session?.safeAddress || null;
  }

  /**
   * Require authentication for a request
   * Throws error if not authenticated
   */
  requireAuth(cookies: RequestEvent['cookies']): SessionData {
    const session = this.getSession(cookies);
    if (!session) {
      throw new Error('Authentication required');
    }
    return session;
  }

  /**
   * Verify that a signature was made by the authenticated user
   * This should be called for any sensitive server operations
   */
  async verifyUserSignature(
    cookies: RequestEvent['cookies'],
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      const session = this.getSession(cookies);
      if (!session) {
        return false;
      }

      // Use auth service to verify signature against the session's safe address
      const verifyResult = await authService.verifySignature(session.safeAddress, signature, message);
      return verifyResult.success;
    } catch (error) {
      console.error('Error verifying user signature:', error);
      return false;
    }
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();