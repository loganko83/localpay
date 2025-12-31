/**
 * Loyalty Points Routes
 * Loyalty program management: points earning, redemption, tiers, and rewards
 * NOTE: Points are internal currency - not regulated financial instruments
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, param, query, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, requireAdmin, requireMerchant, AuthenticatedRequest } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';

const router = Router();

// ==================== Type Definitions ====================

interface LoyaltyAccountRow {
  id: string;
  user_id: string;
  points_balance: number;
  lifetime_points: number;
  tier: string;
  tier_points: number;
  tier_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LoyaltyTransactionRow {
  id: string;
  account_id: string;
  points: number;
  type: string;
  source: string | null;
  reference_id: string | null;
  description: string | null;
  expires_at: string | null;
  created_at: string;
}

interface LoyaltyRewardRow {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: string;
  value: number | null;
  quantity: number | null;
  redeemed_count: number;
  image_url: string | null;
  merchant_id: string | null;
  status: string;
  valid_until: string | null;
  created_at: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
}

// ==================== Tier Configuration ====================

const TIER_CONFIG = {
  bronze: { min: 0, max: 9999, name: 'Bronze', earnMultiplier: 1.0, benefits: ['Basic points earning (1 point per 100 KRW)', 'Access to standard rewards'] },
  silver: { min: 10000, max: 49999, name: 'Silver', earnMultiplier: 1.1, benefits: ['10% bonus points on all purchases', 'Priority customer support', 'Early access to promotions'] },
  gold: { min: 50000, max: 99999, name: 'Gold', earnMultiplier: 1.25, benefits: ['25% bonus points on all purchases', 'Free delivery on orders over 30,000 KRW', 'Exclusive member discounts', 'Birthday bonus points'] },
  platinum: { min: 100000, max: 199999, name: 'Platinum', earnMultiplier: 1.5, benefits: ['50% bonus points on all purchases', 'Free delivery on all orders', 'VIP customer service', 'Special event invitations', 'Double points on weekends'] },
  diamond: { min: 200000, max: Infinity, name: 'Diamond', earnMultiplier: 2.0, benefits: ['100% bonus points on all purchases', 'Unlimited free delivery', 'Dedicated account manager', 'Exclusive Diamond-only rewards', 'First access to new merchants', 'Annual anniversary gift'] },
};

// Points earning rate: 1 point per 100 KRW spent
const BASE_EARN_RATE = 0.01;

// ==================== Helper Functions ====================

/**
 * Calculate tier based on tier points
 */
function calculateTier(tierPoints: number): keyof typeof TIER_CONFIG {
  if (tierPoints >= TIER_CONFIG.diamond.min) return 'diamond';
  if (tierPoints >= TIER_CONFIG.platinum.min) return 'platinum';
  if (tierPoints >= TIER_CONFIG.gold.min) return 'gold';
  if (tierPoints >= TIER_CONFIG.silver.min) return 'silver';
  return 'bronze';
}

/**
 * Get or create loyalty account for user
 */
function getOrCreateLoyaltyAccount(userId: string): LoyaltyAccountRow {
  const db = getDb();

  let account = db.prepare('SELECT * FROM loyalty_accounts WHERE user_id = ?').get(userId) as LoyaltyAccountRow | undefined;

  if (!account) {
    const accountId = uuidv4();
    const tierExpiresAt = new Date();
    tierExpiresAt.setFullYear(tierExpiresAt.getFullYear() + 1);

    db.prepare(`
      INSERT INTO loyalty_accounts (id, user_id, points_balance, lifetime_points, tier, tier_points, tier_expires_at)
      VALUES (?, ?, 0, 0, 'bronze', 0, ?)
    `).run(accountId, userId, tierExpiresAt.toISOString());

    account = db.prepare('SELECT * FROM loyalty_accounts WHERE id = ?').get(accountId) as LoyaltyAccountRow;
  }

  return account;
}

/**
 * Update tier based on current tier points
 */
