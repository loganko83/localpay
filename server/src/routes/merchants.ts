/**
 * Merchant Routes
 * Merchant management, employees, settlements
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireMerchant, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';

const router = Router();

interface MerchantRow {
  id: string;
  user_id: string;
  store_name: string;
  business_number: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  image_url: string | null;
  rating: number;
  review_count: number;
  is_verified: number;
  is_open: number;
  merchant_did: string | null;
  created_at: string;
}

interface EmployeeRow {
  id: string;
  merchant_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  permissions: string | null;
  status: string;
  last_active_at: string | null;
  created_at: string;
}

interface TransactionRow {
  amount: number;
  type: string;
  created_at: string;
}

/**
 * GET /api/merchants
 * List merchants (public)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const verified = req.query.verified as string;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      whereClause += ' AND (store_name LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    if (verified === 'true') {
      whereClause += ' AND is_verified = 1';
    }

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM merchants ${whereClause}`).get(...params) as { count: number };

    const merchants = db.prepare(`
      SELECT * FROM merchants ${whereClause}
      ORDER BY rating DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as MerchantRow[];

    res.json({
      success: true,
      data: {
        merchants: merchants.map(m => ({
          id: m.id,
          storeName: m.store_name,
          category: m.category,
          description: m.description,
          address: m.address,
          phone: m.phone,
          imageUrl: m.image_url,
          rating: m.rating,
          reviewCount: m.review_count,
          isVerified: m.is_verified === 1,
          isOpen: m.is_open === 1,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('List merchants error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list merchants' } });
  }
});

/**
 * GET /api/merchants/:id
 * Get merchant details (public)
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(req.params.id) as MerchantRow | undefined;

    if (!merchant) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Merchant not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        id: merchant.id,
        storeName: merchant.store_name,
        businessNumber: merchant.business_number,
        category: merchant.category,
        description: merchant.description,
        address: merchant.address,
        phone: merchant.phone,
        email: merchant.email,
        imageUrl: merchant.image_url,
        rating: merchant.rating,
        reviewCount: merchant.review_count,
        isVerified: merchant.is_verified === 1,
        isOpen: merchant.is_open === 1,
        createdAt: merchant.created_at,
      },
    });
  } catch (error) {
    console.error('Get merchant error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get merchant' } });
  }
});

/**
 * PUT /api/merchants/profile
 * Update merchant profile (merchant only)
 */
router.put('/profile', authenticate, requireMerchant, [
  body('storeName').optional().isString().isLength({ min: 2, max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('address').optional().isString(),
  body('phone').optional().isString(),
  body('email').optional().isEmail(),
  body('imageUrl').optional().isURL(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { storeName, description, address, phone, email, imageUrl } = req.body;
    const db = getDb();

    // Build update query
    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (storeName !== undefined) {
      updates.push('store_name = ?');
      params.push(storeName);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (imageUrl !== undefined) {
      updates.push('image_url = ?');
      params.push(imageUrl);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(req.user!.merchantId!);

    db.prepare(`UPDATE merchants SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(req.user!.merchantId!) as MerchantRow;

    res.json({
      success: true,
      data: {
        id: merchant.id,
        storeName: merchant.store_name,
        description: merchant.description,
        address: merchant.address,
        phone: merchant.phone,
        email: merchant.email,
        imageUrl: merchant.image_url,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update merchant profile error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' } });
  }
});

/**
 * PUT /api/merchants/status
 * Toggle open/closed status
 */
router.put('/status', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { isOpen } = req.body;
    const db = getDb();

    db.prepare('UPDATE merchants SET is_open = ?, updated_at = datetime(\'now\') WHERE id = ?').run(isOpen ? 1 : 0, req.user!.merchantId!);

    res.json({
      success: true,
      data: { isOpen },
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update status' } });
  }
});

// ==================== Employee Management ====================

/**
 * GET /api/merchants/employees
 * List employees (merchant only)
 */
router.get('/employees', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const employees = db.prepare(`
      SELECT * FROM employees WHERE merchant_id = ?
      ORDER BY role, name
    `).all(req.user!.merchantId!) as EmployeeRow[];

    res.json({
      success: true,
      data: employees.map(e => ({
        id: e.id,
        name: e.name,
        email: e.email,
        phone: e.phone,
        role: e.role,
        permissions: e.permissions ? JSON.parse(e.permissions) : [],
        status: e.status,
        lastActiveAt: e.last_active_at,
        createdAt: e.created_at,
      })),
    });
  } catch (error) {
    console.error('List employees error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list employees' } });
  }
});

/**
 * POST /api/merchants/employees
 * Add employee (merchant only)
 */
router.post('/employees', authenticate, requireMerchant, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail(),
  body('phone').optional().isMobilePhone('ko-KR'),
  body('role').isIn(['manager', 'cashier']).withMessage('Invalid role'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { name, email, phone, role, permissions } = req.body;
    const db = getDb();

    const employeeId = uuidv4();
    db.prepare(`
      INSERT INTO employees (id, merchant_id, name, email, phone, role, permissions, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(employeeId, req.user!.merchantId!, name, email || null, phone || null, role, permissions ? JSON.stringify(permissions) : null);

    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId) as EmployeeRow;

    res.status(201).json({
      success: true,
      data: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        status: employee.status,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Add employee error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to add employee' } });
  }
});

/**
 * DELETE /api/merchants/employees/:id
 * Remove employee (merchant only)
 */
router.delete('/employees/:id', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM employees WHERE id = ? AND merchant_id = ?').run(req.params.id, req.user!.merchantId!);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    res.json({ success: true, message: 'Employee removed' });
  } catch (error) {
    console.error('Remove employee error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove employee' } });
  }
});

// ==================== Settlement Data ====================

/**
 * GET /api/merchants/settlements
 * Get settlement summary (merchant only)
 */
router.get('/settlements', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const period = req.query.period as string || 'current';
    const db = getDb();

    // Get transactions for the period
    let dateFilter = '';
    if (period === 'current') {
      dateFilter = "AND created_at >= date('now', 'start of month')";
    } else if (period === 'last') {
      dateFilter = "AND created_at >= date('now', 'start of month', '-1 month') AND created_at < date('now', 'start of month')";
    }

    const transactions = db.prepare(`
      SELECT amount, type, created_at FROM transactions
      WHERE merchant_id = ? AND status = 'completed' ${dateFilter}
    `).all(req.user!.merchantId!) as TransactionRow[];

    // Calculate summary
    let totalSales = 0;
    let totalRefunds = 0;
    let transactionCount = 0;

    transactions.forEach(tx => {
      if (tx.type === 'payment') {
        totalSales += tx.amount;
        transactionCount++;
      } else if (tx.type === 'refund') {
        totalRefunds += tx.amount;
      }
    });

    const netAmount = totalSales - totalRefunds;
    const platformFee = netAmount * 0.025; // 2.5% platform fee
    const settlementAmount = netAmount - platformFee;

    res.json({
      success: true,
      data: {
        period,
        totalSales,
        totalRefunds,
        netAmount,
        platformFee,
        platformFeeRate: 0.025,
        settlementAmount,
        transactionCount,
        status: 'processing',
      },
    });
  } catch (error) {
    console.error('Get settlements error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get settlements' } });
  }
});

