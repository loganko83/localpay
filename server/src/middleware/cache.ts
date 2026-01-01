/**
 * Cache Middleware
 * HTTP response caching with ETag support
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import * as cacheService from '../services/cache.js';
import logger from '../config/logger.js';

export interface CacheMiddlewareOptions {
  ttl?: number; // Cache TTL in seconds
  namespace?: string; // Cache namespace
  keyGenerator?: (req: Request) => string; // Custom key generator
  condition?: (req: Request) => boolean; // Condition to enable caching
  vary?: string[]; // Vary headers to include in cache key
}

interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  etag: string;
  timestamp: number;
}

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, vary: string[] = []): string {
  const parts = [
    req.method,
    req.originalUrl || req.url,
    ...vary.map((header) => req.get(header) || ''),
  ];

  return parts.join(':');
}

/**
 * Generate ETag from response body
 */
function generateETag(body: string): string {
  return `"${crypto.createHash('md5').update(body).digest('hex')}"`;
}

/**
 * Cache middleware factory
 */
export function cache(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = 60,
    namespace = 'http-cache',
    keyGenerator,
    condition,
    vary = [],
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition
    if (condition && !condition(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator ? keyGenerator(req) : generateCacheKey(req, vary);

    // Check for cached response
    const cached = cacheService.get<CachedResponse>(cacheKey, namespace);

    if (cached) {
      // Check ETag
      const clientETag = req.get('If-None-Match');
      if (clientETag && clientETag === cached.etag) {
        return res.status(304).end();
      }

      // Set cache headers
      res.set({
        'X-Cache': 'HIT',
        'X-Cache-Age': String(Math.floor((Date.now() - cached.timestamp) / 1000)),
        'ETag': cached.etag,
        'Cache-Control': `public, max-age=${ttl}`,
        ...cached.headers,
      });

      return res.status(cached.statusCode).send(cached.body);
    }

    // Capture response
    const originalSend = res.send;
    res.send = function (body: unknown): Response {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
        const etag = generateETag(bodyString);

        const cachedResponse: CachedResponse = {
          statusCode: res.statusCode,
          headers: {
            'Content-Type': res.get('Content-Type') || 'application/json',
          },
          body: bodyString,
          etag,
          timestamp: Date.now(),
        };

        cacheService.set(cacheKey, cachedResponse, namespace, ttl);

        res.set({
          'X-Cache': 'MISS',
          'ETag': etag,
          'Cache-Control': `public, max-age=${ttl}`,
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * No-cache middleware - explicitly disable caching
 */
export function noCache(req: Request, res: Response, next: NextFunction) {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  });
  next();
}

/**
 * Cache invalidation middleware
 */
export function invalidateCache(patterns: string[], namespace: string = 'http-cache') {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      // Only invalidate on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        let deletedCount = 0;
        for (const pattern of patterns) {
          deletedCount += cacheService.delByPattern(pattern, namespace);
        }
        if (deletedCount > 0) {
          logger.debug('Cache invalidated', { patterns, deletedCount, namespace });
        }
      }
    });
    next();
  };
}

/**
 * Cache control header middleware
 */
export function cacheControl(maxAge: number, isPublic: boolean = true) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const visibility = isPublic ? 'public' : 'private';
    res.set('Cache-Control', `${visibility}, max-age=${maxAge}`);
    next();
  };
}

/**
 * Stale-while-revalidate middleware
 */
export function staleWhileRevalidate(maxAge: number, staleAge: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.set(
      'Cache-Control',
      `public, max-age=${maxAge}, stale-while-revalidate=${staleAge}`
    );
    next();
  };
}

export default {
  cache,
  noCache,
  invalidateCache,
  cacheControl,
  staleWhileRevalidate,
};
