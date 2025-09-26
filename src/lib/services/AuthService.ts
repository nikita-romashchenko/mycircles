import { ethers } from 'ethers';
import mongoose from 'mongoose';
import { Profile } from '$lib/models/Profile';
import { env } from '$env/dynamic/private';
import { safeApiService } from '$lib/services/SafeApiService';
import Safe, { hashSafeMessage } from '@safe-global/protocol-kit';

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
    username?: string;
    profileId: string;
    name?: string;
    controllingEOA?: string;
    email?: string;
  };
  error?: string;
}

export interface AuthChallenge {
  nonce: string;
  message: string;
  timestamp: number;
}

export interface SessionData {
  safeAddress: string;
  profileId: string;
  username: string;
  signedAt: number;
}

export class Auth {
  private static instance: Auth;

  static getInstance(): Auth {
    if (!Auth.instance) {
      Auth.instance = new Auth();
    }
    return Auth.instance;
  }


  /**
   * Verify Safe ownership using the Safe API
   */
  async verifySafeOwnership(safeAddress: string, ownerAddress: string): Promise<boolean> {
    try {
      const controlledSafes = await safeApiService.getSafesForOwner(ownerAddress);
      return controlledSafes.map((s: string) => s.toLowerCase()).includes(safeAddress.toLowerCase());
    } catch (error) {
      console.error('Safe ownership verification error:', error);
      return false;
    }
  }

  /**
   * Verify signature using Safe Protocol Kit (EIP-1271 compatible)
   */
  async verifySafeSignature(
    safeAddress: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      const protocolKit = await Safe.init({
        provider: env.RPC_URL,
        safeAddress: safeAddress
      });

      const isValidSafeSignature = await protocolKit.isValidSignature(
        hashSafeMessage(message),
        signature
      );

      return isValidSafeSignature;
    } catch (error) {
      console.error('Safe signature verification error:', error);
      return false;
    }
  }

  /**
   * Validate message timestamp (max 5 minutes old)
   */
  validateMessageTimestamp(message: string): boolean {
    const messageMatch = message.match(/Timestamp: (\d+)/);
    if (!messageMatch) {
      return false;
    }

    const messageTimestamp = parseInt(messageMatch[1]);
    const age = Date.now() - messageTimestamp;
    return age <= 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get Safe user info for Google OAuth (without full authentication)
   */
  async getSafeUserInfo(googleEmail: string): Promise<{
    safeAddress: string;
    privateKey: string;
    profile: any
  } | null> {
    try {
      const profile = await Profile.findOne({
        email: googleEmail,
        $and: [
          { safeAddress: { $exists: true, $ne: null } },
          { safeAddress: { $ne: '0x' } }
        ]
      });

      if (!profile) {
        return null;
      }

      return {
        safeAddress: profile.safeAddress,
        privateKey: profile.privateKey,
        profile
      };
    } catch (error) {
      console.error('Error getting Safe user info:', error);
      return null;
    }
  }

  /**
   * Google OAuth login flow: verify user exists with safeAddress and privateKey
   */
  async authenticateWithGoogle(googleEmail: string): Promise<AuthResult> {
    try {
      const profile = await Profile.findOne({
        email: googleEmail,
        $and: [
          { safeAddress: { $exists: true, $ne: null } },
          { safeAddress: { $ne: '0x' } },
          { privateKey: { $exists: true, $ne: null } },
          { privateKey: { $ne: '' } }
        ]
      });

      if (!profile) {
        return {
          success: false,
          error: 'No Safe address found for this Google account. Please complete registration first.'
        };
      }

      const wallet = new ethers.Wallet(profile.privateKey);
      const ownerAddress = wallet.address;

      return {
        success: true,
        user: {
          safeAddress: profile.safeAddress,
          username: profile.username,
          profileId: profile._id.toString(),
          name: profile.name,
          controllingEOA: ownerAddress,
          email: googleEmail
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
   * Authenticate with wallet owner, safe address, signature and message
   */
  async authenticateWithCredentials(
    message: string,
    signature: string,
    walletOwner: string,
    safeAddress: string
  ): Promise<AuthResult> {
    try {
      // Validate message timestamp
      if (!this.validateMessageTimestamp(message)) {
        return {
          success: false,
          error: 'Message timestamp is too old or invalid'
        };
      }

      // Verify the signature using Safe Protocol Kit
      const isValidSignature = await this.verifySafeSignature(
        safeAddress,
        signature,
        message
      );

      if (!isValidSignature) {
        return {
          success: false,
          error: 'Invalid signature or Safe ownership'
        };
      }

      // Verify that the wallet owner actually controls this safe
      const isOwner = await this.verifySafeOwnership(safeAddress, walletOwner);
      if (!isOwner) {
        return {
          success: false,
          error: 'Wallet does not control this Safe'
        };
      }

      // Check if profile exists for this Safe address
      const profile = await Profile.findOne({ safeAddress: safeAddress });

      if (!profile) {
        return {
          success: false,
          error: 'No profile found for this Safe address'
        };
      }

      return {
        success: true,
        user: {
          safeAddress: safeAddress,
          username: profile.username,
          profileId: profile._id.toString(),
          name: profile.name,
          controllingEOA: walletOwner,
          email: profile.email || undefined
        }
      };
    } catch (error) {
      console.error('Credentials authentication error:', error);
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
          name: profile.name
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
   * Create session data for authenticated user
   */
  createSessionData(user: AuthResult['user']): SessionData {
    if (!user || !user.username) {
      throw new Error('Cannot create session data without user or username');
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
  generateChallenge(): AuthChallenge {
    const nonce = crypto.randomUUID();
    const timestamp = Date.now();
    const message = `Sign this message to authenticate with MyCircles.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}\nDomain: mycircles.app`;

    return { nonce, message, timestamp };
  }
}

// Export singleton instance
export const authService = Auth.getInstance();