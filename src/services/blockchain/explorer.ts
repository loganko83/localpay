/**
 * Tamsa Block Explorer Integration
 * https://xp.tamsa.io
 */

import { XPHERE_CONFIG, TAMSA_EXPLORER_URLS } from './config';
import { xphereService, BlockInfo, TransactionInfo } from './xphere';

export interface ExplorerSearchResult {
  type: 'block' | 'transaction' | 'address' | 'unknown';
  query: string;
  data?: BlockInfo | TransactionInfo | AddressInfo;
  url?: string;
  error?: string;
}

export interface AddressInfo {
  address: string;
  balance: string;
  transactionCount: number;
  type: 'eoa' | 'contract';
}

/**
 * Detect the type of search query
 */
export function detectQueryType(query: string): 'block' | 'transaction' | 'address' | 'unknown' {
  const trimmed = query.trim();

  // Block number
  if (/^\d+$/.test(trimmed)) {
    return 'block';
  }

  // Transaction hash (0x + 64 hex chars)
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return 'transaction';
  }

  // Address (0x + 40 hex chars)
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return 'address';
  }

  // Block hash (0x + 64 hex chars) - could be block or tx
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return 'transaction'; // Will try tx first
  }

  return 'unknown';
}

/**
 * Search for a block, transaction, or address
 */
export async function search(query: string): Promise<ExplorerSearchResult> {
  const type = detectQueryType(query);

  try {
    switch (type) {
      case 'block': {
        const blockNumber = parseInt(query, 10);
        const block = await xphereService.getBlock(blockNumber);
        if (block) {
          return {
            type: 'block',
            query,
            data: block,
            url: TAMSA_EXPLORER_URLS.block(blockNumber),
          };
        }
        return {
          type: 'block',
          query,
          error: 'Block not found',
        };
      }

      case 'transaction': {
        const tx = await xphereService.getTransaction(query);
        if (tx) {
          return {
            type: 'transaction',
            query,
            data: tx,
            url: TAMSA_EXPLORER_URLS.tx(query),
          };
        }
        // Try as block hash
        const block = await xphereService.getBlock(query);
        if (block) {
          return {
            type: 'block',
            query,
            data: block,
            url: TAMSA_EXPLORER_URLS.block(block.number),
          };
        }
        return {
          type: 'transaction',
          query,
          error: 'Transaction not found',
        };
      }

      case 'address': {
        return {
          type: 'address',
          query,
          url: TAMSA_EXPLORER_URLS.address(query),
          data: {
            address: query,
            balance: '0',
            transactionCount: 0,
            type: 'eoa',
          } as AddressInfo,
        };
      }

      default:
        return {
          type: 'unknown',
          query,
          error: 'Invalid search query format',
        };
    }
  } catch (error) {
    return {
      type,
      query,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

/**
 * Get recent blocks for dashboard
 */
export async function getRecentBlocks(count: number = 5): Promise<BlockInfo[]> {
  return xphereService.getLatestBlocks(count);
}

/**
 * Open block in Tamsa explorer
 */
export function openBlockInExplorer(blockNumber: number): void {
  window.open(TAMSA_EXPLORER_URLS.block(blockNumber), '_blank');
}

/**
 * Open transaction in Tamsa explorer
 */
export function openTxInExplorer(txHash: string): void {
  window.open(TAMSA_EXPLORER_URLS.tx(txHash), '_blank');
}

/**
 * Open address in Tamsa explorer
 */
export function openAddressInExplorer(address: string): void {
  window.open(TAMSA_EXPLORER_URLS.address(address), '_blank');
}

/**
 * Get explorer base URL
 */
export function getExplorerUrl(): string {
  return XPHERE_CONFIG.explorerUrl;
}

/**
 * Format block number with commas
 */
export function formatBlockNumber(blockNumber: number): string {
  return blockNumber.toLocaleString();
}

/**
 * Format timestamp to relative time
 */
export function formatTimestamp(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Truncate hash for display
 */
export function truncateHash(hash: string, start: number = 6, end: number = 4): string {
  if (hash.length <= start + end + 3) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

export default {
  detectQueryType,
  search,
  getRecentBlocks,
  openBlockInExplorer,
  openTxInExplorer,
  openAddressInExplorer,
  getExplorerUrl,
  formatBlockNumber,
  formatTimestamp,
  truncateHash,
};
