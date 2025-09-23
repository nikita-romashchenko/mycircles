import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { safeAuthService } from '$lib/auth/SafeAuthService';

export const GET: RequestHandler = async () => {
  try {
    const challenge = safeAuthService.generateChallenge();

    return json(challenge);
  } catch (error) {
    console.error('Error generating challenge:', error);
    return json({ error: 'Failed to generate challenge' }, { status: 500 });
  }
};