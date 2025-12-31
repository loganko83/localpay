/**
 * Carbon Points Routes
 * Environmental impact tracking and carbon credit management
 * Earn points for eco-friendly activities, track CO2 savings
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();

// Carbon calculation rates
const CARBON_RATES = {
  local_purchase: {
    pointsPer1000KRW: 0.5,
    co2Kg: 0.1,
  },
  public_transport: {
    pointsPerTrip: 10,
    co2Kg: 2,
  },
  eco_merchant: {
    multiplier: 2,
  },
  bike_share: {
    pointsPerKm: 5,
    co2KgPerKm: 0.2,
  },
  recycling: {
    pointsPerItem: 20,
    co2Kg: 0.5,
  },
} as const;

// 1 tree absorbs approximately 22kg CO2 per year
const CO2_PER_TREE_KG = 22;

interface CarbonAccountRow {
  id: string;
  user_id: string;
  points_balance: number;
  lifetime_points: number;
  co2_saved_kg: number;
  trees_equivalent: number;
  created_at: string;
  updated_at: string;
}

interface CarbonTransactionRow {
  id: string;
  account_id: string;
  points: number;
  co2_kg: number | null;
  type: string;
  activity_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

type ActivityType = 'local_purchase' | 'public_transport' | 'eco_merchant' | 'bike_share' | 'recycling';

/**
 * Get or create carbon account for user
 */
function getOrCreateCarbonAccount(userId: string): CarbonAccountRow {
  const db = getDb();

  let account = db.prepare('SELECT * FROM carbon_accounts WHERE user_id = ?').get(userId) as CarbonAccountRow | undefined;

  if (!account) {
    const accountId = uuidv4();
    db.prepare(`
      INSERT INTO carbon_accounts (id, user_id, points_balance, lifetime_points, co2_saved_kg, trees_equivalent)
      VALUES (?, ?, 0, 0, 0, 0)
    `).run(accountId, userId);

    account = db.prepare('SELECT * FROM carbon_accounts WHERE id = ?').get(accountId) as CarbonAccountRow;
  }

  return account;
}

/**
 * Calculate carbon savings for a given activity
 */
function calculateCarbonSavings(
  activityType: ActivityType,
  params: { amount?: number; distance?: number; quantity?: number; isEcoMerchant?: boolean }
): { points: number; co2Kg: number } {
  let points = 0;
  let co2Kg = 0;

  switch (activityType) {
    case 'local_purchase':
      if (params.amount) {
        points = Math.floor((params.amount / 1000) * CARBON_RATES.local_purchase.pointsPer1000KRW);
        co2Kg = (params.amount / 1000) * CARBON_RATES.local_purchase.co2Kg;
      }
      break;
    case 'public_transport':
      points = CARBON_RATES.public_transport.pointsPerTrip;
      co2Kg = CARBON_RATES.public_transport.co2Kg;
      break;
    case 'eco_merchant':
      if (params.amount) {
        const basePoints = Math.floor((params.amount / 1000) * CARBON_RATES.local_purchase.pointsPer1000KRW);
        points = basePoints * CARBON_RATES.eco_merchant.multiplier;
        co2Kg = (params.amount / 1000) * CARBON_RATES.local_purchase.co2Kg * CARBON_RATES.eco_merchant.multiplier;
      }
      break;
    case 'bike_share':
      if (params.distance) {
        points = Math.floor(params.distance * CARBON_RATES.bike_share.pointsPerKm);
        co2Kg = params.distance * CARBON_RATES.bike_share.co2KgPerKm;
      }
      break;
    case 'recycling':
      const quantity = params.quantity || 1;
      points = CARBON_RATES.recycling.pointsPerItem * quantity;
      co2Kg = CARBON_RATES.recycling.co2Kg * quantity;
      break;
  }

  // Apply eco merchant multiplier if applicable
  if (params.isEcoMerchant && activityType === 'local_purchase') {
    points = points * CARBON_RATES.eco_merchant.multiplier;
    co2Kg = co2Kg * CARBON_RATES.eco_merchant.multiplier;
  }

  return { points, co2Kg };
}