function updateTierIfNeeded(accountId: string): void {
  const db = getDb();
  const account = db.prepare('SELECT * FROM loyalty_accounts WHERE id = ?').get(accountId) as LoyaltyAccountRow;

  const newTier = calculateTier(account.tier_points);

  if (newTier !== account.tier) {
    db.prepare(`
      UPDATE loyalty_accounts
      SET tier = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newTier, accountId);
  }
}

/**
 * Log audit entry
 */
function logAudit(action: string, actorId: string, actorType: string, targetType: string, targetId: string, description: string, metadata?: Record<string, unknown>): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
    VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), action, actorId, actorType, targetType, targetId, description, metadata ? JSON.stringify(metadata) : null);
}

// ==================== Consumer Endpoints ====================

/**
 * GET /api/loyalty/balance
 * Get user's loyalty balance and tier information
 */
router.get('/balance', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const account = getOrCreateLoyaltyAccount(req.user!.userId);
    const tierConfig = TIER_CONFIG[account.tier as keyof typeof TIER_CONFIG];
    const nextTier = account.tier !== 'diamond'
      ? Object.entries(TIER_CONFIG).find(([, config]) => config.min > account.tier_points)
      : null;

    res.json({
      success: true,
      data: {
        pointsBalance: account.points_balance,
        lifetimePoints: account.lifetime_points,
        tier: {
          current: account.tier,
          name: tierConfig.name,
          points: account.tier_points,
          earnMultiplier: tierConfig.earnMultiplier,
          expiresAt: account.tier_expires_at,
        },
        nextTier: nextTier ? {
          tier: nextTier[0],
          name: nextTier[1].name,
          pointsRequired: nextTier[1].min,
          pointsNeeded: nextTier[1].min - account.tier_points,
        } : null,
        benefits: tierConfig.benefits,
      },
    });
  } catch (error) {
    console.error('Get loyalty balance error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get loyalty balance' } });
  }
});

/**
 * GET /api/loyalty/history
 * Get points transaction history
 */
router.get('/history', authenticate, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isIn(['earn', 'redeem', 'expire', 'adjust', 'bonus']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const page = (req.query.page as unknown as number) || 1;
    const limit = (req.query.limit as unknown as number) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type as string | undefined;

    const account = getOrCreateLoyaltyAccount(req.user!.userId);
    const db = getDb();

    let whereClause = 'WHERE lt.account_id = ?';
    const params: (string | number)[] = [account.id];

    if (type) {
      whereClause += ' AND lt.type = ?';
      params.push(type);
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM loyalty_transactions lt ${whereClause}
    `).get(...params) as { total: number };

    // Get transactions
    const transactions = db.prepare(`
      SELECT lt.* FROM loyalty_transactions lt
      ${whereClause}
      ORDER BY lt.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as LoyaltyTransactionRow[];

    res.json({
      success: true,
      data: {
        transactions: transactions.map((tx) => ({
          id: tx.id,
          points: tx.points,
          type: tx.type,
          source: tx.source,
          referenceId: tx.reference_id,
          description: tx.description,
          expiresAt: tx.expires_at,
          createdAt: tx.created_at,
        })),
        pagination: {
          page,
          limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get loyalty history error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get loyalty history' } });
  }
});

/**
 * POST /api/loyalty/earn
 * Earn points after payment (internal API - called after payment completion)
 */
router.post('/earn', authenticate, [
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  body('transactionId').notEmpty().withMessage('Transaction ID is required'),
  body('source').optional().isString(),
  body('description').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { amount, transactionId, source, description } = req.body;
    const db = getDb();
    const account = getOrCreateLoyaltyAccount(req.user!.userId);

    // Check if points already earned for this transaction
    const existingEarn = db.prepare(`
      SELECT id FROM loyalty_transactions
      WHERE account_id = ? AND reference_id = ? AND type = 'earn'
    `).get(account.id, transactionId);

    if (existingEarn) {
      throw new BadRequestError('Points already earned for this transaction');
    }

    // Calculate points to earn based on tier multiplier
    const tierConfig = TIER_CONFIG[account.tier as keyof typeof TIER_CONFIG];
    const basePoints = Math.floor(amount * BASE_EARN_RATE);
    const earnedPoints = Math.floor(basePoints * tierConfig.earnMultiplier);

    // Set expiration date (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Create loyalty transaction
    const loyaltyTxId = uuidv4();
    db.prepare(`
      INSERT INTO loyalty_transactions (id, account_id, points, type, source, reference_id, description, expires_at)
      VALUES (?, ?, ?, 'earn', ?, ?, ?, ?)
    `).run(loyaltyTxId, account.id, earnedPoints, source || 'payment', transactionId, description || 'Points earned from purchase', expiresAt.toISOString());

    // Update account balance and tier points
    db.prepare(`
      UPDATE loyalty_accounts
      SET points_balance = points_balance + ?,
          lifetime_points = lifetime_points + ?,
          tier_points = tier_points + ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(earnedPoints, earnedPoints, earnedPoints, account.id);

    // Check and update tier if needed
    updateTierIfNeeded(account.id);

    // Get updated account
    const updatedAccount = db.prepare('SELECT * FROM loyalty_accounts WHERE id = ?').get(account.id) as LoyaltyAccountRow;

    // Log audit
    logAudit('LOYALTY_POINTS_EARNED', req.user!.userId, req.user!.userType, 'loyalty_account', account.id,
      `Earned ${earnedPoints} points from ${amount.toLocaleString()} KRW purchase`,
      { amount, basePoints, multiplier: tierConfig.earnMultiplier, earnedPoints, transactionId });

    res.json({
      success: true,
      data: {
        pointsEarned: earnedPoints,
        basePoints,
        bonusMultiplier: tierConfig.earnMultiplier,
        newBalance: updatedAccount.points_balance,
        newTierPoints: updatedAccount.tier_points,
        tier: updatedAccount.tier,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Earn points error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to earn points' } });
  }
});

/**
 * POST /api/loyalty/redeem
 * Redeem points for wallet value
 */
router.post('/redeem', authenticate, [
  body('points').isInt({ min: 100 }).withMessage('Minimum 100 points required for redemption'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { points } = req.body;
    const db = getDb();
    const account = getOrCreateLoyaltyAccount(req.user!.userId);

    // Check sufficient balance
    if (account.points_balance < points) {
      throw new BadRequestError('Insufficient points balance');
    }

    // Calculate value (1 point = 1 KRW)
    const value = points;

    // Create redemption transaction
    const txId = uuidv4();
    db.prepare(`
      INSERT INTO loyalty_transactions (id, account_id, points, type, source, description)
      VALUES (?, ?, ?, 'redeem', 'wallet', ?)
    `).run(txId, account.id, -points, `Redeemed ${points} points for ${value.toLocaleString()} KRW`);

    // Update account balance
    db.prepare(`
      UPDATE loyalty_accounts
      SET points_balance = points_balance - ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(points, account.id);

    // Add value to wallet
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.userId) as { id: string; balance: number } | undefined;

    if (wallet) {
      db.prepare(`
        UPDATE wallets
        SET balance = balance + ?,
            updated_at = datetime('now')
        WHERE user_id = ?
      `).run(value, req.user!.userId);

      // Create wallet transaction
      const walletTxId = `LYL-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      db.prepare(`
        INSERT INTO transactions (id, tx_id, user_id, amount, type, status, description)
        VALUES (?, ?, ?, ?, 'topup', 'completed', ?)
      `).run(uuidv4(), walletTxId, req.user!.userId, value, `Loyalty points redemption: ${points} points`);
    }

    // Get updated account
    const updatedAccount = db.prepare('SELECT * FROM loyalty_accounts WHERE id = ?').get(account.id) as LoyaltyAccountRow;
    const updatedWallet = wallet ? db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(req.user!.userId) as { balance: number } : null;

    // Log audit
    logAudit('LOYALTY_POINTS_REDEEMED', req.user!.userId, req.user!.userType, 'loyalty_account', account.id,
      `Redeemed ${points} points for ${value.toLocaleString()} KRW`,
      { points, value });

    res.json({
      success: true,
      data: {
        pointsRedeemed: points,
        valueReceived: value,
        newPointsBalance: updatedAccount.points_balance,
        newWalletBalance: updatedWallet?.balance || null,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Redeem points error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to redeem points' } });
  }
});

/**
 * GET /api/loyalty/tiers
 * Get tier information and benefits
 */
router.get('/tiers', async (_req, res: Response): Promise<void> => {
  try {
    const tiers = Object.entries(TIER_CONFIG).map(([key, config]) => ({
      id: key,
      name: config.name,
      minPoints: config.min,
      maxPoints: config.max === Infinity ? null : config.max,
      earnMultiplier: config.earnMultiplier,
      benefits: config.benefits,
    }));

    res.json({
      success: true,
      data: {
        tiers,
        earningRate: {
          base: BASE_EARN_RATE,
          description: '1 point per 100 KRW spent',
        },
        redemptionRate: {
          rate: 1,
          description: '1 point = 1 KRW',
        },
      },
    });
  } catch (error) {
    console.error('Get tiers error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get tier information' } });
  }
});

/**
 * GET /api/loyalty/rewards
 * List available rewards
 */
router.get('/rewards', authenticate, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('type').optional().isIn(['voucher', 'product', 'experience', 'cashback']),
  query('merchantId').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const page = (req.query.page as unknown as number) || 1;
    const limit = (req.query.limit as unknown as number) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type as string | undefined;
    const merchantId = req.query.merchantId as string | undefined;

    const db = getDb();
    const account = getOrCreateLoyaltyAccount(req.user!.userId);

    let whereClause = "WHERE lr.status = 'active' AND (lr.valid_until IS NULL OR lr.valid_until > datetime('now'))";
    const params: (string | number)[] = [];

    // Only show rewards with available quantity
    whereClause += ' AND (lr.quantity IS NULL OR lr.quantity > lr.redeemed_count)';

    if (type) {
      whereClause += ' AND lr.reward_type = ?';
      params.push(type);
    }

    if (merchantId) {
      whereClause += ' AND lr.merchant_id = ?';
      params.push(merchantId);
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM loyalty_rewards lr ${whereClause}
    `).get(...params) as { total: number };

    // Get rewards with merchant info
    const rewards = db.prepare(`
      SELECT lr.*, m.store_name as merchant_name
      FROM loyalty_rewards lr
      LEFT JOIN merchants m ON lr.merchant_id = m.id
      ${whereClause}
      ORDER BY lr.points_required ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as (LoyaltyRewardRow & { merchant_name: string | null })[];

    res.json({
      success: true,
      data: {
        rewards: rewards.map((reward) => ({
          id: reward.id,
          name: reward.name,
          description: reward.description,
          pointsRequired: reward.points_required,
          rewardType: reward.reward_type,
          value: reward.value,
          imageUrl: reward.image_url,
          merchantId: reward.merchant_id,
          merchantName: reward.merchant_name,
          availableQuantity: reward.quantity ? reward.quantity - reward.redeemed_count : null,
          validUntil: reward.valid_until,
          canRedeem: account.points_balance >= reward.points_required,
        })),
        userPointsBalance: account.points_balance,
        pagination: {
          page,
          limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get rewards error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get rewards' } });
  }
});

/**
 * GET /api/loyalty/rewards/:id
 * Get reward details
 */
router.get('/rewards/:id', authenticate, [
  param('id').notEmpty().withMessage('Reward ID is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { id } = req.params;
    const db = getDb();
    const account = getOrCreateLoyaltyAccount(req.user!.userId);

    const reward = db.prepare(`
      SELECT lr.*, m.store_name as merchant_name, m.address as merchant_address
      FROM loyalty_rewards lr
      LEFT JOIN merchants m ON lr.merchant_id = m.id
      WHERE lr.id = ?
    `).get(id) as (LoyaltyRewardRow & { merchant_name: string | null; merchant_address: string | null }) | undefined;

    if (!reward) {
      throw new NotFoundError('Reward not found');
    }

    const isExpired = reward.valid_until && new Date(reward.valid_until) < new Date();
    const isExhausted = reward.quantity !== null && reward.quantity <= reward.redeemed_count;

    res.json({
      success: true,
      data: {
        id: reward.id,
        name: reward.name,
        description: reward.description,
        pointsRequired: reward.points_required,
        rewardType: reward.reward_type,
        value: reward.value,
        imageUrl: reward.image_url,
        merchant: reward.merchant_id ? {
          id: reward.merchant_id,
          name: reward.merchant_name,
          address: reward.merchant_address,
        } : null,
        quantity: reward.quantity,
        redeemedCount: reward.redeemed_count,
        availableQuantity: reward.quantity ? reward.quantity - reward.redeemed_count : null,
        validUntil: reward.valid_until,
        status: reward.status,
        isExpired,
        isExhausted,
        canRedeem: !isExpired && !isExhausted && account.points_balance >= reward.points_required,
        userPointsBalance: account.points_balance,
        pointsNeeded: Math.max(0, reward.points_required - account.points_balance),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get reward details error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get reward details' } });
  }
});

/**
 * POST /api/loyalty/rewards/:id/redeem
 * Redeem a specific reward
 */
router.post('/rewards/:id/redeem', authenticate, [
  param('id').notEmpty().withMessage('Reward ID is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { id } = req.params;
    const db = getDb();
    const account = getOrCreateLoyaltyAccount(req.user!.userId);

    const reward = db.prepare(`
      SELECT * FROM loyalty_rewards WHERE id = ?
    `).get(id) as LoyaltyRewardRow | undefined;

    if (!reward) {
      throw new NotFoundError('Reward not found');
    }

    // Validate reward availability
    if (reward.status !== 'active') {
      throw new BadRequestError('This reward is not currently available');
    }

    if (reward.valid_until && new Date(reward.valid_until) < new Date()) {
      throw new BadRequestError('This reward has expired');
    }

    if (reward.quantity !== null && reward.quantity <= reward.redeemed_count) {
      throw new BadRequestError('This reward is no longer available');
    }

    // Check sufficient points
    if (account.points_balance < reward.points_required) {
      throw new BadRequestError(`Insufficient points. You need ${reward.points_required - account.points_balance} more points.`);
    }

    // Create redemption code
    const redemptionCode = `RWD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create loyalty transaction for points deduction
    const txId = uuidv4();
    db.prepare(`
      INSERT INTO loyalty_transactions (id, account_id, points, type, source, reference_id, description)
      VALUES (?, ?, ?, 'redeem', 'reward', ?, ?)
    `).run(txId, account.id, -reward.points_required, reward.id, `Redeemed reward: ${reward.name}`);

    // Update account balance
    db.prepare(`
      UPDATE loyalty_accounts
      SET points_balance = points_balance - ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(reward.points_required, account.id);

    // Update reward redeemed count
    db.prepare(`
      UPDATE loyalty_rewards
      SET redeemed_count = redeemed_count + 1
      WHERE id = ?
    `).run(reward.id);

    // Check if reward is exhausted
    if (reward.quantity !== null && reward.redeemed_count + 1 >= reward.quantity) {
      db.prepare(`
        UPDATE loyalty_rewards SET status = 'exhausted' WHERE id = ?
      `).run(reward.id);
    }

    // Get updated account
    const updatedAccount = db.prepare('SELECT * FROM loyalty_accounts WHERE id = ?').get(account.id) as LoyaltyAccountRow;

    // Log audit
    logAudit('LOYALTY_REWARD_REDEEMED', req.user!.userId, req.user!.userType, 'loyalty_reward', reward.id,
      `Redeemed reward: ${reward.name} for ${reward.points_required} points`,
      { rewardId: reward.id, rewardName: reward.name, pointsSpent: reward.points_required, redemptionCode });

    res.json({
      success: true,
      data: {
        redemptionCode,
        reward: {
          id: reward.id,
          name: reward.name,
          rewardType: reward.reward_type,
          value: reward.value,
        },
        pointsSpent: reward.points_required,
        newPointsBalance: updatedAccount.points_balance,
        instructions: getRedemptionInstructions(reward.reward_type, redemptionCode),
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Redeem reward error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to redeem reward' } });
  }
});

function getRedemptionInstructions(rewardType: string, code: string): string {
  switch (rewardType) {
    case 'voucher':
      return `Show this code (${code}) to the merchant when making a purchase. Valid for single use only.`;
    case 'product':
      return `Present this code (${code}) at the merchant location to claim your product. Valid for 30 days.`;
    case 'experience':
      return `Contact the merchant to schedule your experience. Reference code: ${code}. Valid for 90 days.`;
    case 'cashback':
      return `Your cashback has been applied to your wallet automatically. Reference: ${code}`;
    default:
      return `Redemption code: ${code}. Please contact support for assistance.`;
  }
}

// ==================== Merchant Endpoints ====================

/**
 * POST /api/merchant/loyalty/redeem
 * Merchant redeems customer points via QR scan
 */
router.post('/merchant/redeem', authenticate, requireMerchant, [
  body('customerId').notEmpty().withMessage('Customer ID is required'),
  body('points').isInt({ min: 1 }).withMessage('Points must be a positive integer'),
  body('description').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { customerId, points, description } = req.body;
    const db = getDb();

    // Verify merchant
    const merchant = db.prepare(`
      SELECT * FROM merchants WHERE user_id = ?
    `).get(req.user!.userId) as { id: string; store_name: string } | undefined;

    if (!merchant) {
      throw new ForbiddenError('Merchant not found');
    }

    // Get customer's loyalty account
    const customerAccount = db.prepare(`
      SELECT * FROM loyalty_accounts WHERE user_id = ?
    `).get(customerId) as LoyaltyAccountRow | undefined;

    if (!customerAccount) {
      throw new NotFoundError('Customer loyalty account not found');
    }

    // Check sufficient balance
    if (customerAccount.points_balance < points) {
      throw new BadRequestError('Customer has insufficient points');
    }

    // Calculate discount value (1 point = 1 KRW)
    const discountValue = points;

    // Create loyalty transaction for customer
    const txId = uuidv4();
    db.prepare(`
      INSERT INTO loyalty_transactions (id, account_id, points, type, source, reference_id, description)
      VALUES (?, ?, ?, 'redeem', 'merchant', ?, ?)
    `).run(txId, customerAccount.id, -points, merchant.id, description || `Points redeemed at ${merchant.store_name}`);

    // Update customer account balance
    db.prepare(`
      UPDATE loyalty_accounts
      SET points_balance = points_balance - ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(points, customerAccount.id);

    // Get updated customer account
    const updatedAccount = db.prepare('SELECT * FROM loyalty_accounts WHERE id = ?').get(customerAccount.id) as LoyaltyAccountRow;

    // Get customer info
    const customer = db.prepare('SELECT id, name FROM users WHERE id = ?').get(customerId) as UserRow | undefined;

    // Log audit
    logAudit('MERCHANT_LOYALTY_REDEMPTION', req.user!.userId, 'merchant', 'loyalty_account', customerAccount.id,
      `Merchant ${merchant.store_name} redeemed ${points} points for customer`,
      { merchantId: merchant.id, customerId, points, discountValue });

    res.json({
      success: true,
      data: {
        transactionId: txId,
        customer: {
          id: customer?.id,
          name: customer?.name,
        },
        pointsRedeemed: points,
        discountValue,
        customerNewBalance: updatedAccount.points_balance,
        merchant: {
          id: merchant.id,
          name: merchant.store_name,
        },
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError || error instanceof ForbiddenError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Merchant loyalty redeem error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to redeem customer points' } });
  }
});

// ==================== Admin Endpoints ====================

/**
 * GET /api/admin/loyalty/stats
 * Get loyalty program statistics (admin only)
 */
router.get('/admin/stats', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Overall statistics
    const overallStats = db.prepare(`
      SELECT
        COUNT(*) as total_accounts,
        SUM(points_balance) as total_points_outstanding,
        SUM(lifetime_points) as total_points_earned,
        AVG(points_balance) as avg_points_balance
      FROM loyalty_accounts
    `).get() as {
      total_accounts: number;
      total_points_outstanding: number;
      total_points_earned: number;
      avg_points_balance: number;
    };

    // Tier distribution
    const tierDistribution = db.prepare(`
      SELECT tier, COUNT(*) as count
      FROM loyalty_accounts
      GROUP BY tier
      ORDER BY
        CASE tier
          WHEN 'bronze' THEN 1
          WHEN 'silver' THEN 2
          WHEN 'gold' THEN 3
          WHEN 'platinum' THEN 4
          WHEN 'diamond' THEN 5
        END
    `).all() as { tier: string; count: number }[];

    // Transaction statistics (last 30 days)
    const transactionStats = db.prepare(`
      SELECT
        type,
        COUNT(*) as count,
        SUM(ABS(points)) as total_points
      FROM loyalty_transactions
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY type
    `).all() as { type: string; count: number; total_points: number }[];

    // Top earners (last 30 days)
    const topEarners = db.prepare(`
      SELECT
        la.user_id,
        u.name,
        u.email,
        la.tier,
        la.points_balance,
        SUM(lt.points) as points_earned
      FROM loyalty_transactions lt
      JOIN loyalty_accounts la ON lt.account_id = la.id
      JOIN users u ON la.user_id = u.id
      WHERE lt.type = 'earn' AND lt.created_at >= datetime('now', '-30 days')
      GROUP BY la.user_id
      ORDER BY points_earned DESC
      LIMIT 10
    `).all() as { user_id: string; name: string; email: string; tier: string; points_balance: number; points_earned: number }[];

    // Reward redemption stats
    const rewardStats = db.prepare(`
      SELECT
        lr.reward_type,
        COUNT(*) as total_rewards,
        SUM(lr.redeemed_count) as total_redemptions,
        SUM(lr.points_required * lr.redeemed_count) as points_spent
      FROM loyalty_rewards lr
      GROUP BY lr.reward_type
    `).all() as { reward_type: string; total_rewards: number; total_redemptions: number; points_spent: number }[];

    // Daily activity (last 14 days)
    const dailyActivity = db.prepare(`
      SELECT
        DATE(created_at) as date,
        SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END) as points_earned,
        SUM(CASE WHEN type = 'redeem' THEN ABS(points) ELSE 0 END) as points_redeemed,
        COUNT(CASE WHEN type = 'earn' THEN 1 END) as earn_transactions,
        COUNT(CASE WHEN type = 'redeem' THEN 1 END) as redeem_transactions
      FROM loyalty_transactions
      WHERE created_at >= datetime('now', '-14 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all() as { date: string; points_earned: number; points_redeemed: number; earn_transactions: number; redeem_transactions: number }[];

    // Calculate liability (outstanding points value)
    const pointsLiability = overallStats.total_points_outstanding || 0; // 1 point = 1 KRW

    res.json({
      success: true,
      data: {
        overview: {
          totalAccounts: overallStats.total_accounts,
          totalPointsOutstanding: overallStats.total_points_outstanding || 0,
          totalPointsEarned: overallStats.total_points_earned || 0,
          averageBalance: Math.round(overallStats.avg_points_balance || 0),
          pointsLiability,
        },
        tierDistribution: tierDistribution.map((t) => ({
          tier: t.tier,
          name: TIER_CONFIG[t.tier as keyof typeof TIER_CONFIG]?.name || t.tier,
          count: t.count,
        })),
        transactionStats: transactionStats.map((t) => ({
          type: t.type,
          count: t.count,
          totalPoints: t.total_points,
        })),
        topEarners: topEarners.map((e) => ({
          userId: e.user_id,
          name: e.name,
          email: e.email,
          tier: e.tier,
          currentBalance: e.points_balance,
          pointsEarnedLast30Days: e.points_earned,
        })),
        rewardStats: rewardStats.map((r) => ({
          type: r.reward_type,
          totalRewards: r.total_rewards,
          totalRedemptions: r.total_redemptions || 0,
          pointsSpent: r.points_spent || 0,
        })),
        dailyActivity,
      },
    });
  } catch (error) {
    console.error('Get admin loyalty stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get loyalty statistics' } });
  }
});

export default router;
