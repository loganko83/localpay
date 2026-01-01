/**
 * User Routes
 * User profile, KYC, settings
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();

interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  user_type: string;
  avatar_url: string | null;
  did: string | null;
  kyc_verified: number;
  kyc_verified_at: string | null;
  level: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get('/profile', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as UserRow | undefined;

    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        userType: user.user_type,
        avatarUrl: user.avatar_url,
        did: user.did,
        kycVerified: user.kyc_verified === 1,
        kycVerifiedAt: user.kyc_verified_at,
        level: user.level,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get profile' } });
  }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put('/profile', authenticate, [
  body('name').optional().isString().isLength({ min: 2, max: 100 }),
  body('phone').optional().isMobilePhone('ko-KR'),
  body('avatarUrl').optional().isURL(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { name, phone, avatarUrl } = req.body;
    const db = getDb();

    // Build update query
    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatarUrl);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(req.user!.userId);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as UserRow;

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' } });
  }
});

/**
 * POST /api/users/change-password
 * Change user password
 */
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const db = getDb();

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.userId) as { password_hash: string } | undefined;

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      throw new BadRequestError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(newPasswordHash, req.user!.userId);

    // Invalidate all sessions except current
    const currentToken = req.headers.authorization?.substring(7);
    db.prepare('UPDATE sessions SET is_active = 0 WHERE user_id = ? AND token != ?').run(req.user!.userId, currentToken);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to change password' } });
  }
});

/**
 * POST /api/users/kyc/verify
 * Submit KYC verification (mock)
 */
