/**
 * Traceability Routes
 * Product traceability API for supply chain tracking
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, param, query, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireMerchant, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';

const router = Router();

// ==================== Type Definitions ====================

interface TracedProductRow {
  id: string;
  product_code: string;
  name: string;
  description: string | null;
  category: string | null;
  origin: string | null;
  manufacturer: string | null;
  manufacture_date: string | null;
  expiry_date: string | null;
  merchant_id: string | null;
  batch_number: string | null;
  certifications: string | null;
  blockchain_hash: string | null;
  qr_code_url: string | null;
  status: 'active' | 'sold' | 'recalled' | 'expired';
  created_at: string;
  updated_at: string;
}

interface TracePointRow {
  id: string;
  product_id: string;
  sequence: number;
  location: string;
  location_lat: number | null;
  location_lng: number | null;
  action: 'produced' | 'processed' | 'packaged' | 'shipped' | 'received' | 'stored' | 'sold';
  actor: string;
  actor_type: 'manufacturer' | 'processor' | 'distributor' | 'retailer' | 'consumer' | null;
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  details: string | null;
  blockchain_hash: string | null;
  verified: number;
  created_at: string;
}

interface MerchantRow {
  id: string;
  store_name: string;
}

// ==================== Helper Functions ====================

/**
 * Generate unique product code in format TRC-{random}
 */
function generateProductCode(): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `TRC-${random}`;
}

/**
 * Get the next sequence number for a product's trace points
 */
function getNextSequence(db: ReturnType<typeof getDb>, productId: string): number {
  const result = db.prepare(`
    SELECT COALESCE(MAX(sequence), 0) + 1 as next_seq
    FROM trace_points
    WHERE product_id = ?
  `).get(productId) as { next_seq: number };
  return result.next_seq;
}

/**
 * Generate a mock blockchain hash for demonstration
 */
function generateBlockchainHash(): string {
  return '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Transform product row to API response format
 */
function transformProduct(product: TracedProductRow, merchant?: MerchantRow | null) {
  return {
    id: product.id,
    productCode: product.product_code,
    name: product.name,
    description: product.description,
    category: product.category,
    origin: product.origin,
    manufacturer: product.manufacturer,
    manufactureDate: product.manufacture_date,
    expiryDate: product.expiry_date,
    merchantId: product.merchant_id,
    merchantName: merchant?.store_name || null,
    batchNumber: product.batch_number,
    certifications: product.certifications ? JSON.parse(product.certifications) : [],
    blockchainHash: product.blockchain_hash,
    qrCodeUrl: product.qr_code_url,
    status: product.status,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

/**
 * Transform trace point row to API response format
 */
function transformTracePoint(point: TracePointRow) {
  return {
    id: point.id,
    productId: point.product_id,
    sequence: point.sequence,
    location: point.location,
    coordinates: point.location_lat && point.location_lng ? {
      lat: point.location_lat,
      lng: point.location_lng,
    } : null,
    action: point.action,
    actor: point.actor,
    actorType: point.actor_type,
    timestamp: point.timestamp,
    temperature: point.temperature,
    humidity: point.humidity,
    details: point.details ? JSON.parse(point.details) : null,
    blockchainHash: point.blockchain_hash,
    verified: point.verified === 1,
    createdAt: point.created_at,
  };
}

// ==================== Public Routes ====================

/**
 * GET /api/trace/product/:code
 * Trace product by code (public)
 */
router.get('/product/:code', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const db = getDb();

    // Find product by code
    const product = db.prepare(`
      SELECT * FROM traced_products WHERE product_code = ?
    `).get(code) as TracedProductRow | undefined;

    if (!product) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
      return;
    }

    // Get merchant info
    let merchant: MerchantRow | undefined;
    if (product.merchant_id) {
      merchant = db.prepare(`
        SELECT id, store_name FROM merchants WHERE id = ?
      `).get(product.merchant_id) as MerchantRow | undefined;
    }

    // Get all trace points for this product
    const tracePoints = db.prepare(`
      SELECT * FROM trace_points
      WHERE product_id = ?
      ORDER BY sequence ASC
    `).all(product.id) as TracePointRow[];

    res.json({
      success: true,
      data: {
        product: transformProduct(product, merchant),
        traceHistory: tracePoints.map(transformTracePoint),
        totalSteps: tracePoints.length,
      },
    });
  } catch (error) {
    console.error('Get product trace error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get product trace' },
    });
  }
});

