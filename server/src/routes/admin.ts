/**
 * Admin Routes
 * Dashboard, audit logs, vouchers, system management
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler.js';

const router = Router();

// Apply admin auth to all routes
router.use(authenticate);
router.use(requireAdmin);

interface AuditLogRow {
  id: string;
  timestamp: string;
  action: string;
  actor_id: string;
  actor_type: string;
  actor_did: string | null;
  target_type: string;
  target_id: string;
  description: string;
  previous_state: string | null;
  new_state: string | null;
  metadata: string | null;
  ip_address: string | null;
  user_agent: string | null;
  blockchain_hash: string | null;
  block_number: number | null;
  verified: number;
}

interface VoucherRow {
  id: string;
  name: string;
  code: string;
  amount: number;
  type: string;
  usage_limit: number;
  usage_count: number;
  valid_from: string;
  valid_until: string;
  status: string;
  created_at: string;
}

// ==================== Dashboard Stats ====================

/**
 * GET /api/admin/dashboard
 * Get admin dashboard statistics
 */
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Total users by type
    const userStats = db.prepare(`
      SELECT user_type, COUNT(*) as count
      FROM users
      GROUP BY user_type
    `).all() as { user_type: string; count: number }[];

    // Total merchants
    const merchantStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN is_verified = 0 THEN 1 ELSE 0 END) as pending
      FROM merchants
    `).get() as { total: number; verified: number; pending: number };

    // Transaction volume (last 24h and 30d)
    const volumeStats = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-1 day') THEN amount ELSE 0 END), 0) as volume_24h,
        COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-30 day') THEN amount ELSE 0 END), 0) as volume_30d,
        COUNT(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 END) as count_24h
      FROM transactions
      WHERE type = 'payment' AND status = 'completed'
    `).get() as { volume_24h: number; volume_30d: number; count_24h: number };

    // Total issuance (sum of all top-ups)
    const issuanceStats = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'topup' AND status = 'completed'
    `).get() as { total: number };

    // Audit log stats
    const auditStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN date(timestamp) = date('now') THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified
      FROM audit_logs
    `).get() as { total: number; today: number; verified: number };

    // Active vouchers
    const voucherStats = db.prepare(`
      SELECT COUNT(*) as active
      FROM vouchers
      WHERE status = 'active' AND valid_until >= datetime('now')
    `).get() as { active: number };

    res.json({
      success: true,
      data: {
        users: {
          total: userStats.reduce((sum, u) => sum + u.count, 0),
          consumers: userStats.find(u => u.user_type === 'consumer')?.count || 0,
          merchants: userStats.find(u => u.user_type === 'merchant')?.count || 0,
          admins: userStats.find(u => u.user_type === 'admin')?.count || 0,
        },
        merchants: {
          total: merchantStats.total,
          verified: merchantStats.verified,
          pending: merchantStats.pending,
        },
        transactions: {
          volume24h: volumeStats.volume_24h,
          volume30d: volumeStats.volume_30d,
          count24h: volumeStats.count_24h,
        },
        issuance: {
          total: issuanceStats.total,
        },
        audit: {
          total: auditStats.total,
          today: auditStats.today,
          verifiedPercentage: auditStats.total > 0 ? (auditStats.verified / auditStats.total) * 100 : 0,
        },
        vouchers: {
          active: voucherStats.active,
        },
        systemHealth: 'healthy',
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get dashboard' } });
  }
});

// ==================== Audit Logs ====================

/**
 * GET /api/admin/audit-logs
 * Get audit logs with filtering
 */
