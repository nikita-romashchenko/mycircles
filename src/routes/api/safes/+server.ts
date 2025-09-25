import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { safeApiService } from '$lib/services/SafeApiService';
import { ethers } from 'ethers';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, ownerAddress, privateKey, safeAddress, safeAddresses } = body;

    switch (action) {
      case 'getSafesForOwner': {
        if (!ownerAddress && !privateKey) {
          return json({ error: 'Either ownerAddress or privateKey is required' }, { status: 400 });
        }

        let targetAddress = ownerAddress;

        // If private key provided, extract address from it
        if (privateKey && !ownerAddress) {
          try {
            const wallet = new ethers.Wallet(privateKey);
            targetAddress = wallet.address;
          } catch (error) {
            return json({ error: 'Invalid private key format' }, { status: 400 });
          }
        }

        const safes = await safeApiService.getSafesForOwner(targetAddress);
        return json({
          safes,
          ownerAddress: targetAddress
        });
      }

      case 'getSafeInfo': {
        if (!safeAddress) {
          return json({ error: 'safeAddress is required' }, { status: 400 });
        }

        const safeInfo = await safeApiService.getSafeInfo(safeAddress);
        return json({ safeInfo });
      }

      case 'getMultipleSafeInfo': {
        if (!safeAddresses || !Array.isArray(safeAddresses)) {
          return json({ error: 'safeAddresses array is required' }, { status: 400 });
        }

        const safesInfo = await safeApiService.getMultipleSafeInfo(safeAddresses);
        return json({ safesInfo });
      }

      case 'getSafesWithInfo': {
        if (!ownerAddress && !privateKey) {
          return json({ error: 'Either ownerAddress or privateKey is required' }, { status: 400 });
        }

        let targetAddress = ownerAddress;

        // If private key provided, extract address from it
        if (privateKey && !ownerAddress) {
          try {
            const wallet = new ethers.Wallet(privateKey);
            targetAddress = wallet.address;
          } catch (error) {
            return json({ error: 'Invalid private key format' }, { status: 400 });
          }
        }

        const safes = await safeApiService.getSafesWithInfoForOwner(targetAddress);
        return json({
          safes,
          ownerAddress: targetAddress
        });
      }

      default:
        return json({ error: 'Invalid action. Supported actions: getSafesForOwner, getSafeInfo, getMultipleSafeInfo, getSafesWithInfo' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in safes API:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Failed to process Safe request' },
      { status: 500 }
    );
  }
};