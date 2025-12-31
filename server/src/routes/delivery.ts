/**
 * Delivery Routes
 * Delivery order management for consumers, merchants, and admin
 * NOTE: Payment execution by bank - we manage order tracking and audit trail
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireMerchant, requireAdmin, requireUserType } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler.js';

const router = Router();

// Type definitions
interface DeliveryOrderRow {
  id: string;
  order_number: string;
  user_id: string;
  merchant_id: string;
  items: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_notes: string | null;
  contact_phone: string;
  status: string;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  transaction_id: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string | null;
}

interface DeliveryTrackingRow {
  id: string;
  order_id: string;
  status: string;
  location_lat: number | null;
  location_lng: number | null;
  note: string | null;
  created_at: string;
}

interface MerchantRow {
  id: string;
  store_name: string;
}

interface WalletRow {
  id: string;
  balance: number;
}

// Valid status transitions
const STATUS_FLOW = ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivering', 'completed'];
const CANCELLABLE_STATUSES = ['pending', 'accepted'];

/**
 * Generate unique order number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DEL-${timestamp}-${random}`;
}

/**
 * Validate status transition
 */
function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  const newIndex = STATUS_FLOW.indexOf(newStatus);

  if (currentIndex === -1 || newIndex === -1) return false;

  // Can only move forward one step at a time (except for completing from ready/picked_up/delivering)
  if (newStatus === 'completed') {
    return ['ready', 'picked_up', 'delivering'].includes(currentStatus);
  }

  return newIndex === currentIndex + 1;
}

/**
 * Add tracking record for status change
 */
