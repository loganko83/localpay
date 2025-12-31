/**
 * Notifications Routes
 * Push notifications, preferences, and real-time updates
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, query, param, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();

// ==================== Type Definitions ====================

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'payment' | 'settlement' | 'system' | 'promo' | 'security' | 'welfare';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data: string | null;
  read: number;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
}

interface NotificationPreferencesRow {
  id: string;
  user_id: string;
  push_enabled: number;
  email_enabled: number;
  sms_enabled: number;
  payment_notifications: number;
  settlement_notifications: number;
  system_notifications: number;
  promo_notifications: number;
  security_notifications: number;
  welfare_notifications: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

interface DeviceTokenRow {
  id: string;
  user_id: string;
  device_type: 'ios' | 'android' | 'web';
  token: string;
  device_name: string | null;
  last_used_at: string;
  created_at: string;
}

// ==================== Helper Functions ====================

function validateRequest(req: AuthenticatedRequest): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', { errors: errors.array() });
  }
}

function getOrCreatePreferences(userId: string): NotificationPreferencesRow {
  const db = getDb();

  let prefs = db.prepare(`
    SELECT * FROM notification_preferences WHERE user_id = ?
  `).get(userId) as NotificationPreferencesRow | undefined;

  if (!prefs) {
    const prefsId = uuidv4();
    db.prepare(`
      INSERT INTO notification_preferences (
        id, user_id, push_enabled, email_enabled, sms_enabled,
        payment_notifications, settlement_notifications, system_notifications,
        promo_notifications, security_notifications, welfare_notifications
      ) VALUES (?, ?, 1, 1, 0, 1, 1, 1, 1, 1, 1)
    `).run(prefsId, userId);

    prefs = db.prepare(`SELECT * FROM notification_preferences WHERE id = ?`).get(prefsId) as NotificationPreferencesRow;
  }

  return prefs;
}

function shouldSendNotification(userId: string, notificationType: string): boolean {
  const prefs = getOrCreatePreferences(userId);

  // Check type-specific preference
  const typePrefs: Record<string, keyof NotificationPreferencesRow> = {
    payment: 'payment_notifications',
    settlement: 'settlement_notifications',
    system: 'system_notifications',
    promo: 'promo_notifications',
    security: 'security_notifications',
    welfare: 'welfare_notifications',
  };

  const prefKey = typePrefs[notificationType];
  if (prefKey && !prefs[prefKey]) {
    return false;
  }

  // Check quiet hours
  if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (prefs.quiet_hours_start <= prefs.quiet_hours_end) {
      // Normal range (e.g., 22:00 - 07:00)
      if (currentTime >= prefs.quiet_hours_start || currentTime <= prefs.quiet_hours_end) {
        return notificationType === 'security'; // Only security notifications during quiet hours
      }
    } else {
      // Overnight range
      if (currentTime >= prefs.quiet_hours_start && currentTime <= prefs.quiet_hours_end) {
        return notificationType === 'security';
      }
    }
  }

  return true;
}

// ==================== User Endpoints ====================

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', authenticate, [
  query('type').optional().isIn(['payment', 'settlement', 'system', 'promo', 'security', 'welfare']),
  query('unreadOnly').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { type, unreadOnly, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE user_id = ?';
    const params: (string | number)[] = [req.user!.userId];

    if (type) {
      whereClause += ' AND type = ?';
      params.push(String(type));
    }

    if (unreadOnly === 'true') {
      whereClause += ' AND read = 0';
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM notifications ${whereClause}
    `).get(...params) as { count: number };

    // Get unread count
    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0
    `).get(req.user!.userId) as { count: number };

    // Get notifications
    const notifications = db.prepare(`
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset) as NotificationRow[];

    res.json({
      success: true,
      data: {
        notifications: notifications.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          priority: n.priority,
          data: n.data ? JSON.parse(n.data) : null,
          read: !!n.read,
          readAt: n.read_at,
          actionUrl: n.action_url,
          createdAt: n.created_at,
        })),
        unreadCount: unreadCount.count,
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
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get notifications' } });
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 */
router.post('/:id/read', authenticate, [
  param('id').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;

    const notification = db.prepare(`
      SELECT * FROM notifications WHERE id = ? AND user_id = ?
    `).get(id, req.user!.userId) as NotificationRow | undefined;

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (!notification.read) {
      db.prepare(`
        UPDATE notifications SET read = 1, read_at = datetime('now') WHERE id = ?
      `).run(id);
    }

    res.json({
      success: true,
      data: {
        id,
        read: true,
        readAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to mark as read' } });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    const result = db.prepare(`
      UPDATE notifications SET read = 1, read_at = datetime('now')
      WHERE user_id = ? AND read = 0
    `).run(req.user!.userId);

    res.json({
      success: true,
      data: {
        markedCount: result.changes,
        readAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to mark all as read' } });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', authenticate, [
  param('id').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;

    const notification = db.prepare(`
      SELECT * FROM notifications WHERE id = ? AND user_id = ?
    `).get(id, req.user!.userId) as NotificationRow | undefined;

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    db.prepare(`DELETE FROM notifications WHERE id = ?`).run(id);

    res.json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete notification' } });
  }
});

/**
 * GET /api/notifications/preferences
 * Get notification preferences
 */
router.get('/preferences', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prefs = getOrCreatePreferences(req.user!.userId);

    res.json({
      success: true,
      data: {
        pushEnabled: !!prefs.push_enabled,
        emailEnabled: !!prefs.email_enabled,
        smsEnabled: !!prefs.sms_enabled,
        categories: {
          payment: !!prefs.payment_notifications,
          settlement: !!prefs.settlement_notifications,
          system: !!prefs.system_notifications,
          promo: !!prefs.promo_notifications,
          security: !!prefs.security_notifications,
          welfare: !!prefs.welfare_notifications,
        },
        quietHours: {
          enabled: !!(prefs.quiet_hours_start && prefs.quiet_hours_end),
          start: prefs.quiet_hours_start,
          end: prefs.quiet_hours_end,
        },
        updatedAt: prefs.updated_at,
      },
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get preferences' } });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
router.put('/preferences', authenticate, [
  body('pushEnabled').optional().isBoolean(),
  body('emailEnabled').optional().isBoolean(),
  body('smsEnabled').optional().isBoolean(),
  body('categories').optional().isObject(),
  body('quietHours').optional().isObject(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { pushEnabled, emailEnabled, smsEnabled, categories, quietHours } = req.body;

    // Ensure preferences exist
    getOrCreatePreferences(req.user!.userId);

    // Build update
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (pushEnabled !== undefined) {
      updates.push('push_enabled = ?');
      values.push(pushEnabled ? 1 : 0);
    }
    if (emailEnabled !== undefined) {
      updates.push('email_enabled = ?');
      values.push(emailEnabled ? 1 : 0);
    }
    if (smsEnabled !== undefined) {
      updates.push('sms_enabled = ?');
      values.push(smsEnabled ? 1 : 0);
    }

    if (categories) {
      if (categories.payment !== undefined) {
        updates.push('payment_notifications = ?');
        values.push(categories.payment ? 1 : 0);
      }
      if (categories.settlement !== undefined) {
        updates.push('settlement_notifications = ?');
        values.push(categories.settlement ? 1 : 0);
      }
      if (categories.system !== undefined) {
        updates.push('system_notifications = ?');
        values.push(categories.system ? 1 : 0);
      }
      if (categories.promo !== undefined) {
        updates.push('promo_notifications = ?');
        values.push(categories.promo ? 1 : 0);
      }
      if (categories.security !== undefined) {
        updates.push('security_notifications = ?');
        values.push(categories.security ? 1 : 0);
      }
      if (categories.welfare !== undefined) {
        updates.push('welfare_notifications = ?');
        values.push(categories.welfare ? 1 : 0);
      }
    }

    if (quietHours !== undefined) {
      updates.push('quiet_hours_start = ?', 'quiet_hours_end = ?');
      if (quietHours.enabled && quietHours.start && quietHours.end) {
        values.push(quietHours.start, quietHours.end);
      } else {
        values.push(null, null);
      }
    }

    if (updates.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    updates.push("updated_at = datetime('now')");
    values.push(req.user!.userId);

    db.prepare(`
      UPDATE notification_preferences SET ${updates.join(', ')} WHERE user_id = ?
    `).run(...values);

    const updatedPrefs = getOrCreatePreferences(req.user!.userId);

    res.json({
      success: true,
      data: {
        pushEnabled: !!updatedPrefs.push_enabled,
        emailEnabled: !!updatedPrefs.email_enabled,
        smsEnabled: !!updatedPrefs.sms_enabled,
        categories: {
          payment: !!updatedPrefs.payment_notifications,
          settlement: !!updatedPrefs.settlement_notifications,
          system: !!updatedPrefs.system_notifications,
          promo: !!updatedPrefs.promo_notifications,
          security: !!updatedPrefs.security_notifications,
          welfare: !!updatedPrefs.welfare_notifications,
        },
        quietHours: {
          enabled: !!(updatedPrefs.quiet_hours_start && updatedPrefs.quiet_hours_end),
          start: updatedPrefs.quiet_hours_start,
          end: updatedPrefs.quiet_hours_end,
        },
        updatedAt: updatedPrefs.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Update preferences error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update preferences' } });
  }
});

/**
 * POST /api/notifications/devices
 * Register device token for push notifications
 */
router.post('/devices', authenticate, [
  body('deviceType').isIn(['ios', 'android', 'web']).withMessage('Invalid device type'),
  body('token').isString().notEmpty().withMessage('Device token is required'),
  body('deviceName').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { deviceType, token, deviceName } = req.body;

    // Check if token already exists
    const existing = db.prepare(`
      SELECT * FROM device_tokens WHERE token = ?
    `).get(token) as DeviceTokenRow | undefined;

    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE device_tokens
        SET user_id = ?, device_name = ?, last_used_at = datetime('now')
        WHERE token = ?
      `).run(req.user!.userId, deviceName || null, token);

      res.json({
        success: true,
        data: {
          id: existing.id,
          deviceType,
          token,
          deviceName,
          updated: true,
        },
      });
    } else {
      // Create new
      const deviceId = uuidv4();
      db.prepare(`
        INSERT INTO device_tokens (id, user_id, device_type, token, device_name, last_used_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(deviceId, req.user!.userId, deviceType, token, deviceName || null);

      res.status(201).json({
        success: true,
        data: {
          id: deviceId,
          deviceType,
          token,
          deviceName,
          registered: true,
        },
      });
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Register device error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to register device' } });
  }
});

/**
 * GET /api/notifications/devices
 * Get registered devices
 */
router.get('/devices', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    const devices = db.prepare(`
      SELECT * FROM device_tokens WHERE user_id = ? ORDER BY last_used_at DESC
    `).all(req.user!.userId) as DeviceTokenRow[];

    res.json({
      success: true,
      data: {
        devices: devices.map(d => ({
          id: d.id,
          deviceType: d.device_type,
          deviceName: d.device_name,
          lastUsedAt: d.last_used_at,
          createdAt: d.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get devices' } });
  }
});

/**
 * DELETE /api/notifications/devices/:id
 * Unregister device
 */
router.delete('/devices/:id', authenticate, [
  param('id').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { id } = req.params;

    const device = db.prepare(`
      SELECT * FROM device_tokens WHERE id = ? AND user_id = ?
    `).get(id, req.user!.userId) as DeviceTokenRow | undefined;

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    db.prepare(`DELETE FROM device_tokens WHERE id = ?`).run(id);

    res.json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Delete device error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete device' } });
  }
});

// ==================== Admin Endpoints ====================

/**
 * POST /api/admin/notifications/send
 * Send notification to user(s)
 */
router.post('/admin/send', authenticate, requireAdmin, [
  body('userIds').isArray({ min: 1 }).withMessage('At least one user ID required'),
  body('title').isString().notEmpty().withMessage('Title is required'),
  body('message').isString().notEmpty().withMessage('Message is required'),
  body('type').isIn(['payment', 'settlement', 'system', 'promo', 'security', 'welfare']).withMessage('Invalid type'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('data').optional().isObject(),
  body('actionUrl').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { userIds, title, message, type, priority = 'normal', data, actionUrl } = req.body;

    const sentTo: string[] = [];
    const skipped: string[] = [];

    for (const userId of userIds) {
      // Check if should send based on preferences
      if (!shouldSendNotification(userId, type)) {
        skipped.push(userId);
        continue;
      }

      const notificationId = uuidv4();
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, priority, data, action_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(notificationId, userId, title, message, type, priority, data ? JSON.stringify(data) : null, actionUrl || null);

      sentTo.push(userId);

      // In production, would also send push notification here via FCM/APNs
    }

    res.status(201).json({
      success: true,
      data: {
        sentCount: sentTo.length,
        skippedCount: skipped.length,
        sentTo,
        skipped,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Send notification error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to send notifications' } });
  }
});

/**
 * POST /api/admin/notifications/broadcast
 * Broadcast notification to all users or by user type
 */
router.post('/admin/broadcast', authenticate, requireAdmin, [
  body('title').isString().notEmpty().withMessage('Title is required'),
  body('message').isString().notEmpty().withMessage('Message is required'),
  body('type').isIn(['payment', 'settlement', 'system', 'promo', 'security', 'welfare']).withMessage('Invalid type'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('userType').optional().isIn(['consumer', 'merchant', 'admin']),
  body('data').optional().isObject(),
  body('actionUrl').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    validateRequest(req);

    const db = getDb();
    const { title, message, type, priority = 'normal', userType, data, actionUrl } = req.body;

    // Get target users
    let usersQuery = 'SELECT id FROM users WHERE 1=1';
    const params: string[] = [];

    if (userType) {
      usersQuery += ' AND user_type = ?';
      params.push(userType);
    }

    const users = db.prepare(usersQuery).all(...params) as { id: string }[];

    let sentCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      if (!shouldSendNotification(user.id, type)) {
        skippedCount++;
        continue;
      }

      const notificationId = uuidv4();
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, priority, data, action_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(notificationId, user.id, title, message, type, priority, data ? JSON.stringify(data) : null, actionUrl || null);

      sentCount++;
    }

    res.status(201).json({
      success: true,
      data: {
        totalUsers: users.length,
        sentCount,
        skippedCount,
        userType: userType || 'all',
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Broadcast notification error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to broadcast notifications' } });
  }
});

/**
 * GET /api/admin/notifications/stats
 * Get notification statistics
 */
router.get('/admin/stats', authenticate, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Overall stats
    const overallStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN read = 1 THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN read = 0 THEN 1 ELSE 0 END) as unread_count
      FROM notifications
      WHERE created_at >= datetime('now', '-30 days')
    `).get() as { total: number; read_count: number; unread_count: number };

    // By type
    const byType = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM notifications
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY type
    `).all() as { type: string; count: number }[];

    // By priority
    const byPriority = db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM notifications
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY priority
    `).all() as { priority: string; count: number }[];

    // Daily activity
    const dailyActivity = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as sent,
        SUM(CASE WHEN read = 1 THEN 1 ELSE 0 END) as read_count
      FROM notifications
      WHERE created_at >= datetime('now', '-14 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all() as { date: string; sent: number; read_count: number }[];

    // Device stats
    const deviceStats = db.prepare(`
      SELECT device_type, COUNT(*) as count
      FROM device_tokens
      GROUP BY device_type
    `).all() as { device_type: string; count: number }[];

    // Preference stats
    const prefStats = db.prepare(`
      SELECT
        SUM(push_enabled) as push_enabled,
        SUM(email_enabled) as email_enabled,
        SUM(sms_enabled) as sms_enabled,
        COUNT(*) as total
      FROM notification_preferences
    `).get() as { push_enabled: number; email_enabled: number; sms_enabled: number; total: number };

    res.json({
      success: true,
      data: {
        last30Days: {
          total: overallStats.total || 0,
          read: overallStats.read_count || 0,
          unread: overallStats.unread_count || 0,
          readRate: overallStats.total > 0
            ? Math.round((overallStats.read_count / overallStats.total) * 100)
            : 0,
        },
        byType,
        byPriority,
        dailyActivity,
        devices: {
          total: deviceStats.reduce((sum, d) => sum + d.count, 0),
          byType: deviceStats,
        },
        preferences: {
          totalUsers: prefStats.total || 0,
          pushEnabled: prefStats.push_enabled || 0,
          emailEnabled: prefStats.email_enabled || 0,
          smsEnabled: prefStats.sms_enabled || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get statistics' } });
  }
});

export default router;
