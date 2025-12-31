/**
 * Token Routes
 * Token issuance, burning, and circulation management
 * NOTE: Actual token management via bank - we manage display and audit
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, param, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();

// ==================== Type Definitions ====================

interface TokenIssuanceRow {
  id: string;
  token_type: 'bcoin' | 'welfare' | 'youth' | 'senior' | 'culture' | 'education';
  amount: number;
  purpose: string | null;
  issuer_id: string;
  recipient_type: 'circulation' | 'welfare_program' | 'merchant_settlement';
  recipient_id: string | null;
  blockchain_hash: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface TokenBurnRow {
  id: string;
  token_type: string;
  amount: number;
  reason: string | null;
  burner_id: string;
  blockchain_hash: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
}

interface ProgrammableTokenRow {
  id: string;
  name: string;
  symbol: string;
  token_type: string;
  description: string | null;
  total_supply: number;
  circulating_supply: number;
  max_supply: number | null;
  decimals: number;
  restrictions: string | null;
  expiry_days: number | null;
  usage_categories: string | null;
  status: 'active' | 'paused' | 'deprecated';
  created_at: string;
  updated_at: string;
}

interface TokenBalanceRow {
  token_type: string;
  total_issued: number;
  total_burned: number;
  circulating: number;
  in_wallets: number;
  in_reserve: number;
}

// ==================== Helper Functions ====================

function validateRequest(req: AuthenticatedRequest): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', { errors: errors.array() });
  }
}

function generateBlockchainHash(): string {
  // Mock blockchain hash generation
  const timestamp = Date.now().toString(16);
  const random = Math.random().toString(16).substring(2);
  return `0x${timestamp}${random}`.substring(0, 66).padEnd(66, '0');
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
 * GET /api/tokens/types
 * Get available programmable token types
 */
router.get('/types', async (_req, res: Response): Promise<void> => {
  try {
    const db = getDb();

    const tokens = db.prepare(`
      SELECT * FROM programmable_tokens WHERE status = 'active'
      ORDER BY name
    `).all() as ProgrammableTokenRow[];

    res.json({
      success: true,
      data: {
        tokens: tokens.map(t => ({
          id: t.id,
          name: t.name,
          symbol: t.symbol,
          tokenType: t.token_type,
          description: t.description,
          totalSupply: t.total_supply,
          circulatingSupply: t.circulating_supply,
          maxSupply: t.max_supply,
          decimals: t.decimals,
          restrictions: t.restrictions ? JSON.parse(t.restrictions) : null,
          expiryDays: t.expiry_days,
          usageCategories: t.usage_categories ? JSON.parse(t.usage_categories) : null,
          status: t.status,
        })),
      },
    });
  } catch (error) {
    console.error('Get token types error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get token types' } });
  }
});

/**
 * GET /api/tokens/circulation
 * Get token circulation statistics
 */
router.get('/circulation', async (_req, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Get circulation stats by token type
    const stats = db.prepare(`
      SELECT
        pt.token_type,
        pt.name,
        pt.symbol,
        pt.total_supply,
        pt.circulating_supply,
        pt.max_supply,
        COALESCE(issued.amount, 0) as total_issued,
        COALESCE(burned.amount, 0) as total_burned
      FROM programmable_tokens pt
      LEFT JOIN (
        SELECT token_type, SUM(amount) as amount
        FROM token_issuances
        WHERE status = 'confirmed'
        GROUP BY token_type
      ) issued ON pt.token_type = issued.token_type
      LEFT JOIN (
        SELECT token_type, SUM(amount) as amount
        FROM token_burns
        WHERE status = 'confirmed'
        GROUP BY token_type
      ) burned ON pt.token_type = burned.token_type
      WHERE pt.status = 'active'
    `).all() as (ProgrammableTokenRow & { total_issued: number; total_burned: number })[];

    // Calculate totals
    const totals = stats.reduce((acc, s) => ({
      totalSupply: acc.totalSupply + s.total_supply,
      circulatingSupply: acc.circulatingSupply + s.circulating_supply,
      totalIssued: acc.totalIssued + s.total_issued,
      totalBurned: acc.totalBurned + s.total_burned,
    }), { totalSupply: 0, circulatingSupply: 0, totalIssued: 0, totalBurned: 0 });

    res.json({
      success: true,
      data: {
        tokens: stats.map(s => ({
          tokenType: s.token_type,
          name: s.name,
          symbol: s.symbol,
          totalSupply: s.total_supply,
          circulatingSupply: s.circulating_supply,
          maxSupply: s.max_supply,
          totalIssued: s.total_issued,
          totalBurned: s.total_burned,
          burnRate: s.total_issued > 0 ? Math.round((s.total_burned / s.total_issued) * 10000) / 100 : 0,
        })),
        totals,
      },
    });
  } catch (error) {
    console.error('Get circulation error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get circulation stats' } });
  }
});

