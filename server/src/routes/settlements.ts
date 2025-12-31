/**
 * Settlement Routes
 * Settlement management, approval workflows, batch processing
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, param, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin, requireMerchant, requireUserType } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';

const router = Router();

interface SettlementRow {
  id: string;
  merchant_id: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  total_refunds: number;
  fee_rate: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  scheduled_date: string | null;
  completed_date: string | null;
  bank_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SettlementItemRow {
  id: string;
  settlement_id: string;
  transaction_id: string;
  amount: number;
  type: string;
  created_at: string;
}

interface MerchantRow {
  id: string;
  store_name: string;
  business_number: string;
}

interface TransactionRow {
  id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
  merchant_id: string;
}

// ==================== Merchant Settlement Routes ====================

/**
 * GET /api/settlements/merchant
 * Get merchant's own settlements
 */
router.get('/merchant', authenticate, requireMerchant, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'processing', 'completed', 'failed']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const status = req.query.status as string;

    const db = getDb();
    let whereClause = 'WHERE merchant_id = ?';
    const params: (string | number)[] = [req.user!.merchantId!];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM settlements ${whereClause}`).get(...params) as { count: number };

    const settlements = db.prepare(`
      SELECT s.*, m.store_name as merchant_name
      FROM settlements s
      LEFT JOIN merchants m ON s.merchant_id = m.id
      ${whereClause}
      ORDER BY s.period_end DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (SettlementRow & { merchant_name?: string })[];

    res.json({
      success: true,
      data: {
        settlements: settlements.map(s => ({
          id: s.id,
          merchantId: s.merchant_id,
          merchantName: s.merchant_name,
          periodStart: s.period_start,
          periodEnd: s.period_end,
          totalSales: s.total_sales,
          totalRefunds: s.total_refunds,
          feeRate: s.fee_rate,
          feeAmount: s.fee_amount,
          netAmount: s.net_amount,
          status: s.status,
          scheduledDate: s.scheduled_date,
          completedDate: s.completed_date,
          bankReference: s.bank_reference,
          notes: s.notes,
          createdAt: s.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('Get merchant settlements error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get settlements' } });
  }
});

/**
 * GET /api/settlements/pending
 * Get pending settlements (admin only)
 */
router.get('/pending', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const settlements = db.prepare(`
      SELECT s.*, m.store_name as merchant_name, m.business_number
      FROM settlements s
      LEFT JOIN merchants m ON s.merchant_id = m.id
      WHERE s.status = 'pending'
      ORDER BY s.scheduled_date ASC, s.created_at ASC
    `).all() as (SettlementRow & { merchant_name?: string; business_number?: string })[];

    res.json({
      success: true,
      data: {
        settlements: settlements.map(s => ({
          id: s.id,
          merchantId: s.merchant_id,
          merchantName: s.merchant_name,
          businessNumber: s.business_number,
          periodStart: s.period_start,
          periodEnd: s.period_end,
          totalSales: s.total_sales,
          totalRefunds: s.total_refunds,
          feeRate: s.fee_rate,
          feeAmount: s.fee_amount,
          netAmount: s.net_amount,
          status: s.status,
          scheduledDate: s.scheduled_date,
          notes: s.notes,
          createdAt: s.created_at,
        })),
        totalCount: settlements.length,
        totalAmount: settlements.reduce((sum, s) => sum + s.net_amount, 0),
      },
    });
  } catch (error) {
    console.error('Get pending settlements error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get pending settlements' } });
  }
});

/**
 * GET /api/settlements/calendar
 * Get calendar view data by month (admin only)
 */
