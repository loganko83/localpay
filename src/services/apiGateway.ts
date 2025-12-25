/**
 * API Gateway Service
 *
 * Provides centralized request management including:
 * - Rate limiting per user/endpoint
 * - Request validation and sanitization
 * - Correlation ID tracking
 * - Request/Response logging
 *
 * Architecture Note:
 * This is a client-side gateway for the PoC.
 * In production, use Kong/AWS API Gateway for edge security.
 */

import { auditLogService } from './auditLog';

// Rate limit configuration
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
}

// Request context for tracking
interface RequestContext {
  correlationId: string;
  userId?: string;
  endpoint: string;
  method: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
}

// Rate limit entry
interface RateLimitEntry {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

// Validation rule types
type ValidationRule = 'required' | 'string' | 'number' | 'email' | 'phone' | 'amount' | 'uuid';

interface ValidationSchema {
  [field: string]: ValidationRule[];
}

// Default rate limits by endpoint category
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  payment: { maxRequests: 10, windowMs: 60000, blockDurationMs: 300000 }, // 10/min, block 5min
  auth: { maxRequests: 5, windowMs: 60000, blockDurationMs: 600000 }, // 5/min, block 10min
  query: { maxRequests: 100, windowMs: 60000, blockDurationMs: 60000 }, // 100/min, block 1min
  default: { maxRequests: 60, windowMs: 60000, blockDurationMs: 120000 }, // 60/min, block 2min
};

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Generate correlation ID for request tracking
const generateCorrelationId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
};

// Get rate limit key
const getRateLimitKey = (userId: string | undefined, endpoint: string): string => {
  return `${userId || 'anonymous'}:${endpoint}`;
};

// Get endpoint category for rate limiting
const getEndpointCategory = (endpoint: string): string => {
  if (endpoint.includes('/payment') || endpoint.includes('/topup')) return 'payment';
  if (endpoint.includes('/auth') || endpoint.includes('/login')) return 'auth';
  if (endpoint.includes('/query') || endpoint.includes('/list') || endpoint.includes('/get')) return 'query';
  return 'default';
};

// Validation helpers
const validators = {
  required: (value: unknown): boolean => value !== undefined && value !== null && value !== '',
  string: (value: unknown): boolean => typeof value === 'string',
  number: (value: unknown): boolean => typeof value === 'number' && !isNaN(value),
  email: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },
  phone: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    return /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(value.replace(/-/g, ''));
  },
  amount: (value: unknown): boolean => {
    if (typeof value !== 'number') return false;
    return value > 0 && value <= 3000000; // Max prepaid limit
  },
  uuid: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  },
};

