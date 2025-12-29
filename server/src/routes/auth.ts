/**
 * Authentication Routes
 * Login, register, logout, token refresh
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db/index.js';
import { authenticate, generateToken, AuthenticatedRequest, JwtPayload } from '../middleware/auth.js';
import { BadRequestError, UnauthorizedError, ConflictError, ValidationError } from '../middleware/errorHandler.js';

const router = Router();

interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  password_hash: string;
  name: string;
  user_type: 'consumer' | 'merchant' | 'admin';
  avatar_url: string | null;
  did: string | null;
  kyc_verified: number;
  level: string | null;
  created_at: string;
}

interface MerchantRow {
  id: string;
  store_name: string;
}

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', [
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().isMobilePhone('ko-KR').withMessage('Invalid phone format'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { email, phone, password, userType } = req.body;

    if (!email && !phone) {
      throw new BadRequestError('Email or phone is required');
    }

    const db = getDb();

    // Find user by email or phone
    let user: UserRow | undefined;
    if (email) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    } else {
      user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as UserRow | undefined;
    }

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check user type if specified
    if (userType && user.user_type !== userType) {
      throw new UnauthorizedError(`Invalid login for ${userType} portal`);
    }

    // Get merchant ID if merchant user
    let merchantId: string | undefined;
    if (user.user_type === 'merchant') {
      const merchant = db.prepare('SELECT id FROM merchants WHERE user_id = ?').get(user.id) as MerchantRow | undefined;
      merchantId = merchant?.id;
    }

    // Generate JWT token
    const payload: JwtPayload = {
      userId: user.id,
      userType: user.user_type,
      email: user.email,
      merchantId,
    };

    const token = generateToken(payload);

    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, device_id, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      user.id,
      token,
      req.body.deviceId || null,
      req.ip,
      req.get('user-agent'),
      expiresAt
    );

    // Log audit event
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address, user_agent)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'ADMIN_LOGIN',
      user.id,
      user.user_type,
      'user',
      user.id,
      `User ${user.name} logged in`,
      req.ip,
      req.get('user-agent')
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          userType: user.user_type,
          avatarUrl: user.avatar_url,
          kycVerified: user.kyc_verified === 1,
          level: user.level,
          merchantId,
        },
        expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof UnauthorizedError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Login failed' } });
  }
});

/**
 * POST /api/auth/register
 * User registration
 */
router.post('/register', [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').notEmpty().withMessage('Name is required'),
  body('userType').isIn(['consumer', 'merchant']).withMessage('Invalid user type'),
  body('phone').optional().isMobilePhone('ko-KR'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', { errors: errors.array() });
    }

    const { email, password, name, userType, phone } = req.body;
    const db = getDb();

    // Check if email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, phone, password_hash, name, user_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, email, phone || null, passwordHash, name, userType);

    // Create wallet for consumer
    if (userType === 'consumer') {
      db.prepare(`
        INSERT INTO wallets (id, user_id, balance)
        VALUES (?, ?, ?)
      `).run(uuidv4(), userId, 0);
    }

    // If merchant, require additional info
    if (userType === 'merchant') {
      const { businessNumber, storeName, category, address } = req.body;

      if (!businessNumber || !storeName) {
        throw new BadRequestError('Business number and store name required for merchant registration');
      }

      const merchantId = uuidv4();
      db.prepare(`
        INSERT INTO merchants (id, user_id, store_name, business_number, category, address)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(merchantId, userId, storeName, businessNumber, category || 'other', address || null);
    }

    // Log audit event
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, actor_id, actor_type, target_type, target_id, description, ip_address)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'USER_REGISTERED',
      userId,
      userType,
      'user',
      userId,
      `New ${userType} registered: ${name}`,
      req.ip
    );

    // Generate token
    const payload: JwtPayload = { userId, userType, email };
    const token = generateToken(payload);

    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, userId, token, req.ip, req.get('user-agent'), expiresAt);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          email,
          name,
          userType,
        },
        expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof ConflictError || error instanceof ValidationError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
      return;
    }
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } });
  }
});

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.substring(7);
    const db = getDb();

    // Invalidate session
    db.prepare('UPDATE sessions SET is_active = 0 WHERE token = ?').run(token);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Logout failed' } });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as UserRow | undefined;

    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    // Get merchant info if applicable
    let merchant: MerchantRow | undefined;
    if (user.user_type === 'merchant') {
      merchant = db.prepare('SELECT * FROM merchants WHERE user_id = ?').get(user.id) as MerchantRow | undefined;
    }

    // Get wallet info
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(user.id);

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        userType: user.user_type,
        avatarUrl: user.avatar_url,
        did: user.did,
        kycVerified: user.kyc_verified === 1,
        level: user.level,
        createdAt: user.created_at,
        merchant,
        wallet,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get user info' } });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const oldToken = req.headers.authorization?.substring(7);

    // Generate new token
    const payload: JwtPayload = {
      userId: req.user!.userId,
      userType: req.user!.userType,
      email: req.user!.email,
      merchantId: req.user!.merchantId,
    };

    const newToken = generateToken(payload);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Update session with new token
    db.prepare('UPDATE sessions SET token = ?, expires_at = ? WHERE token = ?').run(newToken, expiresAt, oldToken);

    res.json({
      success: true,
      data: { token: newToken, expiresAt },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Token refresh failed' } });
  }
});

export default router;
