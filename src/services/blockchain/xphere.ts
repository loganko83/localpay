/**
 * Xphere Blockchain Service
 * Connects to Xphere public chain for audit trail anchoring
 */

import { JsonRpcProvider, keccak256, toUtf8Bytes } from 'ethers';
import { XPHERE_CONFIG, TAMSA_EXPLORER_URLS } from './config';

export interface BlockInfo {
  number: number;
  hash: string;
  timestamp: number;
  transactions: number;
  gasUsed: string;
  gasLimit: string;
}

export interface TransactionInfo {
  hash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  gasUsed: string;
  status: 'success' | 'failed' | 'pending';
  timestamp?: number;
  data?: string;
}

export interface NetworkStatus {
  connected: boolean;
  chainId: number;
  blockHeight: number;
  gasPrice: string;
  peerCount?: number;
  syncing: boolean;
}

class XphereService {
  private provider: JsonRpcProvider | null = null;
  private connectionPromise: Promise<void> | null = null;

  /**
   * Connect to Xphere network
   */
  async connect(): Promise<void> {
    if (this.provider) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._doConnect();
    return this.connectionPromise;
  }

  private async _doConnect(): Promise<void> {
    try {
      this.provider = new JsonRpcProvider(XPHERE_CONFIG.rpcUrl, {
        chainId: XPHERE_CONFIG.chainId,
        name: XPHERE_CONFIG.chainName,
      });

      // Test connection
      const network = await this.provider.getNetwork();
      console.log(`[Xphere] Connected to ${network.name} (chainId: ${network.chainId})`);
    } catch (error) {
      console.error('[Xphere] Connection failed:', error);
      this.provider = null;
      throw error;
    }
  }

  /**
   * Get network status
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    await this.connect();
    if (!this.provider) throw new Error('Not connected to Xphere');

    const [blockNumber, feeData, network] = await Promise.all([
      this.provider.getBlockNumber(),
      this.provider.getFeeData(),
      this.provider.getNetwork(),
    ]);

    return {
      connected: true,
      chainId: Number(network.chainId),
      blockHeight: blockNumber,
      gasPrice: feeData.gasPrice?.toString() || '0',
      syncing: false,
    };
  }

  /**
   * Get current block height
   */
  async getBlockHeight(): Promise<number> {
    await this.connect();
    if (!this.provider) throw new Error('Not connected to Xphere');
    return this.provider.getBlockNumber();
  }

  /**
   * Get block info by number or hash
   */
  async getBlock(numberOrHash: number | string): Promise<BlockInfo | null> {
    await this.connect();
    if (!this.provider) throw new Error('Not connected to Xphere');

    const block = await this.provider.getBlock(numberOrHash);
    if (!block) return null;

    return {
      number: block.number,
      hash: block.hash || '',
      timestamp: block.timestamp,
      transactions: block.transactions.length,
      gasUsed: block.gasUsed.toString(),
      gasLimit: block.gasLimit.toString(),
    };
  }

  /**
   * Get transaction info by hash
   */
  async getTransaction(hash: string): Promise<TransactionInfo | null> {
    await this.connect();
    if (!this.provider) throw new Error('Not connected to Xphere');

    const [tx, receipt] = await Promise.all([
      this.provider.getTransaction(hash),
      this.provider.getTransactionReceipt(hash),
    ]);

    if (!tx) return null;

    let timestamp: number | undefined;
    if (tx.blockNumber) {
      const block = await this.provider.getBlock(tx.blockNumber);
      timestamp = block?.timestamp;
    }

    return {
      hash: tx.hash,
      blockNumber: tx.blockNumber || 0,
      blockHash: tx.blockHash || '',
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      gasPrice: tx.gasPrice?.toString() || '0',
      gasUsed: receipt?.gasUsed.toString() || '0',
      status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
      timestamp,
      data: tx.data,
    };
  }

  /**
   * Get latest blocks
   */
  async getLatestBlocks(count: number = 10): Promise<BlockInfo[]> {
    await this.connect();
    if (!this.provider) throw new Error('Not connected to Xphere');

    const currentBlock = await this.provider.getBlockNumber();
    const blocks: BlockInfo[] = [];

    for (let i = 0; i < count && currentBlock - i >= 0; i++) {
      const block = await this.getBlock(currentBlock - i);
      if (block) blocks.push(block);
    }

    return blocks;
  }

  /**
   * Calculate keccak256 hash of data
   */
  hashData(data: string | object): string {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    return keccak256(toUtf8Bytes(dataStr));
  }

  /**
   * Verify data matches a hash
   */
  verifyHash(data: string | object, expectedHash: string): boolean {
    const actualHash = this.hashData(data);
    return actualHash.toLowerCase() === expectedHash.toLowerCase();
  }

  /**
   * Get explorer URL for transaction
   */
  getTxUrl(hash: string): string {
    return TAMSA_EXPLORER_URLS.tx(hash);
  }

  /**
   * Get explorer URL for block
   */
  getBlockUrl(number: number): string {
    return TAMSA_EXPLORER_URLS.block(number);
  }

  /**
   * Get explorer URL for address
   */
  getAddressUrl(address: string): string {
    return TAMSA_EXPLORER_URLS.address(address);
  }

  /**
   * Disconnect from network
   */
  disconnect(): void {
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
      this.connectionPromise = null;
    }
  }
}

// Singleton instance
export const xphereService = new XphereService();
export default xphereService;
