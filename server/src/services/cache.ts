/**
 * Cache Service
 * In-memory caching with TTL and statistics
 */

import NodeCache from 'node-cache';
import logger from '../config/logger.js';

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  hitRate: number;
  memoryUsage: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  checkperiod?: number; // Automatic delete check interval
}

// Default cache configuration
const DEFAULT_TTL = 300; // 5 minutes
const DEFAULT_CHECK_PERIOD = 60; // 1 minute

// Create cache instances for different purposes
const caches: Map<string, NodeCache> = new Map();

// Statistics tracking
let totalHits = 0;
let totalMisses = 0;

/**
 * Get or create a cache instance
 */
function getCache(namespace: string = 'default', options?: CacheOptions): NodeCache {
  if (!caches.has(namespace)) {
    const cache = new NodeCache({
      stdTTL: options?.ttl || DEFAULT_TTL,
      checkperiod: options?.checkperiod || DEFAULT_CHECK_PERIOD,
      useClones: false, // Better performance for read-heavy workloads
      deleteOnExpire: true,
    });

    cache.on('expired', (key, _value) => {
      logger.debug('Cache key expired', { namespace, key });
    });

    caches.set(namespace, cache);
    logger.info('Cache namespace created', { namespace, ttl: options?.ttl || DEFAULT_TTL });
  }

  return caches.get(namespace)!;
}

/**
 * Get cached value
 */
export function get<T>(key: string, namespace: string = 'default'): T | undefined {
  const cache = getCache(namespace);
  const value = cache.get<T>(key);

  if (value !== undefined) {
    totalHits++;
    return value;
  }

  totalMisses++;
  return undefined;
}

/**
 * Set cached value
 */
export function set<T>(
  key: string,
  value: T,
  namespace: string = 'default',
  ttl?: number
): boolean {
  const cache = getCache(namespace);
  return cache.set(key, value, ttl || DEFAULT_TTL);
}

/**
 * Delete cached value
 */
export function del(key: string, namespace: string = 'default'): number {
  const cache = getCache(namespace);
  return cache.del(key);
}

/**
 * Delete multiple keys by pattern
 */
export function delByPattern(pattern: string, namespace: string = 'default'): number {
  const cache = getCache(namespace);
  const keys = cache.keys().filter((key) => key.includes(pattern));
  return cache.del(keys);
}

/**
 * Clear all keys in a namespace
 */
export function clear(namespace: string = 'default'): void {
  const cache = getCache(namespace);
  cache.flushAll();
  logger.info('Cache cleared', { namespace });
}

/**
 * Clear all caches
 */
export function clearAll(): void {
  caches.forEach((cache, namespace) => {
    cache.flushAll();
    logger.info('Cache cleared', { namespace });
  });
  totalHits = 0;
  totalMisses = 0;
}

/**
 * Get cache statistics
 */
export function getStats(namespace?: string): CacheStats {
  if (namespace) {
    const cache = getCache(namespace);
    const stats = cache.getStats();
    const hitRate = stats.hits + stats.misses > 0
      ? (stats.hits / (stats.hits + stats.misses)) * 100
      : 0;

    return {
      hits: stats.hits,
      misses: stats.misses,
      keys: cache.keys().length,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }

  // Aggregate stats from all namespaces
  let totalKeys = 0;
  caches.forEach((cache) => {
    totalKeys += cache.keys().length;
  });

  const hitRate = totalHits + totalMisses > 0
    ? (totalHits / (totalHits + totalMisses)) * 100
    : 0;

  return {
    hits: totalHits,
    misses: totalMisses,
    keys: totalKeys,
    hitRate: Math.round(hitRate * 100) / 100,
    memoryUsage: process.memoryUsage().heapUsed,
  };
}

/**
 * Get all cache namespaces
 */
export function getNamespaces(): string[] {
  return Array.from(caches.keys());
}

/**
 * Check if key exists
 */
export function has(key: string, namespace: string = 'default'): boolean {
  const cache = getCache(namespace);
  return cache.has(key);
}

/**
 * Get TTL for a key
 */
export function getTtl(key: string, namespace: string = 'default'): number | undefined {
  const cache = getCache(namespace);
  return cache.getTtl(key);
}

/**
 * Get or set cached value (cache-aside pattern)
 */
export async function getOrSet<T>(
  key: string,
  factory: () => Promise<T> | T,
  namespace: string = 'default',
  ttl?: number
): Promise<T> {
  const cached = get<T>(key, namespace);
  if (cached !== undefined) {
    return cached;
  }

  const value = await factory();
  set(key, value, namespace, ttl);
  return value;
}

/**
 * Cache warming - preload frequently accessed data
 */
export async function warmCache(
  items: Array<{ key: string; factory: () => Promise<unknown>; namespace?: string; ttl?: number }>
): Promise<void> {
  logger.info('Starting cache warming', { itemCount: items.length });

  for (const item of items) {
    try {
      const value = await item.factory();
      set(item.key, value, item.namespace, item.ttl);
      logger.debug('Cache warmed', { key: item.key, namespace: item.namespace });
    } catch (error) {
      logger.error('Failed to warm cache', {
        key: item.key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.info('Cache warming completed');
}

// Pre-defined cache namespaces with specific TTLs
export const CacheNamespaces = {
  WALLET_BALANCE: 'wallet-balance', // 30 seconds
  MERCHANT_LIST: 'merchant-list', // 5 minutes
  TRANSACTION_HISTORY: 'transaction-history', // 1 minute
  USER_PROFILE: 'user-profile', // 2 minutes
  STATS: 'stats', // 1 minute
  CONFIG: 'config', // 10 minutes
} as const;

// Initialize common cache namespaces with appropriate TTLs
export function initCaches(): void {
  getCache(CacheNamespaces.WALLET_BALANCE, { ttl: 30 });
  getCache(CacheNamespaces.MERCHANT_LIST, { ttl: 300 });
  getCache(CacheNamespaces.TRANSACTION_HISTORY, { ttl: 60 });
  getCache(CacheNamespaces.USER_PROFILE, { ttl: 120 });
  getCache(CacheNamespaces.STATS, { ttl: 60 });
  getCache(CacheNamespaces.CONFIG, { ttl: 600 });
  logger.info('Cache namespaces initialized');
}

export default {
  get,
  set,
  del,
  delByPattern,
  clear,
  clearAll,
  getStats,
  getNamespaces,
  has,
  getTtl,
  getOrSet,
  warmCache,
  initCaches,
  CacheNamespaces,
};
