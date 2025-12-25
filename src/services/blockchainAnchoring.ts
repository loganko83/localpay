/**
 * Blockchain Anchoring Service
 *
 * Implements hybrid blockchain architecture from J-Pay proposal:
 * - Private chain for transaction privacy
 * - Public chain (Xphere) for external verification
 * - Hash anchoring with Merkle tree batching
 *
 * Architecture:
 * [Private Chain] ---> [Merkle Root] ---> [Public Chain Anchor]
 *      |                    |                     |
 *   Real-time          10-min batch          Immutable proof
 *
 * "Money handled by bank, Proof handled by technology"
 */

import { auditLogService } from './auditLog';

// Anchoring configuration
const ANCHOR_CONFIG = {
  batchIntervalMs: 600000, // 10 minutes
  maxBatchSize: 1000, // Max transactions per batch
  minBatchSize: 1, // Minimum to trigger anchor
  retryAttempts: 3,
  retryDelayMs: 5000,
};

// Anchor status
type AnchorStatus = 'pending' | 'anchoring' | 'confirmed' | 'failed';

// Individual transaction hash entry
interface TransactionHash {
  id: string;
  hash: string;
  timestamp: number;
  type: 'payment' | 'topup' | 'refund' | 'settlement' | 'audit' | 'donation' | 'distribution' | 'product_registration' | 'tracking_event' | 'str_submission' | 'carbon_exchange';
  metadata?: Record<string, unknown>;
}

// Merkle tree node
interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  isLeaf: boolean;
  data?: TransactionHash;
}

// Anchor record
interface AnchorRecord {
  id: string;
  merkleRoot: string;
  transactionCount: number;
  transactionIds: string[];
  batchStartTime: number;
  batchEndTime: number;
  anchoredAt?: number;
  publicChainTxHash?: string;
  status: AnchorStatus;
  retryCount: number;
  error?: string;
}

// Verification result
interface VerificationResult {
  verified: boolean;
  anchorId?: string;
  merkleRoot?: string;
  publicChainTxHash?: string;
  anchoredAt?: string;
  error?: string;
  proof?: string[];
}

// In-memory stores (use Redis/DB in production)
const pendingTransactions: TransactionHash[] = [];
const anchorRecords = new Map<string, AnchorRecord>();
const transactionToAnchor = new Map<string, string>(); // txId -> anchorId

// Simple SHA-256 hash simulation (use crypto in production)
const hashData = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
  // Simulate SHA-256 length
  return `0x${hashHex.repeat(8)}`;
};

// Combine two hashes
const combineHashes = (left: string, right: string): string => {
  return hashData(left + right);
};

// Generate unique ID
const generateId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `anchor-${timestamp}-${random}`;
};

// Build Merkle tree from transaction hashes
const buildMerkleTree = (transactions: TransactionHash[]): MerkleNode | null => {
  if (transactions.length === 0) return null;

  // Create leaf nodes
  let nodes: MerkleNode[] = transactions.map(tx => ({
    hash: tx.hash,
    isLeaf: true,
    data: tx,
  }));

  // If odd number, duplicate last
  if (nodes.length % 2 === 1) {
    nodes.push({ ...nodes[nodes.length - 1] });
  }

  // Build tree bottom-up
  while (nodes.length > 1) {
    const newLevel: MerkleNode[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1] || left;
      newLevel.push({
        hash: combineHashes(left.hash, right.hash),
        left,
        right,
        isLeaf: false,
      });
    }
    nodes = newLevel;
  }

  return nodes[0];
};

// Get Merkle proof for a transaction
const getMerkleProof = (
  root: MerkleNode | null,
  targetHash: string,
  proof: string[] = []
): string[] | null => {
  if (!root) return null;

  if (root.isLeaf) {
    return root.hash === targetHash ? proof : null;
  }

  // Try left subtree
  if (root.left) {
    const leftResult = getMerkleProof(root.left, targetHash, [
      ...proof,
      `R:${root.right?.hash || root.left.hash}`,
    ]);
    if (leftResult) return leftResult;
  }

  // Try right subtree
  if (root.right) {
    const rightResult = getMerkleProof(root.right, targetHash, [
      ...proof,
      `L:${root.left?.hash || root.right.hash}`,
    ]);
    if (rightResult) return rightResult;
  }

  return null;
};