/**
 * GET /api/trace/verify/:code
 * Verify product authenticity (public)
 */
router.get('/verify/:code', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const db = getDb();

    // Find product
    const product = db.prepare(`
      SELECT * FROM traced_products WHERE product_code = ?
    `).get(code) as TracedProductRow | undefined;

    if (!product) {
      res.json({
        success: true,
        data: {
          verified: false,
          reason: 'Product not found in database',
          productCode: code,
        },
      });
      return;
    }

    // Get merchant info
    let merchant: MerchantRow | undefined;
    if (product.merchant_id) {
      merchant = db.prepare(`
        SELECT id, store_name FROM merchants WHERE id = ?
      `).get(product.merchant_id) as MerchantRow | undefined;
    }

    // Get trace points count
    const traceStats = db.prepare(`
      SELECT
        COUNT(*) as total_points,
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified_points
      FROM trace_points
      WHERE product_id = ?
    `).get(product.id) as { total_points: number; verified_points: number };

    // Check if product has blockchain hash (indicates it was anchored)
    const hasBlockchainProof = !!product.blockchain_hash;

    // Check product status
    const isRecalled = product.status === 'recalled';
    const isExpired = product.status === 'expired' ||
      (product.expiry_date && new Date(product.expiry_date) < new Date());

    // Calculate verification score
    let verificationScore = 0;
    if (hasBlockchainProof) verificationScore += 40;
    if (traceStats.total_points > 0) verificationScore += 30;
    if (traceStats.verified_points === traceStats.total_points && traceStats.total_points > 0) verificationScore += 30;

    res.json({
      success: true,
      data: {
        verified: !isRecalled && !isExpired && verificationScore >= 70,
        verificationScore,
        productCode: code,
        productName: product.name,
        manufacturer: product.manufacturer,
        origin: product.origin,
        merchantName: merchant?.store_name || null,
        status: product.status,
        hasBlockchainProof,
        tracePointCount: traceStats.total_points,
        verifiedPointCount: traceStats.verified_points,
        warnings: [
          ...(isRecalled ? ['Product has been recalled'] : []),
          ...(isExpired ? ['Product has expired'] : []),
          ...(!hasBlockchainProof ? ['No blockchain verification available'] : []),
        ],
        certifications: product.certifications ? JSON.parse(product.certifications) : [],
        expiryDate: product.expiry_date,
      },
    });
  } catch (error) {
    console.error('Verify product error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to verify product' },
    });
  }
});

// ==================== Consumer Routes ====================

/**
 * POST /api/trace/scan
 * Record consumer scan (updates product status to sold)
 */
router.post('/scan', authenticate, [
  body('productCode').notEmpty().withMessage('Product code is required'),
  body('location').optional().isString(),
  body('coordinates').optional().isObject(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { productCode, location, coordinates } = req.body;
    const db = getDb();

    // Find product
    const product = db.prepare(`
      SELECT * FROM traced_products WHERE product_code = ?
    `).get(productCode) as TracedProductRow | undefined;

    if (!product) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
      return;
    }

    // Get user info
    const user = db.prepare(`
      SELECT name FROM users WHERE id = ?
    `).get(req.user!.userId) as { name: string } | undefined;

    // Add trace point for consumer scan
    const tracePointId = uuidv4();
    const sequence = getNextSequence(db, product.id);

    db.prepare(`
      INSERT INTO trace_points (
        id, product_id, sequence, location, location_lat, location_lng,
        action, actor, actor_type, timestamp, details, blockchain_hash
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
    `).run(
      tracePointId,
      product.id,
      sequence,
      location || 'Consumer Location',
      coordinates?.lat || null,
      coordinates?.lng || null,
      'sold',
      user?.name || 'Consumer',
      'consumer',
      JSON.stringify({ scannedBy: req.user!.userId }),
      generateBlockchainHash()
    );

    // Update product status to sold
    db.prepare(`
      UPDATE traced_products
      SET status = 'sold', updated_at = datetime('now')
      WHERE id = ? AND status = 'active'
    `).run(product.id);

    // Log audit event
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'PRODUCT_SCANNED',
      req.user!.userId,
      'consumer',
      'traced_product',
      product.id,
      `Consumer scanned product ${product.product_code}`
    );

    res.json({
      success: true,
      data: {
        productCode: product.product_code,
        productName: product.name,
        status: 'sold',
        scanRecorded: true,
        tracePointId,
        message: 'Scan recorded successfully',
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    console.error('Scan product error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record scan' },
    });
  }
});

