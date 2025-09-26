import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, locals }) => {
  // Check for session
  const session = await locals.auth();

  // If authentication method is not present, redirect to login
  if (!session) {
    throw redirect(302, '/signin');
  }

  // Return authentication status and user data
  return {
    authenticated: true,
    user: session.user,
    session: session
  };
};