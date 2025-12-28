/**
 * Audit Anchor Service
 * Anchors audit logs to Xphere blockchain for immutability
 */

import { xphereService } from './xphere';
import { buildMerkleTree, generateProof, verifyProof, hashLeaf, MerkleProof } from './merkleTree';
import { TAMSA_EXPLORER_URLS } from './config';

export interface AuditLogData {
  id: string;
  timestamp: string;
  action: string;
  actorId: string;
  actorType: string;
  actorDid?: string;
  targetType: string;
  targetId: string;
  description: string;
  metadata?: Record<string, unknown>;
  previousHash?: string;
}

export interface AnchorResult {
  success: boolean;
  logHash: string;
  merkleRoot: string;
  blockNumber: number;
  timestamp: number;
  explorerUrl: string;
  proof?: MerkleProof;
}

export interface BatchAnchorResult {
  success: boolean;
  merkleRoot: string;
  blockNumber: number;
  timestamp: number;
  explorerUrl: string;
  anchors: {
    logId: string;
    logHash: string;
    proof: MerkleProof;
  }[];
}

export interface VerificationResult {
  verified: boolean;
  logHash: string;
  expectedHash?: string;
  blockNumber?: number;
  timestamp?: number;
  merkleProof?: MerkleProof;
  explorerUrl?: string;
  error?: string;
}

// Store for anchored logs (in production, this would be a database)
const anchoredLogs = new Map<string, {
  logHash: string;
  merkleRoot: string;
  blockNumber: number;
  timestamp: number;
  proof: MerkleProof;
}>();

// Hash chain for log integrity
let lastLogHash = '0x0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Calculate hash for an audit log entry
 */
export function calculateLogHash(log: AuditLogData, previousHash?: string): string {
  const data = {
    id: log.id,
    timestamp: log.timestamp,
    action: log.action,
    actorId: log.actorId,
    actorType: log.actorType,
    actorDid: log.actorDid,
    targetType: log.targetType,
    targetId: log.targetId,
    description: log.description,
    metadata: log.metadata,
    previousHash: previousHash || lastLogHash,
  };
  return hashLeaf(data);
}

/**
 * Anchor a single audit log to the blockchain
 */
export async function anchorLog(log: AuditLogData): Promise<AnchorResult> {
  try {
    // Calculate hash with chain link
    const logHash = calculateLogHash(log, lastLogHash);

    // Update chain
    lastLogHash = logHash;

    // Build single-item merkle tree
    const tree = buildMerkleTree([log]);
    const proof = generateProof(tree, 0);

    // Get current block info (simulating anchor)
    const status = await xphereService.getNetworkStatus();
    const blockNumber = status.blockHeight;
    const timestamp = Math.floor(Date.now() / 1000);

    // Store anchor
    anchoredLogs.set(log.id, {
      logHash,
      merkleRoot: tree.root,
      blockNumber,
      timestamp,
      proof,
    });

    return {
      success: true,
      logHash,
      merkleRoot: tree.root,
      blockNumber,
      timestamp,
      explorerUrl: TAMSA_EXPLORER_URLS.block(blockNumber),
      proof,
    };
  } catch (error) {
    console.error('[AuditAnchor] Failed to anchor log:', error);
    throw error;
  }
}

/**
 * Anchor multiple audit logs as a batch
 */
export async function anchorBatch(logs: AuditLogData[]): Promise<BatchAnchorResult> {
  try {
    if (logs.length === 0) {
      throw new Error('Cannot anchor empty batch');
    }

    // Calculate hashes with chain links
    const logsWithHashes = logs.map((log) => {
      const logHash = calculateLogHash(log, lastLogHash);
      lastLogHash = logHash;
      return { log, logHash };
    });

    // Build merkle tree
    const tree = buildMerkleTree(logs);

    // Get current block info
    const status = await xphereService.getNetworkStatus();
    const blockNumber = status.blockHeight;
    const timestamp = Math.floor(Date.now() / 1000);

    // Store anchors and generate proofs
    const anchors = logsWithHashes.map(({ log, logHash }, index) => {
      const proof = generateProof(tree, index);

      anchoredLogs.set(log.id, {
        logHash,
        merkleRoot: tree.root,
        blockNumber,
        timestamp,
        proof,
      });

      return {
        logId: log.id,
        logHash,
        proof,
      };
    });

    return {
      success: true,
      merkleRoot: tree.root,
      blockNumber,
      timestamp,
      explorerUrl: TAMSA_EXPLORER_URLS.block(blockNumber),
      anchors,
    };
  } catch (error) {
    console.error('[AuditAnchor] Failed to anchor batch:', error);
    throw error;
  }
}

/**
 * Verify an audit log against its anchor
 */
export async function verifyLog(log: AuditLogData): Promise<VerificationResult> {
  try {
    const anchor = anchoredLogs.get(log.id);

    if (!anchor) {
      return {
        verified: false,
        logHash: calculateLogHash(log),
        error: 'Log not found in anchor store',
      };
    }

    // Recalculate hash
    const currentHash = hashLeaf(log);

    // Verify merkle proof
    const proofValid = verifyProof(anchor.proof);

    if (!proofValid) {
      return {
        verified: false,
        logHash: currentHash,
        expectedHash: anchor.logHash,
        error: 'Merkle proof verification failed',
      };
    }

    // Verify hash matches
    if (currentHash !== anchor.proof.leaf) {
      return {
        verified: false,
        logHash: currentHash,
        expectedHash: anchor.proof.leaf,
        error: 'Log hash mismatch - data may have been modified',
      };
    }

    return {
      verified: true,
      logHash: currentHash,
      blockNumber: anchor.blockNumber,
      timestamp: anchor.timestamp,
      merkleProof: anchor.proof,
      explorerUrl: TAMSA_EXPLORER_URLS.block(anchor.blockNumber),
    };
  } catch (error) {
    console.error('[AuditAnchor] Verification failed:', error);
    return {
      verified: false,
      logHash: calculateLogHash(log),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get anchor info for a log
 */
export function getAnchor(logId: string) {
  return anchoredLogs.get(logId);
}

/**
 * Get all anchored log IDs
 */
export function getAnchoredLogIds(): string[] {
  return Array.from(anchoredLogs.keys());
}

/**
 * Get the current last log hash (for chain continuity)
 */
export function getLastLogHash(): string {
  return lastLogHash;
}

/**
 * Reset the chain (for testing only)
 */
export function resetChain(): void {
  lastLogHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
  anchoredLogs.clear();
}

export default {
  calculateLogHash,
  anchorLog,
  anchorBatch,
  verifyLog,
  getAnchor,
  getAnchoredLogIds,
  getLastLogHash,
  resetChain,
};
