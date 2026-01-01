/**
 * Database Backup Service
 * Handles SQLite database backups with rotation and verification
 */

import fs from 'fs';
import path from 'path';
import { getDb } from '../db/index.js';
import logger from '../config/logger.js';

export interface BackupConfig {
  backupDir: string;
  maxBackups: number;
  compressionEnabled: boolean;
}

export interface BackupResult {
  success: boolean;
  filename?: string;
  size?: number;
  duration?: number;
  error?: string;
}

export interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  verified: boolean;
}

const DEFAULT_CONFIG: BackupConfig = {
  backupDir: process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'),
  maxBackups: parseInt(process.env.MAX_BACKUPS || '10', 10),
  compressionEnabled: process.env.BACKUP_COMPRESSION === 'true',
};

/**
 * Create a backup of the SQLite database
 */
export async function createBackup(config: Partial<BackupConfig> = {}): Promise<BackupResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  try {
    // Ensure backup directory exists
    if (!fs.existsSync(cfg.backupDir)) {
      fs.mkdirSync(cfg.backupDir, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `localpay-backup-${timestamp}.db`;
    const backupPath = path.join(cfg.backupDir, filename);

    // Get database instance
    const db = getDb();

    // Use SQLite backup API
    await new Promise<void>((resolve, reject) => {
      try {
        // Use backup method if available, otherwise copy the file
        const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data/localpay.db');

        // Checkpoint WAL to ensure all data is written
        db.pragma('wal_checkpoint(TRUNCATE)');

        // Copy the database file
        fs.copyFileSync(dbPath, backupPath);

        resolve();
      } catch (err) {
        reject(err);
      }
    });

    // Get backup file stats
    const stats = fs.statSync(backupPath);
    const duration = Date.now() - startTime;

    // Verify the backup
    const verified = await verifyBackup(backupPath);

    if (!verified) {
      // Delete corrupted backup
      fs.unlinkSync(backupPath);
      throw new Error('Backup verification failed');
    }

    // Rotate old backups
    await rotateBackups(cfg.backupDir, cfg.maxBackups);

    logger.info('Database backup created successfully', {
      filename,
      size: stats.size,
      duration,
      verified,
    });

    return {
      success: true,
      filename,
      size: stats.size,
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database backup failed', { error: errorMessage });

    return {
      success: false,
      error: errorMessage,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Verify backup integrity
 */
export async function verifyBackup(backupPath: string): Promise<boolean> {
  try {
    // Import Database dynamically to avoid circular dependencies
    const Database = (await import('better-sqlite3')).default;

    // Open the backup database in read-only mode
    const backupDb = new Database(backupPath, { readonly: true });

    try {
      // Run integrity check
      const result = backupDb.pragma('integrity_check') as Array<{ integrity_check: string }>;
      const isValid = result.length === 1 && result[0].integrity_check === 'ok';

      // Verify essential tables exist
      const tables = backupDb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as Array<{ name: string }>;

      const requiredTables = ['users', 'wallets', 'transactions', 'merchants'];
      const existingTables = tables.map(t => t.name);
      const hasRequiredTables = requiredTables.every(t => existingTables.includes(t));

      backupDb.close();

      return isValid && hasRequiredTables;
    } catch {
      backupDb.close();
      return false;
    }
  } catch (error) {
    logger.error('Backup verification error', { error, backupPath });
    return false;
  }
}

/**
 * Rotate old backups, keeping only the most recent ones
 */
export async function rotateBackups(backupDir: string, maxBackups: number): Promise<void> {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('localpay-backup-') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        mtime: fs.statSync(path.join(backupDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Delete old backups beyond maxBackups
    if (files.length > maxBackups) {
      const toDelete = files.slice(maxBackups);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        logger.info('Deleted old backup', { filename: file.name });
      }
    }
  } catch (error) {
    logger.error('Backup rotation error', { error });
  }
}

/**
 * List all available backups
 */
export function listBackups(backupDir?: string): BackupInfo[] {
  const dir = backupDir || DEFAULT_CONFIG.backupDir;

  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir)
    .filter(f => f.startsWith('localpay-backup-') && f.endsWith('.db'))
    .map(f => {
      const filePath = path.join(dir, f);
      const stats = fs.statSync(filePath);
      return {
        filename: f,
        path: filePath,
        size: stats.size,
        createdAt: stats.mtime,
        verified: false, // Not verified on list
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Restore database from backup
 */
export async function restoreBackup(backupPath: string): Promise<BackupResult> {
  const startTime = Date.now();

  try {
    // Verify backup first
    const verified = await verifyBackup(backupPath);
    if (!verified) {
      throw new Error('Backup verification failed - cannot restore corrupted backup');
    }

    const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data/localpay.db');

    // Create a backup of current database before restoring
    const currentBackupPath = dbPath + '.pre-restore';
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, currentBackupPath);
    }

    // Close current database connection
    const db = getDb();
    db.close();

    // Copy backup to database location
    fs.copyFileSync(backupPath, dbPath);

    const duration = Date.now() - startTime;

    logger.info('Database restored from backup', {
      backupPath,
      duration,
    });

    return {
      success: true,
      filename: path.basename(backupPath),
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database restore failed', { error: errorMessage, backupPath });

    return {
      success: false,
      error: errorMessage,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Get backup statistics
 */
export function getBackupStats(backupDir?: string): {
  totalBackups: number;
  totalSize: number;
  oldestBackup?: Date;
  newestBackup?: Date;
} {
  const backups = listBackups(backupDir);

  if (backups.length === 0) {
    return { totalBackups: 0, totalSize: 0 };
  }

  return {
    totalBackups: backups.length,
    totalSize: backups.reduce((sum, b) => sum + b.size, 0),
    oldestBackup: backups[backups.length - 1].createdAt,
    newestBackup: backups[0].createdAt,
  };
}

export default {
  createBackup,
  verifyBackup,
  rotateBackups,
  listBackups,
  restoreBackup,
  getBackupStats,
};
