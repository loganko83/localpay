/**
 * Credit Score Routes
 * Merchant credit scoring, applications, and admin management
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, param, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireMerchant, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';

const router = Router();

// ==================== Type Definitions ====================

interface MerchantCreditScoreRow {
  id: string;
  merchant_id: string;
  score: number;
  grade: string;
  payment_history_score: number;
  volume_score: number;
  tenure_score: number;
  compliance_score: number;
  growth_score: number;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

interface CreditApplicationRow {
  id: string;
  merchant_id: string;
  requested_amount: number;
  purpose: string | null;
  term_months: number | null;
  status: string;
  approved_amount: number | null;
  interest_rate: number | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CreditHistoryRow {
  id: string;
  merchant_id: string;
  score: number;
  grade: string;
  factors: string | null;
  recorded_at: string;
}

interface MerchantRow {
  id: string;
  store_name: string;
  created_at: string;
}

interface TransactionStatsRow {
  total_payments: number;
  total_refunds: number;
  payment_count: number;
  refund_count: number;
}

interface MonthlyTransactionRow {
  month: string;
  total: number;
}

// ==================== Helper Functions ====================

/**
 * Calculate grade from score
 */
function calculateGrade(score: number): string {
  if (score >= 900) return 'A+';
  if (score >= 800) return 'A';
  if (score >= 700) return 'B+';
  if (score >= 600) return 'B';
  if (score >= 500) return 'C';
  if (score >= 400) return 'D';
  return 'F';
}

/**
 * Calculate credit score factors for a merchant
 */
