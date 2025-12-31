/**
 * Security Routes
 * Security hardening, rate limiting status, and security monitoring
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, param, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';

const router = Router();

// ==================== Type Definitions ====================

interface SecurityEventRow {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: string | null;
  resolved: number;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

interface IpBlockRow {
  id: string;
  ip_address: string;
  reason: string;
  blocked_by: string;
  expires_at: string | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: string | null;
  last_active_at: string;
  expires_at: string;
  created_at: string;
}

interface ApiKeyRow {
  id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  permissions: string;
  rate_limit: number;
  last_used_at: string | null;
  expires_at: string | null;
  status: 'active' | 'revoked';
  created_by: string;
  created_at: string;
}

// ==================== Security Event Types ====================

const SECURITY_EVENTS = {
  LOGIN_FAILED: { severity: 'warning' as const, description: 'Failed login attempt' },
  LOGIN_SUCCESS: { severity: 'info' as const, description: 'Successful login' },
  LOGOUT: { severity: 'info' as const, description: 'User logged out' },
  PASSWORD_CHANGE: { severity: 'info' as const, description: 'Password changed' },
  PASSWORD_RESET: { severity: 'warning' as const, description: 'Password reset requested' },
  ACCOUNT_LOCKED: { severity: 'critical' as const, description: 'Account locked due to failed attempts' },
  SUSPICIOUS_ACTIVITY: { severity: 'critical' as const, description: 'Suspicious activity detected' },
  RATE_LIMIT_EXCEEDED: { severity: 'warning' as const, description: 'Rate limit exceeded' },
  IP_BLOCKED: { severity: 'critical' as const, description: 'IP address blocked' },
  SESSION_HIJACK_ATTEMPT: { severity: 'critical' as const, description: 'Possible session hijacking attempt' },
  UNAUTHORIZED_ACCESS: { severity: 'critical' as const, description: 'Unauthorized access attempt' },
  API_KEY_CREATED: { severity: 'info' as const, description: 'API key created' },
  API_KEY_REVOKED: { severity: 'warning' as const, description: 'API key revoked' },
  ADMIN_ACTION: { severity: 'info' as const, description: 'Administrative action performed' },
};

// ==================== Helper Functions ====================

function validateRequest(req: AuthenticatedRequest): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', { errors: errors.array() });
  }
}

function logSecurityEvent(
  eventType: keyof typeof SECURITY_EVENTS,
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null,
  details?: Record<string, unknown>
): void {
  const db = getDb();
  const eventConfig = SECURITY_EVENTS[eventType];

  db.prepare(`
    INSERT INTO security_events (id, event_type, severity, user_id, ip_address, user_agent, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    eventType,
    eventConfig.severity,
    userId,
    ipAddress,
    userAgent,
    details ? JSON.stringify(details) : null
  );
}

function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Generate a secure API key
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  const key = `lpk_${timestamp}_${random}`.substring(0, 40);
  const prefix = key.substring(0, 10);
  // In production, would use proper hashing (bcrypt)
  const hash = key.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0).toString(16);

  return { key, hash, prefix };
}

// ==================== User Endpoints ====================

/**
 * GET /api/security/sessions
 * Get user's active sessions
 */
router.get('/sessions', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    const sessions = db.prepare(`
      SELECT * FROM sessions
      WHERE user_id = ? AND expires_at > datetime('now')
      ORDER BY last_active_at DESC
    `).all(req.user!.userId) as SessionRow[];

    res.json({
      success: true,
      data: {
        sessions: sessions.map(s => ({
          id: s.id,
          ipAddress: s.ip_address,
          userAgent: s.user_agent,
          deviceInfo: s.device_info ? JSON.parse(s.device_info) : null,
          lastActiveAt: s.last_active_at,
          expiresAt: s.expires_at,
          createdAt: s.created_at,
          isCurrent: false, // Would compare with current session token
        })),
        count: sessions.length,
      },
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get sessions' } });
  }
});

/**
 * DELETE /api/security/sessions/:id
 * Revoke a session
 */
router.delete('/sessions/:id', authenticate, [
  param('id').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;

    const session = db.prepare(`
      SELECT * FROM sessions WHERE id = ? AND user_id = ?
    `).get(id, req.user!.userId) as SessionRow | undefined;

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);

    // Log security event
    logSecurityEvent('LOGOUT', req.user!.userId, session.ip_address, session.user_agent, {
      sessionId: id,
      revokedBy: 'user',
    });

    res.json({
      success: true,
      data: { id, revoked: true },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Revoke session error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke session' } });
  }
});

