/**
 * EIP-1193 Provider implementation for private keys
 *
 * This utility creates an EIP-1193 compatible provider from a private key,
 * allowing it to be used in place of window.ethereum for signing operations.
 */

import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { gnosis } from 'viem/chains';
import { PUBLIC_RPC_URL } from '$env/static/public';

export interface EIP1193Provider {
  request(args: { method: string; params?: any[] }): Promise<any>;
}

/**
 * Create an EIP-1193 compatible provider from a private key
 *
 * @param privateKey - The private key (with or without 0x prefix)
 * @returns EIP1193Provider that can sign messages and transactions
 */
export function createPrivateKeyProvider(privateKey: string): EIP1193Provider {
  // Ensure private key has 0x prefix
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

  const account = privateKeyToAccount(formattedKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: gnosis,
    transport: http(PUBLIC_RPC_URL)
  });

  // Create EIP-1193 compatible provider
  const provider: EIP1193Provider = {
    async request(args: { method: string; params?: any[] }): Promise<any> {
      const { method, params = [] } = args;

      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return [account.address];

        case 'eth_chainId':
          return `0x${gnosis.id.toString(16)}`;

        case 'eth_getCode': {
          const [address, blockTag = 'latest'] = params;
          const code = await walletClient.getChainId().then(() =>
            walletClient.request({
              method: 'eth_getCode' as any,
              params: [address, blockTag]
            })
          );
          return code;
        }

        case 'eth_call': {
          const [transaction, blockTag = 'latest'] = params;
          const result = await walletClient.request({
            method: 'eth_call' as any,
            params: [transaction, blockTag]
          });
          return result;
        }

        case 'eth_estimateGas': {
          const [transaction] = params;
          const gasEstimate = await walletClient.request({
            method: 'eth_estimateGas' as any,
            params: [transaction]
          });
          return gasEstimate;
        }

        case 'eth_getBalance': {
          const [address, blockTag = 'latest'] = params;
          const balance = await walletClient.request({
            method: 'eth_getBalance' as any,
            params: [address, blockTag]
          });
          return balance;
        }

        case 'eth_getTransactionCount': {
          const [address, blockTag = 'latest'] = params;
          const nonce = await walletClient.request({
            method: 'eth_getTransactionCount' as any,
            params: [address, blockTag]
          });
          return nonce;
        }

        case 'eth_blockNumber': {
          const blockNumber = await walletClient.request({
            method: 'eth_blockNumber' as any,
            params: []
          });
          return blockNumber;
        }

        case 'personal_sign': {
          const [message, address] = params;
          if (address.toLowerCase() !== account.address.toLowerCase()) {
            throw new Error('Address does not match private key');
          }
          return await account.signMessage({ message });
        }

        case 'eth_signTypedData_v4': {
          const [address, typedDataJson] = params;
          if (address.toLowerCase() !== account.address.toLowerCase()) {
            throw new Error('Address does not match private key');
          }
          const typedData = typeof typedDataJson === 'string'
            ? JSON.parse(typedDataJson)
            : typedDataJson;
          return await account.signTypedData(typedData);
        }

        case 'eth_sign': {
          const [address, messageHex] = params;
          if (address.toLowerCase() !== account.address.toLowerCase()) {
            throw new Error('Address does not match private key');
          }
          return await account.signMessage({
            message: { raw: messageHex as `0x${string}` }
          });
        }

        case 'eth_sendTransaction': {
          const [transaction] = params;
          const hash = await walletClient.sendTransaction({
            ...transaction,
            account,
            chain: gnosis
          });
          return hash;
        }

        case 'wallet_switchEthereumChain':
        case 'wallet_addEthereumChain':
          // For private key provider, we're locked to Gnosis chain
          if (params[0]?.chainId !== `0x${gnosis.id.toString(16)}`) {
            throw new Error('Only Gnosis chain is supported');
          }
          return null;

        default:
          // For any other RPC method, forward it to the underlying transport
          try {
            return await walletClient.request({
              method: method as any,
              params: params as any
            });
          } catch (error) {
            throw new Error(`Unsupported method: ${method}`);
          }
      }
    }
  };

  return provider;
}

/**
 * Check if a private key is valid
 *
 * @param privateKey - The private key to validate
 * @returns true if valid, false otherwise
 */
export function isValidPrivateKey(privateKey: string): boolean {
  try {
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

    // Check length (64 hex chars + 0x prefix = 66 total)
    if (formattedKey.length !== 66) {
      return false;
    }

    // Try to create an account from it
    privateKeyToAccount(formattedKey as `0x${string}`);
    return true;
  } catch {
    return false;
  }
}