router.get('/calendar', authenticate, requireAdmin, [
  query('year').isInt({ min: 2020, max: 2100 }).withMessage('Valid year is required'),
  query('month').isInt({ min: 1, max: 12 }).withMessage('Valid month is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const year = parseInt(req.query.year as string);
    const month = parseInt(req.query.month as string);

    const db = getDb();
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    // Get settlements scheduled for this month
    const settlements = db.prepare(`
      SELECT s.*, m.store_name as merchant_name
      FROM settlements s
      LEFT JOIN merchants m ON s.merchant_id = m.id
      WHERE s.scheduled_date >= ? AND s.scheduled_date < ?
      ORDER BY s.scheduled_date ASC
    `).all(startDate, endDate) as (SettlementRow & { merchant_name?: string })[];

    // Group by date
    const calendarData: Record<string, {
      date: string;
      settlements: Array<{
        id: string;
        merchantName: string;
        netAmount: number;
        status: string;
      }>;
      totalAmount: number;
      count: number;
    }> = {};

    settlements.forEach(s => {
      const date = s.scheduled_date!.split('T')[0];
      if (!calendarData[date]) {
        calendarData[date] = {
          date,
          settlements: [],
          totalAmount: 0,
          count: 0,
        };
      }
      calendarData[date].settlements.push({
        id: s.id,
        merchantName: s.merchant_name || 'Unknown',
        netAmount: s.net_amount,
        status: s.status,
      });
      calendarData[date].totalAmount += s.net_amount;
      calendarData[date].count += 1;
    });

    // Summary stats for the month
    const statusStats = db.prepare(`
      SELECT status, COUNT(*) as count, SUM(net_amount) as total
      FROM settlements
      WHERE scheduled_date >= ? AND scheduled_date < ?
      GROUP BY status
    `).all(startDate, endDate) as { status: string; count: number; total: number }[];

    res.json({
      success: true,
      data: {
        year,
        month,
        days: Object.values(calendarData),
        summary: {
          total: settlements.length,
          pending: statusStats.find(s => s.status === 'pending')?.count || 0,
          processing: statusStats.find(s => s.status === 'processing')?.count || 0,
          completed: statusStats.find(s => s.status === 'completed')?.count || 0,
          failed: statusStats.find(s => s.status === 'failed')?.count || 0,
          totalAmount: settlements.reduce((sum, s) => sum + s.net_amount, 0),
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get calendar data error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get calendar data' } });
  }
});

// ==================== Main Settlement Routes ====================

/**
 * GET /api/settlements
 * List settlements with pagination and filters (admin only)
 */
router.get('/', authenticate, requireAdmin, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'processing', 'completed', 'failed']),
  query('merchantId').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const status = req.query.status as string;
    const merchantId = req.query.merchantId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (status) {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }

    if (merchantId) {
      whereClause += ' AND s.merchant_id = ?';
      params.push(merchantId);
    }

    if (startDate) {
      whereClause += ' AND s.period_start >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND s.period_end <= ?';
      params.push(endDate);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as count
      FROM settlements s
      ${whereClause}
    `).get(...params) as { count: number };

    const settlements = db.prepare(`
      SELECT s.*, m.store_name as merchant_name, m.business_number
      FROM settlements s
      LEFT JOIN merchants m ON s.merchant_id = m.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (SettlementRow & { merchant_name?: string; business_number?: string })[];

    res.json({
      success: true,
      data: {
        settlements: settlements.map(s => ({
          id: s.id,
          merchantId: s.merchant_id,
          merchantName: s.merchant_name,
          businessNumber: s.business_number,
          periodStart: s.period_start,
          periodEnd: s.period_end,
          totalSales: s.total_sales,
          totalRefunds: s.total_refunds,
          feeRate: s.fee_rate,
          feeAmount: s.fee_amount,
          netAmount: s.net_amount,
          status: s.status,
          scheduledDate: s.scheduled_date,
          completedDate: s.completed_date,
          bankReference: s.bank_reference,
          notes: s.notes,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('List settlements error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list settlements' } });
  }
});

/**
 * GET /api/settlements/:id
 * Get settlement details with items
 */
router.get('/:id', authenticate, requireUserType('admin', 'merchant'), [
  param('id').isUUID().withMessage('Valid settlement ID is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const db = getDb();
    const settlement = db.prepare(`
      SELECT s.*, m.store_name as merchant_name, m.business_number, m.email as merchant_email
      FROM settlements s
      LEFT JOIN merchants m ON s.merchant_id = m.id
      WHERE s.id = ?
    `).get(req.params.id) as (SettlementRow & { merchant_name?: string; business_number?: string; merchant_email?: string }) | undefined;

    if (!settlement) {
      throw new NotFoundError('Settlement not found');
    }

    // Check access - merchants can only view their own settlements
    if (req.user!.userType === 'merchant' && settlement.merchant_id !== req.user!.merchantId) {
      throw new ForbiddenError('Access denied');
    }

    // Get settlement items with transaction details
    const items = db.prepare(`
      SELECT si.*, t.tx_id, t.description as transaction_description, t.created_at as transaction_date
      FROM settlement_items si
      LEFT JOIN transactions t ON si.transaction_id = t.id
      WHERE si.settlement_id = ?
      ORDER BY t.created_at DESC
    `).all(req.params.id) as (SettlementItemRow & { tx_id?: string; transaction_description?: string; transaction_date?: string })[];

    res.json({
      success: true,
      data: {
        id: settlement.id,
        merchantId: settlement.merchant_id,
        merchantName: settlement.merchant_name,
        businessNumber: settlement.business_number,
        merchantEmail: settlement.merchant_email,
        periodStart: settlement.period_start,
        periodEnd: settlement.period_end,
        totalSales: settlement.total_sales,
        totalRefunds: settlement.total_refunds,
        feeRate: settlement.fee_rate,
        feeAmount: settlement.fee_amount,
        netAmount: settlement.net_amount,
        status: settlement.status,
        scheduledDate: settlement.scheduled_date,
        completedDate: settlement.completed_date,
        bankReference: settlement.bank_reference,
        notes: settlement.notes,
        createdAt: settlement.created_at,
        updatedAt: settlement.updated_at,
        items: items.map(item => ({
          id: item.id,
          transactionId: item.transaction_id,
          txId: item.tx_id,
          amount: item.amount,
          type: item.type,
          description: item.transaction_description,
          transactionDate: item.transaction_date,
        })),
        itemCount: items.length,
        salesCount: items.filter(i => i.type === 'sale').length,
        refundCount: items.filter(i => i.type === 'refund').length,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ForbiddenError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get settlement error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get settlement' } });
  }
});

/**
 * POST /api/settlements/:id/approve
 * Approve settlement (admin only)
 */
router.post('/:id/approve', authenticate, requireAdmin, [
  param('id').isUUID().withMessage('Valid settlement ID is required'),
  body('bankReference').optional().isString(),
  body('notes').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { bankReference, notes } = req.body;
    const db = getDb();

    const settlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id) as SettlementRow | undefined;

    if (!settlement) {
      throw new NotFoundError('Settlement not found');
    }

    if (settlement.status !== 'pending') {
      throw new BadRequestError(`Cannot approve settlement with status: ${settlement.status}`);
    }

    // Update settlement status to processing (bank will complete it)
    const updates: string[] = [
      'status = ?',
      'updated_at = datetime(\'now\')',
    ];
    const params: (string | null)[] = ['processing'];

    if (bankReference) {
      updates.push('bank_reference = ?');
      params.push(bankReference);
    }

    if (notes) {
      updates.push('notes = ?');
      params.push(notes);
    }

    params.push(req.params.id);

    db.prepare(`UPDATE settlements SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Log audit action
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'SETTLEMENT_APPROVED',
      req.user!.userId,
      'admin',
      'settlement',
      req.params.id,
      `Settlement approved for merchant ${settlement.merchant_id}. Net amount: ${settlement.net_amount}`,
      JSON.stringify({ netAmount: settlement.net_amount, bankReference, notes })
    );

    const updatedSettlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id) as SettlementRow;

    res.json({
      success: true,
      data: {
        id: updatedSettlement.id,
        status: updatedSettlement.status,
        bankReference: updatedSettlement.bank_reference,
        notes: updatedSettlement.notes,
        updatedAt: updatedSettlement.updated_at,
      },
      message: 'Settlement approved and sent to bank for processing',
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Approve settlement error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve settlement' } });
  }
});

/**
 * POST /api/settlements/:id/reject
 * Reject settlement (admin only)
 */
router.post('/:id/reject', authenticate, requireAdmin, [
  param('id').isUUID().withMessage('Valid settlement ID is required'),
  body('reason').notEmpty().withMessage('Rejection reason is required'),
  body('notes').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { reason, notes } = req.body;
    const db = getDb();

    const settlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id) as SettlementRow | undefined;

    if (!settlement) {
      throw new NotFoundError('Settlement not found');
    }

    if (settlement.status !== 'pending') {
      throw new BadRequestError(`Cannot reject settlement with status: ${settlement.status}`);
    }

    // Update settlement status to failed
    const rejectNotes = notes ? `${reason}. ${notes}` : reason;
    db.prepare(`
      UPDATE settlements
      SET status = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run('failed', rejectNotes, req.params.id);

    // Log audit action
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'SETTLEMENT_REJECTED',
      req.user!.userId,
      'admin',
      'settlement',
      req.params.id,
      `Settlement rejected for merchant ${settlement.merchant_id}. Reason: ${reason}`,
      JSON.stringify({ reason, notes, netAmount: settlement.net_amount })
    );

    const updatedSettlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id) as SettlementRow;

    res.json({
      success: true,
      data: {
        id: updatedSettlement.id,
        status: updatedSettlement.status,
        notes: updatedSettlement.notes,
        updatedAt: updatedSettlement.updated_at,
      },
      message: 'Settlement rejected',
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Reject settlement error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reject settlement' } });
  }
});

/**
 * POST /api/settlements/batch
 * Batch create settlements for a period (admin only)
 */
router.post('/batch', authenticate, requireAdmin, [
  body('periodStart').isISO8601().withMessage('Valid period start date is required'),
  body('periodEnd').isISO8601().withMessage('Valid period end date is required'),
  body('feeRate').optional().isFloat({ min: 0, max: 1 }).withMessage('Fee rate must be between 0 and 1'),
  body('scheduledDate').optional().isISO8601(),
  body('merchantIds').optional().isArray(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { periodStart, periodEnd, feeRate = 0.02, scheduledDate, merchantIds } = req.body;
    const db = getDb();

    // Validate date range
    if (new Date(periodStart) >= new Date(periodEnd)) {
      throw new BadRequestError('Period start must be before period end');
    }

    // Get merchants to process
    let merchantQuery = 'SELECT id, store_name FROM merchants WHERE is_verified = 1';
    const merchantParams: string[] = [];
    if (merchantIds && merchantIds.length > 0) {
      merchantQuery += ` AND id IN (${merchantIds.map(() => '?').join(',')})`;
      merchantParams.push(...merchantIds);
    }

    const merchants = db.prepare(merchantQuery).all(...merchantParams) as MerchantRow[];

    if (merchants.length === 0) {
      throw new BadRequestError('No verified merchants found');
    }

    const createdSettlements: Array<{
      id: string;
      merchantId: string;
      merchantName: string;
      totalSales: number;
      totalRefunds: number;
      netAmount: number;
    }> = [];
    let skippedCount = 0;

    // Process each merchant
    for (const merchant of merchants) {
      // Get completed transactions for the period
      const transactions = db.prepare(`
        SELECT id, amount, type
        FROM transactions
        WHERE merchant_id = ?
          AND status = 'completed'
          AND type IN ('payment', 'refund')
          AND created_at >= ?
          AND created_at < ?
      `).all(merchant.id, periodStart, periodEnd) as TransactionRow[];

      if (transactions.length === 0) {
        skippedCount++;
        continue;
      }

      // Calculate totals
      let totalSales = 0;
      let totalRefunds = 0;

      transactions.forEach(tx => {
        if (tx.type === 'payment') {
          totalSales += tx.amount;
        } else if (tx.type === 'refund') {
          totalRefunds += tx.amount;
        }
      });

      const netBeforeFee = totalSales - totalRefunds;
      if (netBeforeFee <= 0) {
        skippedCount++;
        continue;
      }

      const feeAmount = Math.round(netBeforeFee * feeRate);
      const netAmount = netBeforeFee - feeAmount;

      // Create settlement
      const settlementId = uuidv4();
      db.prepare(`
        INSERT INTO settlements (
          id, merchant_id, period_start, period_end,
          total_sales, total_refunds, fee_rate, fee_amount, net_amount,
          status, scheduled_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(
        settlementId,
        merchant.id,
        periodStart,
        periodEnd,
        totalSales,
        totalRefunds,
        feeRate,
        feeAmount,
        netAmount,
        scheduledDate || null
      );

      // Create settlement items
      const insertItem = db.prepare(`
        INSERT INTO settlement_items (id, settlement_id, transaction_id, amount, type)
        VALUES (?, ?, ?, ?, ?)
      `);

      transactions.forEach(tx => {
        insertItem.run(
          uuidv4(),
          settlementId,
          tx.id,
          tx.amount,
          tx.type === 'payment' ? 'sale' : 'refund'
        );
      });

      createdSettlements.push({
        id: settlementId,
        merchantId: merchant.id,
        merchantName: merchant.store_name,
        totalSales,
        totalRefunds,
        netAmount,
      });
    }

    // Log audit action
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'SETTLEMENT_BATCH_CREATED',
      req.user!.userId,
      'admin',
      'settlement',
      'batch',
      `Batch created ${createdSettlements.length} settlements for period ${periodStart} to ${periodEnd}`,
      JSON.stringify({
        periodStart,
        periodEnd,
        feeRate,
        merchantCount: merchants.length,
        createdCount: createdSettlements.length,
        skippedCount,
        totalAmount: createdSettlements.reduce((sum, s) => sum + s.netAmount, 0),
      })
    );

    res.status(201).json({
      success: true,
      data: {
        settlements: createdSettlements,
        summary: {
          periodStart,
          periodEnd,
          feeRate,
          merchantsProcessed: merchants.length,
          settlementsCreated: createdSettlements.length,
          merchantsSkipped: skippedCount,
          totalAmount: createdSettlements.reduce((sum, s) => sum + s.netAmount, 0),
        },
      },
      message: `Created ${createdSettlements.length} settlements for ${merchants.length} merchants`,
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Batch create settlements error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create settlements' } });
  }
});

export default router;
