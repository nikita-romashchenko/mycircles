import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/auth/AuthService';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, signature, message, safeAddress, walletOwner } = await request.json();

    if (!email || !signature || !message || !safeAddress || !walletOwner) {
      return json({
        error: 'Missing required parameters: email, signature, message, safeAddress, walletOwner'
      }, { status: 400 });
    }

    // First verify this is a valid Google user with Safe info
    const safeUserInfo = await authService.getSafeUserInfo(email);
    if (!safeUserInfo) {
      return json({ error: 'No Safe user found for this email' }, { status: 404 });
    }

    // Verify the Safe address matches
    if (safeUserInfo.safeAddress.toLowerCase() !== safeAddress.toLowerCase()) {
      return json({ error: 'Safe address mismatch' }, { status: 400 });
    }

    // Authenticate with credentials (this verifies the signature and Safe ownership)
    const result = await authService.authenticateWithCredentials(
      message,
      signature,
      walletOwner,
      safeAddress
    );

    if (!result.success) {
      return json({ error: result.error || 'Authentication failed' }, { status: 401 });
    }

    return json({
      success: true,
      user: result.user
    });

  } catch (error) {
    console.error('Error in Google Safe complete authentication:', error);
    return json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
};