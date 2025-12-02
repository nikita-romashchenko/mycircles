import type { Address, Hex, TransactionRequest, ContractRunner, BatchRun } from '@aboutcircles/sdk-types';
import type { PublicClient, TransactionReceipt, Chain } from 'viem';
import type { EIP1193Provider } from 'viem';
import { createPublicClient, http } from 'viem';
import { RunnerError } from '@aboutcircles/sdk-runner';
import { Safe4337Pack } from '@safe-global/relay-kit';

/**
 * Configuration options for Safe 4337 paymaster
 */
export interface Safe4337PaymasterOptions {
  /**
   * Whether transactions should be sponsored (gasless)
   */
  isSponsored: boolean;

  /**
   * Pimlico paymaster URL for sponsored transactions
   * @example 'https://api.pimlico.io/v2/100/rpc?apikey=YOUR_API_KEY'
   */
  paymasterUrl: string;
}

/**
 * Configuration options for Safe 4337 custom contracts
 */
export interface Safe4337CustomContracts {
  /**
   * Address of the Safe 4337 module contract
   * @example '0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226'
   */
  safe4337ModuleAddress: string;

  /**
   * Optional entry point address (defaults to standard ERC-4337 entry point)
   */
  entryPointAddress?: string;
}

/**
 * Safe 4337 browser contract runner implementation using Safe4337Pack from relay-kit
 * Executes account abstraction transactions with optional paymaster sponsorship
 *
 * This runner enables gasless transactions through ERC-4337 account abstraction
 * and Pimlico bundler/paymaster infrastructure.
 *
 * @example
 * ```typescript
 * import { createPublicClient, http } from 'viem';
 * import { gnosis } from 'viem/chains';
 * import { Safe4337Runner } from '$lib/runners/Safe4337Runner';
 *
 * const publicClient = createPublicClient({
 *   chain: gnosis,
 *   transport: http('https://rpc.gnosischain.com')
 * });
 *
 * const runner = new Safe4337Runner(
 *   publicClient,
 *   window.ethereum,
 *   '0xYourSafeAddress...',
 *   'https://api.pimlico.io/v2/100/rpc?apikey=YOUR_API_KEY',
 *   {
 *     isSponsored: true,
 *     paymasterUrl: 'https://api.pimlico.io/v2/100/rpc?apikey=YOUR_API_KEY'
 *   },
 *   {
 *     safe4337ModuleAddress: '0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226'
 *   }
 * );
 *
 * await runner.init();
 * ```
 */
export class Safe4337Runner implements ContractRunner {
  public address?: Address;
  public publicClient: PublicClient;

  private eip1193Provider: EIP1193Provider;
  private safeAddress?: Address;
  private bundlerUrl: string;
  private paymasterOptions?: Safe4337PaymasterOptions;
  private customContracts?: Safe4337CustomContracts;
  private safe4337?: any;
  private safeModulesVersion: string;

  /**
   * Creates a new Safe4337Runner
   * @param publicClient - The viem public client for reading blockchain state
   * @param eip1193Provider - The EIP-1193 provider from the browser (e.g., window.ethereum)
   * @param safeAddress - The address of the Safe wallet (optional, can be set in init)
   * @param bundlerUrl - Pimlico bundler URL for ERC-4337 transactions
   * @param paymasterOptions - Optional paymaster configuration for sponsored transactions
   * @param customContracts - Optional custom contract addresses
   * @param safeModulesVersion - Version of Safe modules (default: '0.3.0')
   */
  constructor(
    publicClient: PublicClient,
    eip1193Provider: EIP1193Provider,
    safeAddress: Address | undefined,
    bundlerUrl: string,
    paymasterOptions?: Safe4337PaymasterOptions,
    customContracts?: Safe4337CustomContracts,
    safeModulesVersion: string = '0.3.0'
  ) {
    this.publicClient = publicClient;
    this.eip1193Provider = eip1193Provider;
    this.safeAddress = safeAddress;
    this.bundlerUrl = bundlerUrl;
    this.paymasterOptions = paymasterOptions;
    this.customContracts = customContracts;
    this.safeModulesVersion = safeModulesVersion;
  }

