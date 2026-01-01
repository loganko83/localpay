/**
 * External Services Routes
 * API endpoints for push notifications, email, SMS, and file upload
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import pushService from '../services/push.js';
import emailService from '../services/email.js';
import smsService from '../services/sms.js';
import storageService from '../services/storage.js';
import logger from '../config/logger.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// ============================================
// Push Notifications
// ============================================

/**
 * Register device token
 */
router.post('/push/register', authenticate, (req: Request, res: Response) => {
  try {
    const { token, platform } = req.body;
    const userId = (req as any).user.userId;

    if (!token || !platform) {
      res.status(400).json({
        success: false,
        error: 'Token and platform are required',
      });
      return;
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be ios, android, or web',
      });
      return;
    }

    pushService.registerDeviceToken(userId, token, platform);

    res.json({
      success: true,
      message: 'Device token registered',
    });
  } catch (error) {
    logger.error('Register device token error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to register device token',
    });
  }
});

/**
 * Unregister device token
 */
router.post('/push/unregister', authenticate, (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Token is required',
      });
      return;
    }

    pushService.unregisterDeviceToken(token);

    res.json({
      success: true,
      message: 'Device token unregistered',
    });
  } catch (error) {
    logger.error('Unregister device token error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to unregister device token',
    });
  }
});

/**
 * Send push notification to user (admin only)
 */
router.post('/push/send', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, userIds, title, body, data } = req.body;

    if (!title || !body) {
      res.status(400).json({
        success: false,
        error: 'Title and body are required',
      });
      return;
    }

    const notification = { title, body, data };

    if (userId) {
      const result = await pushService.sendPushToUser(userId, notification);
      res.json({
        success: true,
        data: result,
      });
    } else if (userIds && Array.isArray(userIds)) {
      const result = await pushService.sendPushToUsers(userIds, notification);
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'userId or userIds is required',
      });
    }
  } catch (error) {
    logger.error('Send push notification error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to send push notification',
    });
  }
});

/**
 * Get push notification status
 */
router.get('/push/status', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      configured: pushService.isFCMConfigured(),
      provider: 'firebase',
    },
  });
});

// ============================================
// Email
// ============================================

/**
 * Send email (admin only)
 */
router.post('/email/send', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
      res.status(400).json({
        success: false,
        error: 'To, subject, and content (html or text) are required',
      });
      return;
    }

    const result = await emailService.sendEmail({ to, subject, html, text });

    res.json({
      success: result.success,
      data: {
        messageId: result.messageId,
      },
      error: result.error,
    });
  } catch (error) {
    logger.error('Send email error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
    });
  }
});

/**
 * Get email service status
 */
router.get('/email/status', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      configured: emailService.isEmailConfigured(),
      provider: process.env.EMAIL_PROVIDER || 'ses',
    },
  });
});

// ============================================
// SMS
// ============================================

/**
 * Send SMS (admin only)
 */
router.post('/sms/send', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      res.status(400).json({
        success: false,
        error: 'To and message are required',
      });
      return;
    }

    const result = await smsService.sendSMS({ to, message });

    res.json({
      success: result.success,
      data: {
        messageId: result.messageId,
      },
      error: result.error,
    });
  } catch (error) {
    logger.error('Send SMS error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to send SMS',
    });
  }
});

/**
 * Get SMS service status
 */
router.get('/sms/status', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      configured: smsService.isSMSConfigured(),
      provider: process.env.SMS_PROVIDER || 'aligo',
    },
  });
});

// ============================================
// File Upload
// ============================================

/**
 * Upload file
 */
router.post('/upload', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    const { folder } = req.body;

    const result = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      { folder }
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          url: result.url,
          key: result.key,
          size: result.size,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('File upload error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
    });
  }
});

/**
 * Upload avatar
 */
router.post('/upload/avatar', authenticate, upload.single('avatar'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    const userId = (req as any).user.userId;

    const result = await storageService.uploadAvatar(
      req.file.buffer,
      userId,
      req.file.mimetype
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          url: result.url,
          key: result.key,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Avatar upload error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to upload avatar',
    });
  }
});

/**
 * Delete file (admin only)
 */
router.delete('/upload/:key', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const result = await storageService.deleteFile(key);

    res.json({
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    logger.error('File delete error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
    });
  }
});

/**
 * Get storage status
 */
router.get('/storage/status', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      provider: process.env.STORAGE_PROVIDER || 'local',
      s3Configured: storageService.isS3Configured(),
    },
  });
});

// ============================================
// Service Status Summary
// ============================================

/**
 * Get all external service statuses
 */
router.get('/status', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      push: {
        configured: pushService.isFCMConfigured(),
        provider: 'firebase',
      },
      email: {
        configured: emailService.isEmailConfigured(),
        provider: process.env.EMAIL_PROVIDER || 'ses',
      },
      sms: {
        configured: smsService.isSMSConfigured(),
        provider: process.env.SMS_PROVIDER || 'aligo',
      },
      storage: {
        provider: process.env.STORAGE_PROVIDER || 'local',
        s3Configured: storageService.isS3Configured(),
      },
    },
  });
});

export default router;
