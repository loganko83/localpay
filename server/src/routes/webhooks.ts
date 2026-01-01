/**
 * Webhook Routes
 * Webhook registration and management for merchants
 */

import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError } from '../middleware/errorHandler.js';
import * as webhookService from '../services/webhook.js';
import type { WebhookEventType } from '../services/webhook.js';
import logger from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Valid webhook event types
const VALID_EVENTS: WebhookEventType[] = [
  'payment.completed',
  'payment.failed',
  'payment.refunded',
  'wallet.charged',
  'wallet.low_balance',
  'merchant.settlement',
  'user.registered',
  'user.verified',
  'voucher.redeemed',
  'voucher.expired',
];

/**
 * GET /api/webhooks
 * List webhooks for current merchant
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.userType !== 'merchant' || !req.user!.merchantId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Merchant access required' },
      });
      return;
    }

    const webhooks = webhookService.getMerchantWebhooks(req.user!.merchantId);

    // Mask secrets in response
    const maskedWebhooks = webhooks.map((w) => ({
      ...w,
      secret: w.secret.substring(0, 10) + '...',
    }));

    res.json({
      success: true,
      data: maskedWebhooks,
    });
  } catch (error) {
    logger.error('List webhooks error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list webhooks' },
    });
  }
});

/**
 * POST /api/webhooks
 * Register a new webhook
 */
router.post('/', [
  body('url').isURL().withMessage('Valid URL is required'),
  body('events').isArray({ min: 1 }).withMessage('At least one event is required'),
  body('events.*').isIn(VALID_EVENTS).withMessage('Invalid event type'),
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

    const { url, events } = req.body;

    const webhook = webhookService.registerWebhook(
      req.user!.merchantId,
      url,
      events
    );

    // Log audit event
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'WEBHOOK_REGISTERED',
      req.user!.userId,
      'merchant',
      'webhook',
      webhook.id,
      `Webhook registered for events: ${events.join(', ')}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      data: webhook,
      message: 'Webhook registered successfully. Save your secret - it will not be shown again.',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }

    logger.error('Register webhook error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to register webhook' },
    });
  }
});

/**
 * PATCH /api/webhooks/:id
 * Update webhook configuration
 */
router.patch('/:id', [
  body('url').optional().isURL().withMessage('Valid URL is required'),
  body('events').optional().isArray({ min: 1 }).withMessage('At least one event is required'),
  body('events.*').optional().isIn(VALID_EVENTS).withMessage('Invalid event type'),
  body('enabled').optional().isBoolean().withMessage('Enabled must be boolean'),
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

    const { id } = req.params;
    const { url, events, enabled } = req.body;

    webhookService.updateWebhook(id, req.user!.merchantId, {
      url,
      events,
      enabled,
    });

    // Log audit event
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'WEBHOOK_UPDATED',
      req.user!.userId,
      'merchant',
      'webhook',
      id,
      'Webhook configuration updated',
      req.ip
    );

    res.json({
      success: true,
      message: 'Webhook updated successfully',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }

    const message = error instanceof Error ? error.message : 'Failed to update webhook';
    if (message === 'Webhook not found') {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message },
      });
      return;
    }

    logger.error('Update webhook error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update webhook' },
    });
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete webhook
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.userType !== 'merchant' || !req.user!.merchantId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Merchant access required' },
      });
      return;
    }

    const { id } = req.params;

    webhookService.deleteWebhook(id, req.user!.merchantId);

    // Log audit event
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'WEBHOOK_DELETED',
      req.user!.userId,
      'merchant',
      'webhook',
      id,
      'Webhook deleted',
      req.ip
    );

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete webhook';
    if (message === 'Webhook not found') {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message },
      });
      return;
    }

    logger.error('Delete webhook error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete webhook' },
    });
  }
});

/**
 * GET /api/webhooks/:id/deliveries
 * Get webhook delivery history
 */
router.get('/:id/deliveries', [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
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

    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verify webhook belongs to merchant
    const webhooks = webhookService.getMerchantWebhooks(req.user!.merchantId);
    if (!webhooks.find((w) => w.id === id)) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook not found' },
      });
      return;
    }

    const deliveries = webhookService.getWebhookDeliveries(id, limit);

    res.json({
      success: true,
      data: deliveries,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }

    logger.error('Get webhook deliveries error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get delivery history' },
    });
  }
});

/**
 * POST /api/webhooks/:id/test
 * Send a test webhook
 */
router.post('/:id/test', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.userType !== 'merchant' || !req.user!.merchantId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Merchant access required' },
      });
      return;
    }

    const { id } = req.params;

    // Verify webhook belongs to merchant
    const webhooks = webhookService.getMerchantWebhooks(req.user!.merchantId);
    const webhook = webhooks.find((w) => w.id === id);

    if (!webhook) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Webhook not found' },
      });
      return;
    }

    // Send test event
    await webhookService.sendWebhookEvent(
      'payment.completed',
      {
        test: true,
        message: 'This is a test webhook delivery',
        merchantId: req.user!.merchantId,
        timestamp: new Date().toISOString(),
      },
      req.user!.merchantId
    );

    res.json({
      success: true,
      message: 'Test webhook sent. Check your delivery history for results.',
    });
  } catch (error) {
    logger.error('Test webhook error', { error, userId: req.user!.userId });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send test webhook' },
    });
  }
});

/**
 * GET /api/webhooks/events
 * List available webhook event types
 */
router.get('/events/list', (_req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: VALID_EVENTS.map((event) => ({
      type: event,
      description: getEventDescription(event),
    })),
  });
});

function getEventDescription(event: WebhookEventType): string {
  const descriptions: Record<WebhookEventType, string> = {
    'payment.completed': 'Triggered when a payment is successfully completed',
    'payment.failed': 'Triggered when a payment fails',
    'payment.refunded': 'Triggered when a payment is refunded',
    'wallet.charged': 'Triggered when a wallet is charged',
    'wallet.low_balance': 'Triggered when wallet balance falls below threshold',
    'merchant.settlement': 'Triggered when a settlement is processed',
    'user.registered': 'Triggered when a new user registers',
    'user.verified': 'Triggered when a user completes verification',
    'voucher.redeemed': 'Triggered when a voucher is redeemed',
    'voucher.expired': 'Triggered when a voucher expires',
  };

  return descriptions[event] || 'No description available';
}

export default router;