/**
 * POST /api/security/sessions/revoke-all
 * Revoke all sessions except current
 */
router.post('/sessions/revoke-all', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // In production, would exclude current session
    const result = db.prepare(`
      DELETE FROM sessions WHERE user_id = ?
    `).run(req.user!.userId);

    // Log security event
    logSecurityEvent('LOGOUT', req.user!.userId, null, null, {
      revokedCount: result.changes,
      revokedBy: 'user',
      action: 'revoke_all',
    });

    res.json({
      success: true,
      data: {
        revokedCount: result.changes,
      },
    });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke sessions' } });
  }
});

/**
 * GET /api/security/activity
 * Get user's security activity log
 */
router.get('/activity', authenticate, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM security_events WHERE user_id = ?
    `).get(req.user!.userId) as { count: number };

    // Get events
    const events = db.prepare(`
      SELECT * FROM security_events
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user!.userId, Number(limit), offset) as SecurityEventRow[];

    res.json({
      success: true,
      data: {
        events: events.map(e => ({
          id: e.id,
          type: e.event_type,
          severity: e.severity,
          description: SECURITY_EVENTS[e.event_type as keyof typeof SECURITY_EVENTS]?.description || e.event_type,
          ipAddress: e.ip_address,
          userAgent: e.user_agent,
          details: e.details ? JSON.parse(e.details) : null,
          createdAt: e.created_at,
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
    console.error('Get activity error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get activity' } });
  }
});

// ==================== Admin Endpoints ====================

/**
 * GET /api/admin/security/events
 * Get all security events (admin)
 */
router.get('/admin/events', authenticate, requireAdmin, [
  query('severity').optional().isIn(['info', 'warning', 'critical']),
  query('eventType').optional().isString(),
  query('resolved').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { severity, eventType, resolved, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (severity) {
      whereClause += ' AND severity = ?';
      params.push(String(severity));
    }

    if (eventType) {
      whereClause += ' AND event_type = ?';
      params.push(String(eventType));
    }

    if (resolved !== undefined) {
      whereClause += ' AND resolved = ?';
      params.push(resolved === 'true' ? 1 : 0);
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM security_events ${whereClause}
    `).get(...params) as { count: number };

    // Get events with user info
    const events = db.prepare(`
      SELECT se.*, u.name as user_name, u.email as user_email
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
      ${whereClause}
      ORDER BY se.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset) as (SecurityEventRow & { user_name: string | null; user_email: string | null })[];

    res.json({
      success: true,
      data: {
        events: events.map(e => ({
          id: e.id,
          type: e.event_type,
          severity: e.severity,
          description: SECURITY_EVENTS[e.event_type as keyof typeof SECURITY_EVENTS]?.description || e.event_type,
          user: e.user_id ? {
            id: e.user_id,
            name: e.user_name,
            email: e.user_email,
          } : null,
          ipAddress: e.ip_address,
          userAgent: e.user_agent,
          details: e.details ? JSON.parse(e.details) : null,
          resolved: !!e.resolved,
          resolvedAt: e.resolved_at,
          resolvedBy: e.resolved_by,
          createdAt: e.created_at,
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
    console.error('Get admin events error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get events' } });
  }
});

/**
 * POST /api/admin/security/events/:id/resolve
 * Resolve a security event (admin)
 */
router.post('/admin/events/:id/resolve', authenticate, requireAdmin, [
  param('id').isString().notEmpty(),
  body('notes').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;
    const { notes } = req.body;

    const event = db.prepare(`SELECT * FROM security_events WHERE id = ?`).get(id) as SecurityEventRow | undefined;

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.resolved) {
      throw new BadRequestError('Event is already resolved');
    }

    db.prepare(`
      UPDATE security_events
      SET resolved = 1, resolved_at = datetime('now'), resolved_by = ?,
          details = json_set(COALESCE(details, '{}'), '$.resolution_notes', ?)
      WHERE id = ?
    `).run(req.user!.userId, notes || null, id);

    res.json({
      success: true,
      data: {
        id,
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy: req.user!.userId,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Resolve event error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve event' } });
  }
});

/**
 * GET /api/admin/security/blocked-ips
 * Get blocked IP addresses (admin)
 */
router.get('/admin/blocked-ips', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    const blockedIps = db.prepare(`
      SELECT ib.*, u.name as blocked_by_name
      FROM ip_blocks ib
      LEFT JOIN users u ON ib.blocked_by = u.id
      WHERE ib.expires_at IS NULL OR ib.expires_at > datetime('now')
      ORDER BY ib.created_at DESC
    `).all() as (IpBlockRow & { blocked_by_name: string })[];

    res.json({
      success: true,
      data: {
        blockedIps: blockedIps.map(ip => ({
          id: ip.id,
          ipAddress: ip.ip_address,
          reason: ip.reason,
          blockedBy: {
            id: ip.blocked_by,
            name: ip.blocked_by_name,
          },
          expiresAt: ip.expires_at,
          createdAt: ip.created_at,
        })),
        count: blockedIps.length,
      },
    });
  } catch (error) {
    console.error('Get blocked IPs error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get blocked IPs' } });
  }
});

/**
 * POST /api/admin/security/block-ip
 * Block an IP address (admin)
 */
router.post('/admin/block-ip', authenticate, requireAdmin, [
  body('ipAddress').isIP().withMessage('Valid IP address required'),
  body('reason').isString().notEmpty().withMessage('Reason is required'),
  body('durationHours').optional().isInt({ min: 1 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { ipAddress, reason, durationHours } = req.body;

    // Check if already blocked
    const existing = db.prepare(`
      SELECT * FROM ip_blocks
      WHERE ip_address = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
    `).get(ipAddress) as IpBlockRow | undefined;

    if (existing) {
      throw new BadRequestError('IP address is already blocked');
    }

    let expiresAt = null;
    if (durationHours) {
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + durationHours);
      expiresAt = expiry.toISOString();
    }

    const blockId = uuidv4();
    db.prepare(`
      INSERT INTO ip_blocks (id, ip_address, reason, blocked_by, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(blockId, ipAddress, reason, req.user!.userId, expiresAt);

    // Log security event
    logSecurityEvent('IP_BLOCKED', null, ipAddress, null, {
      reason,
      blockedBy: req.user!.userId,
      expiresAt,
    });

    res.status(201).json({
      success: true,
      data: {
        id: blockId,
        ipAddress,
        reason,
        expiresAt,
        blocked: true,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Block IP error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to block IP' } });
  }
});

/**
 * DELETE /api/admin/security/blocked-ips/:id
 * Unblock an IP address (admin)
 */
router.delete('/admin/blocked-ips/:id', authenticate, requireAdmin, [
  param('id').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;

    const block = db.prepare(`SELECT * FROM ip_blocks WHERE id = ?`).get(id) as IpBlockRow | undefined;

    if (!block) {
      throw new NotFoundError('IP block not found');
    }

    db.prepare(`DELETE FROM ip_blocks WHERE id = ?`).run(id);

    res.json({
      success: true,
      data: {
        id,
        ipAddress: block.ip_address,
        unblocked: true,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Unblock IP error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to unblock IP' } });
  }
});

/**
 * GET /api/admin/security/api-keys
 * Get API keys (admin)
 */
router.get('/admin/api-keys', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    const apiKeys = db.prepare(`
      SELECT ak.*, u.name as created_by_name
      FROM api_keys ak
      LEFT JOIN users u ON ak.created_by = u.id
      ORDER BY ak.created_at DESC
    `).all() as (ApiKeyRow & { created_by_name: string })[];

    res.json({
      success: true,
      data: {
        apiKeys: apiKeys.map(k => ({
          id: k.id,
          name: k.name,
          keyPrefix: k.key_prefix,
          permissions: JSON.parse(k.permissions),
          rateLimit: k.rate_limit,
          lastUsedAt: k.last_used_at,
          expiresAt: k.expires_at,
          status: k.status,
          createdBy: {
            id: k.created_by,
            name: k.created_by_name,
          },
          createdAt: k.created_at,
        })),
        count: apiKeys.length,
      },
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get API keys' } });
  }
});

/**
 * POST /api/admin/security/api-keys
 * Create API key (admin)
 */
router.post('/admin/api-keys', authenticate, requireAdmin, [
  body('name').isString().notEmpty().withMessage('Name is required'),
  body('permissions').isArray().withMessage('Permissions must be an array'),
  body('rateLimit').optional().isInt({ min: 1 }),
  body('expiresInDays').optional().isInt({ min: 1 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { name, permissions, rateLimit = 1000, expiresInDays } = req.body;

    const { key, hash, prefix } = generateApiKey();

    let expiresAt = null;
    if (expiresInDays) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expiresInDays);
      expiresAt = expiry.toISOString();
    }

    const keyId = uuidv4();
    db.prepare(`
      INSERT INTO api_keys (id, name, key_hash, key_prefix, permissions, rate_limit, expires_at, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(keyId, name, hash, prefix, JSON.stringify(permissions), rateLimit, expiresAt, req.user!.userId);

    // Log security event
    logSecurityEvent('API_KEY_CREATED', req.user!.userId, null, null, {
      keyId,
      name,
      permissions,
    });

    res.status(201).json({
      success: true,
      data: {
        id: keyId,
        name,
        key, // Only returned once on creation
        keyPrefix: prefix,
        permissions,
        rateLimit,
        expiresAt,
        message: 'Save this API key securely - it will not be shown again',
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Create API key error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create API key' } });
  }
});

/**
 * DELETE /api/admin/security/api-keys/:id
 * Revoke API key (admin)
 */
router.delete('/admin/api-keys/:id', authenticate, requireAdmin, [
  param('id').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;

    const apiKey = db.prepare(`SELECT * FROM api_keys WHERE id = ?`).get(id) as ApiKeyRow | undefined;

    if (!apiKey) {
      throw new NotFoundError('API key not found');
    }

    if (apiKey.status === 'revoked') {
      throw new BadRequestError('API key is already revoked');
    }

    db.prepare(`UPDATE api_keys SET status = 'revoked' WHERE id = ?`).run(id);

    // Log security event
    logSecurityEvent('API_KEY_REVOKED', req.user!.userId, null, null, {
      keyId: id,
      name: apiKey.name,
    });

    res.json({
      success: true,
      data: {
        id,
        name: apiKey.name,
        revoked: true,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Revoke API key error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke API key' } });
  }
});

/**
 * GET /api/admin/security/stats
 * Get security statistics (admin)
 */
router.get('/admin/stats', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Event stats (last 30 days)
    const eventStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info,
        SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as unresolved
      FROM security_events
      WHERE created_at >= datetime('now', '-30 days')
    `).get() as { total: number; critical: number; warning: number; info: number; unresolved: number };

    // Events by type
    const byType = db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM security_events
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 10
    `).all() as { event_type: string; count: number }[];

    // Active sessions count
    const sessionStats = db.prepare(`
      SELECT COUNT(*) as active_sessions
      FROM sessions
      WHERE expires_at > datetime('now')
    `).get() as { active_sessions: number };

    // Blocked IPs count
    const blockedIpCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM ip_blocks
      WHERE expires_at IS NULL OR expires_at > datetime('now')
    `).get() as { count: number };

    // API key stats
    const apiKeyStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked
      FROM api_keys
    `).get() as { total: number; active: number; revoked: number };

    // Daily events (last 14 days)
    const dailyEvents = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical
      FROM security_events
      WHERE created_at >= datetime('now', '-14 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all() as { date: string; total: number; critical: number }[];

    // Failed login attempts (last 24 hours)
    const failedLogins = db.prepare(`
      SELECT COUNT(*) as count
      FROM security_events
      WHERE event_type = 'LOGIN_FAILED'
        AND created_at >= datetime('now', '-24 hours')
    `).get() as { count: number };

    res.json({
      success: true,
      data: {
        events: {
          last30Days: eventStats.total || 0,
          critical: eventStats.critical || 0,
          warning: eventStats.warning || 0,
          info: eventStats.info || 0,
          unresolved: eventStats.unresolved || 0,
        },
        byType: byType.map(t => ({
          type: t.event_type,
          description: SECURITY_EVENTS[t.event_type as keyof typeof SECURITY_EVENTS]?.description || t.event_type,
          count: t.count,
        })),
        sessions: {
          active: sessionStats.active_sessions,
        },
        blockedIps: blockedIpCount.count,
        apiKeys: {
          total: apiKeyStats.total || 0,
          active: apiKeyStats.active || 0,
          revoked: apiKeyStats.revoked || 0,
        },
        failedLogins24h: failedLogins.count,
        dailyEvents,
      },
    });
  } catch (error) {
    console.error('Get security stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get statistics' } });
  }
});

export default router;
