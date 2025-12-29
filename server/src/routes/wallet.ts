/**
 * Wallet Routes
 * Balance display, charge requests, transaction history
 * NOTE: Actual funds managed by bank - we only display values
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();

interface WalletRow {
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
}

/**
 * GET /api/wallet/balance
 * Get current wallet balance (display value from last bank sync)
 */
router.get('/balance', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.userId) as WalletRow | undefined;

    if (!wallet) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Wallet not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        pendingBalance: wallet.pending_balance,
        chargeLimit: {
          daily: wallet.daily_limit,
          monthly: wallet.monthly_limit,
          total: wallet.total_limit,
          usedToday: wallet.used_today,
          usedThisMonth: wallet.used_this_month,
        },
        lastSyncedAt: wallet.last_synced_at,
      },
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get balance' } });
  }
});

/**
 * POST /api/wallet/sync
 * Sync wallet balance with bank API
 * NOTE: In production, this calls the actual bank API
 */
router.post('/sync', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // In production, this would call the bank API
    // For now, we simulate a bank response
    const mockBankBalance = Math.floor(Math.random() * 500000) + 50000;

    // Update wallet with bank-provided balance
    db.prepare(`
      UPDATE wallets
      SET balance = ?, last_synced_at = datetime('now'), updated_at = datetime('now')
      WHERE user_id = ?
    `).run(mockBankBalance, req.user!.userId);

    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.userId) as WalletRow;

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        lastSyncedAt: wallet.last_synced_at,
        message: 'Balance synced with bank',
      },
    });
  } catch (error) {
    console.error('Sync balance error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sync balance' } });
  }
});

/**
 * POST /api/wallet/charge
 * Request balance charge (top-up)
 * NOTE: Actual charge executed by bank - we only record the request
 */
router.post('/charge', authenticate, [
  body('amount').isInt({ min: 1000, max: 3000000 }).withMessage('Amount must be between 1,000 and 3,000,000'),
  body('bankAccountId').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { amount } = req.body;
    const db = getDb();

    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.userId) as WalletRow | undefined;

    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    // Check limits
    if (wallet.used_today + amount > wallet.daily_limit) {
      throw new BadRequestError('Daily charge limit exceeded');
    }

    if (wallet.used_this_month + amount > wallet.monthly_limit) {
      throw new BadRequestError('Monthly charge limit exceeded');
    }

    if (wallet.balance + amount > wallet.total_limit) {
      throw new BadRequestError('Maximum balance limit exceeded');
    }

    // Create transaction record (pending - awaiting bank confirmation)
    const txId = `CHG-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const transactionId = uuidv4();

    db.prepare(`
      INSERT INTO transactions (id, tx_id, user_id, amount, type, status, description)
      VALUES (?, ?, ?, ?, 'topup', 'pending', ?)
    `).run(transactionId, txId, req.user!.userId, amount, 'Balance charge request');

    // In production, this would call bank API to initiate charge
    // For demo, we simulate immediate success

    // Update transaction status
    db.prepare(`
      UPDATE transactions SET status = 'completed', updated_at = datetime('now')
      WHERE id = ?
    `).run(transactionId);

    // Update wallet balance (simulating bank response)
    db.prepare(`
      UPDATE wallets
      SET balance = balance + ?,
          used_today = used_today + ?,
          used_this_month = used_this_month + ?,
          last_synced_at = datetime('now'),
          updated_at = datetime('now')
      WHERE user_id = ?
    `).run(amount, amount, amount, req.user!.userId);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'BALANCE_CHARGED',
      req.user!.userId,
      req.user!.userType,
      'wallet',
      wallet.id,
      `Charged ${amount.toLocaleString()} KRW`
    );

    const updatedWallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.userId) as WalletRow;

    res.json({
      success: true,
      data: {
        transactionId: txId,
        amount,
        newBalance: updatedWallet.balance,
        status: 'completed',
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Charge error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Charge request failed' } });
  }
});

/**
 * GET /api/wallet/limits
 * Get wallet charge limits and usage
 */
router.get('/limits', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.userId) as WalletRow | undefined;

    if (!wallet) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Wallet not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        daily: {
          limit: wallet.daily_limit,
          used: wallet.used_today,
          remaining: wallet.daily_limit - wallet.used_today,
        },
        monthly: {
          limit: wallet.monthly_limit,
          used: wallet.used_this_month,
          remaining: wallet.monthly_limit - wallet.used_this_month,
        },
        total: {
          limit: wallet.total_limit,
          current: wallet.balance,
          remaining: wallet.total_limit - wallet.balance,
        },
      },
    });
  } catch (error) {
    console.error('Get limits error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get limits' } });
  }
});

export default router;