// ==================== Merchant Routes ====================

/**
 * GET /api/merchant/products
 * Get merchant's traced products
 */
router.get('/merchant/products', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const db = getDb();
    let whereClause = 'WHERE merchant_id = ?';
    const params: (string | number)[] = [req.user!.merchantId!];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR product_code LIKE ? OR batch_number LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM traced_products ${whereClause}
    `).get(...params) as { count: number };

    // Get products
    const products = db.prepare(`
      SELECT * FROM traced_products ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as TracedProductRow[];

    // Get trace point counts for each product
    const productsWithStats = products.map(product => {
      const stats = db.prepare(`
        SELECT COUNT(*) as trace_count
        FROM trace_points
        WHERE product_id = ?
      `).get(product.id) as { trace_count: number };

      return {
        ...transformProduct(product),
        tracePointCount: stats.trace_count,
      };
    });

    res.json({
      success: true,
      data: {
        products: productsWithStats,
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('Get merchant products error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get products' },
    });
  }
});

/**
 * POST /api/merchant/products
 * Register new product
 */
router.post('/merchant/products', authenticate, requireMerchant, [
  body('name').notEmpty().withMessage('Product name is required'),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('origin').optional().isString(),
  body('manufacturer').optional().isString(),
  body('manufactureDate').optional().isISO8601(),
  body('expiryDate').optional().isISO8601(),
  body('batchNumber').optional().isString(),
  body('certifications').optional().isArray(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const {
      name,
      description,
      category,
      origin,
      manufacturer,
      manufactureDate,
      expiryDate,
      batchNumber,
      certifications,
    } = req.body;

    const db = getDb();
    const productId = uuidv4();
    const productCode = generateProductCode();
    const blockchainHash = generateBlockchainHash();

    // Generate QR code URL (mock - in production this would generate actual QR)
    const qrCodeUrl = `/api/trace/qr/${productCode}`;

    db.prepare(`
      INSERT INTO traced_products (
        id, product_code, name, description, category, origin, manufacturer,
        manufacture_date, expiry_date, merchant_id, batch_number, certifications,
        blockchain_hash, qr_code_url, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      productId,
      productCode,
      name,
      description || null,
      category || null,
      origin || null,
      manufacturer || null,
      manufactureDate || null,
      expiryDate || null,
      req.user!.merchantId!,
      batchNumber || null,
      certifications ? JSON.stringify(certifications) : null,
      blockchainHash,
      qrCodeUrl
    );

    // Add initial trace point (produced/registered)
    const tracePointId = uuidv4();
    const merchantInfo = db.prepare(`
      SELECT store_name, address FROM merchants WHERE id = ?
    `).get(req.user!.merchantId!) as { store_name: string; address: string | null } | undefined;

    db.prepare(`
      INSERT INTO trace_points (
        id, product_id, sequence, location, action, actor, actor_type,
        timestamp, details, blockchain_hash
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
    `).run(
      tracePointId,
      productId,
      1,
      merchantInfo?.address || 'Registered Location',
      'produced',
      merchantInfo?.store_name || 'Merchant',
      'retailer',
      JSON.stringify({ registeredBy: req.user!.userId }),
      generateBlockchainHash()
    );

    // Log audit event
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'PRODUCT_REGISTERED',
      req.user!.userId,
      'merchant',
      'traced_product',
      productId,
      `Product ${productCode} registered: ${name}`
    );

    const product = db.prepare(`
      SELECT * FROM traced_products WHERE id = ?
    `).get(productId) as TracedProductRow;

    res.status(201).json({
      success: true,
      data: {
        ...transformProduct(product),
        message: 'Product registered successfully',
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    console.error('Register product error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to register product' },
    });
  }
});

/**
 * PUT /api/merchant/products/:id
 * Update product
 */
router.put('/merchant/products/:id', authenticate, requireMerchant, [
  body('name').optional().isString().isLength({ min: 1 }),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('origin').optional().isString(),
  body('manufacturer').optional().isString(),
  body('manufactureDate').optional().isISO8601(),
  body('expiryDate').optional().isISO8601(),
  body('batchNumber').optional().isString(),
  body('certifications').optional().isArray(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { id } = req.params;
    const db = getDb();

    // Check if product exists and belongs to merchant
    const product = db.prepare(`
      SELECT * FROM traced_products WHERE id = ? AND merchant_id = ?
    `).get(id, req.user!.merchantId!) as TracedProductRow | undefined;

    if (!product) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
      return;
    }

    const {
      name,
      description,
      category,
      origin,
      manufacturer,
      manufactureDate,
      expiryDate,
      batchNumber,
      certifications,
    } = req.body;

    // Build update query
    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (origin !== undefined) {
      updates.push('origin = ?');
      params.push(origin);
    }
    if (manufacturer !== undefined) {
      updates.push('manufacturer = ?');
      params.push(manufacturer);
    }
    if (manufactureDate !== undefined) {
      updates.push('manufacture_date = ?');
      params.push(manufactureDate);
    }
    if (expiryDate !== undefined) {
      updates.push('expiry_date = ?');
      params.push(expiryDate);
    }
    if (batchNumber !== undefined) {
      updates.push('batch_number = ?');
      params.push(batchNumber);
    }
    if (certifications !== undefined) {
      updates.push('certifications = ?');
      params.push(JSON.stringify(certifications));
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`
      UPDATE traced_products SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    const updatedProduct = db.prepare(`
      SELECT * FROM traced_products WHERE id = ?
    `).get(id) as TracedProductRow;

    res.json({
      success: true,
      data: transformProduct(updatedProduct),
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update product' },
    });
  }
});

/**
 * POST /api/merchant/products/:id/trace
 * Add trace point
 */
router.post('/merchant/products/:id/trace', authenticate, requireMerchant, [
  body('location').notEmpty().withMessage('Location is required'),
  body('action').isIn(['produced', 'processed', 'packaged', 'shipped', 'received', 'stored', 'sold'])
    .withMessage('Invalid action'),
  body('actor').notEmpty().withMessage('Actor is required'),
  body('actorType').optional().isIn(['manufacturer', 'processor', 'distributor', 'retailer', 'consumer']),
  body('coordinates').optional().isObject(),
  body('temperature').optional().isNumeric(),
  body('humidity').optional().isNumeric(),
  body('details').optional().isObject(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { id } = req.params;
    const db = getDb();

    // Check if product exists and belongs to merchant
    const product = db.prepare(`
      SELECT * FROM traced_products WHERE id = ? AND merchant_id = ?
    `).get(id, req.user!.merchantId!) as TracedProductRow | undefined;

    if (!product) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
      return;
    }

    if (product.status === 'recalled' || product.status === 'expired') {
      throw new BadRequestError(`Cannot add trace point to ${product.status} product`);
    }

    const {
      location,
      action,
      actor,
      actorType,
      coordinates,
      temperature,
      humidity,
      details,
    } = req.body;

    const tracePointId = uuidv4();
    const sequence = getNextSequence(db, product.id);
    const blockchainHash = generateBlockchainHash();

    db.prepare(`
      INSERT INTO trace_points (
        id, product_id, sequence, location, location_lat, location_lng,
        action, actor, actor_type, timestamp, temperature, humidity,
        details, blockchain_hash, verified
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, 1)
    `).run(
      tracePointId,
      product.id,
      sequence,
      location,
      coordinates?.lat || null,
      coordinates?.lng || null,
      action,
      actor,
      actorType || null,
      temperature || null,
      humidity || null,
      details ? JSON.stringify(details) : null,
      blockchainHash
    );

    // Update product status if action is 'sold'
    if (action === 'sold') {
      db.prepare(`
        UPDATE traced_products SET status = 'sold', updated_at = datetime('now') WHERE id = ?
      `).run(product.id);
    }

    const tracePoint = db.prepare(`
      SELECT * FROM trace_points WHERE id = ?
    `).get(tracePointId) as TracePointRow;

    res.status(201).json({
      success: true,
      data: {
        tracePoint: transformTracePoint(tracePoint),
        message: 'Trace point added successfully',
      },
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    console.error('Add trace point error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to add trace point' },
    });
  }
});

/**
 * GET /api/merchant/products/:id/history
 * Get product trace history
 */
router.get('/merchant/products/:id/history', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Check if product exists and belongs to merchant
    const product = db.prepare(`
      SELECT * FROM traced_products WHERE id = ? AND merchant_id = ?
    `).get(id, req.user!.merchantId!) as TracedProductRow | undefined;

    if (!product) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
      return;
    }

    const tracePoints = db.prepare(`
      SELECT * FROM trace_points
      WHERE product_id = ?
      ORDER BY sequence ASC
    `).all(product.id) as TracePointRow[];

    res.json({
      success: true,
      data: {
        product: transformProduct(product),
        history: tracePoints.map(transformTracePoint),
        totalSteps: tracePoints.length,
      },
    });
  } catch (error) {
    console.error('Get product history error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get product history' },
    });
  }
});

