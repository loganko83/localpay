/**
 * Blockchain Routes
 * Xphere blockchain integration for audit verification and explorer
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, param, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();

// ==================== Blockchain Configuration ====================

const XPHERE_CONFIG = {
  chainId: 20250217,
  rpcUrl: 'https://en-bkk.x-phere.com',
  explorerUrl: 'https://xp.tamsa.io',
  blockTime: 3, // seconds
};

// ==================== Type Definitions ====================

interface BlockRow {
  id: string;
  block_number: number;
  block_hash: string;
  parent_hash: string;
  timestamp: string;
  transactions_count: number;
  gas_used: number;
  gas_limit: number;
  miner: string;
  size: number;
  created_at: string;
}

interface TransactionRow {
  id: string;
  tx_hash: string;
  block_number: number;
  from_address: string;
  to_address: string;
  value: string;
  gas: number;
  gas_price: string;
  input_data: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  tx_type: 'audit_anchor' | 'token_transfer' | 'contract_call';
  timestamp: string;
  created_at: string;
}

interface AuditAnchorRow {
  id: string;
  batch_id: string;
  merkle_root: string;
  tx_hash: string | null;
  block_number: number | null;
  audit_count: number;
  start_timestamp: string;
  end_timestamp: string;
  status: 'pending' | 'anchored' | 'verified' | 'failed';
  created_at: string;
}

// ==================== Helper Functions ====================

function validateRequest(req: AuthenticatedRequest): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', { errors: errors.array() });
  }
}

function generateBlockHash(): string {
  const timestamp = Date.now().toString(16);
  const random = Math.random().toString(16).substring(2);
  return `0x${timestamp}${random}`.substring(0, 66).padEnd(66, '0');
}

function generateTxHash(): string {
  const timestamp = Date.now().toString(16);
  const random = Math.random().toString(16).substring(2);
  return `0x${timestamp}${random}`.substring(0, 66).padEnd(66, '0');
}

function generateMerkleRoot(data: string[]): string {
  // Mock merkle root calculation
  const combined = data.join('');
  const hash = combined.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

function logAudit(
  action: string,
  actorId: string,
  actorType: string,
  targetType: string,
  targetId: string,
  description: string,
  metadata?: Record<string, unknown>
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
    VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), action, actorId, actorType, targetType, targetId, description, metadata ? JSON.stringify(metadata) : null);
}

// ==================== Public Endpoints ====================

/**
 * GET /api/blockchain/status
 * Get blockchain network status
 */
router.get('/status', async (_req, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Get latest block
    const latestBlock = db.prepare(`
      SELECT * FROM blockchain_blocks ORDER BY block_number DESC LIMIT 1
    `).get() as BlockRow | undefined;

    // Get pending transactions count
    const pendingTxCount = db.prepare(`
      SELECT COUNT(*) as count FROM blockchain_transactions WHERE status = 'pending'
    `).get() as { count: number };

    // Get recent anchoring stats
    const anchorStats = db.prepare(`
      SELECT
        COUNT(*) as total_anchors,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified_anchors,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_anchors
      FROM audit_anchors
      WHERE created_at >= datetime('now', '-24 hours')
    `).get() as { total_anchors: number; verified_anchors: number; pending_anchors: number };

    // Mock network health (in production, would query actual RPC)
    const networkHealth = {
      connected: true,
      peers: 12,
      syncing: false,
      latency: 45, // ms
    };

    res.json({
      success: true,
      data: {
        network: {
          chainId: XPHERE_CONFIG.chainId,
          rpcUrl: XPHERE_CONFIG.rpcUrl,
          explorerUrl: XPHERE_CONFIG.explorerUrl,
          blockTime: XPHERE_CONFIG.blockTime,
        },
        status: {
          connected: networkHealth.connected,
          syncing: networkHealth.syncing,
          peers: networkHealth.peers,
          latency: networkHealth.latency,
        },
        latestBlock: latestBlock ? {
          number: latestBlock.block_number,
          hash: latestBlock.block_hash,
          timestamp: latestBlock.timestamp,
          transactionsCount: latestBlock.transactions_count,
        } : null,
        pendingTransactions: pendingTxCount.count,
        anchoring: {
          last24Hours: anchorStats.total_anchors,
          verified: anchorStats.verified_anchors,
          pending: anchorStats.pending_anchors,
        },
      },
    });
  } catch (error) {
    console.error('Get blockchain status error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get blockchain status' } });
  }
});