// Simulate public chain anchoring (integrate with Xphere in production)
const anchorToPublicChain = async (_merkleRoot: string): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Simulate 95% success rate
  if (Math.random() > 0.05) {
    const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substring(2, 18)}`;
    return { success: true, txHash };
  }

  return { success: false, error: 'Network timeout' };
};

class BlockchainAnchoringService {
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  /**
   * Start automatic batch anchoring
   */
  startBatchAnchoring(): void {
    if (this.batchTimer) return;

    this.batchTimer = setInterval(() => {
      this.processPendingBatch();
    }, ANCHOR_CONFIG.batchIntervalMs);

    console.log('[Anchoring] Batch anchoring started (10-min interval)');
  }

  /**
   * Stop automatic batch anchoring
   */
  stopBatchAnchoring(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Add transaction to pending batch
   */
  async addTransaction(
    id: string,
    type: TransactionHash['type'],
    data: Record<string, unknown>
  ): Promise<{ hash: string; batchPosition: number }> {
    const hash = hashData(JSON.stringify({ id, type, data, timestamp: Date.now() }));

    const txHash: TransactionHash = {
      id,
      hash,
      timestamp: Date.now(),
      type,
      metadata: data,
    };

    pendingTransactions.push(txHash);

    // Log transaction addition
    await auditLogService.log({
      action: 'BLOCKCHAIN_TX_ADDED',
      actorId: 'system',
      actorType: 'system',
      targetType: 'transaction',
      targetId: id,
      metadata: {
        hash,
        type,
        batchPosition: pendingTransactions.length,
      },
    });

    // Auto-process if batch is full
    if (pendingTransactions.length >= ANCHOR_CONFIG.maxBatchSize) {
      this.processPendingBatch();
    }

    return { hash, batchPosition: pendingTransactions.length };
  }

  /**
   * Process pending transactions and create anchor
   */
  async processPendingBatch(): Promise<AnchorRecord | null> {
    if (this.isProcessing || pendingTransactions.length < ANCHOR_CONFIG.minBatchSize) {
      return null;
    }

    this.isProcessing = true;

    try {
      // Take current batch
      const batch = pendingTransactions.splice(0, ANCHOR_CONFIG.maxBatchSize);
      const batchStartTime = batch[0]?.timestamp || Date.now();
      const batchEndTime = batch[batch.length - 1]?.timestamp || Date.now();

      // Build Merkle tree
      const merkleTree = buildMerkleTree(batch);
      if (!merkleTree) {
        this.isProcessing = false;
        return null;
      }

      const merkleRoot = merkleTree.hash;
      const anchorId = generateId();

      // Create anchor record
      const anchor: AnchorRecord = {
        id: anchorId,
        merkleRoot,
        transactionCount: batch.length,
        transactionIds: batch.map(tx => tx.id),
        batchStartTime,
        batchEndTime,
        status: 'anchoring',
        retryCount: 0,
      };

      anchorRecords.set(anchorId, anchor);

      // Map transactions to anchor
      batch.forEach(tx => {
        transactionToAnchor.set(tx.id, anchorId);
      });

      // Anchor to public chain
      let anchorResult = await anchorToPublicChain(merkleRoot);

      // Retry on failure
      while (!anchorResult.success && anchor.retryCount < ANCHOR_CONFIG.retryAttempts) {
        anchor.retryCount++;
        await new Promise(resolve => setTimeout(resolve, ANCHOR_CONFIG.retryDelayMs));
        anchorResult = await anchorToPublicChain(merkleRoot);
      }

      if (anchorResult.success) {
        anchor.status = 'confirmed';
        anchor.anchoredAt = Date.now();
        anchor.publicChainTxHash = anchorResult.txHash;

        await auditLogService.log({
          action: 'BLOCKCHAIN_ANCHOR_CONFIRMED',
          actorId: 'system',
          actorType: 'system',
          targetType: 'anchor',
          targetId: anchorId,
          metadata: {
            merkleRoot,
            transactionCount: batch.length,
            publicChainTxHash: anchorResult.txHash,
          },
        });
      } else {
        anchor.status = 'failed';
        anchor.error = anchorResult.error;

        await auditLogService.log({
          action: 'BLOCKCHAIN_ANCHOR_FAILED',
          actorId: 'system',
          actorType: 'system',
          targetType: 'anchor',
          targetId: anchorId,
          metadata: {
            merkleRoot,
            error: anchorResult.error,
            retryCount: anchor.retryCount,
          },
        });
      }

      anchorRecords.set(anchorId, anchor);
      this.isProcessing = false;
      return anchor;

    } catch (error) {
      this.isProcessing = false;
      throw error;
    }
  }

  /**
   * Verify a transaction is anchored
   */
  async verifyTransaction(transactionId: string): Promise<VerificationResult> {
    const anchorId = transactionToAnchor.get(transactionId);

    if (!anchorId) {
      // Check if still pending
      const pending = pendingTransactions.find(tx => tx.id === transactionId);
      if (pending) {
        return {
          verified: false,
          error: 'Transaction pending in batch queue',
        };
      }
      return {
        verified: false,
        error: 'Transaction not found in anchoring system',
      };
    }

    const anchor = anchorRecords.get(anchorId);
    if (!anchor) {
      return {
        verified: false,
        error: 'Anchor record not found',
      };
    }

    if (anchor.status !== 'confirmed') {
      return {
        verified: false,
        anchorId,
        error: `Anchor status: ${anchor.status}`,
      };
    }

    return {
      verified: true,
      anchorId,
      merkleRoot: anchor.merkleRoot,
      publicChainTxHash: anchor.publicChainTxHash,
      anchoredAt: anchor.anchoredAt
        ? new Date(anchor.anchoredAt).toISOString()
        : undefined,
    };
  }

  /**
   * Get anchor status
   */
  getAnchorStatus(anchorId: string): AnchorRecord | null {
    return anchorRecords.get(anchorId) || null;
  }

  /**
   * Get anchoring statistics
   */
  getStatistics(): {
    pendingCount: number;
    totalAnchors: number;
    confirmedAnchors: number;
    failedAnchors: number;
    totalTransactionsAnchored: number;
  } {
    let confirmedAnchors = 0;
    let failedAnchors = 0;
    let totalTransactionsAnchored = 0;

    anchorRecords.forEach(anchor => {
      if (anchor.status === 'confirmed') {
        confirmedAnchors++;
        totalTransactionsAnchored += anchor.transactionCount;
      } else if (anchor.status === 'failed') {
        failedAnchors++;
      }
    });

    return {
      pendingCount: pendingTransactions.length,
      totalAnchors: anchorRecords.size,
      confirmedAnchors,
      failedAnchors,
      totalTransactionsAnchored,
    };
  }

  /**
   * Get recent anchors for dashboard
   */
  getRecentAnchors(limit: number = 10): AnchorRecord[] {
    const anchors = Array.from(anchorRecords.values());
    return anchors
      .sort((a, b) => b.batchEndTime - a.batchEndTime)
      .slice(0, limit);
  }

  /**
   * Retry failed anchor
   */
  async retryFailedAnchor(anchorId: string): Promise<AnchorRecord | null> {
    const anchor = anchorRecords.get(anchorId);
    if (!anchor || anchor.status !== 'failed') {
      return null;
    }

    anchor.status = 'anchoring';
    anchor.retryCount = 0;
    anchor.error = undefined;

    const result = await anchorToPublicChain(anchor.merkleRoot);

    if (result.success) {
      anchor.status = 'confirmed';
      anchor.anchoredAt = Date.now();
      anchor.publicChainTxHash = result.txHash;
    } else {
      anchor.status = 'failed';
      anchor.error = result.error;
    }

    anchorRecords.set(anchorId, anchor);
    return anchor;
  }

  /**
   * Force process current batch (for testing/admin)
   */
  async forceBatchProcess(): Promise<AnchorRecord | null> {
    return this.processPendingBatch();
  }

  /**
   * Clear pending transactions (for testing)
   */
  clearPending(): void {
    pendingTransactions.length = 0;
  }

  /**
   * Get pending transaction count
   */
  getPendingCount(): number {
    return pendingTransactions.length;
  }
}

// Export singleton instance
export const blockchainAnchoringService = new BlockchainAnchoringService();

// Export types
export type {
  AnchorStatus,
  TransactionHash,
  AnchorRecord,
  VerificationResult,
};