router.get('/audit-logs', [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('action').optional().isString(),
  query('actorType').optional().isIn(['consumer', 'merchant', 'admin']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const action = req.query.action as string;
    const actorType = req.query.actorType as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (action) {
      whereClause += ' AND action = ?';
      params.push(action);
    }

    if (actorType) {
      whereClause += ' AND actor_type = ?';
      params.push(actorType);
    }

    if (startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(endDate);
    }

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM audit_logs ${whereClause}`).get(...params) as { count: number };

    const logs = db.prepare(`
      SELECT a.*, u.name as actor_name
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      ${whereClause}
      ORDER BY a.timestamp DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (AuditLogRow & { actor_name?: string })[];

    res.json({
      success: true,
      data: {
        logs: logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          action: log.action,
          actorId: log.actor_id,
          actorName: log.actor_name,
          actorType: log.actor_type,
          targetType: log.target_type,
          targetId: log.target_id,
          description: log.description,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
          blockchainHash: log.blockchain_hash,
          blockNumber: log.block_number,
          verified: log.verified === 1,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit logs' } });
  }
});

/**
 * GET /api/admin/audit-logs/:id
 * Get audit log details
 */
router.get('/audit-logs/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const log = db.prepare(`
      SELECT a.*, u.name as actor_name
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      WHERE a.id = ?
    `).get(req.params.id) as (AuditLogRow & { actor_name?: string }) | undefined;

    if (!log) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Audit log not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        id: log.id,
        timestamp: log.timestamp,
        action: log.action,
        actorId: log.actor_id,
        actorName: log.actor_name,
        actorType: log.actor_type,
        actorDid: log.actor_did,
        targetType: log.target_type,
        targetId: log.target_id,
        description: log.description,
        previousState: log.previous_state ? JSON.parse(log.previous_state) : null,
        newState: log.new_state ? JSON.parse(log.new_state) : null,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        blockchainHash: log.blockchain_hash,
        blockNumber: log.block_number,
        verified: log.verified === 1,
      },
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit log' } });
  }
});

// ==================== Voucher Management ====================

/**
 * GET /api/admin/vouchers
 * List vouchers
 */
router.get('/vouchers', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const status = req.query.status as string;
    const type = req.query.type as string;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM vouchers ${whereClause}`).get(...params) as { count: number };

    const vouchers = db.prepare(`
      SELECT * FROM vouchers ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as VoucherRow[];

    res.json({
      success: true,
      data: {
        vouchers: vouchers.map(v => ({
          id: v.id,
          name: v.name,
          code: v.code,
          amount: v.amount,
          type: v.type,
          usageLimit: v.usage_limit,
          usageCount: v.usage_count,
          validFrom: v.valid_from,
          validUntil: v.valid_until,
          status: v.status,
          createdAt: v.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('List vouchers error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list vouchers' } });
  }
});

/**
 * POST /api/admin/vouchers
 * Create voucher
 */
router.post('/vouchers', [
  body('name').notEmpty().withMessage('Name is required'),
  body('code').notEmpty().withMessage('Code is required'),
  body('amount').isInt({ min: 1000 }).withMessage('Amount must be at least 1000'),
  body('type').isIn(['welcome', 'promo', 'subsidy', 'partner']).withMessage('Invalid voucher type'),
  body('usageLimit').optional().isInt({ min: 0 }),
  body('validFrom').isISO8601().withMessage('Valid from date is required'),
  body('validUntil').isISO8601().withMessage('Valid until date is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { name, code, amount, type, usageLimit, validFrom, validUntil } = req.body;
    const db = getDb();

    // Check code uniqueness
    const existingVoucher = db.prepare('SELECT id FROM vouchers WHERE code = ?').get(code);
    if (existingVoucher) {
      throw new ConflictError('Voucher code already exists');
    }

    const voucherId = uuidv4();
    db.prepare(`
      INSERT INTO vouchers (id, name, code, amount, type, usage_limit, valid_from, valid_until)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(voucherId, name, code, amount, type, usageLimit || 0, validFrom, validUntil);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'VOUCHER_ISSUED',
      req.user!.userId,
      'admin',
      'voucher',
      voucherId,
      `Voucher ${name} (${code}) created`,
      JSON.stringify({ amount, type, usageLimit })
    );

    const voucher = db.prepare('SELECT * FROM vouchers WHERE id = ?').get(voucherId) as VoucherRow;

    res.status(201).json({
      success: true,
      data: {
        id: voucher.id,
        name: voucher.name,
        code: voucher.code,
        amount: voucher.amount,
        type: voucher.type,
        usageLimit: voucher.usage_limit,
        validFrom: voucher.valid_from,
        validUntil: voucher.valid_until,
        status: voucher.status,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ConflictError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Create voucher error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create voucher' } });
  }
});

/**
 * PUT /api/admin/vouchers/:id
 * Update voucher
 */
router.put('/vouchers/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, usageLimit, validUntil, status } = req.body;
    const db = getDb();

    const voucher = db.prepare('SELECT * FROM vouchers WHERE id = ?').get(req.params.id) as VoucherRow | undefined;
    if (!voucher) {
      throw new NotFoundError('Voucher not found');
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (usageLimit !== undefined) {
      updates.push('usage_limit = ?');
      params.push(usageLimit);
    }
    if (validUntil !== undefined) {
      updates.push('valid_until = ?');
      params.push(validUntil);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(req.params.id);

    db.prepare(`UPDATE vouchers SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updatedVoucher = db.prepare('SELECT * FROM vouchers WHERE id = ?').get(req.params.id) as VoucherRow;

    res.json({
      success: true,
      data: {
        id: updatedVoucher.id,
        name: updatedVoucher.name,
        code: updatedVoucher.code,
        amount: updatedVoucher.amount,
        type: updatedVoucher.type,
        usageLimit: updatedVoucher.usage_limit,
        usageCount: updatedVoucher.usage_count,
        validFrom: updatedVoucher.valid_from,
        validUntil: updatedVoucher.valid_until,
        status: updatedVoucher.status,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update voucher error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update voucher' } });
  }
});

/**
 * DELETE /api/admin/vouchers/:id
 * Delete voucher
 */
router.delete('/vouchers/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const voucher = db.prepare('SELECT * FROM vouchers WHERE id = ?').get(req.params.id) as VoucherRow | undefined;

    if (!voucher) {
      throw new NotFoundError('Voucher not found');
    }

    // Don't allow deletion of vouchers that have been used
    if (voucher.usage_count > 0) {
      throw new BadRequestError('Cannot delete voucher that has been used');
    }

    db.prepare('DELETE FROM vouchers WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'Voucher deleted' });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Delete voucher error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete voucher' } });
  }
});

// ==================== System Stats ====================

/**
 * GET /api/admin/stats/transactions
 * Get transaction statistics
 */
router.get('/stats/transactions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const period = req.query.period as string || '30d';
    const db = getDb();

    let dateFilter = '';
    if (period === '24h') {
      dateFilter = "AND created_at >= datetime('now', '-1 day')";
    } else if (period === '7d') {
      dateFilter = "AND created_at >= datetime('now', '-7 day')";
    } else if (period === '30d') {
      dateFilter = "AND created_at >= datetime('now', '-30 day')";
    }

    // Daily stats
    const dailyStats = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as count,
        SUM(amount) as volume,
        type
      FROM transactions
      WHERE status = 'completed' ${dateFilter}
      GROUP BY date(created_at), type
      ORDER BY date ASC
    `).all() as { date: string; count: number; volume: number; type: string }[];

    // Type breakdown
    const typeStats = db.prepare(`
      SELECT
        type,
        COUNT(*) as count,
        SUM(amount) as volume
      FROM transactions
      WHERE status = 'completed' ${dateFilter}
      GROUP BY type
    `).all() as { type: string; count: number; volume: number }[];

    res.json({
      success: true,
      data: {
        period,
        daily: dailyStats,
        byType: typeStats,
      },
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get stats' } });
  }
});

/**
 * GET /api/admin/stats/users
 * Get user statistics
 */
router.get('/stats/users', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // New users by day (last 30 days)
    const newUsers = db.prepare(`
      SELECT
        date(created_at) as date,
        user_type,
        COUNT(*) as count
      FROM users
      WHERE created_at >= datetime('now', '-30 day')
      GROUP BY date(created_at), user_type
      ORDER BY date ASC
    `).all() as { date: string; user_type: string; count: number }[];

    // KYC stats
    const kycStats = db.prepare(`
      SELECT
        SUM(CASE WHEN kyc_verified = 1 THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN kyc_verified = 0 THEN 1 ELSE 0 END) as pending
      FROM users
      WHERE user_type = 'consumer'
    `).get() as { verified: number; pending: number };

    // Level distribution
    const levelStats = db.prepare(`
      SELECT level, COUNT(*) as count
      FROM users
      WHERE user_type = 'consumer' AND level IS NOT NULL
      GROUP BY level
    `).all() as { level: string; count: number }[];

    res.json({
      success: true,
      data: {
        newUsers,
        kyc: kycStats,
        levels: levelStats,
      },
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get stats' } });
  }
});

export default router;
