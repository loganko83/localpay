/**
 * Tourist Wallet Routes
 * Tourist registration, currency exchange, tax refund
 * NOTE: Actual funds managed by bank - we only display values
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';

const router = Router();

// Exchange rates (mock data - in production would come from external API)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1300,
  EUR: 1420,
  JPY: 8.7,
  CNY: 180,
};

// Supported currencies
const SUPPORTED_CURRENCIES = Object.keys(EXCHANGE_RATES);

// Tax refund rate for purchases over minimum amount at tax-free merchants
const TAX_REFUND_RATE = 0.10;
const TAX_REFUND_MIN_PURCHASE = 30000;

// Exchange fee rate
const EXCHANGE_FEE_RATE = 0.01; // 1% fee

interface TouristWalletRow {
  id: string;
  user_id: string;
  passport_number: string | null;
  passport_country: string | null;
  nationality: string | null;
  entry_date: string | null;
  departure_date: string | null;
  original_currency: string;
  exchange_rate: number | null;
  total_exchanged: number;
  total_spent: number;
  remaining_balance: number;
  refundable_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TouristExchangeRow {
  id: string;
  wallet_id: string;
  foreign_amount: number;
  foreign_currency: string;
  local_amount: number;
  exchange_rate: number;
  fee_amount: number;
  transaction_id: string | null;
  created_at: string;
}

interface TaxRefundRequestRow {
  id: string;
  wallet_id: string;
  amount: number;
  tax_amount: number;
  refund_method: string | null;
  status: string;
  processed_at: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

interface MerchantRow {
  id: string;
  store_name: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  image_url: string | null;
  rating: number;
  review_count: number;
  is_verified: number;
  is_open: number;
}

// ==================== Tourist Registration ====================

/**
 * POST /api/tourist/register
 * Register as tourist with passport info
 */
router.post('/register', authenticate, [
  body('passportNumber').notEmpty().withMessage('Passport number is required'),
  body('passportCountry').notEmpty().isLength({ min: 2, max: 3 }).withMessage('Passport country code is required (2-3 letters)'),
  body('nationality').notEmpty().withMessage('Nationality is required'),
  body('entryDate').optional().isISO8601().withMessage('Invalid entry date format'),
  body('departureDate').optional().isISO8601().withMessage('Invalid departure date format'),
  body('originalCurrency').optional().isIn(SUPPORTED_CURRENCIES).withMessage(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const {
      passportNumber,
      passportCountry,
      nationality,
      entryDate,
      departureDate,
      originalCurrency = 'USD',
    } = req.body;

    const db = getDb();

    // Check if tourist wallet already exists
    const existingWallet = db.prepare('SELECT id FROM tourist_wallets WHERE user_id = ?').get(req.user!.userId);
    if (existingWallet) {
      throw new BadRequestError('Tourist wallet already registered for this user');
    }

    const walletId = uuidv4();
    const exchangeRate = EXCHANGE_RATES[originalCurrency];

    db.prepare(`
      INSERT INTO tourist_wallets (
        id, user_id, passport_number, passport_country, nationality,
        entry_date, departure_date, original_currency, exchange_rate,
        total_exchanged, total_spent, remaining_balance, refundable_amount, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'active')
    `).run(
      walletId,
      req.user!.userId,
      passportNumber.toUpperCase(),
      passportCountry.toUpperCase(),
      nationality,
      entryDate || null,
      departureDate || null,
      originalCurrency,
      exchangeRate
    );

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'TOURIST_REGISTERED',
      req.user!.userId,
      'consumer',
      'tourist_wallet',
      walletId,
      `Tourist wallet registered for ${nationality} citizen`,
      JSON.stringify({ passportCountry, originalCurrency })
    );

    const wallet = db.prepare('SELECT * FROM tourist_wallets WHERE id = ?').get(walletId) as TouristWalletRow;

    res.status(201).json({
      success: true,
      data: {
        id: wallet.id,
        passportCountry: wallet.passport_country,
        nationality: wallet.nationality,
        entryDate: wallet.entry_date,
        departureDate: wallet.departure_date,
        originalCurrency: wallet.original_currency,
        exchangeRate: wallet.exchange_rate,
        totalExchanged: wallet.total_exchanged,
        totalSpent: wallet.total_spent,
        remainingBalance: wallet.remaining_balance,
        refundableAmount: wallet.refundable_amount,
        status: wallet.status,
        supportedCurrencies: SUPPORTED_CURRENCIES,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Tourist registration error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to register tourist wallet' } });
  }
});

// ==================== Tourist Wallet Info ====================

/**
 * GET /api/tourist/wallet
 * Get tourist wallet info
 */
router.get('/wallet', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const wallet = db.prepare('SELECT * FROM tourist_wallets WHERE user_id = ?').get(req.user!.userId) as TouristWalletRow | undefined;

    if (!wallet) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tourist wallet not found. Please register first.' },
      });
      return;
    }

    // Get exchange rates
    const currentRates = { ...EXCHANGE_RATES };

    res.json({
      success: true,
      data: {
        id: wallet.id,
        passportCountry: wallet.passport_country,
        nationality: wallet.nationality,
        entryDate: wallet.entry_date,
        departureDate: wallet.departure_date,
        originalCurrency: wallet.original_currency,
        exchangeRate: wallet.exchange_rate,
        totalExchanged: wallet.total_exchanged,
        totalSpent: wallet.total_spent,
        remainingBalance: wallet.remaining_balance,
        refundableAmount: wallet.refundable_amount,
        status: wallet.status,
        createdAt: wallet.created_at,
        currentExchangeRates: currentRates,
        taxRefundRate: TAX_REFUND_RATE,
        taxRefundMinPurchase: TAX_REFUND_MIN_PURCHASE,
      },
    });
  } catch (error) {
    console.error('Get tourist wallet error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get tourist wallet' } });
  }
});

