import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Profile } from '$lib/models/Profile';

export const GET: RequestHandler = async ({ locals, cookies }) => {
  try {
    // Get session data
    const session = await locals.auth();

    if (!session?.user?.safeAddress) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch the profile with private key
    const profile = await Profile.findOne({
      safeAddress: session.user.safeAddress
    }).select('privateKey safeAddress');

    if (!profile || !profile.privateKey) {
      return json({ error: 'Private key not found' }, { status: 404 });
    }

    return json({
      privateKey: profile.privateKey,
      safeAddress: profile.safeAddress
    });
  } catch (error) {
    console.error('Error fetching private key:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};