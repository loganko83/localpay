/**
 * Database Migration Service
 * Handles schema versioning and migrations
 */

import fs from 'fs';
import path from 'path';
import { getDb } from '../db/index.js';
import logger from '../config/logger.js';

export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}

export interface MigrationResult {
  success: boolean;
  appliedMigrations: number[];
  error?: string;
}

/**
 * Initialize migrations table
 */
export function initMigrationsTable(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get current schema version
 */
export function getCurrentVersion(): number {
  const db = getDb();

  try {
    const result = db.prepare(`
      SELECT MAX(version) as version FROM schema_migrations
    `).get() as { version: number | null };

    return result?.version || 0;
  } catch {
    // Table might not exist yet
    return 0;
  }
}

/**
 * Get all applied migrations
 */
export function getAppliedMigrations(): MigrationRecord[] {
  const db = getDb();

  try {
    return db.prepare(`
      SELECT version, name, applied_at
      FROM schema_migrations
      ORDER BY version ASC
    `).all() as MigrationRecord[];
  } catch {
    return [];
  }
}

/**
 * Load migrations from directory
 */
export function loadMigrations(migrationsDir?: string): Migration[] {
  const dir = migrationsDir || path.join(process.cwd(), 'migrations');

  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const migrations: Migration[] = [];

  for (const file of files) {
    const match = file.match(/^(\d+)[-_](.+)\.sql$/);
    if (!match) continue;

    const version = parseInt(match[1], 10);
    const name = match[2].replace(/[-_]/g, ' ');
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');

    // Parse UP and DOWN sections
    const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?:--\s*DOWN|$)/i);
    const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);

    migrations.push({
      version,
      name,
      up: upMatch ? upMatch[1].trim() : content.trim(),
      down: downMatch ? downMatch[1].trim() : '',
    });
  }

  return migrations.sort((a, b) => a.version - b.version);
}

/**
 * Run pending migrations
 */
export async function runMigrations(migrationsDir?: string): Promise<MigrationResult> {
  const db = getDb();

  try {
    // Initialize migrations table
    initMigrationsTable();

    const currentVersion = getCurrentVersion();
    const migrations = loadMigrations(migrationsDir);
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return { success: true, appliedMigrations: [] };
    }

    const appliedVersions: number[] = [];

    for (const migration of pendingMigrations) {
      logger.info(`Running migration ${migration.version}: ${migration.name}`);

      try {
        // Run migration in transaction
        db.transaction(() => {
          // Execute UP migration
          db.exec(migration.up);

          // Record migration
          db.prepare(`
            INSERT INTO schema_migrations (version, name)
            VALUES (?, ?)
          `).run(migration.version, migration.name);
        })();

        appliedVersions.push(migration.version);
        logger.info(`Migration ${migration.version} applied successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Migration ${migration.version} failed`, { error: errorMessage });
        throw error;
      }
    }

    logger.info(`Applied ${appliedVersions.length} migrations`);
    return { success: true, appliedMigrations: appliedVersions };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, appliedMigrations: [], error: errorMessage };
  }
}

/**
 * Rollback last migration
 */
export async function rollbackMigration(migrationsDir?: string): Promise<MigrationResult> {
  const db = getDb();

  try {
    const currentVersion = getCurrentVersion();
    if (currentVersion === 0) {
      logger.info('No migrations to rollback');
      return { success: true, appliedMigrations: [] };
    }

    const migrations = loadMigrations(migrationsDir);
    const currentMigration = migrations.find(m => m.version === currentVersion);

    if (!currentMigration) {
      throw new Error(`Migration ${currentVersion} not found`);
    }

    if (!currentMigration.down) {
      throw new Error(`Migration ${currentVersion} has no rollback defined`);
    }

    logger.info(`Rolling back migration ${currentVersion}: ${currentMigration.name}`);

    db.transaction(() => {
      // Execute DOWN migration
      db.exec(currentMigration.down);

      // Remove migration record
      db.prepare(`
        DELETE FROM schema_migrations WHERE version = ?
      `).run(currentVersion);
    })();

    logger.info(`Rolled back migration ${currentVersion}`);
    return { success: true, appliedMigrations: [currentVersion] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Rollback failed', { error: errorMessage });
    return { success: false, appliedMigrations: [], error: errorMessage };
  }
}

/**
 * Get migration status
 */
export function getMigrationStatus(migrationsDir?: string): {
  currentVersion: number;
  pendingCount: number;
  applied: MigrationRecord[];
  pending: Migration[];
} {
  const currentVersion = getCurrentVersion();
  const migrations = loadMigrations(migrationsDir);
  const applied = getAppliedMigrations();
  const pending = migrations.filter(m => m.version > currentVersion);

  return {
    currentVersion,
    pendingCount: pending.length,
    applied,
    pending,
  };
}

/**
 * Create a new migration file
 */
export function createMigration(name: string, migrationsDir?: string): string {
  const dir = migrationsDir || path.join(process.cwd(), 'migrations');

  // Ensure migrations directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Get next version number
  const existingMigrations = loadMigrations(dir);
  const nextVersion = existingMigrations.length > 0
    ? Math.max(...existingMigrations.map(m => m.version)) + 1
    : 1;

  // Create filename
  const timestamp = nextVersion.toString().padStart(4, '0');
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `${timestamp}-${safeName}.sql`;
  const filepath = path.join(dir, filename);

  // Create migration file template
  const template = `-- Migration: ${name}
-- Version: ${nextVersion}
-- Created: ${new Date().toISOString()}

-- UP
-- Add your migration SQL here


-- DOWN
-- Add rollback SQL here (optional but recommended)

`;

  fs.writeFileSync(filepath, template);
  logger.info(`Created migration file: ${filename}`);

  return filepath;
}

export default {
  initMigrationsTable,
  getCurrentVersion,
  getAppliedMigrations,
  loadMigrations,
  runMigrations,
  rollbackMigration,
  getMigrationStatus,
  createMigration,
};
