/**
 * Health Check Routes
 * Provides endpoints for health monitoring and readiness checks
 */

import { Router, Request, Response } from 'express';
import { getDb } from '../db/index.js';
import logger from '../config/logger.js';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: CheckResult;
    memory: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  latency?: number;
}

/**
 * Basic health check (for load balancer)
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Detailed health check
 */
router.get('/health/detailed', async (_req: Request, res: Response) => {
  const checks: HealthStatus['checks'] = {
    database: await checkDatabase(),
    memory: checkMemory(),
  };

  const overallStatus = determineOverallStatus(checks);

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Kubernetes-style liveness probe
 */
router.get('/health/live', (_req: Request, res: Response) => {
  // Liveness: Is the process running?
  res.status(200).json({
    status: 'live',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Kubernetes-style readiness probe
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  // Readiness: Can the service accept traffic?
  const dbCheck = await checkDatabase();

  if (dbCheck.status === 'fail') {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      reason: dbCheck.message,
    });
    return;
  }

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Metrics endpoint (basic stats)
 */
router.get('/metrics', (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();

  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
    },
    cpu: process.cpuUsage(),
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  });
});

// Helper functions

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const db = getDb();
    const result = db.prepare('SELECT 1 as test').get() as { test: number };

    if (result?.test !== 1) {
      throw new Error('Database query returned unexpected result');
    }

    const latency = Date.now() - start;

    if (latency > 100) {
      return { status: 'warn', message: 'Database slow', latency };
    }

    return { status: 'pass', latency };
  } catch (error) {
    logger.error('Database health check failed', { error });
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - start,
    };
  }
}

function checkMemory(): CheckResult {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
  const usagePercent = (heapUsedMB / heapTotalMB) * 100;

  if (usagePercent > 90) {
    return { status: 'fail', message: `Memory usage critical: ${usagePercent.toFixed(1)}%` };
  }

  if (usagePercent > 70) {
    return { status: 'warn', message: `Memory usage high: ${usagePercent.toFixed(1)}%` };
  }

  return { status: 'pass', message: `Memory usage: ${usagePercent.toFixed(1)}%` };
}

function determineOverallStatus(checks: HealthStatus['checks']): HealthStatus['status'] {
  const statuses = Object.values(checks).map((c) => c.status);

  if (statuses.some((s) => s === 'fail')) {
    return 'unhealthy';
  }

  if (statuses.some((s) => s === 'warn')) {
    return 'degraded';
  }

  return 'healthy';
}

export default router;
