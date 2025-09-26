import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/services/AuthService';

export const GET: RequestHandler = async () => {
  try {
    const challenge = authService.generateChallenge();

    return json(challenge);
  } catch (error) {
    console.error('Error generating challenge:', error);
    return json({ error: 'Failed to generate challenge' }, { status: 500 });
  }
};