  /**
   * Create and initialize a Safe4337Runner in one step
   * @param rpcUrl - The RPC URL to connect to
   * @param eip1193Provider - The EIP-1193 provider from the browser (e.g., window.ethereum)
   * @param safeAddress - The address of the Safe wallet
   * @param chain - The viem chain configuration (e.g., gnosis from 'viem/chains')
   * @param bundlerUrl - Pimlico bundler URL for ERC-4337 transactions
   * @param paymasterOptions - Optional paymaster configuration for sponsored transactions
   * @param customContracts - Optional custom contract addresses
   * @param safeModulesVersion - Version of Safe modules (default: '0.3.0')
   * @returns An initialized Safe4337Runner instance
   *
   * @example
   * ```typescript
   * import { gnosis } from 'viem/chains';
   * import { Safe4337Runner } from '$lib/runners/Safe4337Runner';
   *
   * const runner = await Safe4337Runner.create(
   *   'https://rpc.gnosischain.com',
   *   window.ethereum,
   *   '0xYourSafeAddress...',
   *   gnosis,
   *   'https://api.pimlico.io/v2/100/rpc?apikey=YOUR_API_KEY',
   *   {
   *     isSponsored: true,
   *     paymasterUrl: 'https://api.pimlico.io/v2/100/rpc?apikey=YOUR_API_KEY'
   *   },
   *   {
   *     safe4337ModuleAddress: '0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226'
   *   }
   * );
   * ```
   */
  static async create(
    rpcUrl: string,
    eip1193Provider: EIP1193Provider,
    safeAddress: Address,
    chain: Chain,
    bundlerUrl: string,
    paymasterOptions?: Safe4337PaymasterOptions,
    customContracts?: Safe4337CustomContracts,
    safeModulesVersion: string = '0.3.0'
  ): Promise<Safe4337Runner> {
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const runner = new Safe4337Runner(
      publicClient,
      eip1193Provider,
      safeAddress,
      bundlerUrl,
      paymasterOptions,
      customContracts,
      safeModulesVersion
    );
    await runner.init();
    return runner;
  }

  /**
   * Initialize the runner with a Safe address
   * Sets up the Safe4337Pack with bundler and optional paymaster
   * @param safeAddress - The address of the Safe wallet (optional if provided in constructor)
   * @throws {RunnerError} If no Safe address is provided or initialization fails
   */
  async init(safeAddress?: Address): Promise<void> {
    // Use provided address or the one from constructor
    const targetSafeAddress = safeAddress || this.safeAddress;

    if (!targetSafeAddress) {
      throw RunnerError.initializationFailed(
        'Safe4337Runner',
        new Error('Safe address must be provided either in constructor or init()')
      );
    }

    if (!this.eip1193Provider) {
      throw RunnerError.initializationFailed(
        'Safe4337Runner',
        new Error('No EIP-1193 provider available. Make sure you are in a browser environment with a Web3 wallet extension.')
      );
    }

    try {
      // Get the current signer address from the provider
      const accounts = await this.eip1193Provider.request({
        method: 'eth_requestAccounts'
      }) as string[];

      const signerAddress = accounts[0];

      if (!signerAddress) {
        throw RunnerError.missingSigner();
      }

      this.safeAddress = targetSafeAddress;
      this.address = targetSafeAddress;

      // Build initialization options
      const initOptions: any = {
        provider: this.eip1193Provider,
        signer: signerAddress,
        safeModulesVersion: this.safeModulesVersion,
        bundlerUrl: this.bundlerUrl,
        options: {
          safeAddress: targetSafeAddress,
        },
      };

      // Add custom contracts if provided
      if (this.customContracts) {
        initOptions.customContracts = this.customContracts;
      }

      // Add paymaster options if provided
      if (this.paymasterOptions) {
        initOptions.paymasterOptions = this.paymasterOptions;
      }

      // Initialize Safe4337Pack
      this.safe4337 = await Safe4337Pack.init(initOptions);

    } catch (error) {
      throw RunnerError.initializationFailed('Safe4337Runner', error);
    }
  }

  /**
   * Ensures the Safe4337Pack is initialized
   * @private
   */
  private ensureSafe4337(): any {
    if (!this.safe4337) {
      throw RunnerError.initializationFailed(
        'Safe4337Runner',
        new Error('Safe4337Runner not initialized. Call init() first.')
      );
    }
    return this.safe4337;
  }

