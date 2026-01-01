/**
 * Webhook Service
 * Event-driven webhook delivery system
 */

import crypto from 'crypto';
import { getDb } from '../db/index.js';
import logger from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';

export type WebhookEventType =
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'wallet.charged'
  | 'wallet.low_balance'
  | 'merchant.settlement'
  | 'user.registered'
  | 'user.verified'
  | 'voucher.redeemed'
  | 'voucher.expired';

export interface WebhookConfig {
  id: string;
  merchantId: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  enabled: boolean;
  createdAt: string;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  duration?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s

/**
 * Generate webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Generate webhook signature
 */
export function generateSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verify webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300 // 5 minutes
): boolean {
  const parts = signature.split(',');
  const timestamp = parseInt(parts.find((p) => p.startsWith('t='))?.slice(2) || '0');
  const expectedSignature = parts.find((p) => p.startsWith('v1='))?.slice(3);

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    return false;
  }

  // Verify signature
  const signedPayload = `${timestamp}.${payload}`;
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature || ''),
    Buffer.from(computedSignature)
  );
}

/**
 * Register a new webhook
 */
export function registerWebhook(
  merchantId: string,
  url: string,
  events: WebhookEventType[]
): WebhookConfig {
  const db = getDb();
  const id = uuidv4();
  const secret = generateWebhookSecret();

  db.prepare(`
    INSERT INTO webhooks (id, merchant_id, url, secret, events, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
  `).run(id, merchantId, url, secret, JSON.stringify(events));

  logger.info('Webhook registered', { webhookId: id, merchantId, events });

  return {
    id,
    merchantId,
    url,
    secret,
    events,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Update webhook configuration
 */
export function updateWebhook(
  webhookId: string,
  merchantId: string,
  updates: { url?: string; events?: WebhookEventType[]; enabled?: boolean }
): void {
  const db = getDb();

  const webhook = db.prepare(`
    SELECT id FROM webhooks WHERE id = ? AND merchant_id = ?
  `).get(webhookId, merchantId);

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.url !== undefined) {
    fields.push('url = ?');
    values.push(updates.url);
  }

  if (updates.events !== undefined) {
    fields.push('events = ?');
    values.push(JSON.stringify(updates.events));
  }

  if (updates.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(updates.enabled ? 1 : 0);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = datetime(\'now\')');
  values.push(webhookId);

  db.prepare(`
    UPDATE webhooks SET ${fields.join(', ')} WHERE id = ?
  `).run(...values);

  logger.info('Webhook updated', { webhookId });
}

/**
 * Delete webhook
 */
export function deleteWebhook(webhookId: string, merchantId: string): void {
  const db = getDb();

  const result = db.prepare(`
    DELETE FROM webhooks WHERE id = ? AND merchant_id = ?
  `).run(webhookId, merchantId);

  if (result.changes === 0) {
    throw new Error('Webhook not found');
  }

  logger.info('Webhook deleted', { webhookId });
}

/**
 * Get webhooks for a merchant
 */
export function getMerchantWebhooks(merchantId: string): WebhookConfig[] {
  const db = getDb();

  const webhooks = db.prepare(`
    SELECT id, merchant_id, url, secret, events, enabled, created_at
    FROM webhooks
    WHERE merchant_id = ?
  `).all(merchantId) as Array<{
    id: string;
    merchant_id: string;
    url: string;
    secret: string;
    events: string;
    enabled: number;
    created_at: string;
  }>;

  return webhooks.map((w) => ({
    id: w.id,
    merchantId: w.merchant_id,
    url: w.url,
    secret: w.secret,
    events: JSON.parse(w.events),
    enabled: w.enabled === 1,
    createdAt: w.created_at,
  }));
}

/**
 * Deliver webhook
 */
async function deliverWebhook(
  webhook: WebhookConfig,
  payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, webhook.secret);

  const startTime = Date.now();

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Id': payload.id,
        'X-Webhook-Event': payload.event,
        'User-Agent': 'LocalPay-Webhook/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const duration = Date.now() - startTime;

    if (response.ok) {
      return { success: true, statusCode: response.status, duration };
    }

    return {
      success: false,
      statusCode: response.status,
      error: `HTTP ${response.status}`,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Send webhook event with retry logic
 */
export async function sendWebhookEvent(
  event: WebhookEventType,
  data: Record<string, unknown>,
  merchantId?: string
): Promise<void> {
  const db = getDb();

  // Find matching webhooks
  let query = `
    SELECT id, merchant_id, url, secret, events, enabled, created_at
    FROM webhooks
    WHERE enabled = 1
  `;

  const params: string[] = [];
  if (merchantId) {
    query += ' AND merchant_id = ?';
    params.push(merchantId);
  }

  const webhooks = db.prepare(query).all(...params) as Array<{
    id: string;
    merchant_id: string;
    url: string;
    secret: string;
    events: string;
    enabled: number;
    created_at: string;
  }>;

  // Filter by event type
  const matchingWebhooks = webhooks.filter((w) => {
    const events: WebhookEventType[] = JSON.parse(w.events);
    return events.includes(event);
  });

  if (matchingWebhooks.length === 0) {
    return;
  }

  const payload: WebhookPayload = {
    id: uuidv4(),
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // Deliver to each webhook
  for (const webhookRow of matchingWebhooks) {
    const webhook: WebhookConfig = {
      id: webhookRow.id,
      merchantId: webhookRow.merchant_id,
      url: webhookRow.url,
      secret: webhookRow.secret,
      events: JSON.parse(webhookRow.events),
      enabled: webhookRow.enabled === 1,
      createdAt: webhookRow.created_at,
    };

    // Try delivery with retries
    let lastResult: WebhookDeliveryResult | null = null;
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      lastResult = await deliverWebhook(webhook, payload);

      // Log delivery attempt
      db.prepare(`
        INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status_code, success, error, duration, attempt, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        webhook.id,
        event,
        JSON.stringify(payload),
        lastResult.statusCode || null,
        lastResult.success ? 1 : 0,
        lastResult.error || null,
        lastResult.duration || null,
        attempt + 1
      );

      if (lastResult.success) {
        logger.info('Webhook delivered', {
          webhookId: webhook.id,
          event,
          attempt: attempt + 1,
          duration: lastResult.duration,
        });
        break;
      }

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }

      attempt++;
    }

    if (!lastResult?.success) {
      logger.error('Webhook delivery failed after retries', {
        webhookId: webhook.id,
        event,
        attempts: attempt,
        error: lastResult?.error,
      });
    }
  }
}

/**
 * Get webhook delivery history
 */
export function getWebhookDeliveries(
  webhookId: string,
  limit: number = 50
): Array<{
  id: string;
  event: string;
  statusCode: number | null;
  success: boolean;
  error: string | null;
  duration: number | null;
  attempt: number;
  createdAt: string;
}> {
  const db = getDb();

  const deliveries = db.prepare(`
    SELECT id, event, status_code, success, error, duration, attempt, created_at
    FROM webhook_deliveries
    WHERE webhook_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(webhookId, limit) as Array<{
    id: string;
    event: string;
    status_code: number | null;
    success: number;
    error: string | null;
    duration: number | null;
    attempt: number;
    created_at: string;
  }>;

  return deliveries.map((d) => ({
    id: d.id,
    event: d.event,
    statusCode: d.status_code,
    success: d.success === 1,
    error: d.error,
    duration: d.duration,
    attempt: d.attempt,
    createdAt: d.created_at,
  }));
}

export default {
  generateWebhookSecret,
  generateSignature,
  verifySignature,
  registerWebhook,
  updateWebhook,
  deleteWebhook,
  getMerchantWebhooks,
  sendWebhookEvent,
  getWebhookDeliveries,
};