router.post('/kyc/verify', authenticate, [
  body('realName').notEmpty().withMessage('Real name is required'),
  body('identityNumber').notEmpty().withMessage('Identity number is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const db = getDb();

    // In production, this would call actual KYC verification service
    // For demo, we simulate verification

    db.prepare(`
      UPDATE users SET kyc_verified = 1, kyc_verified_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(req.user!.userId);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'USER_KYC_VERIFIED',
      req.user!.userId,
      req.user!.userType,
      'user',
      req.user!.userId,
      'KYC verification completed'
    );

    res.json({
      success: true,
      data: {
        verified: true,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('KYC verify error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'KYC verification failed' } });
  }
});

/**
 * GET /api/users/sessions
 * Get active sessions
 */
router.get('/sessions', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const sessions = db.prepare(`
      SELECT id, device_id, ip_address, user_agent, created_at, last_active_at
      FROM sessions
      WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
      ORDER BY last_active_at DESC
    `).all(req.user!.userId);

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get sessions' } });
  }
});

/**
 * DELETE /api/users/sessions/:id
 * Revoke a session
 */
router.delete('/sessions/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const result = db.prepare('UPDATE sessions SET is_active = 0 WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.userId);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    res.json({ success: true, message: 'Session revoked' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke session' } });
  }
});

// ==================== Admin-only routes ====================

/**
 * GET /api/users
 * List all users with pagination and filters (admin only)
 * Filters: user_type, kyc_verified, search
 */
router.get('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const userType = req.query.user_type as string || req.query.type as string;
    const kycVerified = req.query.kyc_verified as string;
    const search = req.query.search as string;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (userType) {
      whereClause += ' AND user_type = ?';
      params.push(userType);
    }

    if (kycVerified !== undefined && kycVerified !== '') {
      whereClause += ' AND kyc_verified = ?';
      params.push(kycVerified === 'true' || kycVerified === '1' ? 1 : 0);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).get(...params) as { count: number };

    const users = db.prepare(`
      SELECT id, email, phone, name, user_type, avatar_url, kyc_verified, kyc_verified_at, level, created_at, updated_at
      FROM users ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as UserRow[];

    res.json({
      success: true,
      data: {
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          phone: u.phone,
          name: u.name,
          userType: u.user_type,
          avatarUrl: u.avatar_url,
          kycVerified: u.kyc_verified === 1,
          kycVerifiedAt: u.kyc_verified_at,
          level: u.level,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' } });
  }
});

/**
 * GET /api/users/stats
 * Get user statistics (admin only)
 */
router.get('/stats', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Total users by type
    const usersByType = db.prepare(`
      SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type
    `).all() as Array<{ user_type: string; count: number }>;

    // KYC status counts
    const kycStats = db.prepare(`
      SELECT
        SUM(CASE WHEN kyc_verified = 1 THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN kyc_verified = 0 THEN 1 ELSE 0 END) as pending
      FROM users
    `).get() as { verified: number; pending: number };

    // Users registered today
    const todayRegistrations = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')
    `).get() as { count: number };

    // Users registered this week
    const weekRegistrations = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days')
    `).get() as { count: number };

    // Users registered this month
    const monthRegistrations = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-30 days')
    `).get() as { count: number };

    // Total users
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

    // Active users (with session in last 7 days)
    const activeUsers = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM sessions
      WHERE last_active_at >= datetime('now', '-7 days') AND is_active = 1
    `).get() as { count: number };

    // Level distribution for consumers
    const levelDistribution = db.prepare(`
      SELECT level, COUNT(*) as count FROM users WHERE user_type = 'consumer' GROUP BY level
    `).all() as Array<{ level: string; count: number }>;

    res.json({
      success: true,
      data: {
        total: totalUsers.count,
        byType: usersByType.reduce((acc, item) => {
          acc[item.user_type] = item.count;
          return acc;
        }, {} as Record<string, number>),
        kyc: {
          verified: kycStats.verified || 0,
          pending: kycStats.pending || 0,
        },
        registrations: {
          today: todayRegistrations.count,
          thisWeek: weekRegistrations.count,
          thisMonth: monthRegistrations.count,
        },
        activeUsers: activeUsers.count,
        levelDistribution: levelDistribution.reduce((acc, item) => {
          acc[item.level || 'None'] = item.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get user stats' } });
  }
});

/**
 * GET /api/users/export
 * Export users to CSV format (admin only)
 */
router.get('/export', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userType = req.query.user_type as string;
    const kycVerified = req.query.kyc_verified as string;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (userType) {
      whereClause += ' AND user_type = ?';
      params.push(userType);
    }

    if (kycVerified !== undefined) {
      whereClause += ' AND kyc_verified = ?';
      params.push(kycVerified === 'true' ? 1 : 0);
    }

    const users = db.prepare(`
      SELECT id, email, phone, name, user_type, kyc_verified, kyc_verified_at, level, created_at
      FROM users ${whereClause}
      ORDER BY created_at DESC
    `).all(...params) as UserRow[];

    // Build CSV content
    const headers = ['ID', 'Email', 'Phone', 'Name', 'User Type', 'KYC Verified', 'KYC Verified At', 'Level', 'Created At'];
    const csvRows = [headers.join(',')];

    for (const user of users) {
      const row = [
        user.id,
        user.email || '',
        user.phone || '',
        `"${(user.name || '').replace(/"/g, '""')}"`,
        user.user_type,
        user.kyc_verified === 1 ? 'Yes' : 'No',
        user.kyc_verified_at || '',
        user.level || '',
        user.created_at,
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to export users' } });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID with wallet info (admin only)
 */
router.get('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined;

    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    // Get wallet info
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.params.id) as {
      id: string;
      balance: number;
      pending_balance: number;
      daily_limit: number;
      monthly_limit: number;
      used_today: number;
      used_this_month: number;
    } | undefined;

    // Get merchant info if user is a merchant
    let merchant = null;
    if (user.user_type === 'merchant') {
      merchant = db.prepare('SELECT * FROM merchants WHERE user_id = ?').get(req.params.id) as {
        id: string;
        store_name: string;
        business_number: string;
        category: string;
        is_verified: number;
      } | undefined;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        userType: user.user_type,
        avatarUrl: user.avatar_url,
        did: user.did,
        kycVerified: user.kyc_verified === 1,
        kycVerifiedAt: user.kyc_verified_at,
        level: user.level,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        wallet: wallet ? {
          id: wallet.id,
          balance: wallet.balance,
          pendingBalance: wallet.pending_balance,
          dailyLimit: wallet.daily_limit,
          monthlyLimit: wallet.monthly_limit,
          usedToday: wallet.used_today,
          usedThisMonth: wallet.used_this_month,
        } : null,
        merchant: merchant ? {
          id: merchant.id,
          storeName: merchant.store_name,
          businessNumber: merchant.business_number,
          category: merchant.category,
          isVerified: merchant.is_verified === 1,
        } : null,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' } });
  }
});

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put('/:id', authenticate, requireAdmin, [
  body('name').optional().isString().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail(),
  body('phone').optional().isMobilePhone('ko-KR'),
  body('level').optional().isString(),
  body('userType').optional().isIn(['consumer', 'merchant', 'admin']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { name, email, phone, level, userType } = req.body;
    const db = getDb();

    // Check if user exists
    const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined;
    if (!existingUser) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    // Check email uniqueness if changing email
    if (email && email !== existingUser.email) {
      const emailExists = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.params.id);
      if (emailExists) {
        throw new BadRequestError('Email already in use');
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (level !== undefined) {
      updates.push('level = ?');
      params.push(level);
    }
    if (userType !== undefined) {
      updates.push('user_type = ?');
      params.push(userType);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, previous_state, new_state)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'USER_UPDATED_BY_ADMIN',
      req.user!.userId,
      'admin',
      'user',
      req.params.id,
      'Admin updated user profile',
      JSON.stringify({ name: existingUser.name, email: existingUser.email, phone: existingUser.phone, level: existingUser.level }),
      JSON.stringify({ name, email, phone, level, userType })
    );

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow;

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        name: updatedUser.name,
        userType: updatedUser.user_type,
        level: updatedUser.level,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' } });
  }
});

/**
 * GET /api/users/:id/kyc
 * Get user KYC status details (admin only)
 */
router.get('/:id/kyc', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, kyc_verified, kyc_verified_at, did, created_at FROM users WHERE id = ?')
      .get(req.params.id) as {
        id: string;
        name: string;
        email: string;
        kyc_verified: number;
        kyc_verified_at: string | null;
        did: string | null;
        created_at: string;
      } | undefined;

    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    // Get KYC-related audit logs
    const kycLogs = db.prepare(`
      SELECT timestamp, action, description, actor_id
      FROM audit_logs
      WHERE target_id = ? AND action LIKE '%KYC%'
      ORDER BY timestamp DESC
      LIMIT 10
    `).all(req.params.id) as Array<{
      timestamp: string;
      action: string;
      description: string;
      actor_id: string;
    }>;

    res.json({
      success: true,
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        status: user.kyc_verified === 1 ? 'verified' : 'pending',
        verifiedAt: user.kyc_verified_at,
        did: user.did,
        registeredAt: user.created_at,
        history: kycLogs.map(log => ({
          timestamp: log.timestamp,
          action: log.action,
          description: log.description,
          actorId: log.actor_id,
        })),
      },
    });
  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get KYC status' } });
  }
});

/**
 * PUT /api/users/:id/kyc
 * Update user KYC status (admin only)
 */
router.put('/:id/kyc', authenticate, requireAdmin, [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('reason').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { status, reason } = req.body;
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined;
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    const isApproved = status === 'approved';
    const previousKycStatus = user.kyc_verified === 1 ? 'verified' : 'pending';

    if (isApproved) {
      db.prepare(`
        UPDATE users SET kyc_verified = 1, kyc_verified_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(req.params.id);
    } else {
      db.prepare(`
        UPDATE users SET kyc_verified = 0, kyc_verified_at = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(req.params.id);
    }

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, previous_state, new_state, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      isApproved ? 'USER_KYC_APPROVED' : 'USER_KYC_REJECTED',
      req.user!.userId,
      'admin',
      'user',
      req.params.id,
      isApproved ? 'Admin approved KYC verification' : `Admin rejected KYC verification: ${reason || 'No reason provided'}`,
      JSON.stringify({ kycVerified: previousKycStatus }),
      JSON.stringify({ kycVerified: isApproved ? 'verified' : 'rejected' }),
      reason ? JSON.stringify({ reason }) : null
    );

    res.json({
      success: true,
      data: {
        userId: req.params.id,
        status: isApproved ? 'verified' : 'rejected',
        updatedAt: new Date().toISOString(),
        reason: reason || null,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update KYC status error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update KYC status' } });
  }
});

/**
 * GET /api/users/:id/wallet
 * Get user's wallet info (admin only)
 */
router.get('/:id/wallet', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.params.id) as { id: string; name: string; email: string } | undefined;
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.params.id) as {
      id: string;
      user_id: string;
      balance: number;
      pending_balance: number;
      daily_limit: number;
      monthly_limit: number;
      total_limit: number;
      used_today: number;
      used_this_month: number;
      last_synced_at: string | null;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!wallet) {
      res.json({
        success: true,
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          wallet: null,
          message: 'No wallet found for this user',
        },
      });
      return;
    }

    // Get recent transactions count
    const transactionStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN type = 'payment' THEN 1 ELSE 0 END) as payments,
        SUM(CASE WHEN type = 'topup' THEN 1 ELSE 0 END) as topups,
        SUM(CASE WHEN type = 'refund' THEN 1 ELSE 0 END) as refunds
      FROM transactions WHERE user_id = ?
    `).get(req.params.id) as { total: number; payments: number; topups: number; refunds: number };

    res.json({
      success: true,
      data: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        wallet: {
          id: wallet.id,
          balance: wallet.balance,
          pendingBalance: wallet.pending_balance,
          limits: {
            daily: wallet.daily_limit,
            monthly: wallet.monthly_limit,
            total: wallet.total_limit,
          },
          usage: {
            today: wallet.used_today,
            thisMonth: wallet.used_this_month,
          },
          lastSyncedAt: wallet.last_synced_at,
          createdAt: wallet.created_at,
          updatedAt: wallet.updated_at,
        },
        transactionStats: {
          total: transactionStats.total,
          payments: transactionStats.payments || 0,
          topups: transactionStats.topups || 0,
          refunds: transactionStats.refunds || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get user wallet error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get user wallet' } });
  }
});

/**
 * GET /api/users/:id/transactions
 * Get user's transactions (admin only)
 */
router.get('/:id/transactions', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const type = req.query.type as string;
    const status = req.query.status as string;

    const db = getDb();

    const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(req.params.id) as { id: string; name: string } | undefined;
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    let whereClause = 'WHERE t.user_id = ?';
    const params: (string | number)[] = [req.params.id];

    if (type) {
      whereClause += ' AND t.type = ?';
      params.push(type);
    }

    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM transactions t ${whereClause}`).get(...params) as { count: number };

    const transactions = db.prepare(`
      SELECT
        t.id, t.tx_id, t.amount, t.type, t.status, t.approval_code,
        t.receipt_number, t.description, t.created_at,
        m.store_name as merchant_name
      FROM transactions t
      LEFT JOIN merchants m ON t.merchant_id = m.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as Array<{
      id: string;
      tx_id: string;
      amount: number;
      type: string;
      status: string;
      approval_code: string | null;
      receipt_number: string | null;
      description: string | null;
      created_at: string;
      merchant_name: string | null;
    }>;

    res.json({
      success: true,
      data: {
        userId: user.id,
        userName: user.name,
        transactions: transactions.map(tx => ({
          id: tx.id,
          txId: tx.tx_id,
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          approvalCode: tx.approval_code,
          receiptNumber: tx.receipt_number,
          description: tx.description,
          merchantName: tx.merchant_name,
          createdAt: tx.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get user transactions' } });
  }
});

/**
 * POST /api/users/:id/suspend
 * Suspend user account (admin only)
 */
router.post('/:id/suspend', authenticate, requireAdmin, [
  body('reason').notEmpty().withMessage('Reason is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { reason } = req.body;
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined;
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    // Prevent admin from suspending themselves
    if (req.params.id === req.user!.userId) {
      throw new BadRequestError('Cannot suspend your own account');
    }

    // Invalidate all active sessions
    const result = db.prepare('UPDATE sessions SET is_active = 0 WHERE user_id = ?').run(req.params.id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'USER_SUSPENDED',
      req.user!.userId,
      'admin',
      'user',
      req.params.id,
      `User account suspended: ${reason}`,
      JSON.stringify({ reason, sessionsRevoked: result.changes })
    );

    res.json({
      success: true,
      data: {
        userId: req.params.id,
        status: 'suspended',
        reason,
        sessionsRevoked: result.changes,
        suspendedAt: new Date().toISOString(),
        suspendedBy: req.user!.userId,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Suspend user error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to suspend user' } });
  }
});

/**
 * POST /api/users/:id/activate
 * Reactivate user account (admin only)
 */
router.post('/:id/activate', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined;
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'USER_ACTIVATED',
      req.user!.userId,
      'admin',
      'user',
      req.params.id,
      'User account reactivated by admin'
    );

    res.json({
      success: true,
      data: {
        userId: req.params.id,
        status: 'active',
        activatedAt: new Date().toISOString(),
        activatedBy: req.user!.userId,
      },
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to activate user' } });
  }
});

export default router;
