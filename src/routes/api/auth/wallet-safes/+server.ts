import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/auth/AuthService';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const safes = await authService.getSafeAddressesForOwner(walletAddress);

    return json({
      ownerAddress: walletAddress,
      safes: safes
    });
  } catch (error) {
    console.error('Error getting Safe addresses for wallet:', error);
    return json({ error: 'Failed to get Safe addresses' }, { status: 500 });
  }
};