function calculateCreditFactors(merchantId: string): {
  paymentHistoryScore: number;
  volumeScore: number;
  tenureScore: number;
  complianceScore: number;
  growthScore: number;
  totalScore: number;
  grade: string;
} {
  const db = getDb();

  // Get merchant info for tenure calculation
  const merchant = db.prepare('SELECT created_at FROM merchants WHERE id = ?').get(merchantId) as MerchantRow | undefined;
  if (!merchant) {
    return {
      paymentHistoryScore: 0,
      volumeScore: 0,
      tenureScore: 0,
      complianceScore: 0,
      growthScore: 0,
      totalScore: 0,
      grade: 'F',
    };
  }

  // 1. Payment History Score (0-200): refund rate, chargeback rate
  const txStats = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'payment' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_payments,
      COALESCE(SUM(CASE WHEN type = 'refund' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_refunds,
      COUNT(CASE WHEN type = 'payment' AND status = 'completed' THEN 1 END) as payment_count,
      COUNT(CASE WHEN type = 'refund' AND status = 'completed' THEN 1 END) as refund_count
    FROM transactions
    WHERE merchant_id = ?
  `).get(merchantId) as TransactionStatsRow;

  let paymentHistoryScore = 200; // Start with perfect score
  if (txStats.payment_count > 0) {
    const refundRate = txStats.refund_count / txStats.payment_count;
    // Deduct points based on refund rate (max 100 points deduction)
    paymentHistoryScore -= Math.min(100, Math.round(refundRate * 500));
    // If no transaction history, lower score
    if (txStats.payment_count < 10) {
      paymentHistoryScore -= 50;
    }
  } else {
    paymentHistoryScore = 100; // No history, start at half
  }
  paymentHistoryScore = Math.max(0, Math.min(200, paymentHistoryScore));

  // 2. Volume Score (0-200): monthly transaction volume
  const monthlyVolume = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as volume
    FROM transactions
    WHERE merchant_id = ? AND type = 'payment' AND status = 'completed'
    AND created_at >= datetime('now', '-30 days')
  `).get(merchantId) as { volume: number };

  let volumeScore = 0;
  if (monthlyVolume.volume >= 50000000) volumeScore = 200; // 50M+
  else if (monthlyVolume.volume >= 20000000) volumeScore = 180; // 20M+
  else if (monthlyVolume.volume >= 10000000) volumeScore = 150; // 10M+
  else if (monthlyVolume.volume >= 5000000) volumeScore = 120; // 5M+
  else if (monthlyVolume.volume >= 1000000) volumeScore = 90; // 1M+
  else if (monthlyVolume.volume >= 500000) volumeScore = 60; // 500K+
  else if (monthlyVolume.volume >= 100000) volumeScore = 30; // 100K+
  else volumeScore = 10;

  // 3. Tenure Score (0-200): months since registration
  const createdDate = new Date(merchant.created_at);
  const now = new Date();
  const monthsSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

  let tenureScore = 0;
  if (monthsSinceCreation >= 36) tenureScore = 200; // 3+ years
  else if (monthsSinceCreation >= 24) tenureScore = 170; // 2+ years
  else if (monthsSinceCreation >= 12) tenureScore = 140; // 1+ year
  else if (monthsSinceCreation >= 6) tenureScore = 100; // 6+ months
  else if (monthsSinceCreation >= 3) tenureScore = 60; // 3+ months
  else if (monthsSinceCreation >= 1) tenureScore = 30; // 1+ month
  else tenureScore = 10;

  // 4. Compliance Score (0-200): policy violations, FDS alerts
  const fdsAlerts = db.prepare(`
    SELECT COUNT(*) as count
    FROM fds_alerts
    WHERE target_id = ? AND target_type = 'merchant'
    AND status NOT IN ('false_positive', 'resolved')
  `).get(merchantId) as { count: number };

  let complianceScore = 200;
  // Deduct 30 points per unresolved alert, max 150 deduction
  complianceScore -= Math.min(150, fdsAlerts.count * 30);
  complianceScore = Math.max(0, complianceScore);

  // 5. Growth Score (0-200): month-over-month growth
  const monthlyTx = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE merchant_id = ? AND type = 'payment' AND status = 'completed'
    AND created_at >= datetime('now', '-3 months')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month DESC
    LIMIT 3
  `).all(merchantId) as MonthlyTransactionRow[];

  let growthScore = 100; // Default neutral score
  if (monthlyTx.length >= 2) {
    const currentMonth = monthlyTx[0]?.total || 0;
    const previousMonth = monthlyTx[1]?.total || 0;

    if (previousMonth > 0) {
      const growthRate = (currentMonth - previousMonth) / previousMonth;
      if (growthRate >= 0.5) growthScore = 200; // 50%+ growth
      else if (growthRate >= 0.2) growthScore = 170; // 20%+ growth
      else if (growthRate >= 0.1) growthScore = 150; // 10%+ growth
      else if (growthRate >= 0) growthScore = 120; // Positive growth
      else if (growthRate >= -0.1) growthScore = 80; // Small decline
      else if (growthRate >= -0.3) growthScore = 50; // Moderate decline
      else growthScore = 20; // Large decline
    }
  }

  const totalScore = paymentHistoryScore + volumeScore + tenureScore + complianceScore + growthScore;
  const grade = calculateGrade(totalScore);

  return {
    paymentHistoryScore,
    volumeScore,
    tenureScore,
    complianceScore,
    growthScore,
    totalScore,
    grade,
  };
}

// ==================== Merchant Credit Routes ====================

/**
 * GET /api/merchant/credit/score
 * Get merchant's own credit score
 */
router.get('/score', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const merchantId = req.user!.merchantId!;

    const creditScore = db.prepare(`
      SELECT * FROM merchant_credit_scores WHERE merchant_id = ?
    `).get(merchantId) as MerchantCreditScoreRow | undefined;

    if (!creditScore) {
      // No score yet, calculate and create one
      const factors = calculateCreditFactors(merchantId);

      const id = uuidv4();
      db.prepare(`
        INSERT INTO merchant_credit_scores (id, merchant_id, score, grade, payment_history_score, volume_score, tenure_score, compliance_score, growth_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        merchantId,
        factors.totalScore,
        factors.grade,
        factors.paymentHistoryScore,
        factors.volumeScore,
        factors.tenureScore,
        factors.complianceScore,
        factors.growthScore
      );

      // Record history
      db.prepare(`
        INSERT INTO merchant_credit_history (id, merchant_id, score, grade, factors)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        merchantId,
        factors.totalScore,
        factors.grade,
        JSON.stringify(factors)
      );

      const newScore = db.prepare('SELECT * FROM merchant_credit_scores WHERE id = ?').get(id) as MerchantCreditScoreRow;

      res.json({
        success: true,
        data: {
          score: newScore.score,
          grade: newScore.grade,
          maxScore: 1000,
          calculatedAt: newScore.calculated_at,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        score: creditScore.score,
        grade: creditScore.grade,
        maxScore: 1000,
        calculatedAt: creditScore.calculated_at,
      },
    });
  } catch (error) {
    console.error('Get credit score error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get credit score' } });
  }
});

/**
 * GET /api/merchant/credit/history
 * Get score history over time
 */
router.get('/history', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const merchantId = req.user!.merchantId!;
    const limit = parseInt(req.query.limit as string) || 12;

    const history = db.prepare(`
      SELECT * FROM merchant_credit_history
      WHERE merchant_id = ?
      ORDER BY recorded_at DESC
      LIMIT ?
    `).all(merchantId, limit) as CreditHistoryRow[];

    res.json({
      success: true,
      data: history.map(h => ({
        id: h.id,
        score: h.score,
        grade: h.grade,
        factors: h.factors ? JSON.parse(h.factors) : null,
        recordedAt: h.recorded_at,
      })),
    });
  } catch (error) {
    console.error('Get credit history error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get credit history' } });
  }
});

/**
 * GET /api/merchant/credit/factors
 * Get detailed score breakdown
 */
router.get('/factors', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const merchantId = req.user!.merchantId!;

    const creditScore = db.prepare(`
      SELECT * FROM merchant_credit_scores WHERE merchant_id = ?
    `).get(merchantId) as MerchantCreditScoreRow | undefined;

    if (!creditScore) {
      // Calculate on-the-fly
      const factors = calculateCreditFactors(merchantId);

      res.json({
        success: true,
        data: {
          totalScore: factors.totalScore,
          maxScore: 1000,
          grade: factors.grade,
          factors: {
            paymentHistory: {
              score: factors.paymentHistoryScore,
              maxScore: 200,
              description: 'Based on refund rate and payment history',
            },
            volume: {
              score: factors.volumeScore,
              maxScore: 200,
              description: 'Based on monthly transaction volume',
            },
            tenure: {
              score: factors.tenureScore,
              maxScore: 200,
              description: 'Based on months since registration',
            },
            compliance: {
              score: factors.complianceScore,
              maxScore: 200,
              description: 'Based on policy violations and alerts',
            },
            growth: {
              score: factors.growthScore,
              maxScore: 200,
              description: 'Based on month-over-month growth',
            },
          },
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        totalScore: creditScore.score,
        maxScore: 1000,
        grade: creditScore.grade,
        calculatedAt: creditScore.calculated_at,
        factors: {
          paymentHistory: {
            score: creditScore.payment_history_score,
            maxScore: 200,
            description: 'Based on refund rate and payment history',
          },
          volume: {
            score: creditScore.volume_score,
            maxScore: 200,
            description: 'Based on monthly transaction volume',
          },
          tenure: {
            score: creditScore.tenure_score,
            maxScore: 200,
            description: 'Based on months since registration',
          },
          compliance: {
            score: creditScore.compliance_score,
            maxScore: 200,
            description: 'Based on policy violations and alerts',
          },
          growth: {
            score: creditScore.growth_score,
            maxScore: 200,
            description: 'Based on month-over-month growth',
          },
        },
      },
    });
  } catch (error) {
    console.error('Get credit factors error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get credit factors' } });
  }
});

/**
 * POST /api/merchant/credit/apply
 * Apply for credit/loan
 */
router.post('/apply', authenticate, requireMerchant, [
  body('requestedAmount').isInt({ min: 100000 }).withMessage('Minimum amount is 100,000'),
  body('purpose').notEmpty().withMessage('Purpose is required'),
  body('termMonths').optional().isInt({ min: 1, max: 60 }).withMessage('Term must be 1-60 months'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { requestedAmount, purpose, termMonths, notes } = req.body;
    const db = getDb();
    const merchantId = req.user!.merchantId!;

    // Check for pending applications
    const pendingApp = db.prepare(`
      SELECT id FROM credit_applications
      WHERE merchant_id = ? AND status IN ('pending', 'reviewing')
    `).get(merchantId) as { id: string } | undefined;

    if (pendingApp) {
      throw new BadRequestError('You have a pending application. Please wait for it to be reviewed.');
    }

    // Get credit score
    let creditScore = db.prepare(`
      SELECT * FROM merchant_credit_scores WHERE merchant_id = ?
    `).get(merchantId) as MerchantCreditScoreRow | undefined;

    if (!creditScore) {
      // Calculate and create score first
      const factors = calculateCreditFactors(merchantId);
      const id = uuidv4();
      db.prepare(`
        INSERT INTO merchant_credit_scores (id, merchant_id, score, grade, payment_history_score, volume_score, tenure_score, compliance_score, growth_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        merchantId,
        factors.totalScore,
        factors.grade,
        factors.paymentHistoryScore,
        factors.volumeScore,
        factors.tenureScore,
        factors.complianceScore,
        factors.growthScore
      );
      creditScore = db.prepare('SELECT * FROM merchant_credit_scores WHERE id = ?').get(id) as MerchantCreditScoreRow;
    }

    // Check minimum score requirement
    if (creditScore.score < 400) {
      throw new BadRequestError('Credit score too low to apply. Minimum score is 400.');
    }

    const applicationId = uuidv4();
    db.prepare(`
      INSERT INTO credit_applications (id, merchant_id, requested_amount, purpose, term_months, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(applicationId, merchantId, requestedAmount, purpose, termMonths || null, notes || null);

    const application = db.prepare('SELECT * FROM credit_applications WHERE id = ?').get(applicationId) as CreditApplicationRow;

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'CREDIT_APPLICATION_SUBMITTED',
      req.user!.userId,
      'merchant',
      'credit_application',
      applicationId,
      `Credit application submitted for ${requestedAmount}`,
      JSON.stringify({ requestedAmount, purpose, termMonths })
    );

    res.status(201).json({
      success: true,
      data: {
        id: application.id,
        merchantId: application.merchant_id,
        requestedAmount: application.requested_amount,
        purpose: application.purpose,
        termMonths: application.term_months,
        status: application.status,
        createdAt: application.created_at,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Apply for credit error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to submit application' } });
  }
});

/**
 * GET /api/merchant/credit/applications
 * Get my applications
 */
router.get('/applications', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const merchantId = req.user!.merchantId!;
    const status = req.query.status as string;

    let query = 'SELECT * FROM credit_applications WHERE merchant_id = ?';
    const params: (string | number)[] = [merchantId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const applications = db.prepare(query).all(...params) as CreditApplicationRow[];

    res.json({
      success: true,
      data: applications.map(app => ({
        id: app.id,
        requestedAmount: app.requested_amount,
        purpose: app.purpose,
        termMonths: app.term_months,
        status: app.status,
        approvedAmount: app.approved_amount,
        interestRate: app.interest_rate,
        reviewedAt: app.reviewed_at,
        rejectionReason: app.rejection_reason,
        createdAt: app.created_at,
      })),
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get applications' } });
  }
});

// ==================== Admin Credit Routes ====================

/**
 * GET /api/admin/credit/scores
 * Get all merchant credit scores (admin)
 */
router.get('/admin/scores', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const grade = req.query.grade as string;
    const minScore = parseInt(req.query.minScore as string) || 0;
    const maxScore = parseInt(req.query.maxScore as string) || 1000;

    let whereClause = 'WHERE cs.score >= ? AND cs.score <= ?';
    const params: (string | number)[] = [minScore, maxScore];

    if (grade) {
      whereClause += ' AND cs.grade = ?';
      params.push(grade);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM merchant_credit_scores cs ${whereClause}
    `).get(...params) as { count: number };

    const scores = db.prepare(`
      SELECT cs.*, m.store_name, m.business_number, m.category
      FROM merchant_credit_scores cs
      JOIN merchants m ON cs.merchant_id = m.id
      ${whereClause}
      ORDER BY cs.score DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (MerchantCreditScoreRow & { store_name: string; business_number: string; category: string })[];

    res.json({
      success: true,
      data: {
        scores: scores.map(s => ({
          id: s.id,
          merchantId: s.merchant_id,
          storeName: s.store_name,
          businessNumber: s.business_number,
          category: s.category,
          score: s.score,
          grade: s.grade,
          factors: {
            paymentHistory: s.payment_history_score,
            volume: s.volume_score,
            tenure: s.tenure_score,
            compliance: s.compliance_score,
            growth: s.growth_score,
          },
          calculatedAt: s.calculated_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('Get all credit scores error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get credit scores' } });
  }
});

/**
 * GET /api/admin/credit/applications
 * Get all credit applications (admin)
 */
router.get('/admin/applications', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const status = req.query.status as string;

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (status) {
      whereClause += ' AND ca.status = ?';
      params.push(status);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM credit_applications ca ${whereClause}
    `).get(...params) as { count: number };

    const applications = db.prepare(`
      SELECT ca.*, m.store_name, m.business_number, cs.score, cs.grade
      FROM credit_applications ca
      JOIN merchants m ON ca.merchant_id = m.id
      LEFT JOIN merchant_credit_scores cs ON ca.merchant_id = cs.merchant_id
      ${whereClause}
      ORDER BY ca.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (CreditApplicationRow & { store_name: string; business_number: string; score: number; grade: string })[];

    res.json({
      success: true,
      data: {
        applications: applications.map(app => ({
          id: app.id,
          merchantId: app.merchant_id,
          storeName: app.store_name,
          businessNumber: app.business_number,
          creditScore: app.score,
          creditGrade: app.grade,
          requestedAmount: app.requested_amount,
          purpose: app.purpose,
          termMonths: app.term_months,
          status: app.status,
          approvedAmount: app.approved_amount,
          interestRate: app.interest_rate,
          reviewerId: app.reviewer_id,
          reviewedAt: app.reviewed_at,
          rejectionReason: app.rejection_reason,
          createdAt: app.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('Get all applications error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get applications' } });
  }
});

/**
 * GET /api/admin/credit/applications/:id
 * Get application details (admin)
 */
router.get('/admin/applications/:id', authenticate, requireAdmin, [
  param('id').isUUID().withMessage('Invalid application ID'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const db = getDb();

    const application = db.prepare(`
      SELECT ca.*, m.store_name, m.business_number, m.category, m.address, m.phone, m.email, m.is_verified,
             cs.score, cs.grade, cs.payment_history_score, cs.volume_score, cs.tenure_score, cs.compliance_score, cs.growth_score,
             u.name as reviewer_name
      FROM credit_applications ca
      JOIN merchants m ON ca.merchant_id = m.id
      LEFT JOIN merchant_credit_scores cs ON ca.merchant_id = cs.merchant_id
      LEFT JOIN users u ON ca.reviewer_id = u.id
      WHERE ca.id = ?
    `).get(req.params.id) as (CreditApplicationRow & MerchantCreditScoreRow & {
      store_name: string;
      business_number: string;
      category: string;
      address: string;
      phone: string;
      email: string;
      is_verified: number;
      reviewer_name: string | null;
    }) | undefined;

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Get merchant transaction summary for the last 6 months
    const txSummary = db.prepare(`
      SELECT
        COUNT(CASE WHEN type = 'payment' THEN 1 END) as payment_count,
        COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) as total_payments,
        COUNT(CASE WHEN type = 'refund' THEN 1 END) as refund_count,
        COALESCE(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END), 0) as total_refunds
      FROM transactions
      WHERE merchant_id = ? AND status = 'completed'
      AND created_at >= datetime('now', '-6 months')
    `).get(application.merchant_id) as {
      payment_count: number;
      total_payments: number;
      refund_count: number;
      total_refunds: number;
    };

    res.json({
      success: true,
      data: {
        application: {
          id: application.id,
          requestedAmount: application.requested_amount,
          purpose: application.purpose,
          termMonths: application.term_months,
          status: application.status,
          approvedAmount: application.approved_amount,
          interestRate: application.interest_rate,
          rejectionReason: application.rejection_reason,
          notes: application.notes,
          reviewedAt: application.reviewed_at,
          reviewerName: application.reviewer_name,
          createdAt: application.created_at,
        },
        merchant: {
          id: application.merchant_id,
          storeName: application.store_name,
          businessNumber: application.business_number,
          category: application.category,
          address: application.address,
          phone: application.phone,
          email: application.email,
          isVerified: application.is_verified === 1,
        },
        creditScore: {
          score: application.score,
          grade: application.grade,
          factors: {
            paymentHistory: application.payment_history_score,
            volume: application.volume_score,
            tenure: application.tenure_score,
            compliance: application.compliance_score,
            growth: application.growth_score,
          },
        },
        transactionSummary: {
          paymentCount: txSummary.payment_count,
          totalPayments: txSummary.total_payments,
          refundCount: txSummary.refund_count,
          totalRefunds: txSummary.total_refunds,
          refundRate: txSummary.payment_count > 0 ? (txSummary.refund_count / txSummary.payment_count) : 0,
        },
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get application details error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get application details' } });
  }
});

/**
 * PUT /api/admin/credit/applications/:id/approve
 * Approve application (admin)
 */
router.put('/admin/applications/:id/approve', authenticate, requireAdmin, [
  param('id').isUUID().withMessage('Invalid application ID'),
  body('approvedAmount').isInt({ min: 1 }).withMessage('Approved amount is required'),
  body('interestRate').isFloat({ min: 0, max: 1 }).withMessage('Interest rate must be between 0 and 1'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { approvedAmount, interestRate, notes } = req.body;
    const db = getDb();

    const application = db.prepare('SELECT * FROM credit_applications WHERE id = ?').get(req.params.id) as CreditApplicationRow | undefined;

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.status !== 'pending' && application.status !== 'reviewing') {
      throw new BadRequestError('Application cannot be approved in its current status');
    }

    db.prepare(`
      UPDATE credit_applications
      SET status = 'approved', approved_amount = ?, interest_rate = ?, notes = ?,
          reviewer_id = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(approvedAmount, interestRate, notes || null, req.user!.userId, req.params.id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'CREDIT_APPLICATION_APPROVED',
      req.user!.userId,
      'admin',
      'credit_application',
      req.params.id,
      `Credit application approved for ${approvedAmount} at ${(interestRate * 100).toFixed(2)}% interest`,
      JSON.stringify({ approvedAmount, interestRate, notes })
    );

    res.json({
      success: true,
      message: 'Application approved successfully',
      data: {
        id: req.params.id,
        approvedAmount,
        interestRate,
        status: 'approved',
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Approve application error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve application' } });
  }
});

/**
 * PUT /api/admin/credit/applications/:id/reject
 * Reject application (admin)
 */
router.put('/admin/applications/:id/reject', authenticate, requireAdmin, [
  param('id').isUUID().withMessage('Invalid application ID'),
  body('rejectionReason').notEmpty().withMessage('Rejection reason is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { rejectionReason, notes } = req.body;
    const db = getDb();

    const application = db.prepare('SELECT * FROM credit_applications WHERE id = ?').get(req.params.id) as CreditApplicationRow | undefined;

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.status !== 'pending' && application.status !== 'reviewing') {
      throw new BadRequestError('Application cannot be rejected in its current status');
    }

    db.prepare(`
      UPDATE credit_applications
      SET status = 'rejected', rejection_reason = ?, notes = ?,
          reviewer_id = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(rejectionReason, notes || null, req.user!.userId, req.params.id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'CREDIT_APPLICATION_REJECTED',
      req.user!.userId,
      'admin',
      'credit_application',
      req.params.id,
      `Credit application rejected: ${rejectionReason}`,
      JSON.stringify({ rejectionReason, notes })
    );

    res.json({
      success: true,
      message: 'Application rejected',
      data: {
        id: req.params.id,
        rejectionReason,
        status: 'rejected',
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Reject application error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reject application' } });
  }
});

/**
 * POST /api/admin/credit/recalculate/:merchantId
 * Recalculate score for a merchant (admin)
 */
router.post('/admin/recalculate/:merchantId', authenticate, requireAdmin, [
  param('merchantId').isUUID().withMessage('Invalid merchant ID'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const db = getDb();
    const { merchantId } = req.params;

    // Verify merchant exists
    const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(merchantId) as MerchantRow | undefined;
    if (!merchant) {
      throw new NotFoundError('Merchant not found');
    }

    // Calculate new score
    const factors = calculateCreditFactors(merchantId);

    // Get existing score record
    const existingScore = db.prepare('SELECT * FROM merchant_credit_scores WHERE merchant_id = ?').get(merchantId) as MerchantCreditScoreRow | undefined;

    if (existingScore) {
      // Update existing score
      db.prepare(`
        UPDATE merchant_credit_scores
        SET score = ?, grade = ?, payment_history_score = ?, volume_score = ?, tenure_score = ?,
            compliance_score = ?, growth_score = ?, calculated_at = datetime('now'), updated_at = datetime('now')
        WHERE merchant_id = ?
      `).run(
        factors.totalScore,
        factors.grade,
        factors.paymentHistoryScore,
        factors.volumeScore,
        factors.tenureScore,
        factors.complianceScore,
        factors.growthScore,
        merchantId
      );
    } else {
      // Insert new score
      db.prepare(`
        INSERT INTO merchant_credit_scores (id, merchant_id, score, grade, payment_history_score, volume_score, tenure_score, compliance_score, growth_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        merchantId,
        factors.totalScore,
        factors.grade,
        factors.paymentHistoryScore,
        factors.volumeScore,
        factors.tenureScore,
        factors.complianceScore,
        factors.growthScore
      );
    }

    // Record in history
    db.prepare(`
      INSERT INTO merchant_credit_history (id, merchant_id, score, grade, factors)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      merchantId,
      factors.totalScore,
      factors.grade,
      JSON.stringify(factors)
    );

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'CREDIT_SCORE_RECALCULATED',
      req.user!.userId,
      'admin',
      'merchant',
      merchantId,
      `Credit score recalculated: ${existingScore?.score || 0} -> ${factors.totalScore} (${factors.grade})`,
      JSON.stringify({
        previousScore: existingScore?.score || 0,
        previousGrade: existingScore?.grade || 'N/A',
        newScore: factors.totalScore,
        newGrade: factors.grade,
        factors,
      })
    );

    res.json({
      success: true,
      message: 'Credit score recalculated successfully',
      data: {
        merchantId,
        storeName: merchant.store_name,
        previousScore: existingScore?.score || null,
        previousGrade: existingScore?.grade || null,
        newScore: factors.totalScore,
        newGrade: factors.grade,
        factors: {
          paymentHistory: factors.paymentHistoryScore,
          volume: factors.volumeScore,
          tenure: factors.tenureScore,
          compliance: factors.complianceScore,
          growth: factors.growthScore,
        },
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Recalculate credit score error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to recalculate credit score' } });
  }
});

export default router;
