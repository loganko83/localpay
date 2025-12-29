/**
 * Request Logger Middleware
 * Logs API requests for monitoring and debugging
 */

import { Request, Response, NextFunction } from 'express';

interface RequestLogEntry {
  timestamp: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  userId?: string;
  duration?: number;
  statusCode?: number;
}

/**
 * Request logger middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log entry
  const logEntry: RequestLogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
  };

  // Capture response finish
  res.on('finish', () => {
    logEntry.duration = Date.now() - startTime;
    logEntry.statusCode = res.statusCode;

    // Extract user ID if authenticated
    const user = (req as Request & { user?: { userId: string } }).user;
    if (user?.userId) {
      logEntry.userId = user.userId;
    }

    // Log based on status code
    const logMessage = `${logEntry.method} ${logEntry.url} ${logEntry.statusCode} ${logEntry.duration}ms`;

    if (res.statusCode >= 500) {
      console.error('[ERROR]', logMessage, logEntry);
    } else if (res.statusCode >= 400) {
      console.warn('[WARN]', logMessage);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('[INFO]', logMessage);
    }
  });

  next();
}

export default requestLogger;
