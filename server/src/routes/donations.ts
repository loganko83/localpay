/**
 * Donation Routes
 * Campaign management and donation processing
 * NOTE: Actual funds transferred via bank - we only display values
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, param, query, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';

const router = Router();

// Type definitions
interface DonationCampaign {
  id: string;
  title: string;
  description: string | null;
  organization: string;
  organization_id: string | null;
  target_amount: number;
  raised_amount: number;
  donor_count: number;
  image_url: string | null;
  category: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  blockchain_address: string | null;
  verified: number;
  created_at: string;
  updated_at: string;
}

interface Donation {
  id: string;
  campaign_id: string;
  user_id: string;
  amount: number;
  anonymous: number;
  display_name: string | null;
  message: string | null;
  transaction_id: string | null;
  blockchain_hash: string | null;
  receipt_number: string | null;
  tax_deductible: number;
  created_at: string;
}

interface WalletRow {
  id: string;
  user_id: string;
  balance: number;
}

type CampaignCategory = 'disaster' | 'education' | 'health' | 'environment' | 'poverty' | 'animal' | 'culture' | 'other';
type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

const VALID_CATEGORIES: CampaignCategory[] = ['disaster', 'education', 'health', 'environment', 'poverty', 'animal', 'culture', 'other'];
const VALID_STATUSES: CampaignStatus[] = ['draft', 'active', 'paused', 'completed', 'cancelled'];

/**
 * Generate unique receipt number
 */