function addTrackingRecord(
  orderId: string,
  status: string,
  note?: string,
  locationLat?: number,
  locationLng?: number
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO delivery_tracking (id, order_id, status, location_lat, location_lng, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(uuidv4(), orderId, status, locationLat ?? null, locationLng ?? null, note ?? null);
}

// ==================== Consumer Routes ====================

/**
 * GET /api/delivery/orders
 * Get consumer's delivery orders
 */
router.get('/orders', authenticate, requireUserType('consumer'), [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn([...STATUS_FLOW, 'cancelled', 'all']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const status = req.query.status as string;

    const db = getDb();
    let whereClause = 'WHERE o.user_id = ?';
    const params: (string | number)[] = [req.user!.userId];

    if (status && status !== 'all') {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM delivery_orders o ${whereClause}
    `).get(...params) as { count: number };

    const orders = db.prepare(`
      SELECT o.*, m.store_name as merchant_name
      FROM delivery_orders o
      LEFT JOIN merchants m ON o.merchant_id = m.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (DeliveryOrderRow & { merchant_name?: string })[];

    res.json({
      success: true,
      data: {
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.order_number,
          merchantId: order.merchant_id,
          merchantName: order.merchant_name,
          items: JSON.parse(order.items),
          subtotal: order.subtotal,
          deliveryFee: order.delivery_fee,
          discount: order.discount,
          total: order.total,
          deliveryAddress: order.delivery_address,
          deliveryLat: order.delivery_lat,
          deliveryLng: order.delivery_lng,
          deliveryNotes: order.delivery_notes,
          contactPhone: order.contact_phone,
          status: order.status,
          estimatedDelivery: order.estimated_delivery,
          actualDelivery: order.actual_delivery,
          transactionId: order.transaction_id,
          cancelledAt: order.cancelled_at,
          cancelReason: order.cancel_reason,
          createdAt: order.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('Get delivery orders error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get delivery orders' } });
  }
});

/**
 * POST /api/delivery/orders
 * Create new delivery order
 */
router.post('/orders', authenticate, requireUserType('consumer'), [
  body('merchantId').notEmpty().withMessage('Merchant ID is required'),
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1'),
  body('items.*.price').isInt({ min: 0 }).withMessage('Item price must be non-negative'),
  body('deliveryAddress').notEmpty().withMessage('Delivery address is required'),
  body('contactPhone').notEmpty().withMessage('Contact phone is required'),
  body('deliveryFee').optional().isInt({ min: 0 }),
  body('discount').optional().isInt({ min: 0 }),
  body('deliveryLat').optional().isFloat(),
  body('deliveryLng').optional().isFloat(),
  body('deliveryNotes').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const {
      merchantId,
      items,
      deliveryAddress,
      contactPhone,
      deliveryFee = 3000,
      discount = 0,
      deliveryLat,
      deliveryLng,
      deliveryNotes,
    } = req.body;

    const db = getDb();

    // Verify merchant exists and is open
    const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(merchantId) as MerchantRow | undefined;
    if (!merchant) {
      throw new NotFoundError('Merchant not found');
    }

    // Calculate subtotal from items
    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) => {
      return sum + (item.price * item.quantity);
    }, 0);

    const total = subtotal + deliveryFee - discount;

    if (total < 0) {
      throw new BadRequestError('Total amount cannot be negative');
    }

    // Check wallet balance
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.userId) as WalletRow | undefined;
    if (!wallet || wallet.balance < total) {
      throw new BadRequestError('Insufficient balance');
    }

    // Generate IDs
    const orderId = uuidv4();
    const orderNumber = generateOrderNumber();
    const transactionId = uuidv4();
    const txId = `DEL-PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const approvalCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Create transaction record for payment
    db.prepare(`
      INSERT INTO transactions (id, tx_id, user_id, merchant_id, amount, type, status, approval_code, description)
      VALUES (?, ?, ?, ?, ?, 'payment', 'completed', ?, ?)
    `).run(
      transactionId,
      txId,
      req.user!.userId,
      merchantId,
      total,
      approvalCode,
      `Delivery order ${orderNumber}`
    );

    // Deduct from wallet
    db.prepare(`
      UPDATE wallets SET balance = balance - ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(total, req.user!.userId);

    // Create delivery order
    db.prepare(`
      INSERT INTO delivery_orders (
        id, order_number, user_id, merchant_id, items, subtotal, delivery_fee, discount, total,
        delivery_address, delivery_lat, delivery_lng, delivery_notes, contact_phone,
        status, transaction_id, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'))
    `).run(
      orderId,
      orderNumber,
      req.user!.userId,
      merchantId,
      JSON.stringify(items),
      subtotal,
      deliveryFee,
      discount,
      total,
      deliveryAddress,
      deliveryLat ?? null,
      deliveryLng ?? null,
      deliveryNotes ?? null,
      contactPhone,
      transactionId
    );

    // Add initial tracking record
    addTrackingRecord(orderId, 'pending', 'Order placed');

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'DELIVERY_ORDER_CREATED',
      req.user!.userId,
      'consumer',
      'delivery_order',
      orderId,
      `Delivery order ${orderNumber} created for ${merchant.store_name}`,
      JSON.stringify({ orderNumber, merchantId, total, items: items.length })
    );

    const updatedWallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(req.user!.userId) as { balance: number };

    res.status(201).json({
      success: true,
      data: {
        id: orderId,
        orderNumber,
        merchantName: merchant.store_name,
        items,
        subtotal,
        deliveryFee,
        discount,
        total,
        status: 'pending',
        transactionId: txId,
        newBalance: updatedWallet.balance,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Create delivery order error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create delivery order' } });
  }
});

/**
 * GET /api/delivery/orders/:id
 * Get order details (consumer view)
 */
router.get('/orders/:id', authenticate, requireUserType('consumer'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const order = db.prepare(`
      SELECT o.*, m.store_name as merchant_name
      FROM delivery_orders o
      LEFT JOIN merchants m ON o.merchant_id = m.id
      WHERE o.id = ? AND o.user_id = ?
    `).get(req.params.id, req.user!.userId) as (DeliveryOrderRow & { merchant_name?: string }) | undefined;

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    res.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.order_number,
        merchantId: order.merchant_id,
        merchantName: order.merchant_name,
        items: JSON.parse(order.items),
        subtotal: order.subtotal,
        deliveryFee: order.delivery_fee,
        discount: order.discount,
        total: order.total,
        deliveryAddress: order.delivery_address,
        deliveryLat: order.delivery_lat,
        deliveryLng: order.delivery_lng,
        deliveryNotes: order.delivery_notes,
        contactPhone: order.contact_phone,
        status: order.status,
        estimatedDelivery: order.estimated_delivery,
        actualDelivery: order.actual_delivery,
        transactionId: order.transaction_id,
        cancelledAt: order.cancelled_at,
        cancelReason: order.cancel_reason,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get order details error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get order details' } });
  }
});