// ==================== Currency Exchange ====================

/**
 * POST /api/tourist/exchange
 * Exchange foreign currency to local currency
 */
router.post('/exchange', authenticate, [
  body('foreignAmount').isFloat({ min: 1 }).withMessage('Foreign amount must be at least 1'),
  body('foreignCurrency').isIn(SUPPORTED_CURRENCIES).withMessage(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { foreignAmount, foreignCurrency } = req.body;
    const db = getDb();

    const wallet = db.prepare('SELECT * FROM tourist_wallets WHERE user_id = ?').get(req.user!.userId) as TouristWalletRow | undefined;

    if (!wallet) {
      throw new NotFoundError('Tourist wallet not found. Please register first.');
    }

    if (wallet.status !== 'active') {
      throw new BadRequestError('Tourist wallet is not active');
    }

    const exchangeRate = EXCHANGE_RATES[foreignCurrency];
    const grossLocalAmount = Math.floor(foreignAmount * exchangeRate);
    const feeAmount = Math.floor(grossLocalAmount * EXCHANGE_FEE_RATE);
    const netLocalAmount = grossLocalAmount - feeAmount;

    // Create transaction record
    const txId = `EXC-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const transactionId = uuidv4();

    db.prepare(`
      INSERT INTO transactions (id, tx_id, user_id, amount, type, status, description)
      VALUES (?, ?, ?, ?, 'topup', 'completed', ?)
    `).run(
      transactionId,
      txId,
      req.user!.userId,
      netLocalAmount,
      `Currency exchange: ${foreignAmount} ${foreignCurrency} to KRW`
    );

    // Create exchange record
    const exchangeId = uuidv4();
    db.prepare(`
      INSERT INTO tourist_exchanges (id, wallet_id, foreign_amount, foreign_currency, local_amount, exchange_rate, fee_amount, transaction_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exchangeId,
      wallet.id,
      foreignAmount,
      foreignCurrency,
      netLocalAmount,
      exchangeRate,
      feeAmount,
      transactionId
    );

    // Update tourist wallet balance
    db.prepare(`
      UPDATE tourist_wallets
      SET total_exchanged = total_exchanged + ?,
          remaining_balance = remaining_balance + ?,
          exchange_rate = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(netLocalAmount, netLocalAmount, exchangeRate, wallet.id);

    // Update main wallet balance
    db.prepare(`
      UPDATE wallets
      SET balance = balance + ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(netLocalAmount, req.user!.userId);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'CURRENCY_EXCHANGED',
      req.user!.userId,
      'consumer',
      'tourist_wallet',
      wallet.id,
      `Exchanged ${foreignAmount} ${foreignCurrency} to ${netLocalAmount.toLocaleString()} KRW`,
      JSON.stringify({ foreignAmount, foreignCurrency, exchangeRate, feeAmount, netLocalAmount })
    );

    const updatedWallet = db.prepare('SELECT * FROM tourist_wallets WHERE id = ?').get(wallet.id) as TouristWalletRow;

    res.json({
      success: true,
      data: {
        exchangeId,
        transactionId: txId,
        foreignAmount,
        foreignCurrency,
        exchangeRate,
        grossLocalAmount,
        feeAmount,
        feeRate: EXCHANGE_FEE_RATE,
        netLocalAmount,
        newBalance: updatedWallet.remaining_balance,
        totalExchanged: updatedWallet.total_exchanged,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Currency exchange error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to exchange currency' } });
  }
});

/**
 * GET /api/tourist/exchanges
 * Get exchange history
 */
router.get('/exchanges', authenticate, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const db = getDb();

    const wallet = db.prepare('SELECT * FROM tourist_wallets WHERE user_id = ?').get(req.user!.userId) as TouristWalletRow | undefined;

    if (!wallet) {
      throw new NotFoundError('Tourist wallet not found');
    }

    const countResult = db.prepare('SELECT COUNT(*) as count FROM tourist_exchanges WHERE wallet_id = ?').get(wallet.id) as { count: number };

    const exchanges = db.prepare(`
      SELECT * FROM tourist_exchanges
      WHERE wallet_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(wallet.id, size, page * size) as TouristExchangeRow[];

    res.json({
      success: true,
      data: {
        exchanges: exchanges.map(e => ({
          id: e.id,
          foreignAmount: e.foreign_amount,
          foreignCurrency: e.foreign_currency,
          localAmount: e.local_amount,
          exchangeRate: e.exchange_rate,
          feeAmount: e.fee_amount,
          createdAt: e.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get exchanges error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get exchange history' } });
  }
});

// ==================== Departure Refund ====================

/**
 * POST /api/tourist/refund
 * Request departure refund for remaining balance
 */
router.post('/refund', authenticate, [
  body('refundMethod').isIn(['cash', 'card', 'bank_transfer']).withMessage('Invalid refund method'),
  body('bankDetails').optional().isObject(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { refundMethod, bankDetails } = req.body;
    const db = getDb();

    const wallet = db.prepare('SELECT * FROM tourist_wallets WHERE user_id = ?').get(req.user!.userId) as TouristWalletRow | undefined;

    if (!wallet) {
      throw new NotFoundError('Tourist wallet not found');
    }

    if (wallet.status !== 'active') {
      throw new BadRequestError('Tourist wallet is not active or already refunded');
    }

    if (wallet.remaining_balance <= 0) {
      throw new BadRequestError('No remaining balance to refund');
    }

    // Calculate refund in original currency
    const refundAmountKRW = wallet.remaining_balance;
    const exchangeRate = wallet.exchange_rate || EXCHANGE_RATES[wallet.original_currency];
    const refundAmountForeign = refundAmountKRW / exchangeRate;

    // Create transaction record
    const txId = `REF-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const transactionId = uuidv4();

    db.prepare(`
      INSERT INTO transactions (id, tx_id, user_id, amount, type, status, description)
      VALUES (?, ?, ?, ?, 'withdrawal', 'pending', ?)
    `).run(
      transactionId,
      txId,
      req.user!.userId,
      refundAmountKRW,
      `Departure refund: ${refundAmountKRW.toLocaleString()} KRW to ${refundAmountForeign.toFixed(2)} ${wallet.original_currency}`
    );

    // Update wallet status
    db.prepare(`
      UPDATE tourist_wallets
      SET status = 'refunded',
          refundable_amount = ?,
          remaining_balance = 0,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(refundAmountKRW, wallet.id);

    // Update main wallet balance
    db.prepare(`
      UPDATE wallets
      SET balance = balance - ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(refundAmountKRW, req.user!.userId);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'DEPARTURE_REFUND_REQUESTED',
      req.user!.userId,
      'consumer',
      'tourist_wallet',
      wallet.id,
      `Departure refund requested: ${refundAmountKRW.toLocaleString()} KRW`,
      JSON.stringify({ refundAmountKRW, refundAmountForeign, refundMethod, bankDetails })
    );

    res.json({
      success: true,
      data: {
        transactionId: txId,
        refundAmountKRW,
        refundAmountForeign: parseFloat(refundAmountForeign.toFixed(2)),
        originalCurrency: wallet.original_currency,
        exchangeRate,
        refundMethod,
        status: 'pending',
        message: 'Refund request submitted. Processing within 3-5 business days.',
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Departure refund error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process refund' } });
  }
});

// ==================== Tourist-Friendly Merchants ====================

/**
 * GET /api/tourist/merchants
 * Get tourist-friendly merchants (multi-language, tax-free)
 */
router.get('/merchants', authenticate, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isString(),
  query('taxFree').optional().isBoolean(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const category = req.query.category as string;
    const taxFree = req.query.taxFree === 'true';

    const db = getDb();

    // Build query - in production, would filter by tourist-friendly flags
    let whereClause = 'WHERE is_verified = 1 AND is_open = 1';
    const params: (string | number)[] = [];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    // Note: In production, would have a tax_free_certified column
    // For demo, we consider verified merchants as tax-free eligible

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM merchants ${whereClause}`).get(...params) as { count: number };

    const merchants = db.prepare(`
      SELECT * FROM merchants ${whereClause}
      ORDER BY rating DESC, review_count DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as MerchantRow[];

    // Tourist-friendly categories
    const touristCategories = ['restaurant', 'cafe', 'shopping', 'convenience', 'attraction', 'hotel', 'transportation'];

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
          // Tax-free eligible if verified (demo logic)
          taxFreeEligible: m.is_verified === 1,
          // Multi-language support flag (demo - all verified merchants)
          multiLanguageSupport: m.is_verified === 1,
          supportedLanguages: m.is_verified === 1 ? ['ko', 'en', 'ja', 'zh'] : ['ko'],
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
        touristCategories,
        taxRefundInfo: {
          rate: TAX_REFUND_RATE,
          minPurchase: TAX_REFUND_MIN_PURCHASE,
          description: `${(TAX_REFUND_RATE * 100).toFixed(0)}% tax refund available for purchases over ${TAX_REFUND_MIN_PURCHASE.toLocaleString()} KRW at tax-free merchants`,
        },
      },
    });
  } catch (error) {
    console.error('Get tourist merchants error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get merchants' } });
  }
});