// ==================== Admin Routes ====================

/**
 * GET /api/admin/trace/products
 * Get all traced products (admin)
 */
router.get('/admin/products', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const status = req.query.status as string;
    const merchantId = req.query.merchantId as string;
    const search = req.query.search as string;

    const db = getDb();
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    if (merchantId) {
      whereClause += ' AND p.merchant_id = ?';
      params.push(merchantId);
    }

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.product_code LIKE ? OR p.batch_number LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM traced_products p ${whereClause}
    `).get(...params) as { count: number };

    // Get products with merchant info
    const products = db.prepare(`
      SELECT p.*, m.store_name as merchant_name
      FROM traced_products p
      LEFT JOIN merchants m ON p.merchant_id = m.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (TracedProductRow & { merchant_name: string | null })[];

    // Get trace point counts
    const productsWithStats = products.map(product => {
      const stats = db.prepare(`
        SELECT
          COUNT(*) as trace_count,
          SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified_count
        FROM trace_points
        WHERE product_id = ?
      `).get(product.id) as { trace_count: number; verified_count: number };

      return {
        ...transformProduct(product, { id: product.merchant_id || '', store_name: product.merchant_name || '' }),
        tracePointCount: stats.trace_count,
        verifiedPointCount: stats.verified_count,
      };
    });

    res.json({
      success: true,
      data: {
        products: productsWithStats,
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get products' },
    });
  }
});