function generateReceiptNumber(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DON-${timestamp}-${random}`;
}

// ==================== Consumer Endpoints ====================

/**
 * GET /api/donations/campaigns
 * List active donation campaigns
 */
router.get('/campaigns', authenticate, [
  query('category').optional().isIn(VALID_CATEGORIES),
  query('search').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { category, search, limit = 20, offset = 0 } = req.query;
    const db = getDb();

    let sql = `
      SELECT *
      FROM donation_campaigns
      WHERE status = 'active'
    `;
    const params: (string | number)[] = [];

    if (category) {
      sql += ` AND category = ?`;
      params.push(category as string);
    }

    if (search) {
      sql += ` AND (title LIKE ? OR description LIKE ? OR organization LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY verified DESC, raised_amount DESC, created_at DESC`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const campaigns = db.prepare(sql).all(...params) as DonationCampaign[];

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total
      FROM donation_campaigns
      WHERE status = 'active'
    `;
    const countParams: string[] = [];

    if (category) {
      countSql += ` AND category = ?`;
      countParams.push(category as string);
    }

    if (search) {
      countSql += ` AND (title LIKE ? OR description LIKE ? OR organization LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const totalResult = db.prepare(countSql).get(...countParams) as { total: number };

    res.json({
      success: true,
      data: {
        campaigns: campaigns.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          organization: c.organization,
          targetAmount: c.target_amount,
          raisedAmount: c.raised_amount,
          donorCount: c.donor_count,
          imageUrl: c.image_url,
          category: c.category,
          startDate: c.start_date,
          endDate: c.end_date,
          progress: c.target_amount > 0 ? Math.round((c.raised_amount / c.target_amount) * 100) : 0,
          verified: c.verified === 1,
          blockchainAddress: c.blockchain_address,
        })),
        pagination: {
          total: totalResult.total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + campaigns.length < totalResult.total,
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('List campaigns error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list campaigns' } });
  }
});

/**
 * GET /api/donations/campaigns/:id
 * Get campaign details with recent donors
 */
router.get('/campaigns/:id', authenticate, [
  param('id').notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { id } = req.params;
    const db = getDb();

    const campaign = db.prepare(`
      SELECT * FROM donation_campaigns WHERE id = ?
    `).get(id) as DonationCampaign | undefined;

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Get recent donors (last 10)
    const recentDonors = db.prepare(`
      SELECT
        d.id,
        d.amount,
        d.anonymous,
        d.display_name,
        d.message,
        d.created_at,
        CASE WHEN d.anonymous = 1 THEN NULL ELSE u.name END as user_name
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.campaign_id = ?
      ORDER BY d.created_at DESC
      LIMIT 10
    `).all(id) as Array<{
      id: string;
      amount: number;
      anonymous: number;
      display_name: string | null;
      message: string | null;
      created_at: string;
      user_name: string | null;
    }>;

    // Check if current user has donated
    const userDonation = db.prepare(`
      SELECT SUM(amount) as total_amount, COUNT(*) as donation_count
      FROM donations
      WHERE campaign_id = ? AND user_id = ?
    `).get(id, req.user!.userId) as { total_amount: number | null; donation_count: number };

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          organization: campaign.organization,
          organizationId: campaign.organization_id,
          targetAmount: campaign.target_amount,
          raisedAmount: campaign.raised_amount,
          donorCount: campaign.donor_count,
          imageUrl: campaign.image_url,
          category: campaign.category,
          startDate: campaign.start_date,
          endDate: campaign.end_date,
          status: campaign.status,
          progress: campaign.target_amount > 0 ? Math.round((campaign.raised_amount / campaign.target_amount) * 100) : 0,
          verified: campaign.verified === 1,
          blockchainAddress: campaign.blockchain_address,
          createdAt: campaign.created_at,
        },
        recentDonors: recentDonors.map(d => ({
          id: d.id,
          amount: d.amount,
          displayName: d.anonymous === 1 ? 'Anonymous' : (d.display_name || d.user_name || 'Anonymous'),
          message: d.message,
          createdAt: d.created_at,
        })),
        userDonation: {
          hasContributed: userDonation.donation_count > 0,
          totalAmount: userDonation.total_amount || 0,
          donationCount: userDonation.donation_count,
        },
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get campaign error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get campaign' } });
  }
});

/**
 * POST /api/donations/donate
 * Make a donation to a campaign
 */
router.post('/donate', authenticate, [
  body('campaignId').notEmpty().withMessage('Campaign ID is required'),
  body('amount').isInt({ min: 1000, max: 100000000 }).withMessage('Amount must be between 1,000 and 100,000,000 KRW'),
  body('anonymous').optional().isBoolean(),
  body('displayName').optional().isString().isLength({ max: 50 }),
  body('message').optional().isString().isLength({ max: 500 }),
  body('taxDeductible').optional().isBoolean(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { campaignId, amount, anonymous = false, displayName, message, taxDeductible = true } = req.body;
    const db = getDb();

    // Check campaign exists and is active
    const campaign = db.prepare(`
      SELECT * FROM donation_campaigns WHERE id = ? AND status = 'active'
    `).get(campaignId) as DonationCampaign | undefined;

    if (!campaign) {
      throw new NotFoundError('Campaign not found or not active');
    }

    // Check campaign dates
    const now = new Date();
    if (campaign.start_date && new Date(campaign.start_date) > now) {
      throw new BadRequestError('Campaign has not started yet');
    }
    if (campaign.end_date && new Date(campaign.end_date) < now) {
      throw new BadRequestError('Campaign has ended');
    }

    // Check user wallet balance
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.userId) as WalletRow | undefined;

    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    if (wallet.balance < amount) {
      throw new BadRequestError('Insufficient balance');
    }

    // Generate receipt number
    const receiptNumber = generateReceiptNumber();
    const donationId = uuidv4();
    const txId = `DON-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const transactionId = uuidv4();

    // Create transaction record
    db.prepare(`
      INSERT INTO transactions (id, tx_id, user_id, amount, type, status, description)
      VALUES (?, ?, ?, ?, 'payment', 'completed', ?)
    `).run(transactionId, txId, req.user!.userId, amount, `Donation to: ${campaign.title}`);

    // Create donation record
    db.prepare(`
      INSERT INTO donations (id, campaign_id, user_id, amount, anonymous, display_name, message, transaction_id, receipt_number, tax_deductible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      donationId,
      campaignId,
      req.user!.userId,
      amount,
      anonymous ? 1 : 0,
      displayName || null,
      message || null,
      transactionId,
      receiptNumber,
      taxDeductible ? 1 : 0
    );

    // Update campaign raised_amount and donor_count
    // Check if this is a new donor or repeat donor
    const existingDonations = db.prepare(`
      SELECT COUNT(*) as count FROM donations
      WHERE campaign_id = ? AND user_id = ? AND id != ?
    `).get(campaignId, req.user!.userId, donationId) as { count: number };

    const isNewDonor = existingDonations.count === 0;

    db.prepare(`
      UPDATE donation_campaigns
      SET raised_amount = raised_amount + ?,
          donor_count = donor_count + ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(amount, isNewDonor ? 1 : 0, campaignId);

    // Deduct from wallet (simulating bank response)
    db.prepare(`
      UPDATE wallets
      SET balance = balance - ?,
          updated_at = datetime('now')
      WHERE user_id = ?
    `).run(amount, req.user!.userId);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'DONATION_MADE',
      req.user!.userId,
      req.user!.userType,
      'donation',
      donationId,
      `Donated ${amount.toLocaleString()} KRW to ${campaign.title}`,
      JSON.stringify({ campaignId, amount, receiptNumber, anonymous })
    );

    // Get updated wallet balance
    const updatedWallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(req.user!.userId) as { balance: number };

    res.json({
      success: true,
      data: {
        donationId,
        receiptNumber,
        amount,
        campaignTitle: campaign.title,
        organization: campaign.organization,
        taxDeductible: taxDeductible,
        newBalance: updatedWallet.balance,
        message: 'Thank you for your donation!',
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Donate error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Donation failed' } });
  }
});

/**
 * GET /api/donations/my
 * Get current user's donation history
 */
router.get('/my', authenticate, [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { limit = 20, offset = 0 } = req.query;
    const db = getDb();

    const donations = db.prepare(`
      SELECT
        d.*,
        c.title as campaign_title,
        c.organization,
        c.image_url as campaign_image,
        c.category as campaign_category
      FROM donations d
      LEFT JOIN donation_campaigns c ON d.campaign_id = c.id
      WHERE d.user_id = ?
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user!.userId, Number(limit), Number(offset)) as Array<Donation & {
      campaign_title: string;
      organization: string;
      campaign_image: string | null;
      campaign_category: string | null;
    }>;

    // Get total count
    const totalResult = db.prepare(`
      SELECT COUNT(*) as total FROM donations WHERE user_id = ?
    `).get(req.user!.userId) as { total: number };

    // Get summary stats
    const summary = db.prepare(`
      SELECT
        SUM(amount) as total_donated,
        COUNT(*) as total_donations,
        COUNT(DISTINCT campaign_id) as campaigns_supported
      FROM donations
      WHERE user_id = ?
    `).get(req.user!.userId) as { total_donated: number | null; total_donations: number; campaigns_supported: number };

    res.json({
      success: true,
      data: {
        donations: donations.map(d => ({
          id: d.id,
          campaignId: d.campaign_id,
          campaignTitle: d.campaign_title,
          organization: d.organization,
          campaignImage: d.campaign_image,
          campaignCategory: d.campaign_category,
          amount: d.amount,
          anonymous: d.anonymous === 1,
          displayName: d.display_name,
          message: d.message,
          receiptNumber: d.receipt_number,
          taxDeductible: d.tax_deductible === 1,
          createdAt: d.created_at,
        })),
        summary: {
          totalDonated: summary.total_donated || 0,
          totalDonations: summary.total_donations,
          campaignsSupported: summary.campaigns_supported,
        },
        pagination: {
          total: totalResult.total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + donations.length < totalResult.total,
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get my donations error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get donation history' } });
  }
});

/**
 * GET /api/donations/receipts/:id
 * Get donation receipt details
 */
router.get('/receipts/:id', authenticate, [
  param('id').notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { id } = req.params;
    const db = getDb();

    const donation = db.prepare(`
      SELECT
        d.*,
        c.title as campaign_title,
        c.organization,
        c.organization_id,
        c.verified as organization_verified,
        c.blockchain_address,
        u.name as donor_name,
        u.email as donor_email
      FROM donations d
      LEFT JOIN donation_campaigns c ON d.campaign_id = c.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `).get(id) as (Donation & {
      campaign_title: string;
      organization: string;
      organization_id: string | null;
      organization_verified: number;
      blockchain_address: string | null;
      donor_name: string;
      donor_email: string;
    }) | undefined;

    if (!donation) {
      throw new NotFoundError('Donation receipt not found');
    }

    // Verify the donation belongs to the requesting user
    if (donation.user_id !== req.user!.userId && req.user!.userType !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    res.json({
      success: true,
      data: {
        receipt: {
          receiptNumber: donation.receipt_number,
          donationId: donation.id,
          amount: donation.amount,
          taxDeductible: donation.tax_deductible === 1,
          donatedAt: donation.created_at,
          campaign: {
            title: donation.campaign_title,
            organization: donation.organization,
            organizationId: donation.organization_id,
            verified: donation.organization_verified === 1,
            blockchainAddress: donation.blockchain_address,
          },
          donor: {
            name: donation.anonymous === 1 ? 'Anonymous' : (donation.display_name || donation.donor_name),
            email: donation.anonymous === 1 ? null : donation.donor_email,
          },
          transactionId: donation.transaction_id,
          blockchainHash: donation.blockchain_hash,
          message: donation.message,
        },
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get receipt error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get receipt' } });
  }
});

// ==================== Admin Endpoints ====================

/**
 * GET /api/admin/donations/campaigns
 * Get all campaigns (admin view)
 */
router.get('/admin/campaigns', authenticate, requireAdmin, [
  query('status').optional().isIn(VALID_STATUSES),
  query('category').optional().isIn(VALID_CATEGORIES),
  query('verified').optional().isBoolean(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { status, category, verified, limit = 20, offset = 0 } = req.query;
    const db = getDb();

    let sql = `SELECT * FROM donation_campaigns WHERE 1=1`;
    const params: (string | number)[] = [];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status as string);
    }

    if (category) {
      sql += ` AND category = ?`;
      params.push(category as string);
    }

    if (verified !== undefined) {
      sql += ` AND verified = ?`;
      params.push(verified === 'true' ? 1 : 0);
    }

    sql += ` ORDER BY created_at DESC`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const campaigns = db.prepare(sql).all(...params) as DonationCampaign[];

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM donation_campaigns WHERE 1=1`;
    const countParams: (string | number)[] = [];

    if (status) {
      countSql += ` AND status = ?`;
      countParams.push(status as string);
    }

    if (category) {
      countSql += ` AND category = ?`;
      countParams.push(category as string);
    }

    if (verified !== undefined) {
      countSql += ` AND verified = ?`;
      countParams.push(verified === 'true' ? 1 : 0);
    }

    const totalResult = db.prepare(countSql).get(...countParams) as { total: number };

    res.json({
      success: true,
      data: {
        campaigns: campaigns.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          organization: c.organization,
          organizationId: c.organization_id,
          targetAmount: c.target_amount,
          raisedAmount: c.raised_amount,
          donorCount: c.donor_count,
          imageUrl: c.image_url,
          category: c.category,
          startDate: c.start_date,
          endDate: c.end_date,
          status: c.status,
          progress: c.target_amount > 0 ? Math.round((c.raised_amount / c.target_amount) * 100) : 0,
          verified: c.verified === 1,
          blockchainAddress: c.blockchain_address,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
        pagination: {
          total: totalResult.total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + campaigns.length < totalResult.total,
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Admin list campaigns error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list campaigns' } });
  }
});

/**
 * POST /api/admin/donations/campaigns
 * Create a new campaign
 */
router.post('/admin/campaigns', authenticate, requireAdmin, [
  body('title').notEmpty().isLength({ max: 200 }).withMessage('Title is required (max 200 chars)'),
  body('description').optional().isLength({ max: 5000 }),
  body('organization').notEmpty().isLength({ max: 200 }).withMessage('Organization is required'),
  body('organizationId').optional().isString(),
  body('targetAmount').isInt({ min: 10000, max: 10000000000 }).withMessage('Target amount must be between 10,000 and 10,000,000,000 KRW'),
  body('imageUrl').optional().isURL(),
  body('category').optional().isIn(VALID_CATEGORIES),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('status').optional().isIn(VALID_STATUSES),
  body('blockchainAddress').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const {
      title,
      description,
      organization,
      organizationId,
      targetAmount,
      imageUrl,
      category,
      startDate,
      endDate,
      status = 'draft',
      blockchainAddress,
    } = req.body;

    const db = getDb();
    const campaignId = uuidv4();

    db.prepare(`
      INSERT INTO donation_campaigns (
        id, title, description, organization, organization_id,
        target_amount, image_url, category, start_date, end_date,
        status, blockchain_address
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      campaignId,
      title,
      description || null,
      organization,
      organizationId || null,
      targetAmount,
      imageUrl || null,
      category || null,
      startDate || null,
      endDate || null,
      status,
      blockchainAddress || null
    );

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'CAMPAIGN_CREATED',
      req.user!.userId,
      req.user!.userType,
      'donation_campaign',
      campaignId,
      `Created donation campaign: ${title}`,
      JSON.stringify({ title, organization, targetAmount, status })
    );

    const campaign = db.prepare('SELECT * FROM donation_campaigns WHERE id = ?').get(campaignId) as DonationCampaign;

    res.status(201).json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          organization: campaign.organization,
          organizationId: campaign.organization_id,
          targetAmount: campaign.target_amount,
          raisedAmount: campaign.raised_amount,
          donorCount: campaign.donor_count,
          imageUrl: campaign.image_url,
          category: campaign.category,
          startDate: campaign.start_date,
          endDate: campaign.end_date,
          status: campaign.status,
          verified: campaign.verified === 1,
          blockchainAddress: campaign.blockchain_address,
          createdAt: campaign.created_at,
        },
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Create campaign error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create campaign' } });
  }
});

/**
 * PUT /api/admin/donations/campaigns/:id
 * Update a campaign
 */
router.put('/admin/campaigns/:id', authenticate, requireAdmin, [
  param('id').notEmpty(),
  body('title').optional().isLength({ max: 200 }),
  body('description').optional().isLength({ max: 5000 }),
  body('organization').optional().isLength({ max: 200 }),
  body('organizationId').optional().isString(),
  body('targetAmount').optional().isInt({ min: 10000, max: 10000000000 }),
  body('imageUrl').optional().isURL(),
  body('category').optional().isIn(VALID_CATEGORIES),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('status').optional().isIn(VALID_STATUSES),
  body('blockchainAddress').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { id } = req.params;
    const db = getDb();

    // Check campaign exists
    const existingCampaign = db.prepare('SELECT * FROM donation_campaigns WHERE id = ?').get(id) as DonationCampaign | undefined;

    if (!existingCampaign) {
      throw new NotFoundError('Campaign not found');
    }

    const {
      title,
      description,
      organization,
      organizationId,
      targetAmount,
      imageUrl,
      category,
      startDate,
      endDate,
      status,
      blockchainAddress,
    } = req.body;

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (organization !== undefined) {
      updates.push('organization = ?');
      params.push(organization);
    }
    if (organizationId !== undefined) {
      updates.push('organization_id = ?');
      params.push(organizationId);
    }
    if (targetAmount !== undefined) {
      updates.push('target_amount = ?');
      params.push(targetAmount);
    }
    if (imageUrl !== undefined) {
      updates.push('image_url = ?');
      params.push(imageUrl);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (startDate !== undefined) {
      updates.push('start_date = ?');
      params.push(startDate);
    }
    if (endDate !== undefined) {
      updates.push('end_date = ?');
      params.push(endDate);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (blockchainAddress !== undefined) {
      updates.push('blockchain_address = ?');
      params.push(blockchainAddress);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`
      UPDATE donation_campaigns
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'CAMPAIGN_UPDATED',
      req.user!.userId,
      req.user!.userType,
      'donation_campaign',
      id,
      `Updated donation campaign: ${existingCampaign.title}`,
      JSON.stringify({ updates: req.body })
    );

    const campaign = db.prepare('SELECT * FROM donation_campaigns WHERE id = ?').get(id) as DonationCampaign;

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          organization: campaign.organization,
          organizationId: campaign.organization_id,
          targetAmount: campaign.target_amount,
          raisedAmount: campaign.raised_amount,
          donorCount: campaign.donor_count,
          imageUrl: campaign.image_url,
          category: campaign.category,
          startDate: campaign.start_date,
          endDate: campaign.end_date,
          status: campaign.status,
          verified: campaign.verified === 1,
          blockchainAddress: campaign.blockchain_address,
          createdAt: campaign.created_at,
          updatedAt: campaign.updated_at,
        },
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update campaign error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update campaign' } });
  }
});

/**
 * DELETE /api/admin/donations/campaigns/:id
 * Delete a campaign
 */
router.delete('/admin/campaigns/:id', authenticate, requireAdmin, [
  param('id').notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { id } = req.params;
    const db = getDb();

    // Check campaign exists
    const campaign = db.prepare('SELECT * FROM donation_campaigns WHERE id = ?').get(id) as DonationCampaign | undefined;

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Check if campaign has donations
    const donationCount = db.prepare(`
      SELECT COUNT(*) as count FROM donations WHERE campaign_id = ?
    `).get(id) as { count: number };

    if (donationCount.count > 0) {
      throw new BadRequestError('Cannot delete campaign with existing donations. Consider cancelling instead.');
    }

    // Delete campaign
    db.prepare('DELETE FROM donation_campaigns WHERE id = ?').run(id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'CAMPAIGN_DELETED',
      req.user!.userId,
      req.user!.userType,
      'donation_campaign',
      id,
      `Deleted donation campaign: ${campaign.title}`,
      JSON.stringify({ campaignId: id, title: campaign.title })
    );

    res.json({
      success: true,
      data: {
        message: 'Campaign deleted successfully',
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Delete campaign error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete campaign' } });
  }
});

/**
 * GET /api/admin/donations/stats
 * Get donation statistics
 */
router.get('/admin/stats', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Overall stats
    const overallStats = db.prepare(`
      SELECT
        COUNT(*) as total_campaigns,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_campaigns,
        SUM(raised_amount) as total_raised,
        SUM(donor_count) as total_donors,
        SUM(target_amount) as total_target
      FROM donation_campaigns
    `).get() as {
      total_campaigns: number;
      active_campaigns: number;
      total_raised: number | null;
      total_donors: number | null;
      total_target: number | null;
    };

    // Donation stats
    const donationStats = db.prepare(`
      SELECT
        COUNT(*) as total_donations,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount,
        MAX(amount) as largest_donation,
        SUM(CASE WHEN tax_deductible = 1 THEN amount ELSE 0 END) as tax_deductible_amount
      FROM donations
    `).get() as {
      total_donations: number;
      total_amount: number | null;
      average_amount: number | null;
      largest_donation: number | null;
      tax_deductible_amount: number | null;
    };

    // By category
    const categoryStats = db.prepare(`
      SELECT
        category,
        COUNT(*) as campaign_count,
        SUM(raised_amount) as total_raised,
        SUM(donor_count) as total_donors
      FROM donation_campaigns
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY total_raised DESC
    `).all() as Array<{
      category: string;
      campaign_count: number;
      total_raised: number;
      total_donors: number;
    }>;

    // Recent donations (last 7 days)
    const recentTrend = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as donation_count,
        SUM(amount) as total_amount
      FROM donations
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all() as Array<{
      date: string;
      donation_count: number;
      total_amount: number;
    }>;

    // Top campaigns by raised amount
    const topCampaigns = db.prepare(`
      SELECT id, title, organization, raised_amount, target_amount, donor_count, verified
      FROM donation_campaigns
      WHERE status = 'active'
      ORDER BY raised_amount DESC
      LIMIT 5
    `).all() as Array<{
      id: string;
      title: string;
      organization: string;
      raised_amount: number;
      target_amount: number;
      donor_count: number;
      verified: number;
    }>;

    res.json({
      success: true,
      data: {
        overview: {
          totalCampaigns: overallStats.total_campaigns,
          activeCampaigns: overallStats.active_campaigns,
          totalRaised: overallStats.total_raised || 0,
          totalDonors: overallStats.total_donors || 0,
          totalTarget: overallStats.total_target || 0,
          overallProgress: overallStats.total_target && overallStats.total_target > 0
            ? Math.round(((overallStats.total_raised || 0) / overallStats.total_target) * 100)
            : 0,
        },
        donations: {
          totalDonations: donationStats.total_donations,
          totalAmount: donationStats.total_amount || 0,
          averageAmount: Math.round(donationStats.average_amount || 0),
          largestDonation: donationStats.largest_donation || 0,
          taxDeductibleAmount: donationStats.tax_deductible_amount || 0,
        },
        byCategory: categoryStats.map(c => ({
          category: c.category,
          campaignCount: c.campaign_count,
          totalRaised: c.total_raised,
          totalDonors: c.total_donors,
        })),
        recentTrend: recentTrend.map(t => ({
          date: t.date,
          donationCount: t.donation_count,
          totalAmount: t.total_amount,
        })),
        topCampaigns: topCampaigns.map(c => ({
          id: c.id,
          title: c.title,
          organization: c.organization,
          raisedAmount: c.raised_amount,
          targetAmount: c.target_amount,
          donorCount: c.donor_count,
          progress: c.target_amount > 0 ? Math.round((c.raised_amount / c.target_amount) * 100) : 0,
          verified: c.verified === 1,
        })),
      },
    });
  } catch (error) {
    console.error('Get donation stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get statistics' } });
  }
});

/**
 * POST /api/admin/donations/campaigns/:id/verify
 * Verify organization for a campaign
 */
router.post('/admin/campaigns/:id/verify', authenticate, requireAdmin, [
  param('id').notEmpty(),
  body('verified').isBoolean().withMessage('Verified status is required'),
  body('notes').optional().isString().isLength({ max: 1000 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { id } = req.params;
    const { verified, notes } = req.body;
    const db = getDb();

    // Check campaign exists
    const campaign = db.prepare('SELECT * FROM donation_campaigns WHERE id = ?').get(id) as DonationCampaign | undefined;

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Update verified status
    db.prepare(`
      UPDATE donation_campaigns
      SET verified = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(verified ? 1 : 0, id);

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      verified ? 'CAMPAIGN_VERIFIED' : 'CAMPAIGN_UNVERIFIED',
      req.user!.userId,
      req.user!.userType,
      'donation_campaign',
      id,
      `${verified ? 'Verified' : 'Unverified'} organization for campaign: ${campaign.title}`,
      JSON.stringify({ campaignId: id, verified, notes })
    );

    const updatedCampaign = db.prepare('SELECT * FROM donation_campaigns WHERE id = ?').get(id) as DonationCampaign;

    res.json({
      success: true,
      data: {
        campaign: {
          id: updatedCampaign.id,
          title: updatedCampaign.title,
          organization: updatedCampaign.organization,
          verified: updatedCampaign.verified === 1,
          updatedAt: updatedCampaign.updated_at,
        },
        message: `Organization ${verified ? 'verified' : 'unverified'} successfully`,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Verify campaign error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to verify organization' } });
  }
});

export default router;
