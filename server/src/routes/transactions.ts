/**
 * Transaction Routes
 * Payment processing, refunds, transaction history
 * NOTE: Actual payment execution by bank - we manage audit trail
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireUserType } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();

interface TransactionRow {
  id: string;
  tx_id: string;
  user_id: string;
  merchant_id: string | null;
  amount: number;
  type: string;
  status: string;
  approval_code: string | null;
  receipt_number: string | null;
  description: string | null;
  created_at: string;
}

interface MerchantRow {
  id: string;
  store_name: string;
}

interface WalletRow {
  id: string;
  balance: number;
}

/**
 * GET /api/transactions
 * Get transaction history with pagination
 */
router.get('/', authenticate, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['payment', 'topup', 'refund', 'transfer', 'all']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const type = req.query.type as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const db = getDb();
    let whereClause = 'WHERE t.user_id = ?';
    const params: (string | number)[] = [req.user!.userId];

    if (type && type !== 'all') {
      whereClause += ' AND t.type = ?';
      params.push(type);
    }

    if (startDate) {
      whereClause += ' AND t.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND t.created_at <= ?';
      params.push(endDate);
    }

    // Get total count
    const countResult = db.prepare(`SELECT COUNT(*) as count FROM transactions t ${whereClause}`).get(...params) as { count: number };
    const total = countResult.count;

    // Get transactions with pagination
    const transactions = db.prepare(`
      SELECT t.*, m.store_name as merchant_name
      FROM transactions t
      LEFT JOIN merchants m ON t.merchant_id = m.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (TransactionRow & { merchant_name?: string })[];

    res.json({
      success: true,
      data: {
        transactions: transactions.map(tx => ({
          id: tx.id,
          txId: tx.tx_id,
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          merchantId: tx.merchant_id,
          merchantName: tx.merchant_name,
          approvalCode: tx.approval_code,
          receiptNumber: tx.receipt_number,
          description: tx.description,
          createdAt: tx.created_at,
        })),
        page,
        size,
        totalElements: total,
        totalPages: Math.ceil(total / size),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get transactions' } });
  }
});

/**
 * GET /api/transactions/:id
 * Get transaction details
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const transaction = db.prepare(`
      SELECT t.*, m.store_name as merchant_name, u.name as user_name
      FROM transactions t
      LEFT JOIN merchants m ON t.merchant_id = m.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ? OR t.tx_id = ?
    `).get(req.params.id, req.params.id) as (TransactionRow & { merchant_name?: string; user_name?: string }) | undefined;

    if (!transaction) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
      return;
    }

    // Verify access
    if (transaction.user_id !== req.user!.userId && req.user!.userType !== 'admin') {
      if (req.user!.userType !== 'merchant' || transaction.merchant_id !== req.user!.merchantId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
        return;
      }
    }

    res.json({
      success: true,
      data: {
        id: transaction.id,
        txId: transaction.tx_id,
        userId: transaction.user_id,
        userName: transaction.user_name,
        merchantId: transaction.merchant_id,
        merchantName: transaction.merchant_name,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        approvalCode: transaction.approval_code,
        receiptNumber: transaction.receipt_number,
        description: transaction.description,
        createdAt: transaction.created_at,
      },
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get transaction' } });
  }
});

/**
 * POST /api/transactions/payment
 * Request payment (consumer to merchant)
 * NOTE: Actual payment executed by bank
 */
router.post('/payment', authenticate, requireUserType('consumer'), [
  body('merchantId').notEmpty().withMessage('Merchant ID is required'),
  body('amount').isInt({ min: 100 }).withMessage('Amount must be at least 100'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { merchantId, amount, description } = req.body;
    const db = getDb();

    // Verify merchant exists
    const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(merchantId) as MerchantRow | undefined;
    if (!merchant) {
      throw new NotFoundError('Merchant not found');
    }

    // Check wallet balance
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.userId) as WalletRow | undefined;
    if (!wallet || wallet.balance < amount) {
      throw new BadRequestError('Insufficient balance');
    }

    // Generate transaction IDs
    const txId = `PAY-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const transactionId = uuidv4();
    const approvalCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const receiptNumber = `R${Date.now()}`;

    // Create transaction record
    db.prepare(`
      INSERT INTO transactions (id, tx_id, user_id, merchant_id, amount, type, status, approval_code, receipt_number, description)
      VALUES (?, ?, ?, ?, ?, 'payment', 'pending', ?, ?, ?)
    `).run(transactionId, txId, req.user!.userId, merchantId, amount, approvalCode, receiptNumber, description || `Payment to ${merchant.store_name}`);

    // In production, this would call bank API
    // For demo, simulate immediate success

    // Update transaction status
    db.prepare(`
      UPDATE transactions SET status = 'completed', updated_at = datetime('now')
      WHERE id = ?
    `).run(transactionId);

    // Update wallet balance
    db.prepare(`
      UPDATE wallets SET balance = balance - ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(amount, req.user!.userId);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'PAYMENT_COMPLETED',
      req.user!.userId,
      'consumer',
      'transaction',
      transactionId,
      `Payment of ${amount.toLocaleString()} KRW to ${merchant.store_name}`,
      JSON.stringify({ merchantId, amount, approvalCode })
    );

    const updatedWallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(req.user!.userId) as { balance: number };

    res.json({
      success: true,
      data: {
        transactionId: txId,
        amount,
        merchantName: merchant.store_name,
        approvalCode,
        receiptNumber,
        newBalance: updatedWallet.balance,
        status: 'completed',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Payment error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Payment failed' } });
  }
});

/**
 * POST /api/transactions/refund
 * Request refund (merchant initiated)
 * NOTE: Actual refund executed by bank
 */
router.post('/refund', authenticate, requireUserType('merchant'), [
  body('originalTransactionId').notEmpty().withMessage('Original transaction ID is required'),
  body('amount').optional().isInt({ min: 100 }),
  body('reason').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { originalTransactionId, amount, reason } = req.body;
    const db = getDb();

    // Find original transaction
    const originalTx = db.prepare(`
      SELECT * FROM transactions
      WHERE (id = ? OR tx_id = ?) AND type = 'payment' AND status = 'completed'
    `).get(originalTransactionId, originalTransactionId) as TransactionRow | undefined;

    if (!originalTx) {
      throw new NotFoundError('Original transaction not found or not refundable');
    }

    // Verify merchant owns this transaction
    if (originalTx.merchant_id !== req.user!.merchantId) {
      throw new BadRequestError('Cannot refund transaction from another merchant');
    }

    const refundAmount = amount || originalTx.amount;
    if (refundAmount > originalTx.amount) {
      throw new BadRequestError('Refund amount exceeds original transaction amount');
    }

    // Create refund transaction
    const txId = `REF-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const transactionId = uuidv4();

    db.prepare(`
      INSERT INTO transactions (id, tx_id, user_id, merchant_id, amount, type, status, description)
      VALUES (?, ?, ?, ?, ?, 'refund', 'pending', ?)
    `).run(transactionId, txId, originalTx.user_id, originalTx.merchant_id, refundAmount, reason || `Refund for ${originalTx.tx_id}`);

    // In production, this would call bank API
    // For demo, simulate immediate success

    // Update refund transaction status
    db.prepare(`
      UPDATE transactions SET status = 'completed', updated_at = datetime('now')
      WHERE id = ?
    `).run(transactionId);

    // Restore user wallet balance
    db.prepare(`
      UPDATE wallets SET balance = balance + ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(refundAmount, originalTx.user_id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'REFUND_COMPLETED',
      req.user!.userId,
      'merchant',
      'transaction',
      transactionId,
      `Refund of ${refundAmount.toLocaleString()} KRW`,
      JSON.stringify({ originalTxId: originalTx.tx_id, refundAmount, reason })
    );

    res.json({
      success: true,
      data: {
        transactionId: txId,
        originalTransactionId: originalTx.tx_id,
        amount: refundAmount,
        status: 'completed',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Refund error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Refund failed' } });
  }
});

/**
 * GET /api/transactions/verify/:txId
 * Verify transaction status (for receipt validation)
 */
router.get('/verify/:txId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const transaction = db.prepare(`
      SELECT t.*, m.store_name as merchant_name
      FROM transactions t
      LEFT JOIN merchants m ON t.merchant_id = m.id
      WHERE t.tx_id = ?
    `).get(req.params.txId) as (TransactionRow & { merchant_name?: string }) | undefined;

    if (!transaction) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        txId: transaction.tx_id,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        merchantName: transaction.merchant_name,
        approvalCode: transaction.approval_code,
        receiptNumber: transaction.receipt_number,
        createdAt: transaction.created_at,
        verified: true,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Verify transaction error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Verification failed' } });
  }
});

export default router;