/**
 * GET /api/admin/trace/stats
 * Get traceability statistics (admin)
 */
router.get('/admin/stats', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Product stats by status
    const productStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
        SUM(CASE WHEN status = 'recalled' THEN 1 ELSE 0 END) as recalled,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired
      FROM traced_products
    `).get() as {
      total: number;
      active: number;
      sold: number;
      recalled: number;
      expired: number;
    };

    // Trace point stats
    const traceStats = db.prepare(`
      SELECT
        COUNT(*) as total_points,
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified_points,
        COUNT(DISTINCT product_id) as products_with_traces
      FROM trace_points
    `).get() as {
      total_points: number;
      verified_points: number;
      products_with_traces: number;
    };

    // Action distribution
    const actionDistribution = db.prepare(`
      SELECT action, COUNT(*) as count
      FROM trace_points
      GROUP BY action
      ORDER BY count DESC
    `).all() as { action: string; count: number }[];

    // Recent activity (last 7 days)
    const recentActivity = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as products_registered
      FROM traced_products
      WHERE created_at >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date DESC
    `).all() as { date: string; products_registered: number }[];

    // Top merchants by traced products
    const topMerchants = db.prepare(`
      SELECT
        m.id,
        m.store_name,
        COUNT(p.id) as product_count
      FROM merchants m
      LEFT JOIN traced_products p ON m.id = p.merchant_id
      GROUP BY m.id
      HAVING product_count > 0
      ORDER BY product_count DESC
      LIMIT 10
    `).all() as { id: string; store_name: string; product_count: number }[];

    // Products by category
    const categoryDistribution = db.prepare(`
      SELECT
        COALESCE(category, 'Uncategorized') as category,
        COUNT(*) as count
      FROM traced_products
      GROUP BY category
      ORDER BY count DESC
    `).all() as { category: string; count: number }[];

    res.json({
      success: true,
      data: {
        products: {
          total: productStats.total,
          active: productStats.active,
          sold: productStats.sold,
          recalled: productStats.recalled,
          expired: productStats.expired,
        },
        tracePoints: {
          total: traceStats.total_points,
          verified: traceStats.verified_points,
          verificationRate: traceStats.total_points > 0
            ? Math.round((traceStats.verified_points / traceStats.total_points) * 100)
            : 0,
          productsWithTraces: traceStats.products_with_traces,
        },
        actionDistribution: actionDistribution.reduce((acc, item) => {
          acc[item.action] = item.count;
          return acc;
        }, {} as Record<string, number>),
        recentActivity,
        topMerchants,
        categoryDistribution,
      },
    });
  } catch (error) {
    console.error('Get trace stats error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get statistics' },
    });
  }
});

