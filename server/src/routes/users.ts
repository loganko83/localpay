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
 * List all users (admin only)
 */
router.get('/', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const type = req.query.type as string;
    const search = req.query.search as string;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (type) {
      whereClause += ' AND user_type = ?';
      params.push(type);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).get(...params) as { count: number };

    const users = db.prepare(`
      SELECT id, email, phone, name, user_type, avatar_url, kyc_verified, level, created_at
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
          level: u.level,
          createdAt: u.created_at,
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
 * GET /api/users/:id
 * Get user by ID (admin only)
 */
router.get('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined;

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
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' } });
  }
});

export default router;
