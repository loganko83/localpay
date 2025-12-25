/**
 * Security Middleware
 *
 * Provides centralized security controls for all requests:
 * - CSRF token management
 * - Request signature verification
 * - Session validation
 * - Security headers
 * - Input sanitization
 *
 * Architecture Note:
 * This middleware layer sits between UI and services.
 * For production, integrate with Kong/AWS API Gateway.
 */

import { auditLogService } from '../services/auditLog';

// CSRF Token configuration
const CSRF_CONFIG = {
  tokenLength: 32,
  headerName: 'X-CSRF-Token',
  cookieName: 'csrf_token',
  expirationMs: 3600000, // 1 hour
};

// Session configuration
const SESSION_CONFIG = {
  maxIdleMs: 1800000, // 30 minutes
  maxDurationMs: 86400000, // 24 hours
  refreshThresholdMs: 900000, // 15 minutes before expiry
};

// Request signing configuration
const SIGNATURE_CONFIG = {
  algorithm: 'SHA-256',
  headerName: 'X-Request-Signature',
  timestampHeaderName: 'X-Request-Timestamp',
  maxTimestampDriftMs: 300000, // 5 minutes
};

// Security context for request
interface SecurityContext {
  userId?: string;
  sessionId?: string;
  csrfToken?: string;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
  isAuthenticated: boolean;
  permissions: string[];
}

// Session data
interface SessionData {
  id: string;
  userId: string;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
  twoFactorVerified: boolean;
  permissions: string[];
}

// CSRF token entry
interface CSRFEntry {
  token: string;
  createdAt: number;
  expiresAt: number;
  userId?: string;
}

// In-memory stores (use Redis in production)
const sessionStore = new Map<string, SessionData>();
const csrfStore = new Map<string, CSRFEntry>();

// Generate secure random token
const generateToken = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Generate session ID
const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = generateToken(16);
  return `sess_${timestamp}_${random}`;
};

// Simple hash function (use crypto in production)
const hashData = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
};

// Sanitize user input
const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#x60;');
};

// Deep sanitize object
const deepSanitize = <T>(obj: T): T => {
  if (typeof obj === 'string') {
    return sanitizeInput(obj) as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item)) as T;
  }
  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeInput(key)] = deepSanitize(value);
    }
    return sanitized as T;
  }
  return obj;
};

class SecurityMiddleware {
  // ============================================
  // CSRF Protection
  // ============================================

  /**
   * Generate CSRF token for a session
   */
  generateCSRFToken(userId?: string): string {
    const token = generateToken(CSRF_CONFIG.tokenLength);
    const now = Date.now();

    const entry: CSRFEntry = {
      token,
      createdAt: now,
      expiresAt: now + CSRF_CONFIG.expirationMs,
      userId,
    };

    csrfStore.set(token, entry);
    return token;
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(token: string, userId?: string): boolean {
    const entry = csrfStore.get(token);

    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      csrfStore.delete(token);
      return false;
    }
    if (userId && entry.userId && entry.userId !== userId) {
      return false;
    }

    return true;
  }

