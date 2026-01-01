/**
 * Winston Logger Configuration
 * Production-grade structured logging
 */

import winston from 'winston';
import path from 'path';
import { config } from './index.js';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format for development
const devFormat = printf(({ level, message, timestamp, requestId, ...metadata }) => {
  let msg = `${timestamp} [${level}]`;
  if (requestId) {
    msg += ` [${requestId}]`;
  }
  msg += `: ${message}`;

  if (Object.keys(metadata).length > 0 && metadata.stack === undefined) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  if (metadata.stack) {
    msg += `\n${metadata.stack}`;
  }
  return msg;
});

// Log directory
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (config.nodeEnv === 'production' ? 'info' : 'debug'),
  defaultMeta: {
    service: 'localpay-api',
    version: '1.0.0',
  },
  transports: [],
});

// Production configuration
if (config.nodeEnv === 'production') {
  logger.add(new winston.transports.File({
    filename: path.join(LOG_DIR, 'error.log'),
    level: 'error',
    format: combine(
      timestamp(),
      errors({ stack: true }),
      json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));

  logger.add(new winston.transports.File({
    filename: path.join(LOG_DIR, 'combined.log'),
    format: combine(
      timestamp(),
      errors({ stack: true }),
      json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 10,
  }));

  // Also log to console in production
  logger.add(new winston.transports.Console({
    format: combine(
      timestamp(),
      json()
    ),
  }));
} else {
  // Development configuration
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      devFormat
    ),
  }));
}

// Child logger factory for request context
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

// Log levels helper
export const logLevels = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  http: 'http',
  verbose: 'verbose',
  debug: 'debug',
  silly: 'silly',
} as const;

// Structured logging helpers
export const loggers = {
  /**
   * Log API request
   */
  request(method: string, path: string, metadata?: Record<string, unknown>) {
    logger.http(`${method} ${path}`, metadata);
  },

  /**
   * Log API response
   */
  response(method: string, path: string, statusCode: number, duration: number, metadata?: Record<string, unknown>) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, `${method} ${path} ${statusCode} ${duration}ms`, metadata);
  },

  /**
   * Log database query
   */
  query(operation: string, table: string, duration: number, metadata?: Record<string, unknown>) {
    logger.debug(`DB ${operation} on ${table} (${duration}ms)`, metadata);
  },

  /**
   * Log authentication event
   */
  auth(event: string, userId?: string, metadata?: Record<string, unknown>) {
    logger.info(`Auth: ${event}`, { userId, ...metadata });
  },

  /**
   * Log security event
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, unknown>) {
    const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    logger.log(level, `Security: ${event}`, { severity, ...metadata });
  },

  /**
   * Log transaction event
   */
  transaction(event: string, transactionId: string, amount?: number, metadata?: Record<string, unknown>) {
    logger.info(`Transaction: ${event}`, { transactionId, amount, ...metadata });
  },

  /**
   * Log external service call
   */
  external(service: string, operation: string, success: boolean, duration: number, metadata?: Record<string, unknown>) {
    const level = success ? 'info' : 'error';
    logger.log(level, `External: ${service}.${operation} (${duration}ms)`, { success, ...metadata });
  },
};

export default logger;
