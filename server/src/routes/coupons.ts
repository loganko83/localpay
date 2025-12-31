/**
 * Coupons and Offers Routes
 * Consumer coupon claiming/usage, merchant coupon management, admin offers
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, param, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireMerchant, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';

const router = Router();

// ============================================================================
// Type Definitions
// ============================================================================

interface CouponRow {
  id: string;
  name: string;
  description: string | null;
  merchant_id: string | null;
  discount_type: 'percentage' | 'fixed' | 'cashback';
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  valid_from: string;
  valid_until: string;
  usage_limit: number;
  used_count: number;
  category: string | null;
  region: string | null;
  status: 'active' | 'expired' | 'exhausted';
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UserCouponRow {
  id: string;
  user_id: string;
  coupon_id: string;
  claimed_at: string;
  used_at: string | null;
  transaction_id: string | null;
  status: 'available' | 'used' | 'expired';
}

interface OfferRow {
  id: string;
  title: string;
  description: string | null;
  merchant_id: string | null;
  discount_type: 'percentage' | 'fixed' | 'cashback' | null;
  discount_value: number | null;
  min_purchase: number;
  image_url: string | null;
  terms: string | null;
  valid_from: string | null;
  valid_until: string | null;
  status: 'draft' | 'active' | 'paused' | 'expired';
  view_count: number;
  claim_count: number;
  created_at: string;
  updated_at: string;
}

interface MerchantRow {
  id: string;
  store_name: string;
  category: string;
  image_url: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function validateRequest(req: AuthenticatedRequest): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', { errors: errors.array() });
  }
}

function isCouponValid(coupon: CouponRow): boolean {
  const now = new Date();
  const validFrom = new Date(coupon.valid_from);
  const validUntil = new Date(coupon.valid_until);

  return (
    coupon.status === 'active' &&
    now >= validFrom &&
    now <= validUntil &&
    (coupon.usage_limit === 0 || coupon.used_count < coupon.usage_limit)
  );
}

function calculateDiscount(
  coupon: CouponRow,
  purchaseAmount: number
): { discount: number; finalAmount: number } {
  if (purchaseAmount < coupon.min_purchase) {
    return { discount: 0, finalAmount: purchaseAmount };
  }

  let discount = 0;

  switch (coupon.discount_type) {
    case 'percentage':
      discount = Math.floor(purchaseAmount * (coupon.discount_value / 100));
      break;
    case 'fixed':
      discount = coupon.discount_value;
      break;
    case 'cashback':
      discount = Math.floor(purchaseAmount * (coupon.discount_value / 100));
      break;
  }

  // Apply max discount cap if exists
  if (coupon.max_discount && discount > coupon.max_discount) {
    discount = coupon.max_discount;
  }

  // Discount cannot exceed purchase amount
  if (discount > purchaseAmount) {
    discount = purchaseAmount;
  }

  return {
    discount,
    finalAmount: purchaseAmount - discount,
  };
}

// ============================================================================
// Consumer Routes
// ============================================================================

/**
 * GET /api/coupons
 * List available coupons with optional filters
 */