/**
 * POST /api/admin/trace/products/:id/recall
 * Recall product (admin)
 */
router.post('/admin/products/:id/recall', authenticate, requireAdmin, [
  body('reason').notEmpty().withMessage('Recall reason is required'),
  body('notes').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { id } = req.params;
    const { reason, notes } = req.body;
    const db = getDb();

    // Find product
    const product = db.prepare(`
      SELECT * FROM traced_products WHERE id = ?
    `).get(id) as TracedProductRow | undefined;

    if (!product) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
      return;
    }

    if (product.status === 'recalled') {
      throw new BadRequestError('Product is already recalled');
    }

    // Update product status
    db.prepare(`
      UPDATE traced_products
      SET status = 'recalled', updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    // Add recall trace point
    const tracePointId = uuidv4();
    const sequence = getNextSequence(db, product.id);

    db.prepare(`
      INSERT INTO trace_points (
        id, product_id, sequence, location, action, actor, actor_type,
        timestamp, details, blockchain_hash, verified
      )
      VALUES (?, ?, ?, ?, 'received', ?, 'retailer', datetime('now'), ?, ?, 1)
    `).run(
      tracePointId,
      product.id,
      sequence,
      'Product Recalled',
      'System Admin',
      JSON.stringify({ recallReason: reason, notes, recalledBy: req.user!.userId }),
      generateBlockchainHash()
    );

    // Log audit event
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'PRODUCT_RECALLED',
      req.user!.userId,
      'admin',
      'traced_product',
      product.id,
      `Product ${product.product_code} recalled: ${reason}`,
      JSON.stringify({ reason, notes })
    );

    res.json({
      success: true,
      data: {
        productCode: product.product_code,
        productName: product.name,
        status: 'recalled',
        reason,
        recalledAt: new Date().toISOString(),
        message: 'Product recalled successfully',
      },
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BadRequestError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    console.error('Recall product error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to recall product' },
    });
  }
});

export default router;