// ==================== Tax Refund ====================

/**
 * POST /api/tourist/tax-refund
 * Request tax refund for eligible purchases
 */
router.post('/tax-refund', authenticate, [
  body('transactionIds').isArray({ min: 1 }).withMessage('At least one transaction ID required'),
  body('transactionIds.*').isString(),
  body('refundMethod').isIn(['cash', 'card', 'bank_transfer']).withMessage('Invalid refund method'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { transactionIds, refundMethod } = req.body;
    const db = getDb();

    const wallet = db.prepare('SELECT * FROM tourist_wallets WHERE user_id = ?').get(req.user!.userId) as TouristWalletRow | undefined;

    if (!wallet) {
      throw new NotFoundError('Tourist wallet not found');
    }

    if (wallet.status !== 'active') {
      throw new BadRequestError('Tourist wallet is not active');
    }

    // Get eligible transactions (payments over minimum amount at verified merchants)
    const transactions = db.prepare(`
      SELECT t.*, m.store_name, m.is_verified
      FROM transactions t
      LEFT JOIN merchants m ON t.merchant_id = m.id
      WHERE t.id IN (${transactionIds.map(() => '?').join(',')})
        AND t.user_id = ?
        AND t.type = 'payment'
        AND t.status = 'completed'
        AND t.amount >= ?
        AND m.is_verified = 1
    `).all(...transactionIds, req.user!.userId, TAX_REFUND_MIN_PURCHASE) as Array<{
      id: string;
      amount: number;
      store_name: string;
    }>;

    if (transactions.length === 0) {
      throw new BadRequestError('No eligible transactions found for tax refund');
    }

    // Calculate total tax refund
    const totalPurchaseAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const taxRefundAmount = Math.floor(totalPurchaseAmount * TAX_REFUND_RATE);

    // Create tax refund request
    const refundId = uuidv4();
    const referenceNumber = `TAX-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    db.prepare(`
      INSERT INTO tax_refund_requests (id, wallet_id, amount, tax_amount, refund_method, status, reference_number, notes)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      refundId,
      wallet.id,
      totalPurchaseAmount,
      taxRefundAmount,
      refundMethod,
      referenceNumber,
      JSON.stringify({ transactionIds, merchantNames: transactions.map(t => t.store_name) })
    );

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'TAX_REFUND_REQUESTED',
      req.user!.userId,
      'consumer',
      'tax_refund_request',
      refundId,
      `Tax refund requested: ${taxRefundAmount.toLocaleString()} KRW`,
      JSON.stringify({ totalPurchaseAmount, taxRefundAmount, transactionCount: transactions.length })
    );

    res.status(201).json({
      success: true,
      data: {
        refundId,
        referenceNumber,
        totalPurchaseAmount,
        taxRefundAmount,
        taxRate: TAX_REFUND_RATE,
        eligibleTransactions: transactions.length,
        refundMethod,
        status: 'pending',
        message: 'Tax refund request submitted. Collect at airport departure or receive via selected method.',
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Tax refund error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process tax refund' } });
  }
});

/**
 * GET /api/tourist/tax-refunds
 * Get tax refund request history
 */
router.get('/tax-refunds', authenticate, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const db = getDb();

    const wallet = db.prepare('SELECT * FROM tourist_wallets WHERE user_id = ?').get(req.user!.userId) as TouristWalletRow | undefined;

    if (!wallet) {
      throw new NotFoundError('Tourist wallet not found');
    }

    const countResult = db.prepare('SELECT COUNT(*) as count FROM tax_refund_requests WHERE wallet_id = ?').get(wallet.id) as { count: number };

    const refunds = db.prepare(`
      SELECT * FROM tax_refund_requests
      WHERE wallet_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(wallet.id, size, page * size) as TaxRefundRequestRow[];

    res.json({
      success: true,
      data: {
        refunds: refunds.map(r => ({
          id: r.id,
          referenceNumber: r.reference_number,
          purchaseAmount: r.amount,
          taxRefundAmount: r.tax_amount,
          refundMethod: r.refund_method,
          status: r.status,
          processedAt: r.processed_at,
          createdAt: r.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get tax refunds error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get tax refund history' } });
  }
});

// ==================== Admin Routes ====================

/**
 * GET /api/admin/tourist/stats
 * Tourist statistics (admin only)
 * Note: Mounted at /api/admin/tourist, so path is just /stats
 */
router.get('/stats', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Total tourist wallets
    const totalWallets = db.prepare('SELECT COUNT(*) as count FROM tourist_wallets').get() as { count: number };
    const activeWallets = db.prepare("SELECT COUNT(*) as count FROM tourist_wallets WHERE status = 'active'").get() as { count: number };

    // Total exchanges
    const exchangeStats = db.prepare(`
      SELECT
        COUNT(*) as total_exchanges,
        COALESCE(SUM(local_amount), 0) as total_exchanged_krw,
        COALESCE(SUM(fee_amount), 0) as total_fees
      FROM tourist_exchanges
    `).get() as { total_exchanges: number; total_exchanged_krw: number; total_fees: number };

    // Exchange by currency
    const exchangeByCurrency = db.prepare(`
      SELECT
        foreign_currency,
        COUNT(*) as count,
        SUM(foreign_amount) as total_foreign,
        SUM(local_amount) as total_local
      FROM tourist_exchanges
      GROUP BY foreign_currency
      ORDER BY total_local DESC
    `).all() as Array<{ foreign_currency: string; count: number; total_foreign: number; total_local: number }>;

    // Tax refund stats
    const taxRefundStats = db.prepare(`
      SELECT
        COUNT(*) as total_requests,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN tax_amount ELSE 0 END), 0) as total_refunded,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN tax_amount ELSE 0 END), 0) as pending_refunds
      FROM tax_refund_requests
    `).get() as { total_requests: number; total_refunded: number; pending_refunds: number };

    // Nationality distribution
    const nationalityDist = db.prepare(`
      SELECT nationality, COUNT(*) as count
      FROM tourist_wallets
      WHERE nationality IS NOT NULL
      GROUP BY nationality
      ORDER BY count DESC
      LIMIT 10
    `).all() as Array<{ nationality: string; count: number }>;

    // Recent registrations (last 30 days)
    const recentRegistrations = db.prepare(`
      SELECT COUNT(*) as count
      FROM tourist_wallets
      WHERE created_at >= date('now', '-30 days')
    `).get() as { count: number };

    res.json({
      success: true,
      data: {
        overview: {
          totalWallets: totalWallets.count,
          activeWallets: activeWallets.count,
          recentRegistrations: recentRegistrations.count,
        },
        exchanges: {
          totalCount: exchangeStats.total_exchanges,
          totalExchangedKRW: exchangeStats.total_exchanged_krw,
          totalFees: exchangeStats.total_fees,
          byCurrency: exchangeByCurrency.map(c => ({
            currency: c.foreign_currency,
            count: c.count,
            totalForeign: c.total_foreign,
            totalLocalKRW: c.total_local,
          })),
        },
        taxRefunds: {
          totalRequests: taxRefundStats.total_requests,
          totalRefunded: taxRefundStats.total_refunded,
          pendingRefunds: taxRefundStats.pending_refunds,
        },
        demographics: {
          topNationalities: nationalityDist,
        },
        currentExchangeRates: EXCHANGE_RATES,
      },
    });
  } catch (error) {
    console.error('Get tourist stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get tourist statistics' } });
  }
});

/**
 * GET /api/admin/tourist/wallets
 * List all tourist wallets (admin only)
 * Note: Mounted at /api/admin/tourist, so path is just /wallets
 */
router.get('/wallets', authenticate, requireAdmin, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['active', 'departed', 'refunded', 'expired']),
  query('nationality').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const status = req.query.status as string;
    const nationality = req.query.nationality as string;

    const db = getDb();

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (status) {
      whereClause += ' AND tw.status = ?';
      params.push(status);
    }

    if (nationality) {
      whereClause += ' AND tw.nationality = ?';
      params.push(nationality);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as count
      FROM tourist_wallets tw
      ${whereClause}
    `).get(...params) as { count: number };

    const wallets = db.prepare(`
      SELECT tw.*, u.name as user_name, u.email as user_email
      FROM tourist_wallets tw
      LEFT JOIN users u ON tw.user_id = u.id
      ${whereClause}
      ORDER BY tw.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as Array<TouristWalletRow & { user_name: string; user_email: string }>;

    res.json({
      success: true,
      data: {
        wallets: wallets.map(w => ({
          id: w.id,
          userId: w.user_id,
          userName: w.user_name,
          userEmail: w.user_email,
          passportCountry: w.passport_country,
          nationality: w.nationality,
          entryDate: w.entry_date,
          departureDate: w.departure_date,
          originalCurrency: w.original_currency,
          exchangeRate: w.exchange_rate,
          totalExchanged: w.total_exchanged,
          totalSpent: w.total_spent,
          remainingBalance: w.remaining_balance,
          refundableAmount: w.refundable_amount,
          status: w.status,
          createdAt: w.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
        filters: {
          statuses: ['active', 'departed', 'refunded', 'expired'],
        },
      },
    });
  } catch (error) {
    console.error('Get tourist wallets error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get tourist wallets' } });
  }
});

export default router;
