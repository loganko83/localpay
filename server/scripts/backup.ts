#!/usr/bin/env npx tsx
/**
 * Database Backup CLI Script
 * Usage: npx tsx scripts/backup.ts [command]
 *
 * Commands:
 *   create    Create a new backup
 *   list      List all backups
 *   verify    Verify all backups
 *   cleanup   Remove old backups beyond retention limit
 *   stats     Show backup statistics
 */

import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(path.join(__dirname, '..'));

// Load environment
import dotenv from 'dotenv';
dotenv.config();

import { initDatabase } from '../src/db/index.js';
import backupService from '../src/services/backup.js';

async function main() {
  const command = process.argv[2] || 'create';

  console.log('LocalPay Database Backup Tool');
  console.log('==============================\n');

  // Initialize database
  await initDatabase();

  switch (command) {
    case 'create':
      await createBackup();
      break;
    case 'list':
      listBackups();
      break;
    case 'verify':
      await verifyBackups();
      break;
    case 'cleanup':
      await cleanup();
      break;
    case 'stats':
      showStats();
      break;
    default:
      console.log('Unknown command:', command);
      console.log('\nUsage: npx tsx scripts/backup.ts [create|list|verify|cleanup|stats]');
      process.exit(1);
  }
}

async function createBackup() {
  console.log('Creating backup...\n');

  const result = await backupService.createBackup();

  if (result.success) {
    console.log('Backup created successfully!');
    console.log(`  Filename: ${result.filename}`);
    console.log(`  Size: ${formatBytes(result.size || 0)}`);
    console.log(`  Duration: ${result.duration}ms`);
  } else {
    console.error('Backup failed:', result.error);
    process.exit(1);
  }
}

function listBackups() {
  console.log('Available backups:\n');

  const backups = backupService.listBackups();

  if (backups.length === 0) {
    console.log('No backups found.');
    return;
  }

  console.log('  #  | Filename                              | Size      | Created');
  console.log('-----+---------------------------------------+-----------+------------------------');

  backups.forEach((backup, index) => {
    console.log(
      `  ${(index + 1).toString().padStart(2)} | ` +
      `${backup.filename.padEnd(37)} | ` +
      `${formatBytes(backup.size).padStart(9)} | ` +
      `${backup.createdAt.toISOString()}`
    );
  });

  console.log(`\nTotal: ${backups.length} backup(s)`);
}

async function verifyBackups() {
  console.log('Verifying backups...\n');

  const backups = backupService.listBackups();

  if (backups.length === 0) {
    console.log('No backups to verify.');
    return;
  }

  let validCount = 0;
  let invalidCount = 0;

  for (const backup of backups) {
    process.stdout.write(`  Verifying ${backup.filename}... `);
    const verified = await backupService.verifyBackup(backup.path);

    if (verified) {
      console.log('OK');
      validCount++;
    } else {
      console.log('FAILED');
      invalidCount++;
    }
  }

  console.log(`\nResults: ${validCount} valid, ${invalidCount} invalid`);

  if (invalidCount > 0) {
    process.exit(1);
  }
}

async function cleanup() {
  console.log('Cleaning up old backups...\n');

  const maxBackups = parseInt(process.env.MAX_BACKUPS || '10', 10);
  const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

  const beforeCount = backupService.listBackups().length;
  await backupService.rotateBackups(backupDir, maxBackups);
  const afterCount = backupService.listBackups().length;

  const deleted = beforeCount - afterCount;
  console.log(`Deleted ${deleted} old backup(s).`);
  console.log(`Keeping ${afterCount} backup(s) (max: ${maxBackups})`);
}

function showStats() {
  console.log('Backup Statistics:\n');

  const stats = backupService.getBackupStats();

  console.log(`  Total backups: ${stats.totalBackups}`);
  console.log(`  Total size: ${formatBytes(stats.totalSize)}`);

  if (stats.oldestBackup) {
    console.log(`  Oldest backup: ${stats.oldestBackup.toISOString()}`);
  }
  if (stats.newestBackup) {
    console.log(`  Newest backup: ${stats.newestBackup.toISOString()}`);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