/**
 * GET /api/blockchain/blocks
 * Get recent blocks
 */
router.get('/blocks', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters' } });
      return;
    }

    const db = getDb();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = db.prepare(`SELECT COUNT(*) as count FROM blockchain_blocks`).get() as { count: number };

    // Get blocks
    const blocks = db.prepare(`
      SELECT * FROM blockchain_blocks
      ORDER BY block_number DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as BlockRow[];

    res.json({
      success: true,
      data: {
        blocks: blocks.map(b => ({
          number: b.block_number,
          hash: b.block_hash,
          parentHash: b.parent_hash,
          timestamp: b.timestamp,
          transactionsCount: b.transactions_count,
          gasUsed: b.gas_used,
          gasLimit: b.gas_limit,
          miner: b.miner,
          size: b.size,
        })),
        pagination: {
          page,
          limit,
          total: countResult.count,
          totalPages: Math.ceil(countResult.count / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get blocks error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get blocks' } });
  }
});

/**
 * GET /api/blockchain/blocks/:number
 * Get block details by number or hash
 */
router.get('/blocks/:identifier', [
  param('identifier').notEmpty(),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    const db = getDb();

    let block: BlockRow | undefined;

    // Check if identifier is a number or hash
    if (/^\d+$/.test(identifier)) {
      block = db.prepare(`SELECT * FROM blockchain_blocks WHERE block_number = ?`).get(parseInt(identifier)) as BlockRow | undefined;
    } else {
      block = db.prepare(`SELECT * FROM blockchain_blocks WHERE block_hash = ?`).get(identifier) as BlockRow | undefined;
    }

    if (!block) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Block not found' } });
      return;
    }

    // Get transactions in this block
    const transactions = db.prepare(`
      SELECT * FROM blockchain_transactions
      WHERE block_number = ?
      ORDER BY created_at DESC
    `).all(block.block_number) as TransactionRow[];

    res.json({
      success: true,
      data: {
        block: {
          number: block.block_number,
          hash: block.block_hash,
          parentHash: block.parent_hash,
          timestamp: block.timestamp,
          transactionsCount: block.transactions_count,
          gasUsed: block.gas_used,
          gasLimit: block.gas_limit,
          miner: block.miner,
          size: block.size,
        },
        transactions: transactions.map(tx => ({
          hash: tx.tx_hash,
          from: tx.from_address,
          to: tx.to_address,
          value: tx.value,
          gas: tx.gas,
          status: tx.status,
          type: tx.tx_type,
        })),
        explorerUrl: `${XPHERE_CONFIG.explorerUrl}/block/${block.block_number}`,
      },
    });
  } catch (error) {
    console.error('Get block details error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get block details' } });
  }
});

/**
 * GET /api/blockchain/tx/:hash
 * Get transaction details
 */
router.get('/tx/:hash', [
  param('hash').notEmpty(),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { hash } = req.params;
    const db = getDb();

    const transaction = db.prepare(`
      SELECT * FROM blockchain_transactions WHERE tx_hash = ?
    `).get(hash) as TransactionRow | undefined;

    if (!transaction) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
      return;
    }

    // If audit anchor transaction, get anchor details
    let anchorDetails = null;
    if (transaction.tx_type === 'audit_anchor') {
      const anchor = db.prepare(`
        SELECT * FROM audit_anchors WHERE tx_hash = ?
      `).get(hash) as AuditAnchorRow | undefined;

      if (anchor) {
        anchorDetails = {
          batchId: anchor.batch_id,
          merkleRoot: anchor.merkle_root,
          auditCount: anchor.audit_count,
          startTimestamp: anchor.start_timestamp,
          endTimestamp: anchor.end_timestamp,
          status: anchor.status,
        };
      }
    }

    res.json({
      success: true,
      data: {
        transaction: {
          hash: transaction.tx_hash,
          blockNumber: transaction.block_number,
          from: transaction.from_address,
          to: transaction.to_address,
          value: transaction.value,
          gas: transaction.gas,
          gasPrice: transaction.gas_price,
          inputData: transaction.input_data,
          status: transaction.status,
          type: transaction.tx_type,
          timestamp: transaction.timestamp,
        },
        anchorDetails,
        explorerUrl: `${XPHERE_CONFIG.explorerUrl}/tx/${transaction.tx_hash}`,
      },
    });
  } catch (error) {
    console.error('Get transaction details error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get transaction details' } });
  }
});

/**
 * GET /api/blockchain/verify/:hash
 * Verify audit anchor by merkle root or tx hash
 */
router.get('/verify/:hash', [
  param('hash').notEmpty(),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { hash } = req.params;
    const db = getDb();

    // Try to find by tx_hash first, then by merkle_root
    let anchor = db.prepare(`
      SELECT * FROM audit_anchors WHERE tx_hash = ?
    `).get(hash) as AuditAnchorRow | undefined;

    if (!anchor) {
      anchor = db.prepare(`
        SELECT * FROM audit_anchors WHERE merkle_root = ?
      `).get(hash) as AuditAnchorRow | undefined;
    }

    if (!anchor) {
      res.json({
        success: true,
        data: {
          verified: false,
          message: 'No audit anchor found for this hash',
        },
      });
      return;
    }

    // Get associated audit logs count
    const auditCount = db.prepare(`
      SELECT COUNT(*) as count FROM audit_logs
      WHERE timestamp BETWEEN ? AND ?
    `).get(anchor.start_timestamp, anchor.end_timestamp) as { count: number };

    res.json({
      success: true,
      data: {
        verified: anchor.status === 'verified',
        anchor: {
          batchId: anchor.batch_id,
          merkleRoot: anchor.merkle_root,
          txHash: anchor.tx_hash,
          blockNumber: anchor.block_number,
          auditCount: anchor.audit_count,
          startTimestamp: anchor.start_timestamp,
          endTimestamp: anchor.end_timestamp,
          status: anchor.status,
          createdAt: anchor.created_at,
        },
        auditLogsIncluded: auditCount.count,
        explorerUrl: anchor.tx_hash ? `${XPHERE_CONFIG.explorerUrl}/tx/${anchor.tx_hash}` : null,
      },
    });
  } catch (error) {
    console.error('Verify audit error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to verify audit' } });
  }
});

// ==================== Admin Endpoints ====================

/**
 * POST /api/blockchain/anchor
 * Anchor audit batch to blockchain (admin only)
 */
router.post('/anchor', authenticate, requireAdmin, [
  body('startTimestamp').isISO8601().withMessage('Start timestamp required'),
  body('endTimestamp').isISO8601().withMessage('End timestamp required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { startTimestamp, endTimestamp } = req.body;

    // Get audit logs in time range
    const auditLogs = db.prepare(`
      SELECT id, timestamp, action, actor_id, target_type, target_id
      FROM audit_logs
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY timestamp
    `).all(startTimestamp, endTimestamp) as { id: string; timestamp: string; action: string; actor_id: string; target_type: string; target_id: string }[];

    if (auditLogs.length === 0) {
      throw new BadRequestError('No audit logs found in the specified time range');
    }

    // Generate merkle root from audit log data
    const leafData = auditLogs.map(log =>
      `${log.id}|${log.timestamp}|${log.action}|${log.actor_id}|${log.target_type}|${log.target_id}`
    );
    const merkleRoot = generateMerkleRoot(leafData);

    // Generate mock blockchain transaction
    const txHash = generateTxHash();
    const blockNumber = Math.floor(Date.now() / 3000); // Mock block number

    // Create anchor record
    const anchorId = uuidv4();
    const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;

    db.prepare(`
      INSERT INTO audit_anchors (
        id, batch_id, merkle_root, tx_hash, block_number, audit_count,
        start_timestamp, end_timestamp, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'anchored')
    `).run(anchorId, batchId, merkleRoot, txHash, blockNumber, auditLogs.length, startTimestamp, endTimestamp);

    // Create blockchain transaction record
    const txId = uuidv4();
    db.prepare(`
      INSERT INTO blockchain_transactions (
        id, tx_hash, block_number, from_address, to_address, value, gas, gas_price,
        input_data, status, tx_type, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'audit_anchor', datetime('now'))
    `).run(
      txId, txHash, blockNumber,
      '0x0000000000000000000000000000000000000001', // System address
      '0x0000000000000000000000000000000000000002', // Audit contract
      '0', 21000, '1000000000',
      merkleRoot
    );

    // Log audit
    logAudit('AUDIT_ANCHORED', req.user!.userId, 'admin', 'audit_anchor', anchorId,
      `Anchored ${auditLogs.length} audit logs to blockchain`,
      { batchId, merkleRoot, txHash, blockNumber, auditCount: auditLogs.length });

    res.status(201).json({
      success: true,
      data: {
        anchorId,
        batchId,
        merkleRoot,
        txHash,
        blockNumber,
        auditCount: auditLogs.length,
        startTimestamp,
        endTimestamp,
        status: 'anchored',
        explorerUrl: `${XPHERE_CONFIG.explorerUrl}/tx/${txHash}`,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Anchor audit error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to anchor audit batch' } });
  }
});

/**
 * GET /api/blockchain/anchors
 * Get audit anchor history (admin only)
 */
router.get('/anchors', authenticate, requireAdmin, [
  query('status').optional().isIn(['pending', 'anchored', 'verified', 'failed']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(String(status));
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM audit_anchors ${whereClause}
    `).get(...params) as { count: number };

    // Get anchors
    const anchors = db.prepare(`
      SELECT * FROM audit_anchors
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset) as AuditAnchorRow[];

    res.json({
      success: true,
      data: {
        anchors: anchors.map(a => ({
          id: a.id,
          batchId: a.batch_id,
          merkleRoot: a.merkle_root,
          txHash: a.tx_hash,
          blockNumber: a.block_number,
          auditCount: a.audit_count,
          startTimestamp: a.start_timestamp,
          endTimestamp: a.end_timestamp,
          status: a.status,
          createdAt: a.created_at,
          explorerUrl: a.tx_hash ? `${XPHERE_CONFIG.explorerUrl}/tx/${a.tx_hash}` : null,
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.count,
          totalPages: Math.ceil(countResult.count / Number(limit)),
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get anchors error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get anchor history' } });
  }
});

/**
 * POST /api/blockchain/anchors/:id/verify
 * Verify an anchored batch (admin only)
 */
router.post('/anchors/:id/verify', authenticate, requireAdmin, [
  param('id').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;

    const anchor = db.prepare(`SELECT * FROM audit_anchors WHERE id = ?`).get(id) as AuditAnchorRow | undefined;

    if (!anchor) {
      throw new NotFoundError('Anchor not found');
    }

    if (anchor.status === 'verified') {
      throw new BadRequestError('Anchor is already verified');
    }

    if (anchor.status !== 'anchored') {
      throw new BadRequestError('Only anchored batches can be verified');
    }

    // Verify by recalculating merkle root from audit logs
    const auditLogs = db.prepare(`
      SELECT id, timestamp, action, actor_id, target_type, target_id
      FROM audit_logs
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY timestamp
    `).all(anchor.start_timestamp, anchor.end_timestamp) as { id: string; timestamp: string; action: string; actor_id: string; target_type: string; target_id: string }[];

    const leafData = auditLogs.map(log =>
      `${log.id}|${log.timestamp}|${log.action}|${log.actor_id}|${log.target_type}|${log.target_id}`
    );
    const recalculatedRoot = generateMerkleRoot(leafData);

    const isValid = recalculatedRoot === anchor.merkle_root;

    if (isValid) {
      db.prepare(`
        UPDATE audit_anchors SET status = 'verified' WHERE id = ?
      `).run(id);
    } else {
      db.prepare(`
        UPDATE audit_anchors SET status = 'failed' WHERE id = ?
      `).run(id);
    }

    // Log audit
    logAudit('ANCHOR_VERIFIED', req.user!.userId, 'admin', 'audit_anchor', id,
      `Verification ${isValid ? 'passed' : 'failed'} for batch ${anchor.batch_id}`,
      { batchId: anchor.batch_id, isValid, originalRoot: anchor.merkle_root, recalculatedRoot });

    res.json({
      success: true,
      data: {
        id: anchor.id,
        batchId: anchor.batch_id,
        verified: isValid,
        originalMerkleRoot: anchor.merkle_root,
        recalculatedMerkleRoot: recalculatedRoot,
        auditLogsCount: auditLogs.length,
        status: isValid ? 'verified' : 'failed',
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Verify anchor error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to verify anchor' } });
  }
});

/**
 * GET /api/blockchain/stats
 * Get blockchain statistics (admin only)
 */
router.get('/stats', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Block stats
    const blockStats = db.prepare(`
      SELECT
        COUNT(*) as total_blocks,
        MAX(block_number) as latest_block,
        SUM(transactions_count) as total_transactions,
        AVG(gas_used) as avg_gas_used
      FROM blockchain_blocks
    `).get() as { total_blocks: number; latest_block: number; total_transactions: number; avg_gas_used: number };

    // Transaction stats by type
    const txByType = db.prepare(`
      SELECT tx_type, COUNT(*) as count
      FROM blockchain_transactions
      GROUP BY tx_type
    `).all() as { tx_type: string; count: number }[];

    // Anchor stats
    const anchorStats = db.prepare(`
      SELECT
        COUNT(*) as total_anchors,
        SUM(audit_count) as total_audits_anchored,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified_anchors,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_anchors,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_anchors
      FROM audit_anchors
    `).get() as { total_anchors: number; total_audits_anchored: number; verified_anchors: number; pending_anchors: number; failed_anchors: number };

    // Daily activity (last 14 days)
    const dailyActivity = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as anchors,
        SUM(audit_count) as audits
      FROM audit_anchors
      WHERE created_at >= datetime('now', '-14 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all() as { date: string; anchors: number; audits: number }[];

    res.json({
      success: true,
      data: {
        network: {
          chainId: XPHERE_CONFIG.chainId,
          explorerUrl: XPHERE_CONFIG.explorerUrl,
        },
        blocks: {
          total: blockStats.total_blocks || 0,
          latest: blockStats.latest_block || 0,
          totalTransactions: blockStats.total_transactions || 0,
          avgGasUsed: Math.round(blockStats.avg_gas_used || 0),
        },
        transactionsByType: txByType.map(t => ({
          type: t.tx_type,
          count: t.count,
        })),
        anchoring: {
          total: anchorStats.total_anchors || 0,
          auditsAnchored: anchorStats.total_audits_anchored || 0,
          verified: anchorStats.verified_anchors || 0,
          pending: anchorStats.pending_anchors || 0,
          failed: anchorStats.failed_anchors || 0,
          verificationRate: anchorStats.total_anchors > 0
            ? Math.round((anchorStats.verified_anchors / anchorStats.total_anchors) * 100)
            : 0,
        },
        dailyActivity,
      },
    });
  } catch (error) {
    console.error('Get blockchain stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get blockchain stats' } });
  }
});

export default router;
