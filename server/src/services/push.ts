/**
 * Push Notification Service
 * Firebase Cloud Messaging (FCM) integration
 */

import logger from '../config/logger.js';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface FCMConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

// Notification templates
export const notificationTemplates = {
  payment_received: (amount: number, merchantName: string) => ({
    title: 'Payment Received',
    body: `You received ${amount.toLocaleString()} KRW from ${merchantName}`,
  }),

  payment_sent: (amount: number, merchantName: string) => ({
    title: 'Payment Successful',
    body: `You paid ${amount.toLocaleString()} KRW to ${merchantName}`,
  }),

  refund_processed: (amount: number, merchantName: string) => ({
    title: 'Refund Processed',
    body: `${amount.toLocaleString()} KRW refunded from ${merchantName}`,
  }),

  voucher_received: (amount: number, voucherName: string) => ({
    title: 'Voucher Received',
    body: `You received a ${voucherName} worth ${amount.toLocaleString()} KRW`,
  }),

  wallet_charged: (amount: number) => ({
    title: 'Wallet Charged',
    body: `${amount.toLocaleString()} KRW added to your wallet`,
  }),

  security_alert: (message: string) => ({
    title: 'Security Alert',
    body: message,
  }),

  promotion: (title: string, body: string) => ({
    title,
    body,
  }),
};

/**
 * Check if FCM is configured
 */
export function isFCMConfigured(): boolean {
  return !!(
    process.env.FCM_PROJECT_ID &&
    process.env.FCM_PRIVATE_KEY &&
    process.env.FCM_CLIENT_EMAIL
  );
}

/**
 * Get FCM configuration
 */
function getFCMConfig(): FCMConfig | null {
  if (!isFCMConfigured()) {
    return null;
  }

  return {
    projectId: process.env.FCM_PROJECT_ID!,
    privateKey: process.env.FCM_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    clientEmail: process.env.FCM_CLIENT_EMAIL!,
  };
}

/**
 * Send push notification to a single device
 */
export async function sendPushNotification(
  deviceToken: string,
  notification: PushNotification
): Promise<PushResult> {
  const config = getFCMConfig();

  if (!config) {
    logger.warn('FCM not configured, skipping push notification');
    return { success: false, error: 'FCM not configured' };
  }

  try {
    // In production, this would use the Firebase Admin SDK
    // For now, we'll use the FCM HTTP v1 API directly
    const accessToken = await getAccessToken(config);

    const message = {
      message: {
        token: deviceToken,
        notification: {
          title: notification.title,
          body: notification.body,
          image: notification.imageUrl,
        },
        data: notification.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`FCM API error: ${error}`);
    }

    const result = await response.json() as { name: string };

    logger.info('Push notification sent', {
      messageId: result.name,
      token: deviceToken.substring(0, 20) + '...',
    });

    return { success: true, messageId: result.name };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send push notification', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Send push notification to a user (all their devices)
 */
export async function sendPushToUser(
  userId: string,
  notification: PushNotification
): Promise<{ sent: number; failed: number }> {
  const db = getDb();

  // Get all active device tokens for the user
  const tokens = db.prepare(`
    SELECT token FROM device_tokens
    WHERE user_id = ? AND active = 1
  `).all(userId) as Array<{ token: string }>;

  if (tokens.length === 0) {
    logger.info('No device tokens found for user', { userId });
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const { token } of tokens) {
    const result = await sendPushNotification(token, notification);
    if (result.success) {
      sent++;
    } else {
      failed++;
      // Deactivate invalid tokens
      if (result.error?.includes('not registered') || result.error?.includes('invalid')) {
        db.prepare('UPDATE device_tokens SET active = 0 WHERE token = ?').run(token);
      }
    }
  }

  // Store notification in database
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, body, data, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(uuidv4(), userId, notification.title, notification.body, JSON.stringify(notification.data || {}));

  return { sent, failed };
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(
  userIds: string[],
  notification: PushNotification
): Promise<{ totalSent: number; totalFailed: number }> {
  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendPushToUser(userId, notification);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { totalSent, totalFailed };
}

/**
 * Register device token for a user
 */
export function registerDeviceToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web'
): void {
  const db = getDb();

  // Check if token already exists
  const existing = db.prepare('SELECT id FROM device_tokens WHERE token = ?').get(token);

  if (existing) {
    // Update existing token
    db.prepare(`
      UPDATE device_tokens
      SET user_id = ?, platform = ?, active = 1, updated_at = datetime('now')
      WHERE token = ?
    `).run(userId, platform, token);
  } else {
    // Insert new token
    db.prepare(`
      INSERT INTO device_tokens (id, user_id, token, platform, active, created_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'))
    `).run(uuidv4(), userId, token, platform);
  }

  logger.info('Device token registered', { userId, platform });
}

/**
 * Unregister device token
 */
export function unregisterDeviceToken(token: string): void {
  const db = getDb();
  db.prepare('UPDATE device_tokens SET active = 0 WHERE token = ?').run(token);
  logger.info('Device token unregistered');
}

/**
 * Get OAuth2 access token for FCM
 */
async function getAccessToken(config: FCMConfig): Promise<string> {
  // In production, use google-auth-library or similar
  // This is a simplified implementation
  const jwt = await createJWT(config);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get FCM access token');
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

/**
 * Create JWT for service account authentication
 */
async function createJWT(config: FCMConfig): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.clientEmail,
    sub: config.clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Note: In production, use a proper JWT library like jsonwebtoken
  // This is a placeholder that would need crypto implementation
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Sign with private key (requires crypto implementation)
  // For now, return a placeholder
  return `${encodedHeader}.${encodedPayload}.signature`;
}

export default {
  isFCMConfigured,
  sendPushNotification,
  sendPushToUser,
  sendPushToUsers,
  registerDeviceToken,
  unregisterDeviceToken,
  notificationTemplates,
};
