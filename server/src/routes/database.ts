/**
 * Database Management Routes
 * Admin endpoints for backup, migration, and maintenance
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import backupService from '../services/backup.js';
import migrationService from '../services/migration.js';
import { getDb } from '../db/index.js';
import logger from '../config/logger.js';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /api/admin/database/backup:
 *   post:
 *     summary: Create database backup
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup created successfully
 */
router.post('/backup', async (_req: Request, res: Response) => {
  try {
    const result = await backupService.createBackup();

    if (result.success) {
      res.json({
        success: true,
        message: 'Backup created successfully',
        data: {
          filename: result.filename,
          size: result.size,
          duration: result.duration,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Backup endpoint error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create backup',
    });
  }
});

/**
 * @swagger
 * /api/admin/database/backups:
 *   get:
 *     summary: List all backups
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of backups
 */
router.get('/backups', (_req: Request, res: Response) => {
  try {
    const backups = backupService.listBackups();
    const stats = backupService.getBackupStats();

    res.json({
      success: true,
      data: {
        backups: backups.map(b => ({
          filename: b.filename,
          size: b.size,
          sizeFormatted: formatBytes(b.size),
          createdAt: b.createdAt.toISOString(),
        })),
        stats: {
          totalBackups: stats.totalBackups,
          totalSize: stats.totalSize,
          totalSizeFormatted: formatBytes(stats.totalSize),
          oldestBackup: stats.oldestBackup?.toISOString(),
          newestBackup: stats.newestBackup?.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('List backups error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to list backups',
    });
  }
});

/**
 * @swagger
 * /api/admin/database/backup/{filename}/verify:
 *   post:
 *     summary: Verify backup integrity
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/backup/:filename/verify', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const backups = backupService.listBackups();
    const backup = backups.find(b => b.filename === filename);

    if (!backup) {
      res.status(404).json({
        success: false,
        error: 'Backup not found',
      });
      return;
    }

    const verified = await backupService.verifyBackup(backup.path);

    res.json({
      success: true,
      data: {
        filename,
        verified,
        message: verified ? 'Backup is valid' : 'Backup verification failed',
      },
    });
  } catch (error) {
    logger.error('Verify backup error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to verify backup',
    });
  }
});

/**
 * @swagger
 * /api/admin/database/migrations:
 *   get:
 *     summary: Get migration status
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 */
router.get('/migrations', (_req: Request, res: Response) => {
  try {
    const status = migrationService.getMigrationStatus();

    res.json({
      success: true,
      data: {
        currentVersion: status.currentVersion,
        pendingCount: status.pendingCount,
        applied: status.applied,
        pending: status.pending.map(m => ({
          version: m.version,
          name: m.name,
        })),
      },
    });
  } catch (error) {
    logger.error('Migration status error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get migration status',
    });
  }
});

/**
 * @swagger
 * /api/admin/database/migrations/run:
 *   post:
 *     summary: Run pending migrations
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 */
router.post('/migrations/run', async (_req: Request, res: Response) => {
  try {
    const result = await migrationService.runMigrations();

    if (result.success) {
      res.json({
        success: true,
        message: result.appliedMigrations.length > 0
          ? `Applied ${result.appliedMigrations.length} migrations`
          : 'No pending migrations',
        data: {
          appliedMigrations: result.appliedMigrations,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Run migrations error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to run migrations',
    });
  }
});

/**
 * @swagger
 * /api/admin/database/migrations/rollback:
 *   post:
 *     summary: Rollback last migration
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 */
router.post('/migrations/rollback', async (_req: Request, res: Response) => {
  try {
    const result = await migrationService.rollbackMigration();

    if (result.success) {
      res.json({
        success: true,
        message: result.appliedMigrations.length > 0
          ? `Rolled back migration ${result.appliedMigrations[0]}`
          : 'No migrations to rollback',
        data: {
          rolledBack: result.appliedMigrations,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Rollback migration error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to rollback migration',
    });
  }
});

/**
 * @swagger
 * /api/admin/database/stats:
 *   get:
 *     summary: Get database statistics
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const db = getDb();

    // Get table sizes
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as Array<{ name: string }>;

    const tableStats = tables.map(t => {
      const count = (db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get() as { count: number }).count;
      return { name: t.name, rowCount: count };
    });

    // Get database size
    const pageCountResult = db.pragma('page_count') as Array<{ page_count: number }>;
    const pageSizeResult = db.pragma('page_size') as Array<{ page_size: number }>;
    const pageCount = pageCountResult[0]?.page_count || 0;
    const pageSize = pageSizeResult[0]?.page_size || 4096;
    const dbSize = pageCount * pageSize;

    // Get index info
    const indexes = db.prepare(`
      SELECT name, tbl_name FROM sqlite_master
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
    `).all() as Array<{ name: string; tbl_name: string }>;

    // Get WAL info
    const walModeResult = db.pragma('journal_mode') as Array<{ journal_mode: string }>;
    const walMode = walModeResult[0]?.journal_mode || 'unknown';

    res.json({
      success: true,
      data: {
        database: {
          size: dbSize,
          sizeFormatted: formatBytes(dbSize),
          pageCount,
          pageSize,
          walMode,
        },
        tables: tableStats,
        indexes: indexes.length,
        indexList: indexes,
      },
    });
  } catch (error) {
    logger.error('Database stats error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get database stats',
    });
  }
});

/**
 * @swagger
 * /api/admin/database/optimize:
 *   post:
 *     summary: Optimize database (VACUUM and ANALYZE)
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 */
router.post('/optimize', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const startTime = Date.now();

    // Run ANALYZE to update statistics
    db.exec('ANALYZE');

    // Run VACUUM to reclaim space (this can take a while)
    db.exec('VACUUM');

    // Checkpoint WAL
    db.pragma('wal_checkpoint(TRUNCATE)');

    const duration = Date.now() - startTime;

    logger.info('Database optimization completed', { duration });

    res.json({
      success: true,
      message: 'Database optimization completed',
      data: {
        duration,
        operations: ['ANALYZE', 'VACUUM', 'WAL checkpoint'],
      },
    });
  } catch (error) {
    logger.error('Database optimization error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to optimize database',
    });
  }
});

/**
 * @swagger
 * /api/admin/database/integrity:
 *   get:
 *     summary: Check database integrity
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 */
router.get('/integrity', (_req: Request, res: Response) => {
  try {
    const db = getDb();

    const result = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
    const isValid = result.length === 1 && result[0].integrity_check === 'ok';

    res.json({
      success: true,
      data: {
        valid: isValid,
        result: result.map(r => r.integrity_check),
      },
    });
  } catch (error) {
    logger.error('Integrity check error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to check integrity',
    });
  }
});

// Helper function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
