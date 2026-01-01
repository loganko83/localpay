/**
 * Two-Factor Authentication Routes
 * TOTP setup, verification, and management
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError, BadRequestError, UnauthorizedError } from '../middleware/errorHandler.js';
import * as totpService from '../services/totp.js';
import logger from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/auth/2fa/status
 * Get 2FA status for current user
 */
router.get('/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const enabled = totpService.isTOTPEnabled(req.user!.userId);
    const backupCodesCount = enabled ? totpService.getBackupCodesCount(req.user!.userId) : 0;

    res.json({
      success: true,
      data: {
        enabled,
        backupCodesRemaining: backupCodesCount,
      },
    });
  } catch (error) {
    logger.error('2FA status check error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get 2FA status' },
    });
  }
});

/**
 * POST /api/auth/2fa/setup
 * Initiate 2FA setup
 */
router.post('/setup', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const email = req.user!.email || 'user@localpay.kr';
    const result = await totpService.setupTOTP(req.user!.userId, email);

    // Log audit event
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      '2FA_SETUP_INITIATED',
      req.user!.userId,
      req.user!.userType,
      'user',
      req.user!.userId,
      '2FA setup initiated',
      req.ip
    );

    res.json({
      success: true,
      data: {
        qrCodeDataUrl: result.qrCodeDataUrl,
        secret: result.secret, // For manual entry
        backupCodes: result.backupCodes,
        message: 'Scan the QR code with your authenticator app, then verify with a code',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to setup 2FA';
    logger.error('2FA setup error', { error, userId: req.user!.userId });

    if (message.includes('already enabled')) {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_ENABLED', message },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to setup 2FA' },
    });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verify TOTP and enable 2FA
 */
router.post('/verify', [
  body('token').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Token must be 6 digits'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { token } = req.body;
    const success = totpService.verifyAndEnableTOTP(req.user!.userId, token);

    if (!success) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid verification code' },
      });
      return;
    }

    // Log audit event
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      '2FA_ENABLED',
      req.user!.userId,
      req.user!.userType,
      'user',
      req.user!.userId,
      '2FA enabled successfully',
      req.ip
    );

    res.json({
      success: true,
      message: 'Two-factor authentication has been enabled',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }

    const message = error instanceof Error ? error.message : 'Failed to verify 2FA';
    logger.error('2FA verification error', { error, userId: req.user!.userId });

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message },
    });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA
 */
router.post('/disable', [
  body('password').notEmpty().withMessage('Password is required'),
  body('token').optional().isLength({ min: 6, max: 8 }).withMessage('Token must be 6-8 characters'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { password, token } = req.body;
    const db = getDb();

    // Verify password
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.userId) as { password_hash: string } | undefined;
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    // If 2FA is enabled, verify token
    if (totpService.isTOTPEnabled(req.user!.userId)) {
      if (!token) {
        res.status(400).json({
          success: false,
          error: { code: 'TOKEN_REQUIRED', message: '2FA token is required to disable' },
        });
        return;
      }

      const verification = totpService.verifyTOTPForLogin(req.user!.userId, token);
      if (!verification.valid) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid 2FA token' },
        });
        return;
      }
    }

    // Disable 2FA
    totpService.disableTOTP(req.user!.userId, password);

    // Log audit event
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      '2FA_DISABLED',
      req.user!.userId,
      req.user!.userType,
      'user',
      req.user!.userId,
      '2FA disabled by user',
      req.ip
    );

    res.json({
      success: true,
      message: 'Two-factor authentication has been disabled',
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof UnauthorizedError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }

    logger.error('2FA disable error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to disable 2FA' },
    });
  }
});

/**
 * POST /api/auth/2fa/backup-codes
 * Regenerate backup codes
 */
router.post('/backup-codes', [
  body('password').notEmpty().withMessage('Password is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { password } = req.body;
    const db = getDb();

    // Verify password
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.userId) as { password_hash: string } | undefined;
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    // Regenerate backup codes
    const backupCodes = totpService.regenerateBackupCodes(req.user!.userId);

    // Log audit event
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      '2FA_BACKUP_CODES_REGENERATED',
      req.user!.userId,
      req.user!.userType,
      'user',
      req.user!.userId,
      'Backup codes regenerated',
      req.ip
    );

    res.json({
      success: true,
      data: {
        backupCodes,
        message: 'New backup codes generated. Old codes are no longer valid.',
      },
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof UnauthorizedError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }

    const message = error instanceof Error ? error.message : 'Failed to regenerate backup codes';
    logger.error('Backup codes regeneration error', { error, userId: req.user!.userId });

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message },
    });
  }
});

export default router;