  /**
   * Estimate gas for a transaction
   */
  estimateGas = async (tx: TransactionRequest): Promise<bigint> => {
    const estimate = await this.publicClient.estimateGas({
      // @ts-expect-error - Address type is compatible with viem's 0x${string}
      account: this.address,
      // @ts-expect-error - Address type is compatible with viem's 0x${string}
      to: tx.to!,
      data: tx.data,
      value: tx.value,
    });

    return estimate;
  };

  /**
   * Call a contract (read-only operation)
   */
  call = async (tx: TransactionRequest): Promise<string> => {
    const result = await this.publicClient.call({
      // @ts-expect-error - Address type is compatible with viem's 0x${string}
      account: tx.from || this.address,
      // @ts-expect-error - Address type is compatible with viem's 0x${string}
      to: tx.to,
      data: tx.data,
      value: tx.value,
      gas: tx.gas,
      gasPrice: tx.gasPrice,
    });

    return result.data || '0x';
  };

  /**
   * Resolve an ENS name to an address
   */
  resolveName = async (name: string): Promise<string | null> => {
    try {
      const address = await this.publicClient.getEnsAddress({
        name,
      });
      return address;
    } catch (error) {
      // ENS resolution failed or not supported
      return null;
    }
  };

  /**
   * Send one or more transactions through Safe 4337 and wait for confirmation
   * All transactions are batched and executed atomically as a UserOperation
   *
   * The transaction will be sponsored if paymaster options were configured
   *
   * @throws {RunnerError} If transaction reverts or execution fails
   */
  sendTransaction = async (txs: TransactionRequest[]): Promise<TransactionReceipt> => {
    const safe4337 = this.ensureSafe4337();

    if (txs.length === 0) {
      throw RunnerError.executionFailed('No transactions provided');
    }

    try {
      // Convert to Safe4337 transaction format
      const transactions = txs.map((tx) => ({
        to: tx.to!,
        data: tx.data ?? '0x',
        value: (tx.value?.toString() ?? '0'),
      }));

      // Create the SafeOperation with all the transactions
      const safeOperation = await safe4337.createTransaction({
        transactions,
      });

      // Sign the SafeOperation
      const signedSafeOperation = await safe4337.signSafeOperation(safeOperation);

      // Execute and submit to bundler
      const userOperationHash = await safe4337.executeTransaction({
        executable: signedSafeOperation,
      });

      if (!userOperationHash) {
        throw RunnerError.executionFailed('No UserOperation hash returned from Safe 4337 execution');
      }

      // Poll for the user operation receipt
      let userOperationReceipt = null;
      const maxAttempts = 60; // 2 minutes max wait (60 * 2 seconds)
      let attempts = 0;

      while (!userOperationReceipt && attempts < maxAttempts) {
        // Wait 2 seconds before checking the status again
        await new Promise((resolve) => setTimeout(resolve, 2000));
        userOperationReceipt = await safe4337.getUserOperationReceipt(userOperationHash);
        attempts++;
      }

      if (!userOperationReceipt) {
        throw RunnerError.timeout(userOperationHash, maxAttempts * 2000);
      }

      // Extract transaction hash from UserOperation receipt
      const txHash = userOperationReceipt.receipt?.transactionHash;

      if (!txHash) {
        throw RunnerError.executionFailed('No transaction hash in UserOperation receipt');
      }

      // Get the full transaction receipt
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash as Hex,
      });

      // Check transaction status and throw if reverted
      if (receipt.status === 'reverted') {
        throw RunnerError.transactionReverted(
          receipt.transactionHash,
          receipt.blockNumber,
          receipt.gasUsed
        );
      }

      // Re-initialize Safe4337Pack after successful transaction to clear nonce cache
      // This prevents AA25 "invalid account nonce" errors on subsequent transactions
      console.log('🔄 Refreshing Safe4337Pack to clear nonce cache...');
      await this.reinitializeSafe4337();