// ==================== Admin Endpoints ====================

/**
 * GET /api/admin/tokens/issuance
 * Get token issuance history
 */
router.get('/admin/issuance', authenticate, requireAdmin, [
  query('tokenType').optional().isString(),
  query('status').optional().isIn(['pending', 'confirmed', 'failed']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { tokenType, status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (tokenType) {
      whereClause += ' AND ti.token_type = ?';
      params.push(String(tokenType));
    }

    if (status) {
      whereClause += ' AND ti.status = ?';
      params.push(String(status));
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM token_issuances ti ${whereClause}
    `).get(...params) as { count: number };

    // Get issuances with issuer info
    const issuances = db.prepare(`
      SELECT ti.*, u.name as issuer_name, u.email as issuer_email
      FROM token_issuances ti
      LEFT JOIN users u ON ti.issuer_id = u.id
      ${whereClause}
      ORDER BY ti.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset) as (TokenIssuanceRow & { issuer_name: string; issuer_email: string })[];

    res.json({
      success: true,
      data: {
        issuances: issuances.map(i => ({
          id: i.id,
          tokenType: i.token_type,
          amount: i.amount,
          purpose: i.purpose,
          issuer: {
            id: i.issuer_id,
            name: i.issuer_name,
            email: i.issuer_email,
          },
          recipientType: i.recipient_type,
          recipientId: i.recipient_id,
          blockchainHash: i.blockchain_hash,
          status: i.status,
          createdAt: i.created_at,
          updatedAt: i.updated_at,
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
    console.error('Get issuance history error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get issuance history' } });
  }
});

/**
 * POST /api/admin/tokens/issue
 * Issue new tokens
 */
router.post('/admin/issue', authenticate, requireAdmin, [
  body('tokenType').isIn(['bcoin', 'welfare', 'youth', 'senior', 'culture', 'education']).withMessage('Invalid token type'),
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  body('purpose').optional().isString().isLength({ max: 500 }),
  body('recipientType').isIn(['circulation', 'welfare_program', 'merchant_settlement']).withMessage('Invalid recipient type'),
  body('recipientId').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { tokenType, amount, purpose, recipientType, recipientId } = req.body;

    // Check max supply limit if exists
    const token = db.prepare(`
      SELECT * FROM programmable_tokens WHERE token_type = ? AND status = 'active'
    `).get(tokenType) as ProgrammableTokenRow | undefined;

    if (!token) {
      throw new BadRequestError('Token type not found or not active');
    }

    if (token.max_supply && (token.total_supply + amount) > token.max_supply) {
      throw new BadRequestError(`Issuance would exceed max supply of ${token.max_supply.toLocaleString()}`);
    }

    // Generate mock blockchain hash
    const blockchainHash = generateBlockchainHash();

    // Create issuance record
    const issuanceId = uuidv4();
    db.prepare(`
      INSERT INTO token_issuances (
        id, token_type, amount, purpose, issuer_id, recipient_type, recipient_id, blockchain_hash, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `).run(issuanceId, tokenType, amount, purpose || null, req.user!.userId, recipientType, recipientId || null, blockchainHash);

    // Update token supply
    db.prepare(`
      UPDATE programmable_tokens
      SET total_supply = total_supply + ?,
          circulating_supply = circulating_supply + ?,
          updated_at = datetime('now')
      WHERE token_type = ?
    `).run(amount, amount, tokenType);

    // Log audit
    logAudit('TOKEN_ISSUED', req.user!.userId, 'admin', 'token', issuanceId,
      `Issued ${amount.toLocaleString()} ${tokenType} tokens`,
      { tokenType, amount, purpose, recipientType, recipientId, blockchainHash });

    // Get updated token
    const updatedToken = db.prepare(`SELECT * FROM programmable_tokens WHERE token_type = ?`).get(tokenType) as ProgrammableTokenRow;

    res.status(201).json({
      success: true,
      data: {
        issuanceId,
        tokenType,
        amount,
        purpose,
        recipientType,
        recipientId,
        blockchainHash,
        status: 'confirmed',
        newTotalSupply: updatedToken.total_supply,
        newCirculatingSupply: updatedToken.circulating_supply,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Issue tokens error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to issue tokens' } });
  }
});

/**
 * POST /api/admin/tokens/burn
 * Burn tokens (remove from circulation)
 */
router.post('/admin/burn', authenticate, requireAdmin, [
  body('tokenType').isIn(['bcoin', 'welfare', 'youth', 'senior', 'culture', 'education']).withMessage('Invalid token type'),
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  body('reason').optional().isString().isLength({ max: 500 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { tokenType, amount, reason } = req.body;

    // Check circulating supply
    const token = db.prepare(`
      SELECT * FROM programmable_tokens WHERE token_type = ? AND status = 'active'
    `).get(tokenType) as ProgrammableTokenRow | undefined;

    if (!token) {
      throw new BadRequestError('Token type not found or not active');
    }

    if (token.circulating_supply < amount) {
      throw new BadRequestError(`Cannot burn more than circulating supply (${token.circulating_supply.toLocaleString()})`);
    }

    // Generate mock blockchain hash
    const blockchainHash = generateBlockchainHash();

    // Create burn record
    const burnId = uuidv4();
    db.prepare(`
      INSERT INTO token_burns (id, token_type, amount, reason, burner_id, blockchain_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
    `).run(burnId, tokenType, amount, reason || null, req.user!.userId, blockchainHash);

    // Update token supply
    db.prepare(`
      UPDATE programmable_tokens
      SET total_supply = total_supply - ?,
          circulating_supply = circulating_supply - ?,
          updated_at = datetime('now')
      WHERE token_type = ?
    `).run(amount, amount, tokenType);

    // Log audit
    logAudit('TOKEN_BURNED', req.user!.userId, 'admin', 'token', burnId,
      `Burned ${amount.toLocaleString()} ${tokenType} tokens`,
      { tokenType, amount, reason, blockchainHash });

    // Get updated token
    const updatedToken = db.prepare(`SELECT * FROM programmable_tokens WHERE token_type = ?`).get(tokenType) as ProgrammableTokenRow;

    res.json({
      success: true,
      data: {
        burnId,
        tokenType,
        amount,
        reason,
        blockchainHash,
        status: 'confirmed',
        newTotalSupply: updatedToken.total_supply,
        newCirculatingSupply: updatedToken.circulating_supply,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Burn tokens error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to burn tokens' } });
  }
});

/**
 * GET /api/admin/tokens/reserves
 * Get reserve balances
 */
router.get('/admin/reserves', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Get reserve balances by token type
    const reserves = db.prepare(`
      SELECT
        pt.token_type,
        pt.name,
        pt.symbol,
        pt.total_supply,
        pt.circulating_supply,
        (pt.total_supply - pt.circulating_supply) as reserve_balance,
        COALESCE(pending_issuance.amount, 0) as pending_issuance,
        COALESCE(pending_burn.amount, 0) as pending_burn
      FROM programmable_tokens pt
      LEFT JOIN (
        SELECT token_type, SUM(amount) as amount
        FROM token_issuances
        WHERE status = 'pending'
        GROUP BY token_type
      ) pending_issuance ON pt.token_type = pending_issuance.token_type
      LEFT JOIN (
        SELECT token_type, SUM(amount) as amount
        FROM token_burns
        WHERE status = 'pending'
        GROUP BY token_type
      ) pending_burn ON pt.token_type = pending_burn.token_type
      WHERE pt.status = 'active'
    `).all() as {
      token_type: string;
      name: string;
      symbol: string;
      total_supply: number;
      circulating_supply: number;
      reserve_balance: number;
      pending_issuance: number;
      pending_burn: number;
    }[];

    // Calculate bank reserve (mock: assume 1:1 backing)
    const totalCirculating = reserves.reduce((sum, r) => sum + r.circulating_supply, 0);
    const bankReserve = totalCirculating; // 100% backed

    res.json({
      success: true,
      data: {
        reserves: reserves.map(r => ({
          tokenType: r.token_type,
          name: r.name,
          symbol: r.symbol,
          totalSupply: r.total_supply,
          circulatingSupply: r.circulating_supply,
          reserveBalance: r.reserve_balance,
          pendingIssuance: r.pending_issuance,
          pendingBurn: r.pending_burn,
        })),
        bankReserve: {
          totalBacking: bankReserve,
          currency: 'KRW',
          backingRatio: 1.0,
          lastVerified: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Get reserves error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get reserves' } });
  }
});

/**
 * GET /api/admin/tokens/stats
 * Get comprehensive token statistics
 */
router.get('/admin/stats', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Overall stats
    const overallStats = db.prepare(`
      SELECT
        COUNT(*) as token_count,
        SUM(total_supply) as total_supply,
        SUM(circulating_supply) as circulating_supply
      FROM programmable_tokens
      WHERE status = 'active'
    `).get() as { token_count: number; total_supply: number; circulating_supply: number };

    // Issuance stats (last 30 days)
    const issuanceStats = db.prepare(`
      SELECT
        token_type,
        COUNT(*) as issuance_count,
        SUM(amount) as total_issued
      FROM token_issuances
      WHERE status = 'confirmed'
        AND created_at >= datetime('now', '-30 days')
      GROUP BY token_type
    `).all() as { token_type: string; issuance_count: number; total_issued: number }[];

    // Burn stats (last 30 days)
    const burnStats = db.prepare(`
      SELECT
        token_type,
        COUNT(*) as burn_count,
        SUM(amount) as total_burned
      FROM token_burns
      WHERE status = 'confirmed'
        AND created_at >= datetime('now', '-30 days')
      GROUP BY token_type
    `).all() as { token_type: string; burn_count: number; total_burned: number }[];

    // Daily activity (last 14 days)
    const dailyActivity = db.prepare(`
      SELECT
        date,
        SUM(issued) as issued,
        SUM(burned) as burned
      FROM (
        SELECT DATE(created_at) as date, amount as issued, 0 as burned
        FROM token_issuances
        WHERE status = 'confirmed' AND created_at >= datetime('now', '-14 days')
        UNION ALL
        SELECT DATE(created_at) as date, 0 as issued, amount as burned
        FROM token_burns
        WHERE status = 'confirmed' AND created_at >= datetime('now', '-14 days')
      )
      GROUP BY date
      ORDER BY date DESC
    `).all() as { date: string; issued: number; burned: number }[];

    // Recent activity
    const recentActivity = db.prepare(`
      SELECT * FROM (
        SELECT id, token_type, amount, 'issuance' as activity_type, created_at
        FROM token_issuances
        WHERE status = 'confirmed'
        ORDER BY created_at DESC
        LIMIT 5
      )
      UNION ALL
      SELECT * FROM (
        SELECT id, token_type, amount, 'burn' as activity_type, created_at
        FROM token_burns
        WHERE status = 'confirmed'
        ORDER BY created_at DESC
        LIMIT 5
      )
      ORDER BY created_at DESC
      LIMIT 10
    `).all() as { id: string; token_type: string; amount: number; activity_type: string; created_at: string }[];

    res.json({
      success: true,
      data: {
        overview: {
          activeTokenTypes: overallStats.token_count,
          totalSupply: overallStats.total_supply || 0,
          circulatingSupply: overallStats.circulating_supply || 0,
          reserveRatio: overallStats.total_supply > 0
            ? Math.round(((overallStats.total_supply - overallStats.circulating_supply) / overallStats.total_supply) * 100)
            : 0,
        },
        last30Days: {
          issuance: issuanceStats.map(i => ({
            tokenType: i.token_type,
            count: i.issuance_count,
            amount: i.total_issued,
          })),
          burns: burnStats.map(b => ({
            tokenType: b.token_type,
            count: b.burn_count,
            amount: b.total_burned,
          })),
        },
        dailyActivity,
        recentActivity: recentActivity.map(a => ({
          id: a.id,
          tokenType: a.token_type,
          amount: a.amount,
          activityType: a.activity_type,
          createdAt: a.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('Get token stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get token statistics' } });
  }
});

/**
 * GET /api/admin/tokens/programmable
 * Get all programmable token configurations
 */
router.get('/admin/programmable', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    const tokens = db.prepare(`SELECT * FROM programmable_tokens ORDER BY name`).all() as ProgrammableTokenRow[];

    res.json({
      success: true,
      data: {
        tokens: tokens.map(t => ({
          id: t.id,
          name: t.name,
          symbol: t.symbol,
          tokenType: t.token_type,
          description: t.description,
          totalSupply: t.total_supply,
          circulatingSupply: t.circulating_supply,
          maxSupply: t.max_supply,
          decimals: t.decimals,
          restrictions: t.restrictions ? JSON.parse(t.restrictions) : null,
          expiryDays: t.expiry_days,
          usageCategories: t.usage_categories ? JSON.parse(t.usage_categories) : null,
          status: t.status,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        })),
      },
    });
  } catch (error) {
    console.error('Get programmable tokens error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get programmable tokens' } });
  }
});

/**
 * PUT /api/admin/tokens/programmable/:id
 * Update programmable token configuration
 */
router.put('/admin/programmable/:id', authenticate, requireAdmin, [
  param('id').isString().notEmpty(),
  body('status').optional().isIn(['active', 'paused', 'deprecated']),
  body('maxSupply').optional().isInt({ min: 0 }),
  body('expiryDays').optional().isInt({ min: 0 }),
  body('restrictions').optional().isObject(),
  body('usageCategories').optional().isArray(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;
    const { status, maxSupply, expiryDays, restrictions, usageCategories } = req.body;

    // Check token exists
    const token = db.prepare(`SELECT * FROM programmable_tokens WHERE id = ?`).get(id) as ProgrammableTokenRow | undefined;

    if (!token) {
      throw new NotFoundError('Token not found');
    }

    // Build update
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (maxSupply !== undefined) {
      if (maxSupply > 0 && token.total_supply > maxSupply) {
        throw new BadRequestError('Max supply cannot be less than current total supply');
      }
      updates.push('max_supply = ?');
      values.push(maxSupply || null);
    }
    if (expiryDays !== undefined) {
      updates.push('expiry_days = ?');
      values.push(expiryDays || null);
    }
    if (restrictions !== undefined) {
      updates.push('restrictions = ?');
      values.push(JSON.stringify(restrictions));
    }
    if (usageCategories !== undefined) {
      updates.push('usage_categories = ?');
      values.push(JSON.stringify(usageCategories));
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE programmable_tokens SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // Log audit
    logAudit('TOKEN_CONFIG_UPDATED', req.user!.userId, 'admin', 'token', id,
      `Updated ${token.name} token configuration`,
      { status, maxSupply, expiryDays, restrictions, usageCategories });

    const updatedToken = db.prepare(`SELECT * FROM programmable_tokens WHERE id = ?`).get(id) as ProgrammableTokenRow;

    res.json({
      success: true,
      data: {
        id: updatedToken.id,
        name: updatedToken.name,
        symbol: updatedToken.symbol,
        tokenType: updatedToken.token_type,
        status: updatedToken.status,
        maxSupply: updatedToken.max_supply,
        expiryDays: updatedToken.expiry_days,
        restrictions: updatedToken.restrictions ? JSON.parse(updatedToken.restrictions) : null,
        usageCategories: updatedToken.usage_categories ? JSON.parse(updatedToken.usage_categories) : null,
        updatedAt: updatedToken.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update token config error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update token configuration' } });
  }
});

export default router;
