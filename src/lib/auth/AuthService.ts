import { ethers } from 'ethers';
import mongoose from 'mongoose';
import { Profile } from '$lib/models/Profile';
import { env } from '$env/dynamic/private';

// Connect to MongoDB if not already connected
if (mongoose.connection.readyState === 0) {
  mongoose.connect(env.MONGODB_URI || 'mongodb://localhost:27017/mycircles')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
}

export interface AuthResult {
  success: boolean;
  user?: {
    safeAddress: string;
    username: string;
    profileId: string;
    name: string;
    privateKey: string;
  };
  error?: string;
}

export interface SessionData {
  safeAddress: string;
  profileId: string;
  username: string;
  signedAt: number;
}

export class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Google OAuth login flow: verify user exists with safeAddress and privateKey
   */
  async authenticateWithGoogle(googleEmail: string): Promise<AuthResult> {
    try {
      const profile = await Profile.findOne({
        email: googleEmail,
        safeAddress: { $exists: true, $ne: null },
        privateKey: { $exists: true, $ne: null }
      });

      if (!profile) {
        return {
          success: false,
          error: 'No Safe address found for this Google account. Please complete registration first.'
        };
      }

      return {
        success: true,
        user: {
          safeAddress: profile.safeAddress,
          username: profile.username,
          profileId: profile._id.toString(),
          name: profile.name,
          privateKey: profile.privateKey
        }
      };
    } catch (error) {
      console.error('Google auth error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Private key login flow: extract safes, verify ownership
   */
  async authenticateWithPrivateKey(privateKey: string, selectedSafeAddress: string): Promise<AuthResult> {
    try {
      // Validate private key format
      if (!privateKey.match(/^0x[a-fA-F0-9]{64}$/)) {
        return {
          success: false,
          error: 'Invalid private key format'
        };
      }

      // Get wallet address from private key
      const wallet = new ethers.Wallet(privateKey);
      const walletAddress = wallet.address;

      // Verify the private key controls the selected safe
      const controlsSafe = await this.verifyPrivateKeyControlsSafe(privateKey, selectedSafeAddress);
      if (!controlsSafe) {
        return {
          success: false,
          error: 'Private key does not control the selected Safe address'
        };
      }

      // Find profile by safeAddress
      const profile = await Profile.findOne({ safeAddress: selectedSafeAddress });
      if (!profile) {
        return {
          success: false,
          error: 'No profile found for this Safe address'
        };
      }

      // Verify the stored private key matches
      if (profile.privateKey !== privateKey) {
        return {
          success: false,
          error: 'Private key does not match stored key for this Safe'
        };
      }

      return {
        success: true,
        user: {
          safeAddress: profile.safeAddress,
          username: profile.username,
          profileId: profile._id.toString(),
          name: profile.name,
          privateKey: profile.privateKey
        }
      };
    } catch (error) {
      console.error('Private key auth error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Verify private key signature against stored profile
   */
  async verifySignature(safeAddress: string, signature: string, message: string): Promise<AuthResult> {
    try {
      // Find profile by safeAddress
      const profile = await Profile.findOne({ safeAddress });
      if (!profile) {
        return {
          success: false,
          error: 'Profile not found for this Safe address'
        };
      }

      // Verify signature
      let recoveredAddress: string;
      try {
        recoveredAddress = ethers.verifyMessage(message, signature);
      } catch (error) {
        return {
          success: false,
          error: 'Invalid signature'
        };
      }

      // Verify the signature was made with the private key that controls this Safe
      const expectedWallet = new ethers.Wallet(profile.privateKey);
      if (recoveredAddress.toLowerCase() !== expectedWallet.address.toLowerCase()) {
        return {
          success: false,
          error: 'Signature does not match Safe owner'
        };
      }

      // Check message timestamp (max 5 minutes old)
      const messageMatch = message.match(/Timestamp: (\d+)/);
      if (messageMatch) {
        const messageTimestamp = parseInt(messageMatch[1]);
        const age = Date.now() - messageTimestamp;
        if (age > 5 * 60 * 1000) { // 5 minutes
          return {
            success: false,
            error: 'Authentication message expired'
          };
        }
      }

      return {
        success: true,
        user: {
          safeAddress: profile.safeAddress,
          username: profile.username,
          profileId: profile._id.toString(),
          name: profile.name,
          privateKey: profile.privateKey
        }
      };
    } catch (error) {
      console.error('Signature verification error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Get Safe addresses controlled by a private key
   */
  async getSafeAddressesForPrivateKey(privateKey: string): Promise<string[]> {
    try {
      const wallet = new ethers.Wallet(privateKey);
      const walletAddress = wallet.address;
      const checksumAddress = ethers.getAddress(walletAddress);

      const response = await fetch(`https://safe-transaction-gnosis-chain.safe.global/api/v1/owners/${checksumAddress}/safes/`);

      if (!response.ok) {
        throw new Error('Failed to fetch Safe addresses');
      }

      const data = await response.json();
      return data.safes || [];
    } catch (error) {
      console.error('Error fetching Safe addresses:', error);
      return [];
    }
  }

  /**
   * Verify that a private key controls a specific Safe address
   */
  private async verifyPrivateKeyControlsSafe(privateKey: string, safeAddress: string): Promise<boolean> {
    try {
      const controlledSafes = await this.getSafeAddressesForPrivateKey(privateKey);
      return controlledSafes.map(s => s.toLowerCase()).includes(safeAddress.toLowerCase());
    } catch (error) {
      console.error('Error verifying Safe control:', error);
      return false;
    }
  }

  /**
   * Create session data for authenticated user
   */
  createSessionData(user: AuthResult['user']): SessionData {
    if (!user) {
      throw new Error('Cannot create session data without user');
    }

    return {
      safeAddress: user.safeAddress,
      profileId: user.profileId,
      username: user.username,
      signedAt: Date.now()
    };
  }

  /**
   * Validate session data
   */
  validateSession(sessionData: SessionData): boolean {
    if (!sessionData?.safeAddress || !sessionData?.profileId || !sessionData?.signedAt) {
      return false;
    }

    // Check if session is expired (24 hours)
    const age = Date.now() - sessionData.signedAt;
    if (age > 24 * 60 * 60 * 1000) {
      return false;
    }

    return true;
  }

  /**
   * Generate authentication challenge
   */
  generateChallenge(): { nonce: string; message: string; timestamp: number } {
    const nonce = crypto.randomUUID();
    const timestamp = Date.now();
    const message = `Sign this message to authenticate with MyCircles.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

    return { nonce, message, timestamp };
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();