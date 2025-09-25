import { env } from '$env/dynamic/private';
import { ethers } from 'ethers';

export interface SafeInfo {
  address: string;
  threshold: number;
  owners: string[];
  balance: string;
}

export interface SafeApiResponse {
  safes: string[];
}

/**
 * Centralized service for Safe Global API interactions
 */
export class SafeApiService {
  private static readonly BASE_URL = 'https://safe-transaction-gnosis-chain.safe.global/api/v1';
  private static instance: SafeApiService;
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.RPC_URL);
  }

  static getInstance(): SafeApiService {
    if (!SafeApiService.instance) {
      SafeApiService.instance = new SafeApiService();
    }
    return SafeApiService.instance;
  }

  /**
   * Get Safe addresses owned by a wallet address
   */
  async getSafesForOwner(ownerAddress: string): Promise<string[]> {
    try {
      const checksumAddress = ethers.getAddress(ownerAddress);
      const response = await fetch(
        `${SafeApiService.BASE_URL}/owners/${checksumAddress}/safes/`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Safe API error: ${response.status} ${response.statusText}`);
      }

      const data: SafeApiResponse = await response.json();
      return data.safes || [];
    } catch (error) {
      console.error('Error fetching Safe addresses:', error);
      throw new Error(`Failed to fetch Safe addresses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed information about a specific Safe
   */
  async getSafeInfo(safeAddress: string): Promise<SafeInfo> {
    try {
      const checksumAddress = ethers.getAddress(safeAddress);

      // Get safe info from API
      const safeResponse = await fetch(
        `${SafeApiService.BASE_URL}/safes/${checksumAddress}/`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      let safeInfo: any = {
        threshold: 1,
        owners: []
      };

      if (safeResponse.ok) {
        safeInfo = await safeResponse.json();
      } else {
        console.warn(`Failed to fetch info for safe ${checksumAddress}`);
      }

      // Get balance from RPC
      let balance = '0';
      try {
        const balanceWei = await this.provider.getBalance(checksumAddress);
        balance = ethers.formatEther(balanceWei);
      } catch (error) {
        console.warn(`Failed to fetch balance for safe ${checksumAddress}:`, error);
      }

      return {
        address: checksumAddress,
        threshold: safeInfo.threshold || 1,
        owners: safeInfo.owners || [],
        balance
      };
    } catch (error) {
      console.error(`Error fetching safe info for ${safeAddress}:`, error);
      throw new Error(`Failed to fetch Safe info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed information for multiple Safes
   */
  async getMultipleSafeInfo(safeAddresses: string[]): Promise<SafeInfo[]> {
    const results = await Promise.allSettled(
      safeAddresses.map(address => this.getSafeInfo(address))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<SafeInfo> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Get Safes with detailed info for an owner
   */
  async getSafesWithInfoForOwner(ownerAddress: string): Promise<SafeInfo[]> {
    try {
      const safeAddresses = await this.getSafesForOwner(ownerAddress);
      return await this.getMultipleSafeInfo(safeAddresses);
    } catch (error) {
      console.error('Error fetching Safes with info:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const safeApiService = SafeApiService.getInstance();