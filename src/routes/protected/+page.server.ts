import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Check for OAuth session (includes both Google OAuth and Safe-PK auth)
  const session = await locals.auth();
  console.error(session)
  // If no session, redirect to signin
  if (!session) {
    throw redirect(302, '/signin');
  }

  // Determine auth method based on session data
  const authMethod = session.user?.safeAddress ? 'safe' : 'oauth';

  // Return authentication status and user data
  return {
    authenticated: true,
    authMethod,
    user: session.user,
    session: session
  };
};