/**
 * POST /api/delivery/orders/:id/cancel
 * Cancel order (consumer)
 */
router.post('/orders/:id/cancel', authenticate, requireUserType('consumer'), [
  body('reason').optional().isString().isLength({ max: 500 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    const db = getDb();

    const order = db.prepare(`
      SELECT * FROM delivery_orders WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user!.userId) as DeliveryOrderRow | undefined;

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestError(`Order cannot be cancelled in ${order.status} status`);
    }

    // Update order status
    db.prepare(`
      UPDATE delivery_orders
      SET status = 'cancelled', cancelled_at = datetime('now'), cancel_reason = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(reason ?? null, order.id);

    // Refund to wallet
    db.prepare(`
      UPDATE wallets SET balance = balance + ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(order.total, req.user!.userId);

    // Create refund transaction
    const refundTxId = `DEL-REF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(`
      INSERT INTO transactions (id, tx_id, user_id, merchant_id, amount, type, status, description)
      VALUES (?, ?, ?, ?, ?, 'refund', 'completed', ?)
    `).run(
      uuidv4(),
      refundTxId,
      req.user!.userId,
      order.merchant_id,
      order.total,
      `Refund for cancelled delivery order ${order.order_number}`
    );

    // Add tracking record
    addTrackingRecord(order.id, 'cancelled', reason ?? 'Order cancelled by customer');

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'DELIVERY_ORDER_CANCELLED',
      req.user!.userId,
      'consumer',
      'delivery_order',
      order.id,
      `Delivery order ${order.order_number} cancelled`,
      JSON.stringify({ orderNumber: order.order_number, reason, refundAmount: order.total })
    );

    const updatedWallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(req.user!.userId) as { balance: number };

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        status: 'cancelled',
        refundAmount: order.total,
        newBalance: updatedWallet.balance,
        cancelledAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel order' } });
  }
});

/**
 * GET /api/delivery/orders/:id/track
 * Get order tracking history (consumer)
 */
router.get('/orders/:id/track', authenticate, requireUserType('consumer'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Verify order belongs to user
    const order = db.prepare(`
      SELECT id, order_number, status FROM delivery_orders WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user!.userId) as { id: string; order_number: string; status: string } | undefined;

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const tracking = db.prepare(`
      SELECT * FROM delivery_tracking WHERE order_id = ? ORDER BY created_at ASC
    `).all(order.id) as DeliveryTrackingRow[];

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        currentStatus: order.status,
        tracking: tracking.map(t => ({
          id: t.id,
          status: t.status,
          locationLat: t.location_lat,
          locationLng: t.location_lng,
          note: t.note,
          createdAt: t.created_at,
        })),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get tracking error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get tracking history' } });
  }
});

// ==================== Merchant Routes ====================

/**
 * GET /api/merchant/delivery/orders
 * Get merchant's delivery orders
 */
router.get('/merchant/orders', authenticate, requireMerchant, [
  query('page').optional().isInt({ min: 0 }),
  query('size').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn([...STATUS_FLOW, 'cancelled', 'all']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const size = parseInt(req.query.size as string) || 20;
    const status = req.query.status as string;

    const db = getDb();
    let whereClause = 'WHERE o.merchant_id = ?';
    const params: (string | number)[] = [req.user!.merchantId!];

    if (status && status !== 'all') {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM delivery_orders o ${whereClause}
    `).get(...params) as { count: number };

    const orders = db.prepare(`
      SELECT o.*, u.name as customer_name, u.phone as customer_phone
      FROM delivery_orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as (DeliveryOrderRow & { customer_name?: string; customer_phone?: string })[];

    res.json({
      success: true,
      data: {
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.order_number,
          customerId: order.user_id,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          items: JSON.parse(order.items),
          subtotal: order.subtotal,
          deliveryFee: order.delivery_fee,
          discount: order.discount,
          total: order.total,
          deliveryAddress: order.delivery_address,
          deliveryLat: order.delivery_lat,
          deliveryLng: order.delivery_lng,
          deliveryNotes: order.delivery_notes,
          contactPhone: order.contact_phone,
          status: order.status,
          estimatedDelivery: order.estimated_delivery,
          actualDelivery: order.actual_delivery,
          cancelledAt: order.cancelled_at,
          cancelReason: order.cancel_reason,
          createdAt: order.created_at,
        })),
        page,
        size,
        totalElements: countResult.count,
        totalPages: Math.ceil(countResult.count / size),
      },
    });
  } catch (error) {
    console.error('Get merchant delivery orders error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get delivery orders' } });
  }
});

/**
 * GET /api/merchant/delivery/orders/:id
 * Get order details (merchant view)
 */
router.get('/merchant/orders/:id', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const order = db.prepare(`
      SELECT o.*, u.name as customer_name, u.phone as customer_phone, u.email as customer_email
      FROM delivery_orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ? AND o.merchant_id = ?
    `).get(req.params.id, req.user!.merchantId!) as (DeliveryOrderRow & { customer_name?: string; customer_phone?: string; customer_email?: string }) | undefined;

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Get tracking history
    const tracking = db.prepare(`
      SELECT * FROM delivery_tracking WHERE order_id = ? ORDER BY created_at ASC
    `).all(order.id) as DeliveryTrackingRow[];

    res.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.order_number,
        customer: {
          id: order.user_id,
          name: order.customer_name,
          phone: order.customer_phone,
          email: order.customer_email,
        },
        items: JSON.parse(order.items),
        subtotal: order.subtotal,
        deliveryFee: order.delivery_fee,
        discount: order.discount,
        total: order.total,
        deliveryAddress: order.delivery_address,
        deliveryLat: order.delivery_lat,
        deliveryLng: order.delivery_lng,
        deliveryNotes: order.delivery_notes,
        contactPhone: order.contact_phone,
        status: order.status,
        estimatedDelivery: order.estimated_delivery,
        actualDelivery: order.actual_delivery,
        cancelledAt: order.cancelled_at,
        cancelReason: order.cancel_reason,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        tracking: tracking.map(t => ({
          id: t.id,
          status: t.status,
          locationLat: t.location_lat,
          locationLng: t.location_lng,
          note: t.note,
          createdAt: t.created_at,
        })),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Get merchant order details error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get order details' } });
  }
});

/**
 * POST /api/merchant/delivery/orders/:id/accept
 * Accept order (merchant)
 */
router.post('/merchant/orders/:id/accept', authenticate, requireMerchant, [
  body('estimatedMinutes').optional().isInt({ min: 1, max: 180 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { estimatedMinutes = 30 } = req.body;
    const db = getDb();

    const order = db.prepare(`
      SELECT * FROM delivery_orders WHERE id = ? AND merchant_id = ?
    `).get(req.params.id, req.user!.merchantId!) as DeliveryOrderRow | undefined;

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.status !== 'pending') {
      throw new BadRequestError(`Order cannot be accepted in ${order.status} status`);
    }

    const estimatedDelivery = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE delivery_orders
      SET status = 'accepted', estimated_delivery = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(estimatedDelivery, order.id);

    addTrackingRecord(order.id, 'accepted', `Order accepted. Estimated delivery in ${estimatedMinutes} minutes`);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        status: 'accepted',
        estimatedDelivery,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Accept order error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to accept order' } });
  }
});

/**
 * POST /api/merchant/delivery/orders/:id/preparing
 * Mark order as preparing (merchant)
 */
router.post('/merchant/orders/:id/preparing', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    const order = db.prepare(`
      SELECT * FROM delivery_orders WHERE id = ? AND merchant_id = ?
    `).get(req.params.id, req.user!.merchantId!) as DeliveryOrderRow | undefined;

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (!isValidStatusTransition(order.status, 'preparing')) {
      throw new BadRequestError(`Cannot change status from ${order.status} to preparing`);
    }

    db.prepare(`
      UPDATE delivery_orders SET status = 'preparing', updated_at = datetime('now') WHERE id = ?
    `).run(order.id);

    addTrackingRecord(order.id, 'preparing', 'Order is being prepared');

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        status: 'preparing',
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update order status' } });
  }
});

/**
 * POST /api/merchant/delivery/orders/:id/ready
 * Mark order as ready (merchant)
 */
router.post('/merchant/orders/:id/ready', authenticate, requireMerchant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    const order = db.prepare(`
      SELECT * FROM delivery_orders WHERE id = ? AND merchant_id = ?
    `).get(req.params.id, req.user!.merchantId!) as DeliveryOrderRow | undefined;

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (!isValidStatusTransition(order.status, 'ready')) {
      throw new BadRequestError(`Cannot change status from ${order.status} to ready`);
    }

    db.prepare(`
      UPDATE delivery_orders SET status = 'ready', updated_at = datetime('now') WHERE id = ?
    `).run(order.id);

    addTrackingRecord(order.id, 'ready', 'Order is ready for pickup');

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        status: 'ready',
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update order status' } });
  }
});

/**
 * POST /api/merchant/delivery/orders/:id/complete
 * Complete delivery (merchant)
 */
router.post('/merchant/orders/:id/complete', authenticate, requireMerchant, [
  body('note').optional().isString().isLength({ max: 500 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { note } = req.body;
    const db = getDb();

    const order = db.prepare(`
      SELECT * FROM delivery_orders WHERE id = ? AND merchant_id = ?
    `).get(req.params.id, req.user!.merchantId!) as DeliveryOrderRow | undefined;

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (!isValidStatusTransition(order.status, 'completed')) {
      throw new BadRequestError(`Cannot complete order in ${order.status} status`);
    }

    const actualDelivery = new Date().toISOString();

    db.prepare(`
      UPDATE delivery_orders SET status = 'completed', actual_delivery = ?, updated_at = datetime('now') WHERE id = ?
    `).run(actualDelivery, order.id);

    addTrackingRecord(order.id, 'completed', note ?? 'Order delivered successfully');

    // Log audit
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, metadata)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'DELIVERY_ORDER_COMPLETED',
      req.user!.userId,
      'merchant',
      'delivery_order',
      order.id,
      `Delivery order ${order.order_number} completed`,
      JSON.stringify({ orderNumber: order.order_number, total: order.total })
    );

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        status: 'completed',
        actualDelivery,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Complete order error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to complete order' } });
  }
});

/**
 * POST /api/merchant/delivery/orders/:id/track
 * Add tracking update (merchant)
 */
router.post('/merchant/orders/:id/track', authenticate, requireMerchant, [
  body('status').isIn([...STATUS_FLOW, 'picked_up', 'delivering']).withMessage('Invalid status'),
  body('note').optional().isString().isLength({ max: 500 }),
  body('locationLat').optional().isFloat({ min: -90, max: 90 }),
  body('locationLng').optional().isFloat({ min: -180, max: 180 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { status, note, locationLat, locationLng } = req.body;
    const db = getDb();

    const order = db.prepare(`
      SELECT * FROM delivery_orders WHERE id = ? AND merchant_id = ?
    `).get(req.params.id, req.user!.merchantId!) as DeliveryOrderRow | undefined;

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new BadRequestError(`Cannot update tracking for ${order.status} order`);
    }

    // Update order status if different
    if (status !== order.status) {
      if (!isValidStatusTransition(order.status, status)) {
        throw new BadRequestError(`Invalid status transition from ${order.status} to ${status}`);
      }

      db.prepare(`
        UPDATE delivery_orders SET status = ?, updated_at = datetime('now') WHERE id = ?
      `).run(status, order.id);
    }

    // Add tracking record
    addTrackingRecord(order.id, status, note, locationLat, locationLng);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        status,
        note,
        locationLat,
        locationLng,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Add tracking error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to add tracking update' } });
  }
});

// ==================== Admin Routes ====================

/**
 * GET /api/admin/delivery/stats
 * Get delivery statistics (admin)
 */
router.get('/admin/stats', authenticate, requireAdmin, [
  query('period').optional().isIn(['today', 'week', 'month', 'all']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const period = (req.query.period as string) || 'today';
    const db = getDb();

    let dateFilter = '';
    if (period === 'today') {
      dateFilter = "AND date(created_at) = date('now')";
    } else if (period === 'week') {
      dateFilter = "AND created_at >= date('now', '-7 days')";
    } else if (period === 'month') {
      dateFilter = "AND created_at >= date('now', 'start of month')";
    }

    // Overall stats
    const overallStats = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_orders,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled_orders,
        COALESCE(SUM(CASE WHEN status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END), 0) as active_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) as completed_revenue,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN total END), 0) as avg_order_value,
        COALESCE(SUM(delivery_fee), 0) as total_delivery_fees
      FROM delivery_orders
      WHERE 1=1 ${dateFilter}
    `).get() as {
      total_orders: number;
      completed_orders: number;
      cancelled_orders: number;
      active_orders: number;
      total_revenue: number;
      completed_revenue: number;
      avg_order_value: number;
      total_delivery_fees: number;
    };

    // Status breakdown
    const statusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
      FROM delivery_orders
      WHERE 1=1 ${dateFilter}
      GROUP BY status
    `).all() as { status: string; count: number; revenue: number }[];

    // Top merchants by delivery orders
    const topMerchants = db.prepare(`
      SELECT
        m.id, m.store_name,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total), 0) as total_revenue
      FROM merchants m
      INNER JOIN delivery_orders o ON m.id = o.merchant_id
      WHERE 1=1 ${dateFilter.replace('created_at', 'o.created_at')}
      GROUP BY m.id
      ORDER BY order_count DESC
      LIMIT 10
    `).all() as { id: string; store_name: string; order_count: number; total_revenue: number }[];

    // Average delivery time for completed orders
    const avgDeliveryTime = db.prepare(`
      SELECT
        AVG(
          (julianday(actual_delivery) - julianday(created_at)) * 24 * 60
        ) as avg_minutes
      FROM delivery_orders
      WHERE status = 'completed' AND actual_delivery IS NOT NULL ${dateFilter}
    `).get() as { avg_minutes: number | null };

    // Hourly distribution (for today)
    const hourlyDistribution = db.prepare(`
      SELECT
        strftime('%H', created_at) as hour,
        COUNT(*) as order_count
      FROM delivery_orders
      WHERE date(created_at) = date('now')
      GROUP BY strftime('%H', created_at)
      ORDER BY hour
    `).all() as { hour: string; order_count: number }[];

    res.json({
      success: true,
      data: {
        period,
        overview: {
          totalOrders: overallStats.total_orders,
          completedOrders: overallStats.completed_orders,
          cancelledOrders: overallStats.cancelled_orders,
          activeOrders: overallStats.active_orders,
          totalRevenue: overallStats.total_revenue,
          completedRevenue: overallStats.completed_revenue,
          avgOrderValue: Math.round(overallStats.avg_order_value),
          totalDeliveryFees: overallStats.total_delivery_fees,
          completionRate: overallStats.total_orders > 0
            ? Math.round((overallStats.completed_orders / overallStats.total_orders) * 100)
            : 0,
          cancellationRate: overallStats.total_orders > 0
            ? Math.round((overallStats.cancelled_orders / overallStats.total_orders) * 100)
            : 0,
        },
        statusBreakdown: statusBreakdown.map(s => ({
          status: s.status,
          count: s.count,
          revenue: s.revenue,
        })),
        topMerchants: topMerchants.map(m => ({
          merchantId: m.id,
          storeName: m.store_name,
          orderCount: m.order_count,
          totalRevenue: m.total_revenue,
        })),
        performance: {
          avgDeliveryTimeMinutes: avgDeliveryTime.avg_minutes ? Math.round(avgDeliveryTime.avg_minutes) : null,
        },
        hourlyDistribution: hourlyDistribution.map(h => ({
          hour: parseInt(h.hour),
          orderCount: h.order_count,
        })),
      },
    });
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get delivery statistics' } });
  }
});

export default router;