  /**
   * Invalidate CSRF token after use
   */
  invalidateCSRFToken(token: string): void {
    csrfStore.delete(token);
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Create new session
   */
  async createSession(
    userId: string,
    options: {
      ipAddress?: string;
      userAgent?: string;
      permissions?: string[];
    } = {}
  ): Promise<SessionData> {
    const sessionId = generateSessionId();
    const now = Date.now();

    const session: SessionData = {
      id: sessionId,
      userId,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + SESSION_CONFIG.maxDurationMs,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      twoFactorVerified: false,
      permissions: options.permissions || [],
    };

    sessionStore.set(sessionId, session);

    await auditLogService.log({
      action: 'SESSION_CREATED',
      actorId: userId,
      actorType: 'consumer',
      targetType: 'session',
      targetId: sessionId,
      metadata: {
        ipAddress: options.ipAddress,
        userAgent: options.userAgent?.substring(0, 100),
      },
    });

    return session;
  }

  /**
   * Validate and refresh session
   */
  validateSession(sessionId: string): SessionData | null {
    const session = sessionStore.get(sessionId);

    if (!session) return null;

    const now = Date.now();

    // Check expiration
    if (now > session.expiresAt) {
      sessionStore.delete(sessionId);
      return null;
    }

    // Check idle timeout
    if (now - session.lastActivityAt > SESSION_CONFIG.maxIdleMs) {
      sessionStore.delete(sessionId);
      return null;
    }

    // Refresh last activity
    session.lastActivityAt = now;
    sessionStore.set(sessionId, session);

    return session;
  }

  /**
   * Mark session as 2FA verified
   */
  markTwoFactorVerified(sessionId: string): boolean {
    const session = sessionStore.get(sessionId);
    if (!session) return false;

    session.twoFactorVerified = true;
    sessionStore.set(sessionId, session);
    return true;
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = sessionStore.get(sessionId);
    if (session) {
      await auditLogService.log({
        action: 'SESSION_DESTROYED',
        actorId: session.userId,
        actorType: 'consumer',
        targetType: 'session',
        targetId: sessionId,
      });
    }
    sessionStore.delete(sessionId);
  }

  /**
   * Destroy all sessions for user
   */
  async destroyAllUserSessions(userId: string): Promise<number> {
    let count = 0;
    for (const [sessionId, session] of sessionStore.entries()) {
      if (session.userId === userId) {
        sessionStore.delete(sessionId);
        count++;
      }
    }

    if (count > 0) {
      await auditLogService.log({
        action: 'ALL_SESSIONS_DESTROYED',
        actorId: userId,
        actorType: 'consumer',
        targetType: 'user',
        targetId: userId,
        metadata: { sessionCount: count },
      });
    }

    return count;
  }

  // ============================================
  // Request Signature Verification
  // ============================================

  /**
   * Generate request signature
   */
  generateSignature(
    method: string,
    path: string,
    timestamp: number,
    body: string,
    secretKey: string
  ): string {
    const payload = `${method}:${path}:${timestamp}:${body}`;
    return hashData(payload + secretKey);
  }

  /**
   * Verify request signature
   */
  verifySignature(
    method: string,
    path: string,
    timestamp: number,
    body: string,
    signature: string,
    secretKey: string
  ): boolean {
    // Check timestamp drift
    const now = Date.now();
    if (Math.abs(now - timestamp) > SIGNATURE_CONFIG.maxTimestampDriftMs) {
      return false;
    }

    const expectedSignature = this.generateSignature(method, path, timestamp, body, secretKey);
    return signature === expectedSignature;
  }

  // ============================================
  // Input Validation
  // ============================================

  /**
   * Sanitize request data
   */
  sanitize<T>(data: T): T {
    return deepSanitize(data);
  }

  /**
   * Validate required fields
   */
  validateRequired(
    data: Record<string, unknown>,
    requiredFields: string[]
  ): { valid: boolean; missingFields: string[] } {
    const missingFields = requiredFields.filter(
      field => data[field] === undefined || data[field] === null || data[field] === ''
    );

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }

  // ============================================
  // Security Context
  // ============================================

  /**
   * Create security context for request
   */
  createContext(options: {
    sessionId?: string;
    csrfToken?: string;
    ipAddress?: string;
    userAgent?: string;
  }): SecurityContext {
    const context: SecurityContext = {
      timestamp: Date.now(),
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      isAuthenticated: false,
      permissions: [],
    };

    // Validate session
    if (options.sessionId) {
      const session = this.validateSession(options.sessionId);
      if (session) {
        context.userId = session.userId;
        context.sessionId = session.id;
        context.isAuthenticated = true;
        context.permissions = session.permissions;
      }
    }

    // Validate CSRF
    if (options.csrfToken) {
      context.csrfToken = options.csrfToken;
    }

    return context;
  }

  /**
   * Check if context has permission
   */
  hasPermission(context: SecurityContext, permission: string): boolean {
    return context.permissions.includes(permission) || context.permissions.includes('admin');
  }

  // ============================================
  // Security Headers
  // ============================================

  /**
   * Get recommended security headers
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get active session count for user
   */
  getUserSessionCount(userId: string): number {
    let count = 0;
    for (const session of sessionStore.values()) {
      if (session.userId === userId) count++;
    }
    return count;
  }

  /**
   * Get all sessions for user (for multi-device management)
   */
  getUserSessions(userId: string): SessionData[] {
    const sessions: SessionData[] = [];
    for (const session of sessionStore.values()) {
      if (session.userId === userId) {
        sessions.push(session);
      }
    }
    return sessions.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  }

  /**
   * Cleanup expired tokens and sessions
   */
  cleanup(): { expiredSessions: number; expiredTokens: number } {
    const now = Date.now();
    let expiredSessions = 0;
    let expiredTokens = 0;

    // Cleanup sessions
    for (const [sessionId, session] of sessionStore.entries()) {
      if (now > session.expiresAt || now - session.lastActivityAt > SESSION_CONFIG.maxIdleMs) {
        sessionStore.delete(sessionId);
        expiredSessions++;
      }
    }

    // Cleanup CSRF tokens
    for (const [token, entry] of csrfStore.entries()) {
      if (now > entry.expiresAt) {
        csrfStore.delete(token);
        expiredTokens++;
      }
    }

    return { expiredSessions, expiredTokens };
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();

// Export types
export type { SecurityContext, SessionData, CSRFEntry };

// Export configuration for reference
export const securityConfig = {
  csrf: CSRF_CONFIG,
  session: SESSION_CONFIG,
  signature: SIGNATURE_CONFIG,
};
