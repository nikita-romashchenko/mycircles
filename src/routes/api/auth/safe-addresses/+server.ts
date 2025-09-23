import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { safeAuthService } from '$lib/auth/SafeAuthService';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { privateKey } = await request.json();

    if (!privateKey) {
      return json({ error: 'Private key is required' }, { status: 400 });
    }

    const safeInfo = await safeAuthService.getSafeAddressesForPrivateKey(privateKey);

    return json({
      ownerAddress: safeInfo.ownerAddress,
      safes: safeInfo.controlledSafes
    });
  } catch (error) {
    console.error('Error getting Safe addresses:', error);
    return json({ error: 'Failed to get Safe addresses' }, { status: 500 });
  }
};