/**
 * GET /api/merchants/dashboard
 * Get merchant dashboard stats
 */
router.get('/dashboard', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Today's stats
    const todayStats = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as sales,
        COUNT(CASE WHEN type = 'payment' THEN 1 END) as count
      FROM transactions
      WHERE merchant_id = ? AND status = 'completed' AND date(created_at) = date('now')
    `).get(req.user!.merchantId!) as { sales: number; count: number };

    // This month's stats
    const monthStats = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as sales,
        COUNT(CASE WHEN type = 'payment' THEN 1 END) as count
      FROM transactions
      WHERE merchant_id = ? AND status = 'completed' AND created_at >= date('now', 'start of month')
    `).get(req.user!.merchantId!) as { sales: number; count: number };

    // Recent transactions
    const recentTransactions = db.prepare(`
      SELECT t.*, u.name as customer_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.merchant_id = ? AND t.status = 'completed'
      ORDER BY t.created_at DESC
      LIMIT 5
    `).all(req.user!.merchantId!);

    res.json({
      success: true,
      data: {
        today: {
          sales: todayStats.sales,
          transactionCount: todayStats.count,
        },
        thisMonth: {
          sales: monthStats.sales,
          transactionCount: monthStats.count,
        },
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get dashboard' } });
  }
});

// ==================== Admin Routes ====================

/**
 * POST /api/merchants/:id/verify
 * Verify merchant (admin only)
 */
router.post('/:id/verify', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(req.params.id) as MerchantRow | undefined;

    if (!merchant) {
      throw new NotFoundError('Merchant not found');
    }

    db.prepare('UPDATE merchants SET is_verified = 1, updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'MERCHANT_VERIFIED',
      req.user!.userId,
      'admin',
      'merchant',
      req.params.id,
      `Merchant ${merchant.store_name} verified`
    );

    res.json({ success: true, message: 'Merchant verified' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Verify merchant error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to verify merchant' } });
  }
});

/**
 * POST /api/merchants/:id/suspend
 * Suspend merchant (admin only)
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

    const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(req.params.id) as MerchantRow | undefined;

    if (!merchant) {
      throw new NotFoundError('Merchant not found');
    }

    db.prepare('UPDATE merchants SET is_verified = 0, is_open = 0, updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'MERCHANT_SUSPENDED',
      req.user!.userId,
      'admin',
      'merchant',
      req.params.id,
      `Merchant ${merchant.store_name} suspended`,
      JSON.stringify({ reason })
    );

    res.json({ success: true, message: 'Merchant suspended' });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Suspend merchant error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to suspend merchant' } });
  }
});

export default router;
