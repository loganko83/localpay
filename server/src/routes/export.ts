/**
 * Export Routes
 * Transaction and data export endpoints
 */

import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { ValidationError } from '../middleware/errorHandler.js';
import * as exportService from '../services/export.js';
import logger from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/export/transactions
 * Export user transactions (CSV or PDF)
 */
router.get('/transactions', [
  query('format').optional().isIn(['csv', 'pdf']).withMessage('Format must be csv or pdf'),
  query('dateFrom').optional().isISO8601().withMessage('Invalid date format'),
  query('dateTo').optional().isISO8601().withMessage('Invalid date format'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const format = (req.query.format as string) || 'csv';
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    // Get transactions
    const transactions = exportService.getUserTransactions(req.user!.userId, {
      dateFrom,
      dateTo,
    });

    // Log audit event
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'TRANSACTION_EXPORT',
      req.user!.userId,
      req.user!.userType,
      'export',
      req.user!.userId,
      `Exported ${transactions.length} transactions as ${format.toUpperCase()}`,
      req.ip
    );

    if (format === 'pdf') {
      const pdfBuffer = await exportService.exportTransactionsToPDF(
        transactions,
        'Transaction History'
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=transactions-${Date.now()}.pdf`);
      res.send(pdfBuffer);
    } else {
      const csv = exportService.exportTransactionsToCSV(transactions);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=transactions-${Date.now()}.csv`);
      res.send(csv);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }

    logger.error('Transaction export error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to export transactions' },
    });
  }
});

/**
 * GET /api/export/merchant/transactions
 * Export merchant transactions (for merchants only)
 */
router.get('/merchant/transactions', [
  query('format').optional().isIn(['csv', 'pdf']).withMessage('Format must be csv or pdf'),
  query('dateFrom').optional().isISO8601().withMessage('Invalid date format'),
  query('dateTo').optional().isISO8601().withMessage('Invalid date format'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.userType !== 'merchant' || !req.user!.merchantId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Merchant access required' },
      });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const format = (req.query.format as string) || 'csv';
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    // Get transactions
    const transactions = exportService.getMerchantTransactions(req.user!.merchantId, {
      dateFrom,
      dateTo,
    });

    // Log audit event
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'MERCHANT_TRANSACTION_EXPORT',
      req.user!.userId,
      'merchant',
      'export',
      req.user!.merchantId,
      `Exported ${transactions.length} transactions as ${format.toUpperCase()}`,
      req.ip
    );

    if (format === 'pdf') {
      const pdfBuffer = await exportService.exportTransactionsToPDF(
        transactions,
        'Merchant Transaction Report'
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=merchant-transactions-${Date.now()}.pdf`);
      res.send(pdfBuffer);
    } else {
      const csv = exportService.exportTransactionsToCSV(transactions);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=merchant-transactions-${Date.now()}.csv`);
      res.send(csv);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }

    logger.error('Merchant transaction export error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to export transactions' },
    });
  }
});

/**
 * GET /api/export/merchant/settlement
 * Generate settlement report PDF (for merchants)
 */
router.get('/merchant/settlement', [
  query('dateFrom').notEmpty().isISO8601().withMessage('Start date is required'),
  query('dateTo').notEmpty().isISO8601().withMessage('End date is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.userType !== 'merchant' || !req.user!.merchantId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Merchant access required' },
      });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    const pdfBuffer = await exportService.generateSettlementReport(
      req.user!.merchantId,
      dateFrom,
      dateTo
    );

    // Log audit event
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'SETTLEMENT_REPORT_GENERATED',
      req.user!.userId,
      'merchant',
      'export',
      req.user!.merchantId,
      `Settlement report generated for ${dateFrom} to ${dateTo}`,
      req.ip
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=settlement-${dateFrom}-${dateTo}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }

    logger.error('Settlement report error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate settlement report' },
    });
  }
});

/**
 * GET /api/export/user-data
 * Export all user data (GDPR compliance)
 */
router.get('/user-data', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userData = exportService.exportUserData(req.user!.userId);

    // Log audit event
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'GDPR_DATA_EXPORT',
      req.user!.userId,
      req.user!.userType,
      'export',
      req.user!.userId,
      'User data exported for GDPR compliance',
      req.ip
    );

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=user-data-${Date.now()}.json`);
    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      data: userData,
    });
  } catch (error) {
    logger.error('User data export error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to export user data' },
    });
  }
});

/**
 * GET /api/export/admin/users
 * Export all users (admin only)
 */
router.get('/admin/users', requireAdmin, [
  query('format').optional().isIn(['csv', 'json']).withMessage('Format must be csv or json'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const format = (req.query.format as string) || 'json';
    const db = getDb();

    const users = db.prepare(`
      SELECT id, email, phone, name, user_type, kyc_verified, level, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    // Log audit event
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'ADMIN_USER_EXPORT',
      req.user!.userId,
      'admin',
      'export',
      'all',
      `Exported ${users.length} users as ${format.toUpperCase()}`,
      req.ip
    );

    if (format === 'csv') {
      const { Parser } = await import('json2csv');
      const parser = new Parser();
      const csv = parser.parse(users);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=users-${Date.now()}.csv`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=users-${Date.now()}.json`);
      res.json({
        success: true,
        exportedAt: new Date().toISOString(),
        count: users.length,
        data: users,
      });
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }

    logger.error('Admin user export error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to export users' },
    });
  }
});

export default router;
