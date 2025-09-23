import { ethers } from 'ethers';
import { env } from '$env/dynamic/private';
import mongoose from 'mongoose';
import Safe, {hashSafeMessage} from '@safe-global/protocol-kit';
import { Profile } from '$lib/models/Profile';

// Connect to MongoDB if not already connected
if (mongoose.connection.readyState === 0) {
  mongoose.connect(env.MONGODB_URI || 'mongodb://localhost:27017/mycircles')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
}

export interface SafeAuthResult {
  success: boolean;
  user?: {
    safeAddress: string;
    username?: string;
    profileId: string;
    name?: string;
    controllingEOA: string;
    email?: string;
  };
  error?: string;
}

export interface SafeAuthChallenge {
  nonce: string;
  message: string;
  timestamp: number;
}

export interface SafeOwnerInfo {
  ownerAddress: string;
  controlledSafes: string[];
}

export class SafeAuthService {
  private static instance: SafeAuthService;
  private readonly GNOSIS_RPC_URL = 'https://rpc.gnosischain.com';

  constructor() {}

  static getInstance(): SafeAuthService {
    if (!SafeAuthService.instance) {
      SafeAuthService.instance = new SafeAuthService();
    }
    return SafeAuthService.instance;
  }

  /**
   * Generate authentication challenge for signing
   */
  generateChallenge(): SafeAuthChallenge {
    const nonce = crypto.randomUUID();
    const timestamp = Date.now();
    const message = `Sign this message to authenticate with MyCircles.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}\nDomain: ${env.ORIGIN || 'localhost:5173'}`;

    return { nonce, message, timestamp };
  }

  /**
   * Get Safe addresses controlled by a private key/EOA
   */
  async getSafeAddressesForOwner(ownerAddress: string): Promise<string[]> {
    try {
      const checksumAddress = ethers.getAddress(ownerAddress);
      const response = await fetch(
        `https://safe-transaction-gnosis-chain.safe.global/api/v1/owners/${checksumAddress}/safes/`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Safe addresses: ${response.status}`);
      }

      const data = await response.json();
      return data.safes || [];
    } catch (error) {
      console.error('Error fetching Safe addresses:', error);
      return [];
    }
  }

  /**
   * Get Safe addresses controlled by a private key
   */
  async getSafeAddressesForPrivateKey(privateKey: string): Promise<SafeOwnerInfo> {
    try {
      // Validate private key format
      if (!privateKey.match(/^0x[a-fA-F0-9]{64}$/)) {
        throw new Error('Invalid private key format');
      }

      const wallet = new ethers.Wallet(privateKey);
      const ownerAddress = wallet.address;
      const controlledSafes = await this.getSafeAddressesForOwner(ownerAddress);

      return {
        ownerAddress,
        controlledSafes
      };
    } catch (error) {
      console.error('Error getting Safe addresses for private key:', error);
      throw error;
    }
  }

  /**
   * Verify signature using EIP-1271 compatible verification
   */
  async verifySignature(
    safeAddress: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      // First verify the signature was made by the EOA
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
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify Safe ownership using the Safe Protocol Kit
   */
  async verifySafeOwnership(safeAddress: string, ownerAddress: string): Promise<boolean> {
    try {
      // For now, use the API check as the Safe SDK setup is complex
      // TODO: Implement proper Safe SDK integration when needed
      const controlledSafes = await this.getSafeAddressesForOwner(ownerAddress);
      return controlledSafes.map((s: string) => s.toLowerCase()).includes(safeAddress.toLowerCase());
    } catch (error) {
      console.error('Safe ownership verification error:', error);
      return false;
    }
  }

  /**
   * Flow 1: Direct private key authentication
   */
  async authenticateWithPrivateKey(
    privateKey: string,
    selectedSafeAddress: string,
    signature: string,
    originalMessage: string
  ): Promise<SafeAuthResult> {
    try {
      const wallet = new ethers.Wallet(privateKey);
      const ownerAddress = wallet.address;

      // Verify the signature
      const isValidSignature = await this.verifySignature(
        selectedSafeAddress,
        signature,
        originalMessage
      );

      if (!isValidSignature) {
        return {
          success: false,
          error: 'Invalid signature or Safe ownership'
        };
      }

      // Check if profile exists for this Safe address
      let profile = await Profile.findOne({ safeAddress: selectedSafeAddress });

      if (!profile) {
        // Create a new profile for this Safe address
        profile = new Profile({
          safeAddress: selectedSafeAddress,
          privateKey,
          email: `${selectedSafeAddress}@safe.local`, // Placeholder email
          name: `Safe User ${selectedSafeAddress.slice(0, 8)}`
        });
        await profile.save();
      } else {
        // Update the private key if it's different
        if (profile.privateKey !== privateKey) {
          profile.privateKey = privateKey;
          await profile.save();
        }
      }

      return {
        success: true,
        user: {
          safeAddress: selectedSafeAddress,
          username: profile.username,
          profileId: profile._id.toString(),
          name: profile.name,
          controllingEOA: ownerAddress,
          email: profile.email
        }
      };
    } catch (error) {
      console.error('Private key authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Flow 2: Google OAuth + Safe verification
   */
  async authenticateWithGoogle(
    googleEmail: string,
    signature: string,
    originalMessage: string
  ): Promise<SafeAuthResult> {
    try {
      // Find profile by Google email
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

      // Verify the signature
      const isValidSignature = await this.verifySignature(
        profile.safeAddress,
        signature,
        originalMessage
      );

      if (!isValidSignature) {
        return {
          success: false,
          error: 'Invalid signature or Safe ownership'
        };
      }

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
      console.error('Google + Safe authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
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
}

// Export singleton instance
export const safeAuthService = SafeAuthService.getInstance();