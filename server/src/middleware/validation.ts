/**
 * Validation Middleware
 * Centralized request validation with express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';

/**
 * Validate request and return errors if any
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: 'path' in err ? err.path : 'unknown',
        message: err.msg,
      })),
    });
  };
}

/**
 * Common validation rules
 */
export const rules = {
  // ID validations
  id: (field: string = 'id') => param(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isLength({ min: 1, max: 100 })
    .withMessage(`${field} must be between 1 and 100 characters`),

  // Email validation
  email: () => body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  // Password validation
  password: () => body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  // Strong password validation
  strongPassword: () => body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),

  // Amount validation
  amount: () => body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isInt({ min: 100, max: 3000000 })
    .withMessage('Amount must be between 100 and 3,000,000 KRW'),

  // Phone validation (Korean format)
  phone: () => body('phone')
    .optional()
    .trim()
    .matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
    .withMessage('Invalid phone number format'),

  // Name validation
  name: () => body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\uAC00-\uD7AF\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  // Pagination
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Page must be a non-negative integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],

  // Date range
  dateRange: () => [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format'),
  ],

  // Code validation (vouchers, coupons)
  code: () => body('code')
    .trim()
    .notEmpty()
    .withMessage('Code is required')
    .isLength({ min: 4, max: 20 })
    .withMessage('Code must be between 4 and 20 characters')
    .isAlphanumeric()
    .withMessage('Code must contain only letters and numbers'),

  // Reason/description validation
  reason: () => body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),

  // Optional reason
  optionalReason: () => body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must be at most 500 characters'),
};

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  const sanitize = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = value
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitize(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }

  next();
}

/**
 * Pre-built validation schemas for common operations
 */
export const schemas = {
  login: [
    rules.email(),
    rules.password(),
  ],

  register: [
    rules.email(),
    rules.strongPassword(),
    rules.name(),
    rules.phone(),
  ],

  payment: [
    body('merchantId').notEmpty().withMessage('Merchant ID is required'),
    rules.amount(),
    body('description').optional().isLength({ max: 200 }),
  ],

  refund: [
    body('originalTransactionId').notEmpty().withMessage('Original transaction ID is required'),
    rules.optionalReason(),
  ],

  voucher: [
    rules.code(),
  ],

  passwordReset: [
    rules.email(),
  ],

  passwordChange: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    rules.strongPassword(),
  ],

  idParam: [
    rules.id(),
  ],
};

export default {
  validate,
  rules,
  schemas,
  sanitizeInput,
};