// ==================== User Endpoints ====================

/**
 * GET /api/carbon/balance
 * Get user's carbon points balance and impact stats
 */
router.get('/balance', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const account = getOrCreateCarbonAccount(req.user!.userId);

    res.json({
      success: true,
      data: {
        pointsBalance: account.points_balance,
        lifetimePoints: account.lifetime_points,
        co2SavedKg: parseFloat(account.co2_saved_kg.toFixed(2)),
        treesEquivalent: parseFloat(account.trees_equivalent.toFixed(2)),
        updatedAt: account.updated_at,
      },
    });
  } catch (error) {
    console.error('Get carbon balance error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get carbon balance' } });
  }
});

/**
 * GET /api/carbon/history
 * Get carbon points transaction history
 */
router.get('/history', authenticate, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['earn', 'redeem', 'expire']),
  query('activityType').optional().isIn(['local_purchase', 'public_transport', 'eco_merchant', 'bike_share', 'recycling']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const type = req.query.type as string;
    const activityType = req.query.activityType as string;

    const account = getOrCreateCarbonAccount(req.user!.userId);
    const db = getDb();

    let whereClause = 'WHERE ct.account_id = ?';
    const params: (string | number)[] = [account.id];

    if (type) {
      whereClause += ' AND ct.type = ?';
      params.push(type);
    }

    if (activityType) {
      whereClause += ' AND ct.activity_type = ?';
      params.push(activityType);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM carbon_transactions ct ${whereClause}
    `).get(...params) as { count: number };

    const transactions = db.prepare(`
      SELECT ct.*
      FROM carbon_transactions ct
      ${whereClause}
      ORDER BY ct.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as CarbonTransactionRow[];

    res.json({
      success: true,
      data: {
        transactions: transactions.map(tx => ({
          id: tx.id,
          points: tx.points,
          co2Kg: tx.co2_kg ? parseFloat(tx.co2_kg.toFixed(2)) : null,
          type: tx.type,
          activityType: tx.activity_type,
          referenceId: tx.reference_id,
          description: tx.description,
          createdAt: tx.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('Get carbon history error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get carbon history' } });
  }
});

/**
 * POST /api/carbon/earn
 * Earn carbon points (internal endpoint, typically called after eco-activity)
 */
router.post('/earn', authenticate, [
  body('activityType').isIn(['local_purchase', 'public_transport', 'eco_merchant', 'bike_share', 'recycling']).withMessage('Invalid activity type'),
  body('amount').optional().isInt({ min: 0 }).withMessage('Amount must be positive'),
  body('distance').optional().isFloat({ min: 0 }).withMessage('Distance must be positive'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('referenceId').optional().isString(),
  body('description').optional().isString(),
  body('isEcoMerchant').optional().isBoolean(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { activityType, amount, distance, quantity, referenceId, description, isEcoMerchant } = req.body;

    // Calculate points and CO2 savings
    const { points, co2Kg } = calculateCarbonSavings(activityType as ActivityType, {
      amount,
      distance,
      quantity,
      isEcoMerchant,
    });

    if (points <= 0) {
      throw new BadRequestError('No points earned for this activity');
    }

    const db = getDb();
    const account = getOrCreateCarbonAccount(req.user!.userId);
    const transactionId = uuidv4();

    // Calculate new trees equivalent
    const newCo2Total = account.co2_saved_kg + co2Kg;
    const newTreesEquivalent = newCo2Total / CO2_PER_TREE_KG;

    // Create transaction record
    db.prepare(`
      INSERT INTO carbon_transactions (id, account_id, points, co2_kg, type, activity_type, reference_id, description)
      VALUES (?, ?, ?, ?, 'earn', ?, ?, ?)
    `).run(transactionId, account.id, points, co2Kg, activityType, referenceId || null, description || null);

    // Update account balance
    db.prepare(`
      UPDATE carbon_accounts
      SET points_balance = points_balance + ?,
          lifetime_points = lifetime_points + ?,
          co2_saved_kg = ?,
          trees_equivalent = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(points, points, newCo2Total, newTreesEquivalent, account.id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'CARBON_POINTS_EARNED',
      req.user!.userId,
      req.user!.userType,
      'carbon_account',
      account.id,
      `Earned ${points} carbon points from ${activityType}`,
      JSON.stringify({ points, co2Kg, activityType, referenceId })
    );

    const updatedAccount = db.prepare('SELECT * FROM carbon_accounts WHERE id = ?').get(account.id) as CarbonAccountRow;

    res.json({
      success: true,
      data: {
        transactionId,
        pointsEarned: points,
        co2SavedKg: parseFloat(co2Kg.toFixed(2)),
        activityType,
        newBalance: updatedAccount.points_balance,
        lifetimePoints: updatedAccount.lifetime_points,
        totalCo2SavedKg: parseFloat(updatedAccount.co2_saved_kg.toFixed(2)),
        treesEquivalent: parseFloat(updatedAccount.trees_equivalent.toFixed(2)),
      },
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Earn carbon points error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to earn carbon points' } });
  }
});

/**
 * POST /api/carbon/calculate
 * Calculate carbon savings for an activity (preview without saving)
 */
router.post('/calculate', authenticate, [
  body('activityType').isIn(['local_purchase', 'public_transport', 'eco_merchant', 'bike_share', 'recycling']).withMessage('Invalid activity type'),
  body('amount').optional().isInt({ min: 0 }).withMessage('Amount must be positive'),
  body('distance').optional().isFloat({ min: 0 }).withMessage('Distance must be positive'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('isEcoMerchant').optional().isBoolean(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { activityType, amount, distance, quantity, isEcoMerchant } = req.body;

    const { points, co2Kg } = calculateCarbonSavings(activityType as ActivityType, {
      amount,
      distance,
      quantity,
      isEcoMerchant,
    });

    const treesEquivalent = co2Kg / CO2_PER_TREE_KG;

    res.json({
      success: true,
      data: {
        activityType,
        points,
        co2Kg: parseFloat(co2Kg.toFixed(2)),
        treesEquivalent: parseFloat(treesEquivalent.toFixed(4)),
        rates: CARBON_RATES[activityType as ActivityType],
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Calculate carbon savings error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to calculate carbon savings' } });
  }
});

/**
 * POST /api/carbon/redeem
 * Redeem carbon points
 */
router.post('/redeem', authenticate, [
  body('points').isInt({ min: 1 }).withMessage('Points must be at least 1'),
  body('rewardType').optional().isString(),
  body('description').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { points, rewardType, description } = req.body;
    const db = getDb();
    const account = getOrCreateCarbonAccount(req.user!.userId);

    if (account.points_balance < points) {
      throw new BadRequestError('Insufficient carbon points');
    }

    const transactionId = uuidv4();

    // Create redeem transaction
    db.prepare(`
      INSERT INTO carbon_transactions (id, account_id, points, type, description)
      VALUES (?, ?, ?, 'redeem', ?)
    `).run(transactionId, account.id, -points, description || `Redeemed for ${rewardType || 'reward'}`);

    // Update account balance
    db.prepare(`
      UPDATE carbon_accounts
      SET points_balance = points_balance - ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(points, account.id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'CARBON_POINTS_REDEEMED',
      req.user!.userId,
      req.user!.userType,
      'carbon_account',
      account.id,
      `Redeemed ${points} carbon points`,
      JSON.stringify({ points, rewardType })
    );

    const updatedAccount = db.prepare('SELECT * FROM carbon_accounts WHERE id = ?').get(account.id) as CarbonAccountRow;

    res.json({
      success: true,
      data: {
        transactionId,
        pointsRedeemed: points,
        newBalance: updatedAccount.points_balance,
        message: `Successfully redeemed ${points} carbon points`,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Redeem carbon points error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to redeem carbon points' } });
  }
});

/**
 * GET /api/carbon/impact
 * Get user's environmental impact summary
 */
router.get('/impact', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const account = getOrCreateCarbonAccount(req.user!.userId);
    const db = getDb();

    // Get activity breakdown
    const activityBreakdown = db.prepare(`
      SELECT
        activity_type,
        COUNT(*) as count,
        SUM(points) as total_points,
        SUM(co2_kg) as total_co2
      FROM carbon_transactions
      WHERE account_id = ? AND type = 'earn' AND activity_type IS NOT NULL
      GROUP BY activity_type
    `).all(account.id) as { activity_type: string; count: number; total_points: number; total_co2: number }[];

    // Get monthly trend (last 6 months)
    const monthlyTrend = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END) as earned,
        SUM(CASE WHEN type = 'redeem' THEN ABS(points) ELSE 0 END) as redeemed,
        SUM(CASE WHEN type = 'earn' THEN co2_kg ELSE 0 END) as co2_saved
      FROM carbon_transactions
      WHERE account_id = ? AND created_at >= datetime('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `).all(account.id) as { month: string; earned: number; redeemed: number; co2_saved: number }[];

    // Calculate equivalents
    const co2Saved = account.co2_saved_kg;
    const equivalents = {
      treesPlanted: parseFloat((co2Saved / CO2_PER_TREE_KG).toFixed(2)),
      carKmAvoided: parseFloat((co2Saved / 0.21).toFixed(2)), // Average car emits 0.21 kg CO2/km
      electricityKwhSaved: parseFloat((co2Saved / 0.5).toFixed(2)), // Average 0.5 kg CO2/kWh
      plasticBottlesRecycled: Math.floor(co2Saved / 0.082), // About 82g CO2 per bottle
    };

    res.json({
      success: true,
      data: {
        summary: {
          lifetimePoints: account.lifetime_points,
          currentBalance: account.points_balance,
          co2SavedKg: parseFloat(co2Saved.toFixed(2)),
          treesEquivalent: account.trees_equivalent,
        },
        activityBreakdown: activityBreakdown.map(a => ({
          activityType: a.activity_type,
          count: a.count,
          totalPoints: a.total_points,
          totalCo2Kg: parseFloat((a.total_co2 || 0).toFixed(2)),
        })),
        monthlyTrend: monthlyTrend.map(m => ({
          month: m.month,
          earned: m.earned,
          redeemed: m.redeemed,
          co2SavedKg: parseFloat((m.co2_saved || 0).toFixed(2)),
        })),
        equivalents,
      },
    });
  } catch (error) {
    console.error('Get carbon impact error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get carbon impact' } });
  }
});

/**
 * GET /api/carbon/leaderboard
 * Get top carbon savers
 */
router.get('/leaderboard', authenticate, [
  query('period').optional().isIn(['all', 'month', 'week']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const period = req.query.period as string || 'all';
    const limit = parseInt(req.query.limit as string) || 10;

    const db = getDb();
    let dateFilter = '';

    if (period === 'month') {
      dateFilter = "AND ct.created_at >= datetime('now', '-1 month')";
    } else if (period === 'week') {
      dateFilter = "AND ct.created_at >= datetime('now', '-7 days')";
    }

    const leaderboard = db.prepare(`
      SELECT
        ca.user_id,
        u.name as user_name,
        ${period === 'all' ? 'ca.lifetime_points as total_points' : 'COALESCE(SUM(ct.points), 0) as total_points'},
        ${period === 'all' ? 'ca.co2_saved_kg as total_co2' : 'COALESCE(SUM(ct.co2_kg), 0) as total_co2'}
      FROM carbon_accounts ca
      JOIN users u ON ca.user_id = u.id
      ${period !== 'all' ? 'LEFT JOIN carbon_transactions ct ON ca.id = ct.account_id AND ct.type = \'earn\'' + dateFilter : ''}
      ${period !== 'all' ? 'GROUP BY ca.id, ca.user_id, u.name' : ''}
      ORDER BY total_points DESC
      LIMIT ?
    `).all(limit) as { user_id: string; user_name: string; total_points: number; total_co2: number }[];

    // Find current user's rank
    const userAccount = getOrCreateCarbonAccount(req.user!.userId);
    let userRank: number | null = null;

    if (period === 'all') {
      const rankResult = db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM carbon_accounts
        WHERE lifetime_points > ?
      `).get(userAccount.lifetime_points) as { rank: number };
      userRank = rankResult.rank;
    } else {
      const userPointsResult = db.prepare(`
        SELECT COALESCE(SUM(points), 0) as points
        FROM carbon_transactions
        WHERE account_id = ? AND type = 'earn' ${dateFilter}
      `).get(userAccount.id) as { points: number };

      const rankResult = db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM (
          SELECT ca.id, COALESCE(SUM(ct.points), 0) as total
          FROM carbon_accounts ca
          LEFT JOIN carbon_transactions ct ON ca.id = ct.account_id AND ct.type = 'earn' ${dateFilter}
          GROUP BY ca.id
          HAVING total > ?
        )
      `).get(userPointsResult.points) as { rank: number };
      userRank = rankResult.rank;
    }

    res.json({
      success: true,
      data: {
        period,
        leaderboard: leaderboard.map((entry, index) => ({
          rank: index + 1,
          userId: entry.user_id,
          userName: entry.user_name,
          totalPoints: entry.total_points,
          co2SavedKg: parseFloat((entry.total_co2 || 0).toFixed(2)),
          isCurrentUser: entry.user_id === req.user!.userId,
        })),
        currentUser: {
          rank: userRank,
          points: userAccount.lifetime_points,
          co2SavedKg: parseFloat(userAccount.co2_saved_kg.toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error('Get carbon leaderboard error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get leaderboard' } });
  }
});

// ==================== Admin Endpoints ====================

/**
 * GET /api/admin/carbon/stats
 * Get platform-wide carbon statistics (admin only)
 */
router.get('/admin/stats', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Overall platform stats
    const overallStats = db.prepare(`
      SELECT
        COUNT(*) as total_accounts,
        COALESCE(SUM(points_balance), 0) as total_points_balance,
        COALESCE(SUM(lifetime_points), 0) as total_lifetime_points,
        COALESCE(SUM(co2_saved_kg), 0) as total_co2_saved,
        COALESCE(SUM(trees_equivalent), 0) as total_trees
      FROM carbon_accounts
    `).get() as {
      total_accounts: number;
      total_points_balance: number;
      total_lifetime_points: number;
      total_co2_saved: number;
      total_trees: number;
    };

    // Transaction stats
    const transactionStats = db.prepare(`
      SELECT
        type,
        COUNT(*) as count,
        COALESCE(SUM(ABS(points)), 0) as total_points,
        COALESCE(SUM(co2_kg), 0) as total_co2
      FROM carbon_transactions
      GROUP BY type
    `).all() as { type: string; count: number; total_points: number; total_co2: number }[];

    // Activity type breakdown
    const activityStats = db.prepare(`
      SELECT
        activity_type,
        COUNT(*) as count,
        COALESCE(SUM(points), 0) as total_points,
        COALESCE(SUM(co2_kg), 0) as total_co2
      FROM carbon_transactions
      WHERE type = 'earn' AND activity_type IS NOT NULL
      GROUP BY activity_type
      ORDER BY total_points DESC
    `).all() as { activity_type: string; count: number; total_points: number; total_co2: number }[];

    // Daily trend (last 30 days)
    const dailyTrend = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as transactions,
        COALESCE(SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END), 0) as points_earned,
        COALESCE(SUM(CASE WHEN type = 'redeem' THEN ABS(points) ELSE 0 END), 0) as points_redeemed,
        COALESCE(SUM(CASE WHEN type = 'earn' THEN co2_kg ELSE 0 END), 0) as co2_saved
      FROM carbon_transactions
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all() as { date: string; transactions: number; points_earned: number; points_redeemed: number; co2_saved: number }[];

    // Top earners
    const topEarners = db.prepare(`
      SELECT
        ca.user_id,
        u.name as user_name,
        ca.lifetime_points,
        ca.co2_saved_kg
      FROM carbon_accounts ca
      JOIN users u ON ca.user_id = u.id
      ORDER BY ca.lifetime_points DESC
      LIMIT 10
    `).all() as { user_id: string; user_name: string; lifetime_points: number; co2_saved_kg: number }[];

    res.json({
      success: true,
      data: {
        overview: {
          totalAccounts: overallStats.total_accounts,
          totalPointsBalance: overallStats.total_points_balance,
          totalLifetimePoints: overallStats.total_lifetime_points,
          totalCo2SavedKg: parseFloat(overallStats.total_co2_saved.toFixed(2)),
          totalTreesEquivalent: parseFloat(overallStats.total_trees.toFixed(2)),
        },
        transactionStats: transactionStats.map(t => ({
          type: t.type,
          count: t.count,
          totalPoints: t.total_points,
          totalCo2Kg: parseFloat((t.total_co2 || 0).toFixed(2)),
        })),
        activityBreakdown: activityStats.map(a => ({
          activityType: a.activity_type,
          count: a.count,
          totalPoints: a.total_points,
          totalCo2Kg: parseFloat((a.total_co2 || 0).toFixed(2)),
        })),
        dailyTrend: dailyTrend.map(d => ({
          date: d.date,
          transactions: d.transactions,
          pointsEarned: d.points_earned,
          pointsRedeemed: d.points_redeemed,
          co2SavedKg: parseFloat((d.co2_saved || 0).toFixed(2)),
        })),
        topEarners: topEarners.map((e, i) => ({
          rank: i + 1,
          userId: e.user_id,
          userName: e.user_name,
          lifetimePoints: e.lifetime_points,
          co2SavedKg: parseFloat(e.co2_saved_kg.toFixed(2)),
        })),
      },
    });
  } catch (error) {
    console.error('Get carbon admin stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get carbon stats' } });
  }
});

/**
 * GET /api/admin/carbon/merchants
 * Get eco-certified merchant rankings (admin only)
 */
router.get('/admin/merchants', authenticate, requireAdmin, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;

    const db = getDb();

    // Get merchants with carbon transaction stats
    // Note: This requires joining with transactions that have eco_merchant activity type
    const countResult = db.prepare(`
      SELECT COUNT(DISTINCT m.id) as count
      FROM merchants m
      JOIN transactions t ON t.merchant_id = m.id AND t.status = 'completed'
    `).get() as { count: number };

    const merchants = db.prepare(`
      SELECT
        m.id,
        m.store_name,
        m.category,
        m.is_verified,
        COUNT(t.id) as total_transactions,
        COALESCE(SUM(t.amount), 0) as total_volume,
        COALESCE(SUM(t.amount) / 1000 * 0.5, 0) as estimated_carbon_points,
        COALESCE(SUM(t.amount) / 1000 * 0.1, 0) as estimated_co2_saved
      FROM merchants m
      LEFT JOIN transactions t ON t.merchant_id = m.id AND t.status = 'completed' AND t.type = 'payment'
      GROUP BY m.id
      ORDER BY estimated_carbon_points DESC
      LIMIT ? OFFSET ?
    `).all(size, page * size) as {
      id: string;
      store_name: string;
      category: string;
      is_verified: number;
      total_transactions: number;
      total_volume: number;
      estimated_carbon_points: number;
      estimated_co2_saved: number;
    }[];

    res.json({
      success: true,
      data: {
        merchants: merchants.map((m, index) => ({
          rank: page * size + index + 1,
          merchantId: m.id,
          storeName: m.store_name,
          category: m.category,
          isVerified: m.is_verified === 1,
          totalTransactions: m.total_transactions,
          totalVolume: m.total_volume,
          estimatedCarbonPoints: Math.floor(m.estimated_carbon_points),
          estimatedCo2SavedKg: parseFloat(m.estimated_co2_saved.toFixed(2)),
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('Get eco merchants error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get eco merchant rankings' } });
  }
});

export default router;