      return receipt;
    } catch (error) {
      if (error instanceof RunnerError) {
        throw error;
      }
      throw RunnerError.executionFailed('Safe 4337 transaction failed', error);
    }
  };

  /**
   * Re-initialize the Safe4337Pack instance to clear cached nonce
   * @private
   */
  private async reinitializeSafe4337(): Promise<void> {
    try {
      if (!this.safeAddress) {
        throw new Error('No safe address available for reinitialization');
      }

      // Get the current signer address from the provider
      const accounts = await this.eip1193Provider.request({
        method: 'eth_accounts' // Use eth_accounts instead of eth_requestAccounts to avoid popup
      }) as string[];

      const signerAddress = accounts[0];

      if (!signerAddress) {
        throw RunnerError.missingSigner();
      }

      // Build initialization options
      const initOptions: any = {
        provider: this.eip1193Provider,
        signer: signerAddress,
        safeModulesVersion: this.safeModulesVersion,
        bundlerUrl: this.bundlerUrl,
        options: {
          safeAddress: this.safeAddress,
        },
      };

      // Add custom contracts if provided
      if (this.customContracts) {
        initOptions.customContracts = this.customContracts;
      }

      // Add paymaster options if provided
      if (this.paymasterOptions) {
        initOptions.paymasterOptions = this.paymasterOptions;
      }

      // Re-initialize Safe4337Pack with fresh nonce
      this.safe4337 = await Safe4337Pack.init(initOptions);
      console.log('✅ Safe4337Pack refreshed successfully');
    } catch (error) {
      console.error('⚠️ Failed to refresh Safe4337Pack:', error);
      // Don't throw - we can still continue with the old instance
    }
  }

  /**
   * Create a batch transaction runner
   * @returns A Safe4337BatchRun instance for batching multiple transactions
   */
  sendBatchTransaction = (): Safe4337BatchRun => {
    const safe4337 = this.ensureSafe4337();
    return new Safe4337BatchRun(safe4337, this.publicClient, this.reinitializeSafe4337.bind(this));
  };
}

/**
 * Batch transaction runner for Safe 4337 operations
 * Allows multiple transactions to be batched and executed together as a UserOperation
 */
export class Safe4337BatchRun implements BatchRun {
  private readonly transactions: TransactionRequest[] = [];

  constructor(
    private readonly safe4337: any,
    private readonly publicClient: PublicClient,
    private readonly reinitializeSafe4337: () => Promise<void>
  ) {}

  /**
   * Add a transaction to the batch
   */
  addTransaction(tx: TransactionRequest) {
    this.transactions.push(tx);
  }

  /**
   * Execute all batched transactions as a sponsored UserOperation
   * Waits for the UserOperation to be included and confirmed on-chain
   *
   * @throws {RunnerError} If transaction reverts or execution fails
   */
  async run(): Promise<TransactionReceipt> {
    if (this.transactions.length === 0) {
      throw RunnerError.executionFailed('No transactions in batch');
    }

    try {
      // Convert to Safe4337 transaction format
      const transactions = this.transactions.map((tx) => ({
        to: tx.to!,
        data: tx.data ?? '0x',
        value: (tx.value?.toString() ?? '0'),
      }));

      // Create the SafeOperation with all the transactions
      const safeOperation = await this.safe4337.createTransaction({
        transactions,
      });

      // Sign the SafeOperation
      const signedSafeOperation = await this.safe4337.signSafeOperation(safeOperation);

      // Execute and submit to bundler
      const userOperationHash = await this.safe4337.executeTransaction({
        executable: signedSafeOperation,
      });

      if (!userOperationHash) {
        throw RunnerError.executionFailed('No UserOperation hash returned from Safe 4337 execution');
      }

      // Poll for the user operation receipt
      let userOperationReceipt = null;
      const maxAttempts = 60; // 2 minutes max wait
      let attempts = 0;

      while (!userOperationReceipt && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        userOperationReceipt = await this.safe4337.getUserOperationReceipt(userOperationHash);
        attempts++;
      }

      if (!userOperationReceipt) {
        throw RunnerError.timeout(userOperationHash, maxAttempts * 2000);
      }

      // Extract transaction hash from UserOperation receipt
      const txHash = userOperationReceipt.receipt?.transactionHash;

      if (!txHash) {
        throw RunnerError.executionFailed('No transaction hash in UserOperation receipt');
      }

      // Get the full transaction receipt
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash as Hex,
      });

      // Check transaction status and throw if reverted
      if (receipt.status === 'reverted') {
        throw RunnerError.transactionReverted(
          receipt.transactionHash,
          receipt.blockNumber,
          receipt.gasUsed
        );
      }

      // Re-initialize Safe4337Pack after successful transaction to clear nonce cache
      console.log('🔄 Refreshing Safe4337Pack after batch transaction...');
      await this.reinitializeSafe4337();

      return receipt;
    } catch (error) {
      if (error instanceof RunnerError) {
        throw error;
      }
      throw RunnerError.executionFailed('Safe 4337 batch transaction failed', error);
    }
  }
}