router.get('/', authenticate, [
  query('category').optional().isString(),
  query('region').optional().isString(),
  query('merchant').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { category, region, merchant, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build query with filters
    let whereClause = `WHERE c.status = 'active'
      AND datetime(c.valid_from) <= datetime('now')
      AND datetime(c.valid_until) >= datetime('now')
      AND (c.usage_limit = 0 OR c.used_count < c.usage_limit)`;
    const params: (string | number)[] = [];

    if (category) {
      whereClause += ` AND c.category = ?`;
      params.push(String(category));
    }
    if (region) {
      whereClause += ` AND c.region = ?`;
      params.push(String(region));
    }
    if (merchant) {
      whereClause += ` AND c.merchant_id = ?`;
      params.push(String(merchant));
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM coupons c ${whereClause}
    `).get(...params) as { count: number };

    // Get coupons with merchant info
    const coupons = db.prepare(`
      SELECT c.*, m.store_name as merchant_name, m.image_url as merchant_image
      FROM coupons c
      LEFT JOIN merchants m ON c.merchant_id = m.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset) as (CouponRow & { merchant_name: string | null; merchant_image: string | null })[];

    // Check if user has claimed each coupon
    const userCoupons = db.prepare(`
      SELECT coupon_id, status FROM user_coupons WHERE user_id = ?
    `).all(req.user!.userId) as { coupon_id: string; status: string }[];

    const claimedMap = new Map(userCoupons.map(uc => [uc.coupon_id, uc.status]));

    const formattedCoupons = coupons.map(coupon => ({
      id: coupon.id,
      name: coupon.name,
      description: coupon.description,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      minPurchase: coupon.min_purchase,
      maxDiscount: coupon.max_discount,
      validFrom: coupon.valid_from,
      validUntil: coupon.valid_until,
      remainingCount: coupon.usage_limit > 0 ? coupon.usage_limit - coupon.used_count : null,
      category: coupon.category,
      region: coupon.region,
      imageUrl: coupon.image_url,
      merchant: coupon.merchant_id ? {
        id: coupon.merchant_id,
        name: coupon.merchant_name,
        imageUrl: coupon.merchant_image,
      } : null,
      claimed: claimedMap.has(coupon.id),
      claimStatus: claimedMap.get(coupon.id) || null,
    }));

    res.json({
      success: true,
      data: {
        coupons: formattedCoupons,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.count,
          totalPages: Math.ceil(countResult.count / Number(limit)),
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get coupons error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get coupons' } });
  }
});

/**
 * GET /api/coupons/my
 * Get user's claimed coupons
 */
router.get('/my', authenticate, [
  query('status').optional().isIn(['available', 'used', 'expired']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = `WHERE uc.user_id = ?`;
    const params: (string | number)[] = [req.user!.userId];

    if (status) {
      whereClause += ` AND uc.status = ?`;
      params.push(String(status));
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM user_coupons uc ${whereClause}
    `).get(...params) as { count: number };

    // Get user coupons with coupon details
    const userCoupons = db.prepare(`
      SELECT uc.*, c.name, c.description, c.discount_type, c.discount_value,
             c.min_purchase, c.max_discount, c.valid_from, c.valid_until,
             c.category, c.region, c.image_url,
             m.id as merchant_id, m.store_name as merchant_name, m.image_url as merchant_image
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      LEFT JOIN merchants m ON c.merchant_id = m.id
      ${whereClause}
      ORDER BY uc.claimed_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset) as (UserCouponRow & CouponRow & { merchant_name: string | null; merchant_image: string | null })[];

    const formattedCoupons = userCoupons.map(uc => ({
      id: uc.id,
      couponId: uc.coupon_id,
      name: uc.name,
      description: uc.description,
      discountType: uc.discount_type,
      discountValue: uc.discount_value,
      minPurchase: uc.min_purchase,
      maxDiscount: uc.max_discount,
      validFrom: uc.valid_from,
      validUntil: uc.valid_until,
      category: uc.category,
      region: uc.region,
      imageUrl: uc.image_url,
      merchant: uc.merchant_id ? {
        id: uc.merchant_id,
        name: uc.merchant_name,
        imageUrl: uc.merchant_image,
      } : null,
      claimedAt: uc.claimed_at,
      usedAt: uc.used_at,
      transactionId: uc.transaction_id,
      status: uc.status,
    }));

    res.json({
      success: true,
      data: {
        coupons: formattedCoupons,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.count,
          totalPages: Math.ceil(countResult.count / Number(limit)),
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get my coupons error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get coupons' } });
  }
});

/**
 * GET /api/coupons/:id
 * Get coupon details
 */
router.get('/:id', authenticate, [
  param('id').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;

    const coupon = db.prepare(`
      SELECT c.*, m.store_name as merchant_name, m.image_url as merchant_image,
             m.address as merchant_address, m.phone as merchant_phone
      FROM coupons c
      LEFT JOIN merchants m ON c.merchant_id = m.id
      WHERE c.id = ?
    `).get(id) as (CouponRow & {
      merchant_name: string | null;
      merchant_image: string | null;
      merchant_address: string | null;
      merchant_phone: string | null;
    }) | undefined;

    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }

    // Check if user has claimed
    const userCoupon = db.prepare(`
      SELECT * FROM user_coupons WHERE user_id = ? AND coupon_id = ?
    `).get(req.user!.userId, id) as UserCouponRow | undefined;

    res.json({
      success: true,
      data: {
        id: coupon.id,
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        minPurchase: coupon.min_purchase,
        maxDiscount: coupon.max_discount,
        validFrom: coupon.valid_from,
        validUntil: coupon.valid_until,
        usageLimit: coupon.usage_limit,
        usedCount: coupon.used_count,
        remainingCount: coupon.usage_limit > 0 ? coupon.usage_limit - coupon.used_count : null,
        category: coupon.category,
        region: coupon.region,
        imageUrl: coupon.image_url,
        status: coupon.status,
        isValid: isCouponValid(coupon),
        merchant: coupon.merchant_id ? {
          id: coupon.merchant_id,
          name: coupon.merchant_name,
          imageUrl: coupon.merchant_image,
          address: coupon.merchant_address,
          phone: coupon.merchant_phone,
        } : null,
        userCoupon: userCoupon ? {
          id: userCoupon.id,
          claimedAt: userCoupon.claimed_at,
          usedAt: userCoupon.used_at,
          status: userCoupon.status,
        } : null,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get coupon error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get coupon' } });
  }
});

/**
 * POST /api/coupons/:id/claim
 * Claim a coupon
 */
router.post('/:id/claim', authenticate, [
  param('id').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;

    // Get coupon
    const coupon = db.prepare(`SELECT * FROM coupons WHERE id = ?`).get(id) as CouponRow | undefined;

    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }

    // Validate coupon
    if (!isCouponValid(coupon)) {
      throw new BadRequestError('Coupon is no longer available');
    }

    // Check if already claimed
    const existingClaim = db.prepare(`
      SELECT * FROM user_coupons WHERE user_id = ? AND coupon_id = ?
    `).get(req.user!.userId, id) as UserCouponRow | undefined;

    if (existingClaim) {
      throw new BadRequestError('You have already claimed this coupon');
    }

    // Claim the coupon
    const userCouponId = uuidv4();
    db.prepare(`
      INSERT INTO user_coupons (id, user_id, coupon_id, status)
      VALUES (?, ?, ?, 'available')
    `).run(userCouponId, req.user!.userId, id);

    // Increment used count (claimed count)
    db.prepare(`
      UPDATE coupons SET used_count = used_count + 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    // Check if coupon is exhausted
    const updatedCoupon = db.prepare(`SELECT * FROM coupons WHERE id = ?`).get(id) as CouponRow;
    if (updatedCoupon.usage_limit > 0 && updatedCoupon.used_count >= updatedCoupon.usage_limit) {
      db.prepare(`UPDATE coupons SET status = 'exhausted', updated_at = datetime('now') WHERE id = ?`).run(id);
    }

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'COUPON_CLAIMED',
      req.user!.userId,
      req.user!.userType,
      'coupon',
      id,
      `Claimed coupon: ${coupon.name}`
    );

    res.json({
      success: true,
      data: {
        userCouponId,
        couponId: id,
        couponName: coupon.name,
        message: 'Coupon claimed successfully',
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Claim coupon error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to claim coupon' } });
  }
});

/**
 * POST /api/coupons/:id/use
 * Use a coupon (apply to transaction)
 */
router.post('/:id/use', authenticate, [
  param('id').isString().notEmpty(),
  body('purchaseAmount').isInt({ min: 1 }).withMessage('Purchase amount is required'),
  body('transactionId').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;
    const { purchaseAmount, transactionId } = req.body;

    // Get user's coupon
    const userCoupon = db.prepare(`
      SELECT uc.id, uc.user_id, uc.coupon_id, uc.claimed_at, uc.used_at, uc.transaction_id,
             uc.status as user_coupon_status,
             c.name, c.discount_type, c.discount_value, c.min_purchase,
             c.max_discount, c.valid_from, c.valid_until, c.merchant_id
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.id = ? AND uc.user_id = ?
    `).get(id, req.user!.userId) as (Omit<UserCouponRow, 'status'> & Omit<CouponRow, 'status'> & { user_coupon_status: 'available' | 'used' | 'expired' }) | undefined;

    if (!userCoupon) {
      throw new NotFoundError('Coupon not found in your wallet');
    }

    if (userCoupon.user_coupon_status !== 'available') {
      throw new BadRequestError(`Coupon has already been ${userCoupon.user_coupon_status}`);
    }

    // Check validity period
    const now = new Date();
    const validFrom = new Date(userCoupon.valid_from);
    const validUntil = new Date(userCoupon.valid_until);

    if (now < validFrom || now > validUntil) {
      // Mark as expired
      db.prepare(`UPDATE user_coupons SET status = 'expired', updated_at = datetime('now') WHERE id = ?`).run(id);
      throw new BadRequestError('Coupon has expired');
    }

    // Check minimum purchase
    if (purchaseAmount < userCoupon.min_purchase) {
      throw new BadRequestError(`Minimum purchase amount is ${userCoupon.min_purchase} KRW`);
    }

    // Calculate discount
    const couponForCalculation: CouponRow = {
      id: userCoupon.coupon_id,
      name: userCoupon.name,
      description: userCoupon.description,
      merchant_id: userCoupon.merchant_id,
      discount_type: userCoupon.discount_type,
      discount_value: userCoupon.discount_value,
      min_purchase: userCoupon.min_purchase,
      max_discount: userCoupon.max_discount,
      valid_from: userCoupon.valid_from,
      valid_until: userCoupon.valid_until,
      usage_limit: userCoupon.usage_limit,
      used_count: userCoupon.used_count,
      category: userCoupon.category,
      region: userCoupon.region,
      status: 'active',
      image_url: userCoupon.image_url,
      created_at: userCoupon.created_at,
      updated_at: userCoupon.updated_at,
    };
    const { discount, finalAmount } = calculateDiscount(couponForCalculation, purchaseAmount);

    // Mark coupon as used
    db.prepare(`
      UPDATE user_coupons
      SET status = 'used', used_at = datetime('now'), transaction_id = ?
      WHERE id = ?
    `).run(transactionId || null, id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'COUPON_USED',
      req.user!.userId,
      req.user!.userType,
      'coupon',
      userCoupon.coupon_id,
      `Used coupon: ${userCoupon.name}`,
      JSON.stringify({ purchaseAmount, discount, finalAmount, transactionId })
    );

    res.json({
      success: true,
      data: {
        couponId: userCoupon.coupon_id,
        couponName: userCoupon.name,
        discountType: userCoupon.discount_type,
        discountValue: userCoupon.discount_value,
        purchaseAmount,
        discount,
        finalAmount,
        message: 'Coupon applied successfully',
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Use coupon error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to use coupon' } });
  }
});

/**
 * GET /api/offers
 * List promotional offers
 */
router.get('/offers', authenticate, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM offers
      WHERE status = 'active'
      AND (valid_from IS NULL OR datetime(valid_from) <= datetime('now'))
      AND (valid_until IS NULL OR datetime(valid_until) >= datetime('now'))
    `).get() as { count: number };

    // Get offers with merchant info
    const offers = db.prepare(`
      SELECT o.*, m.store_name as merchant_name, m.image_url as merchant_image
      FROM offers o
      LEFT JOIN merchants m ON o.merchant_id = m.id
      WHERE o.status = 'active'
      AND (o.valid_from IS NULL OR datetime(o.valid_from) <= datetime('now'))
      AND (o.valid_until IS NULL OR datetime(o.valid_until) >= datetime('now'))
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(Number(limit), offset) as (OfferRow & { merchant_name: string | null; merchant_image: string | null })[];

    const formattedOffers = offers.map(offer => ({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      discountType: offer.discount_type,
      discountValue: offer.discount_value,
      minPurchase: offer.min_purchase,
      imageUrl: offer.image_url,
      terms: offer.terms,
      validFrom: offer.valid_from,
      validUntil: offer.valid_until,
      viewCount: offer.view_count,
      claimCount: offer.claim_count,
      merchant: offer.merchant_id ? {
        id: offer.merchant_id,
        name: offer.merchant_name,
        imageUrl: offer.merchant_image,
      } : null,
    }));

    res.json({
      success: true,
      data: {
        offers: formattedOffers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.count,
          totalPages: Math.ceil(countResult.count / Number(limit)),
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get offers error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get offers' } });
  }
});

/**
 * GET /api/offers/:id
 * Get offer details
 */
router.get('/offers/:id', authenticate, [
  param('id').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;

    const offer = db.prepare(`
      SELECT o.*, m.store_name as merchant_name, m.image_url as merchant_image,
             m.address as merchant_address, m.phone as merchant_phone
      FROM offers o
      LEFT JOIN merchants m ON o.merchant_id = m.id
      WHERE o.id = ?
    `).get(id) as (OfferRow & {
      merchant_name: string | null;
      merchant_image: string | null;
      merchant_address: string | null;
      merchant_phone: string | null;
    }) | undefined;

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Increment view count
    db.prepare(`UPDATE offers SET view_count = view_count + 1 WHERE id = ?`).run(id);

    res.json({
      success: true,
      data: {
        id: offer.id,
        title: offer.title,
        description: offer.description,
        discountType: offer.discount_type,
        discountValue: offer.discount_value,
        minPurchase: offer.min_purchase,
        imageUrl: offer.image_url,
        terms: offer.terms,
        validFrom: offer.valid_from,
        validUntil: offer.valid_until,
        status: offer.status,
        viewCount: offer.view_count + 1,
        claimCount: offer.claim_count,
        merchant: offer.merchant_id ? {
          id: offer.merchant_id,
          name: offer.merchant_name,
          imageUrl: offer.merchant_image,
          address: offer.merchant_address,
          phone: offer.merchant_phone,
        } : null,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get offer error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get offer' } });
  }
});

// ============================================================================
// Merchant Routes
// ============================================================================

/**
 * GET /api/merchant/coupons
 * Get merchant's coupons
 */
router.get('/merchant/coupons', authenticate, requireMerchant, [
  query('status').optional().isIn(['active', 'expired', 'exhausted']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const merchantId = req.user!.merchantId;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (!merchantId) {
      throw new ForbiddenError('Merchant account required');
    }

    let whereClause = `WHERE merchant_id = ?`;
    const params: (string | number)[] = [merchantId];

    if (status) {
      whereClause += ` AND status = ?`;
      params.push(String(status));
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM coupons ${whereClause}
    `).get(...params) as { count: number };

    // Get coupons
    const coupons = db.prepare(`
      SELECT * FROM coupons ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset) as CouponRow[];

    // Get usage stats for each coupon
    const formattedCoupons = coupons.map(coupon => {
      const usageStats = db.prepare(`
        SELECT
          COUNT(*) as total_claimed,
          SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as total_used
        FROM user_coupons WHERE coupon_id = ?
      `).get(coupon.id) as { total_claimed: number; total_used: number };

      return {
        id: coupon.id,
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        minPurchase: coupon.min_purchase,
        maxDiscount: coupon.max_discount,
        validFrom: coupon.valid_from,
        validUntil: coupon.valid_until,
        usageLimit: coupon.usage_limit,
        usedCount: coupon.used_count,
        category: coupon.category,
        region: coupon.region,
        imageUrl: coupon.image_url,
        status: coupon.status,
        stats: {
          claimed: usageStats.total_claimed,
          used: usageStats.total_used,
          conversionRate: usageStats.total_claimed > 0
            ? Math.round((usageStats.total_used / usageStats.total_claimed) * 100)
            : 0,
        },
        createdAt: coupon.created_at,
      };
    });

    res.json({
      success: true,
      data: {
        coupons: formattedCoupons,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.count,
          totalPages: Math.ceil(countResult.count / Number(limit)),
        },
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get merchant coupons error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get coupons' } });
  }
});

/**
 * POST /api/merchant/coupons
 * Create a new coupon
 */
router.post('/merchant/coupons', authenticate, requireMerchant, [
  body('name').isString().notEmpty().withMessage('Name is required'),
  body('description').optional().isString(),
  body('discountType').isIn(['percentage', 'fixed', 'cashback']).withMessage('Invalid discount type'),
  body('discountValue').isFloat({ min: 0.01 }).withMessage('Discount value must be positive'),
  body('minPurchase').optional().isInt({ min: 0 }),
  body('maxDiscount').optional().isInt({ min: 0 }),
  body('validFrom').isISO8601().withMessage('Valid from date is required'),
  body('validUntil').isISO8601().withMessage('Valid until date is required'),
  body('usageLimit').optional().isInt({ min: 0 }),
  body('category').optional().isString(),
  body('region').optional().isString(),
  body('imageUrl').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const merchantId = req.user!.merchantId;

    if (!merchantId) {
      throw new ForbiddenError('Merchant account required');
    }

    const {
      name, description, discountType, discountValue, minPurchase = 0,
      maxDiscount, validFrom, validUntil, usageLimit = 0, category, region, imageUrl
    } = req.body;

    // Validate dates
    if (new Date(validUntil) <= new Date(validFrom)) {
      throw new BadRequestError('Valid until date must be after valid from date');
    }

    const couponId = uuidv4();

    db.prepare(`
      INSERT INTO coupons (
        id, name, description, merchant_id, discount_type, discount_value,
        min_purchase, max_discount, valid_from, valid_until, usage_limit,
        category, region, image_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      couponId, name, description || null, merchantId, discountType, discountValue,
      minPurchase, maxDiscount || null, validFrom, validUntil, usageLimit,
      category || null, region || null, imageUrl || null
    );

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'COUPON_CREATED',
      req.user!.userId,
      'merchant',
      'coupon',
      couponId,
      `Created coupon: ${name}`
    );

    const coupon = db.prepare(`SELECT * FROM coupons WHERE id = ?`).get(couponId) as CouponRow;

    res.status(201).json({
      success: true,
      data: {
        id: coupon.id,
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        minPurchase: coupon.min_purchase,
        maxDiscount: coupon.max_discount,
        validFrom: coupon.valid_from,
        validUntil: coupon.valid_until,
        usageLimit: coupon.usage_limit,
        category: coupon.category,
        region: coupon.region,
        imageUrl: coupon.image_url,
        status: coupon.status,
        message: 'Coupon created successfully',
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Create coupon error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create coupon' } });
  }
});

/**
 * PUT /api/merchant/coupons/:id
 * Update a coupon
 */
router.put('/merchant/coupons/:id', authenticate, requireMerchant, [
  param('id').isString().notEmpty(),
  body('name').optional().isString().notEmpty(),
  body('description').optional().isString(),
  body('discountType').optional().isIn(['percentage', 'fixed', 'cashback']),
  body('discountValue').optional().isFloat({ min: 0.01 }),
  body('minPurchase').optional().isInt({ min: 0 }),
  body('maxDiscount').optional().isInt({ min: 0 }),
  body('validFrom').optional().isISO8601(),
  body('validUntil').optional().isISO8601(),
  body('usageLimit').optional().isInt({ min: 0 }),
  body('category').optional().isString(),
  body('region').optional().isString(),
  body('imageUrl').optional().isString(),
  body('status').optional().isIn(['active', 'expired', 'exhausted']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const merchantId = req.user!.merchantId;
    const { id } = req.params;

    if (!merchantId) {
      throw new ForbiddenError('Merchant account required');
    }

    // Get existing coupon
    const existingCoupon = db.prepare(`
      SELECT * FROM coupons WHERE id = ? AND merchant_id = ?
    `).get(id, merchantId) as CouponRow | undefined;

    if (!existingCoupon) {
      throw new NotFoundError('Coupon not found');
    }

    const {
      name, description, discountType, discountValue, minPurchase,
      maxDiscount, validFrom, validUntil, usageLimit, category, region, imageUrl, status
    } = req.body;

    // Validate dates if both provided
    if (validFrom && validUntil && new Date(validUntil) <= new Date(validFrom)) {
      throw new BadRequestError('Valid until date must be after valid from date');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }
    if (discountType !== undefined) { updates.push('discount_type = ?'); values.push(discountType); }
    if (discountValue !== undefined) { updates.push('discount_value = ?'); values.push(discountValue); }
    if (minPurchase !== undefined) { updates.push('min_purchase = ?'); values.push(minPurchase); }
    if (maxDiscount !== undefined) { updates.push('max_discount = ?'); values.push(maxDiscount); }
    if (validFrom !== undefined) { updates.push('valid_from = ?'); values.push(validFrom); }
    if (validUntil !== undefined) { updates.push('valid_until = ?'); values.push(validUntil); }
    if (usageLimit !== undefined) { updates.push('usage_limit = ?'); values.push(usageLimit); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category || null); }
    if (region !== undefined) { updates.push('region = ?'); values.push(region || null); }
    if (imageUrl !== undefined) { updates.push('image_url = ?'); values.push(imageUrl || null); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'COUPON_UPDATED',
      req.user!.userId,
      'merchant',
      'coupon',
      id,
      `Updated coupon: ${name || existingCoupon.name}`
    );

    const updatedCoupon = db.prepare(`SELECT * FROM coupons WHERE id = ?`).get(id) as CouponRow;

    res.json({
      success: true,
      data: {
        id: updatedCoupon.id,
        name: updatedCoupon.name,
        description: updatedCoupon.description,
        discountType: updatedCoupon.discount_type,
        discountValue: updatedCoupon.discount_value,
        minPurchase: updatedCoupon.min_purchase,
        maxDiscount: updatedCoupon.max_discount,
        validFrom: updatedCoupon.valid_from,
        validUntil: updatedCoupon.valid_until,
        usageLimit: updatedCoupon.usage_limit,
        usedCount: updatedCoupon.used_count,
        category: updatedCoupon.category,
        region: updatedCoupon.region,
        imageUrl: updatedCoupon.image_url,
        status: updatedCoupon.status,
        message: 'Coupon updated successfully',
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError ||
        error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update coupon error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update coupon' } });
  }
});

/**
 * DELETE /api/merchant/coupons/:id
 * Delete a coupon
 */
router.delete('/merchant/coupons/:id', authenticate, requireMerchant, [
  param('id').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const merchantId = req.user!.merchantId;
    const { id } = req.params;

    if (!merchantId) {
      throw new ForbiddenError('Merchant account required');
    }

    // Get existing coupon
    const existingCoupon = db.prepare(`
      SELECT * FROM coupons WHERE id = ? AND merchant_id = ?
    `).get(id, merchantId) as CouponRow | undefined;

    if (!existingCoupon) {
      throw new NotFoundError('Coupon not found');
    }

    // Check if coupon has been claimed
    const claimCount = db.prepare(`
      SELECT COUNT(*) as count FROM user_coupons WHERE coupon_id = ?
    `).get(id) as { count: number };

    if (claimCount.count > 0) {
      throw new BadRequestError('Cannot delete coupon that has been claimed by users. Set status to expired instead.');
    }

    // Delete coupon
    db.prepare(`DELETE FROM coupons WHERE id = ?`).run(id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'COUPON_DELETED',
      req.user!.userId,
      'merchant',
      'coupon',
      id,
      `Deleted coupon: ${existingCoupon.name}`
    );

    res.json({
      success: true,
      data: {
        id,
        message: 'Coupon deleted successfully',
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError ||
        error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Delete coupon error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete coupon' } });
  }
});

// ============================================================================
// Admin Routes
// ============================================================================

/**
 * GET /api/admin/coupons
 * Get all coupons (admin view)
 */
router.get('/admin/coupons', authenticate, requireAdmin, [
  query('merchantId').optional().isString(),
  query('status').optional().isIn(['active', 'expired', 'exhausted']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { merchantId, status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (merchantId) {
      whereClause += ` AND c.merchant_id = ?`;
      params.push(String(merchantId));
    }
    if (status) {
      whereClause += ` AND c.status = ?`;
      params.push(String(status));
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM coupons c ${whereClause}
    `).get(...params) as { count: number };

    // Get coupons with merchant info
    const coupons = db.prepare(`
      SELECT c.*, m.store_name as merchant_name
      FROM coupons c
      LEFT JOIN merchants m ON c.merchant_id = m.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset) as (CouponRow & { merchant_name: string | null })[];

    const formattedCoupons = coupons.map(coupon => {
      const usageStats = db.prepare(`
        SELECT
          COUNT(*) as total_claimed,
          SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as total_used
        FROM user_coupons WHERE coupon_id = ?
      `).get(coupon.id) as { total_claimed: number; total_used: number };

      return {
        id: coupon.id,
        name: coupon.name,
        description: coupon.description,
        merchantId: coupon.merchant_id,
        merchantName: coupon.merchant_name,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        minPurchase: coupon.min_purchase,
        maxDiscount: coupon.max_discount,
        validFrom: coupon.valid_from,
        validUntil: coupon.valid_until,
        usageLimit: coupon.usage_limit,
        usedCount: coupon.used_count,
        category: coupon.category,
        region: coupon.region,
        imageUrl: coupon.image_url,
        status: coupon.status,
        stats: {
          claimed: usageStats.total_claimed,
          used: usageStats.total_used,
          conversionRate: usageStats.total_claimed > 0
            ? Math.round((usageStats.total_used / usageStats.total_claimed) * 100)
            : 0,
        },
        createdAt: coupon.created_at,
        updatedAt: coupon.updated_at,
      };
    });

    res.json({
      success: true,
      data: {
        coupons: formattedCoupons,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.count,
          totalPages: Math.ceil(countResult.count / Number(limit)),
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get admin coupons error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get coupons' } });
  }
});

/**
 * GET /api/admin/coupons/stats
 * Get coupon usage statistics
 */
router.get('/admin/coupons/stats', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Overall stats
    const overallStats = db.prepare(`
      SELECT
        COUNT(*) as total_coupons,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_coupons,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_coupons,
        SUM(CASE WHEN status = 'exhausted' THEN 1 ELSE 0 END) as exhausted_coupons,
        SUM(used_count) as total_claims
      FROM coupons
    `).get() as {
      total_coupons: number;
      active_coupons: number;
      expired_coupons: number;
      exhausted_coupons: number;
      total_claims: number;
    };

    // User coupon stats
    const userCouponStats = db.prepare(`
      SELECT
        COUNT(*) as total_user_coupons,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as used,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired
      FROM user_coupons
    `).get() as {
      total_user_coupons: number;
      available: number;
      used: number;
      expired: number;
    };

    // Top coupons by claims
    const topCoupons = db.prepare(`
      SELECT c.id, c.name, c.merchant_id, m.store_name as merchant_name,
             c.discount_type, c.discount_value, c.used_count as claims
      FROM coupons c
      LEFT JOIN merchants m ON c.merchant_id = m.id
      ORDER BY c.used_count DESC
      LIMIT 10
    `).all() as {
      id: string;
      name: string;
      merchant_id: string | null;
      merchant_name: string | null;
      discount_type: string;
      discount_value: number;
      claims: number;
    }[];

    // Monthly stats (last 6 months)
    const monthlyStats = db.prepare(`
      SELECT
        strftime('%Y-%m', claimed_at) as month,
        COUNT(*) as claims,
        SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as redemptions
      FROM user_coupons
      WHERE claimed_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', claimed_at)
      ORDER BY month DESC
    `).all() as { month: string; claims: number; redemptions: number }[];

    // By discount type
    const byDiscountType = db.prepare(`
      SELECT
        discount_type,
        COUNT(*) as count,
        SUM(used_count) as total_claims
      FROM coupons
      GROUP BY discount_type
    `).all() as { discount_type: string; count: number; total_claims: number }[];

    // By category
    const byCategory = db.prepare(`
      SELECT
        COALESCE(category, 'Uncategorized') as category,
        COUNT(*) as count,
        SUM(used_count) as total_claims
      FROM coupons
      GROUP BY category
      ORDER BY total_claims DESC
      LIMIT 10
    `).all() as { category: string; count: number; total_claims: number }[];

    res.json({
      success: true,
      data: {
        overview: {
          totalCoupons: overallStats.total_coupons,
          activeCoupons: overallStats.active_coupons,
          expiredCoupons: overallStats.expired_coupons,
          exhaustedCoupons: overallStats.exhausted_coupons,
          totalClaims: overallStats.total_claims,
        },
        userCoupons: {
          total: userCouponStats.total_user_coupons,
          available: userCouponStats.available,
          used: userCouponStats.used,
          expired: userCouponStats.expired,
          redemptionRate: userCouponStats.total_user_coupons > 0
            ? Math.round((userCouponStats.used / userCouponStats.total_user_coupons) * 100)
            : 0,
        },
        topCoupons: topCoupons.map(c => ({
          id: c.id,
          name: c.name,
          merchantId: c.merchant_id,
          merchantName: c.merchant_name,
          discountType: c.discount_type,
          discountValue: c.discount_value,
          claims: c.claims,
        })),
        monthlyTrends: monthlyStats,
        byDiscountType,
        byCategory,
      },
    });
  } catch (error) {
    console.error('Get coupon stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get statistics' } });
  }
});

/**
 * POST /api/admin/offers
 * Create a platform-wide offer
 */
router.post('/admin/offers', authenticate, requireAdmin, [
  body('title').isString().notEmpty().withMessage('Title is required'),
  body('description').optional().isString(),
  body('merchantId').optional().isString(),
  body('discountType').optional().isIn(['percentage', 'fixed', 'cashback']),
  body('discountValue').optional().isFloat({ min: 0 }),
  body('minPurchase').optional().isInt({ min: 0 }),
  body('imageUrl').optional().isString(),
  body('terms').optional().isString(),
  body('validFrom').optional().isISO8601(),
  body('validUntil').optional().isISO8601(),
  body('status').optional().isIn(['draft', 'active', 'paused']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();

    const {
      title, description, merchantId, discountType, discountValue, minPurchase = 0,
      imageUrl, terms, validFrom, validUntil, status = 'draft'
    } = req.body;

    // Validate merchant if provided
    if (merchantId) {
      const merchant = db.prepare(`SELECT id FROM merchants WHERE id = ?`).get(merchantId);
      if (!merchant) {
        throw new BadRequestError('Merchant not found');
      }
    }

    // Validate dates if both provided
    if (validFrom && validUntil && new Date(validUntil) <= new Date(validFrom)) {
      throw new BadRequestError('Valid until date must be after valid from date');
    }

    const offerId = uuidv4();

    db.prepare(`
      INSERT INTO offers (
        id, title, description, merchant_id, discount_type, discount_value,
        min_purchase, image_url, terms, valid_from, valid_until, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      offerId, title, description || null, merchantId || null,
      discountType || null, discountValue || null, minPurchase,
      imageUrl || null, terms || null, validFrom || null, validUntil || null, status
    );

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'OFFER_CREATED',
      req.user!.userId,
      'admin',
      'offer',
      offerId,
      `Created offer: ${title}`
    );

    const offer = db.prepare(`SELECT * FROM offers WHERE id = ?`).get(offerId) as OfferRow;

    res.status(201).json({
      success: true,
      data: {
        id: offer.id,
        title: offer.title,
        description: offer.description,
        merchantId: offer.merchant_id,
        discountType: offer.discount_type,
        discountValue: offer.discount_value,
        minPurchase: offer.min_purchase,
        imageUrl: offer.image_url,
        terms: offer.terms,
        validFrom: offer.valid_from,
        validUntil: offer.valid_until,
        status: offer.status,
        message: 'Offer created successfully',
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Create offer error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create offer' } });
  }
});

/**
 * PUT /api/admin/offers/:id
 * Update an offer
 */
router.put('/admin/offers/:id', authenticate, requireAdmin, [
  param('id').isString().notEmpty(),
  body('title').optional().isString().notEmpty(),
  body('description').optional().isString(),
  body('merchantId').optional().isString(),
  body('discountType').optional().isIn(['percentage', 'fixed', 'cashback']),
  body('discountValue').optional().isFloat({ min: 0 }),
  body('minPurchase').optional().isInt({ min: 0 }),
  body('imageUrl').optional().isString(),
  body('terms').optional().isString(),
  body('validFrom').optional().isISO8601(),
  body('validUntil').optional().isISO8601(),
  body('status').optional().isIn(['draft', 'active', 'paused', 'expired']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;

    // Get existing offer
    const existingOffer = db.prepare(`SELECT * FROM offers WHERE id = ?`).get(id) as OfferRow | undefined;

    if (!existingOffer) {
      throw new NotFoundError('Offer not found');
    }

    const {
      title, description, merchantId, discountType, discountValue, minPurchase,
      imageUrl, terms, validFrom, validUntil, status
    } = req.body;

    // Validate merchant if provided
    if (merchantId) {
      const merchant = db.prepare(`SELECT id FROM merchants WHERE id = ?`).get(merchantId);
      if (!merchant) {
        throw new BadRequestError('Merchant not found');
      }
    }

    // Validate dates if both provided
    if (validFrom && validUntil && new Date(validUntil) <= new Date(validFrom)) {
      throw new BadRequestError('Valid until date must be after valid from date');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }
    if (merchantId !== undefined) { updates.push('merchant_id = ?'); values.push(merchantId || null); }
    if (discountType !== undefined) { updates.push('discount_type = ?'); values.push(discountType || null); }
    if (discountValue !== undefined) { updates.push('discount_value = ?'); values.push(discountValue); }
    if (minPurchase !== undefined) { updates.push('min_purchase = ?'); values.push(minPurchase); }
    if (imageUrl !== undefined) { updates.push('image_url = ?'); values.push(imageUrl || null); }
    if (terms !== undefined) { updates.push('terms = ?'); values.push(terms || null); }
    if (validFrom !== undefined) { updates.push('valid_from = ?'); values.push(validFrom || null); }
    if (validUntil !== undefined) { updates.push('valid_until = ?'); values.push(validUntil || null); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE offers SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'OFFER_UPDATED',
      req.user!.userId,
      'admin',
      'offer',
      id,
      `Updated offer: ${title || existingOffer.title}`
    );

    const updatedOffer = db.prepare(`SELECT * FROM offers WHERE id = ?`).get(id) as OfferRow;

    res.json({
      success: true,
      data: {
        id: updatedOffer.id,
        title: updatedOffer.title,
        description: updatedOffer.description,
        merchantId: updatedOffer.merchant_id,
        discountType: updatedOffer.discount_type,
        discountValue: updatedOffer.discount_value,
        minPurchase: updatedOffer.min_purchase,
        imageUrl: updatedOffer.image_url,
        terms: updatedOffer.terms,
        validFrom: updatedOffer.valid_from,
        validUntil: updatedOffer.valid_until,
        status: updatedOffer.status,
        viewCount: updatedOffer.view_count,
        claimCount: updatedOffer.claim_count,
        message: 'Offer updated successfully',
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update offer error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update offer' } });
  }
});

export default router;
