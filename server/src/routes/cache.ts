/**
 * Cache Management Routes
 * Admin endpoints for cache monitoring and control
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import * as cacheService from '../services/cache.js';
import logger from '../config/logger.js';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/cache/stats
 * Get cache statistics
 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const namespaces = cacheService.getNamespaces();
    const stats: Record<string, ReturnType<typeof cacheService.getStats>> = {};

    for (const namespace of namespaces) {
      stats[namespace] = cacheService.getStats(namespace);
    }

    const overall = cacheService.getStats();

    res.json({
      success: true,
      data: {
        overall,
        namespaces: stats,
        namespaceCount: namespaces.length,
        memoryUsage: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
          unit: 'MB',
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get cache stats', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
    });
  }
});

/**
 * GET /api/admin/cache/namespaces
 * List all cache namespaces
 */
router.get('/namespaces', (_req: Request, res: Response) => {
  try {
    const namespaces = cacheService.getNamespaces();
    const details = namespaces.map((namespace) => ({
      name: namespace,
      ...cacheService.getStats(namespace),
    }));

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    logger.error('Failed to list cache namespaces', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to list cache namespaces',
    });
  }
});

/**
 * DELETE /api/admin/cache/clear
 * Clear all caches
 */
router.delete('/clear', (_req: Request, res: Response) => {
  try {
    cacheService.clearAll();
    logger.info('All caches cleared by admin');

    res.json({
      success: true,
      message: 'All caches cleared successfully',
    });
  } catch (error) {
    logger.error('Failed to clear caches', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to clear caches',
    });
  }
});

/**
 * DELETE /api/admin/cache/:namespace
 * Clear specific namespace cache
 */
router.delete('/:namespace', (req: Request, res: Response) => {
  try {
    const { namespace } = req.params;
    const namespaces = cacheService.getNamespaces();

    if (!namespaces.includes(namespace)) {
      return res.status(404).json({
        success: false,
        error: 'Cache namespace not found',
      });
    }

    cacheService.clear(namespace);
    logger.info('Cache namespace cleared by admin', { namespace });

    res.json({
      success: true,
      message: `Cache namespace '${namespace}' cleared successfully`,
    });
  } catch (error) {
    logger.error('Failed to clear cache namespace', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache namespace',
    });
  }
});

/**
 * DELETE /api/admin/cache/:namespace/pattern/:pattern
 * Delete cache entries by pattern
 */
router.delete('/:namespace/pattern/:pattern', (req: Request, res: Response) => {
  try {
    const { namespace, pattern } = req.params;
    const deletedCount = cacheService.delByPattern(pattern, namespace);

    logger.info('Cache entries deleted by pattern', { namespace, pattern, deletedCount });

    res.json({
      success: true,
      message: `Deleted ${deletedCount} cache entries matching pattern '${pattern}'`,
      deletedCount,
    });
  } catch (error) {
    logger.error('Failed to delete cache entries', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete cache entries',
    });
  }
});

/**
 * POST /api/admin/cache/warm
 * Trigger cache warming
 */
router.post('/warm', async (_req: Request, res: Response) => {
  try {
    // Initialize cache namespaces with default TTLs
    cacheService.initCaches();

    logger.info('Cache warming initiated by admin');

    res.json({
      success: true,
      message: 'Cache warming initiated',
    });
  } catch (error) {
    logger.error('Failed to warm cache', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to warm cache',
    });
  }
});

export default router;