// Sanitize input to prevent XSS
const sanitizeInput = (input: unknown): unknown => {
  if (typeof input === 'string') {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (input && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};

class APIGateway {
  private enabled: boolean = true;

  /**
   * Check rate limit for a request
   */
  checkRateLimit(
    userId: string | undefined,
    endpoint: string,
    category?: string
  ): { allowed: boolean; retryAfter?: number; remaining?: number } {
    if (!this.enabled) return { allowed: true };

    const key = getRateLimitKey(userId, endpoint);
    const cat = category || getEndpointCategory(endpoint);
    const config = DEFAULT_RATE_LIMITS[cat] || DEFAULT_RATE_LIMITS.default;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Check if currently blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }

    // Initialize or reset window
    if (!entry || now - entry.windowStart > config.windowMs) {
      entry = { count: 0, windowStart: now };
    }

    // Increment count
    entry.count++;

    // Check if over limit
    if (entry.count > config.maxRequests) {
      entry.blockedUntil = now + config.blockDurationMs;
      rateLimitStore.set(key, entry);

      // Log rate limit violation
      auditLogService.log({
        action: 'RATE_LIMIT_EXCEEDED',
        actorId: userId || 'anonymous',
        actorType: 'consumer',
        targetType: 'api',
        targetId: endpoint,
        metadata: {
          category: cat,
          count: entry.count,
          limit: config.maxRequests,
          blockDuration: config.blockDurationMs,
        },
      });

      return {
        allowed: false,
        retryAfter: Math.ceil(config.blockDurationMs / 1000),
      };
    }

    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
    };
  }

  /**
   * Validate request data against schema
   */
  validateRequest(
    data: Record<string, unknown>,
    schema: ValidationSchema
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      for (const rule of rules) {
        const validator = validators[rule];
        if (!validator) continue;

        if (rule === 'required' && !validator(value)) {
          errors.push(`${field} is required`);
          break; // Skip other rules if required fails
        }

        if (value !== undefined && value !== null && rule !== 'required' && !validator(value)) {
          errors.push(`${field} is invalid (expected ${rule})`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize request data
   */
  sanitize<T>(data: T): T {
    return sanitizeInput(data) as T;
  }

  /**
   * Create request context for tracking
   */
  createContext(
    endpoint: string,
    method: string,
    userId?: string
  ): RequestContext {
    return {
      correlationId: generateCorrelationId(),
      userId,
      endpoint,
      method,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log request for audit trail
   */
  async logRequest(
    context: RequestContext,
    requestData?: Record<string, unknown>,
    responseStatus?: number,
    responseTime?: number
  ): Promise<void> {
    // Mask sensitive data
    const maskedData = requestData ? this.maskSensitiveData(requestData) : undefined;

    await auditLogService.log({
      action: 'API_REQUEST',
      actorId: context.userId || 'anonymous',
      actorType: 'consumer',
      targetType: 'api',
      targetId: context.endpoint,
      metadata: {
        correlationId: context.correlationId,
        method: context.method,
        requestData: maskedData,
        responseStatus,
        responseTime,
        timestamp: context.timestamp,
      },
    });
  }

  /**
   * Mask sensitive data in logs
   */
  private maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = ['password', 'pin', 'cvv', 'cardNumber', 'accountNumber', 'ssn'];
    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(f => key.toLowerCase().includes(f))) {
        masked[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitiveData(value as Record<string, unknown>);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Validate payment amount against prepaid limits
   */
  validatePaymentAmount(
    amount: number,
    currentBalance: number,
    dailyUsed: number,
    monthlyUsed: number
  ): { valid: boolean; error?: string } {
    const limits = {
      daily: 500000, // 50 KRW
      monthly: 2000000, // 200 KRW
      total: 3000000, // 300 KRW (prepaid max)
      minTransaction: 100, // Min 100 KRW
    };

    if (amount < limits.minTransaction) {
      return { valid: false, error: `Minimum transaction amount is ${limits.minTransaction} KRW` };
    }

    if (amount > currentBalance) {
      return { valid: false, error: 'Insufficient balance' };
    }

    if (dailyUsed + amount > limits.daily) {
      return { valid: false, error: `Daily limit exceeded (${limits.daily.toLocaleString()} KRW)` };
    }

    if (monthlyUsed + amount > limits.monthly) {
      return { valid: false, error: `Monthly limit exceeded (${limits.monthly.toLocaleString()} KRW)` };
    }

    return { valid: true };
  }

  /**
   * Validate top-up amount against prepaid limits
   */
  validateTopUpAmount(
    amount: number,
    currentBalance: number
  ): { valid: boolean; error?: string } {
    const limits = {
      total: 3000000, // Max prepaid balance
      minTopUp: 1000, // Min 1,000 KRW
      maxTopUp: 1000000, // Max single top-up 1,000,000 KRW
    };

    if (amount < limits.minTopUp) {
      return { valid: false, error: `Minimum top-up amount is ${limits.minTopUp.toLocaleString()} KRW` };
    }

    if (amount > limits.maxTopUp) {
      return { valid: false, error: `Maximum single top-up is ${limits.maxTopUp.toLocaleString()} KRW` };
    }

    if (currentBalance + amount > limits.total) {
      const maxAllowed = limits.total - currentBalance;
      return {
        valid: false,
        error: `Prepaid limit would be exceeded. Maximum additional top-up: ${maxAllowed.toLocaleString()} KRW`
      };
    }

    return { valid: true };
  }

  /**
   * Clear rate limit for a user (for testing or admin reset)
   */
  clearRateLimit(userId: string, endpoint?: string): void {
    if (endpoint) {
      rateLimitStore.delete(getRateLimitKey(userId, endpoint));
    } else {
      // Clear all entries for this user
      for (const key of rateLimitStore.keys()) {
        if (key.startsWith(`${userId}:`)) {
          rateLimitStore.delete(key);
        }
      }
    }
  }

  /**
   * Enable/disable gateway (for testing)
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get rate limit status for monitoring
   */
  getRateLimitStatus(userId: string, endpoint: string): {
    count: number;
    windowStart: number;
    isBlocked: boolean;
    blockedUntil?: number;
  } | null {
    const key = getRateLimitKey(userId, endpoint);
    const entry = rateLimitStore.get(key);

    if (!entry) return null;

    return {
      count: entry.count,
      windowStart: entry.windowStart,
      isBlocked: entry.blockedUntil ? entry.blockedUntil > Date.now() : false,
      blockedUntil: entry.blockedUntil,
    };
  }
}

// Export singleton instance
export const apiGateway = new APIGateway();

// Export types
export type { RequestContext, ValidationSchema, RateLimitConfig };

// Common validation schemas
export const validationSchemas = {
  payment: {
    userId: ['required', 'string'] as ValidationRule[],
    merchantId: ['required', 'string'] as ValidationRule[],
    amount: ['required', 'number', 'amount'] as ValidationRule[],
  },
  topUp: {
    userId: ['required', 'string'] as ValidationRule[],
    amount: ['required', 'number', 'amount'] as ValidationRule[],
    sourceAccountId: ['required', 'string'] as ValidationRule[],
  },
  login: {
    phone: ['required', 'phone'] as ValidationRule[],
  },
  register: {
    phone: ['required', 'phone'] as ValidationRule[],
    name: ['required', 'string'] as ValidationRule[],
    email: ['email'] as ValidationRule[],
  },
};
