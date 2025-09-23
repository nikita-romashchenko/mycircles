import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { sessionManager } from '$lib/auth/SessionManager';

export const load: PageServerLoad = async ({ cookies, locals }) => {
  // Check for Google OAuth session
  const oauthSession = await locals.auth();

  // Check for Safe authentication
  const safeSession = sessionManager.getSession(cookies);

  // If neither authentication method is present, redirect to login
  if (!oauthSession && !safeSession) {
    throw redirect(302, '/safe-login');
  }

  // Return authentication status and user data
  return {
    authenticated: true,
    authMethod: oauthSession ? 'oauth' : 'safe',
    user: oauthSession?.user || {
      username: safeSession?.username,
      safeAddress: safeSession?.safeAddress,
      profileId: safeSession?.profileId
    },
    oauthSession: oauthSession,
    safeSession: safeSession
  };
};