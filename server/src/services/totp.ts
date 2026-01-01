/**
 * TOTP (Time-based One-Time Password) Service
 * Two-Factor Authentication implementation
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { getDb } from '../db/index.js';
import logger from '../config/logger.js';

// Configure TOTP
authenticator.options = {
  digits: 6,
  step: 30,
  window: 1, // Allow 1 step before/after for clock skew
};

const APP_NAME = 'LocalPay';
const BACKUP_CODES_COUNT = 10;

export interface TOTPSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface TOTPVerifyResult {
  valid: boolean;
  usedBackupCode?: boolean;
}

/**
 * Generate a new TOTP secret for a user
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Create OTPAuth URL for authenticator apps
 */
export function createOTPAuthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, APP_NAME, secret);
}

/**
 * Generate QR code data URL
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * Verify TOTP token
 */
export function verifyToken(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    logger.error('TOTP verification error', { error });
    return false;
  }
}

/**
 * Setup 2FA for a user
 */
export async function setupTOTP(userId: string, email: string): Promise<TOTPSetupResult> {
  const db = getDb();

  // Check if user already has 2FA enabled
  const existing = db.prepare(`
    SELECT id FROM two_factor_auth WHERE user_id = ? AND enabled = 1
  `).get(userId);

  if (existing) {
    throw new Error('2FA is already enabled for this user');
  }

  // Generate new secret and backup codes
  const secret = generateSecret();
  const backupCodes = generateBackupCodes();
  const otpauthUrl = createOTPAuthUrl(email, secret);
  const qrCodeDataUrl = await generateQRCode(otpauthUrl);

  // Hash backup codes for storage
  const hashedBackupCodes = backupCodes.map((code) =>
    crypto.createHash('sha256').update(code).digest('hex')
  );

  // Store pending 2FA setup (not enabled yet until verified)
  const existingSetup = db.prepare('SELECT id FROM two_factor_auth WHERE user_id = ?').get(userId) as { id: string } | undefined;

  if (existingSetup) {
    db.prepare(`
      UPDATE two_factor_auth
      SET secret = ?, backup_codes = ?, enabled = 0, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(secret, JSON.stringify(hashedBackupCodes), userId);
  } else {
    db.prepare(`
      INSERT INTO two_factor_auth (id, user_id, secret, backup_codes, enabled, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now'))
    `).run(crypto.randomUUID(), userId, secret, JSON.stringify(hashedBackupCodes));
  }

  logger.info('2FA setup initiated', { userId });

  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
    backupCodes,
  };
}

/**
 * Verify and enable 2FA
 */
export function verifyAndEnableTOTP(userId: string, token: string): boolean {
  const db = getDb();

  // Get pending 2FA setup
  const setup = db.prepare(`
    SELECT secret FROM two_factor_auth
    WHERE user_id = ? AND enabled = 0
  `).get(userId) as { secret: string } | undefined;

  if (!setup) {
    throw new Error('No pending 2FA setup found');
  }

  // Verify token
  if (!verifyToken(setup.secret, token)) {
    return false;
  }

  // Enable 2FA
  db.prepare(`
    UPDATE two_factor_auth
    SET enabled = 1, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(userId);

  // Update user record
  db.prepare(`
    UPDATE users SET two_factor_enabled = 1 WHERE id = ?
  `).run(userId);

  logger.info('2FA enabled', { userId });
  return true;
}

/**
 * Verify 2FA token for login
 */
export function verifyTOTPForLogin(userId: string, token: string): TOTPVerifyResult {
  const db = getDb();

  // Get 2FA setup
  const setup = db.prepare(`
    SELECT secret, backup_codes FROM two_factor_auth
    WHERE user_id = ? AND enabled = 1
  `).get(userId) as { secret: string; backup_codes: string } | undefined;

  if (!setup) {
    throw new Error('2FA is not enabled for this user');
  }

  // Try TOTP token first
  if (verifyToken(setup.secret, token)) {
    return { valid: true, usedBackupCode: false };
  }

  // Try backup codes
  const hashedToken = crypto.createHash('sha256').update(token.toUpperCase()).digest('hex');
  const backupCodes: string[] = JSON.parse(setup.backup_codes);

  const codeIndex = backupCodes.indexOf(hashedToken);
  if (codeIndex !== -1) {
    // Remove used backup code
    backupCodes.splice(codeIndex, 1);
    db.prepare(`
      UPDATE two_factor_auth
      SET backup_codes = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(JSON.stringify(backupCodes), userId);

    logger.info('Backup code used for 2FA', { userId, remainingCodes: backupCodes.length });
    return { valid: true, usedBackupCode: true };
  }

  return { valid: false };
}

/**
 * Disable 2FA for a user
 */
export function disableTOTP(userId: string, password: string): void {
  const db = getDb();

  // Verify password first (caller should do this)
  // This function just handles the 2FA disable logic

  // Delete 2FA record
  db.prepare('DELETE FROM two_factor_auth WHERE user_id = ?').run(userId);

  // Update user record
  db.prepare('UPDATE users SET two_factor_enabled = 0 WHERE id = ?').run(userId);

  logger.info('2FA disabled', { userId });
}

/**
 * Regenerate backup codes
 */
export function regenerateBackupCodes(userId: string): string[] {
  const db = getDb();

  // Check if 2FA is enabled
  const setup = db.prepare(`
    SELECT id FROM two_factor_auth WHERE user_id = ? AND enabled = 1
  `).get(userId);

  if (!setup) {
    throw new Error('2FA is not enabled for this user');
  }

  // Generate new backup codes
  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = backupCodes.map((code) =>
    crypto.createHash('sha256').update(code).digest('hex')
  );

  // Update backup codes
  db.prepare(`
    UPDATE two_factor_auth
    SET backup_codes = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(JSON.stringify(hashedBackupCodes), userId);

  logger.info('Backup codes regenerated', { userId });
  return backupCodes;
}

/**
 * Check if user has 2FA enabled
 */
export function isTOTPEnabled(userId: string): boolean {
  const db = getDb();
  const result = db.prepare(`
    SELECT enabled FROM two_factor_auth WHERE user_id = ? AND enabled = 1
  `).get(userId);

  return !!result;
}

/**
 * Get remaining backup codes count
 */
export function getBackupCodesCount(userId: string): number {
  const db = getDb();
  const result = db.prepare(`
    SELECT backup_codes FROM two_factor_auth WHERE user_id = ? AND enabled = 1
  `).get(userId) as { backup_codes: string } | undefined;

  if (!result) {
    return 0;
  }

  const codes: string[] = JSON.parse(result.backup_codes);
  return codes.length;
}

export default {
  generateSecret,
  generateBackupCodes,
  createOTPAuthUrl,
  generateQRCode,
  verifyToken,
  setupTOTP,
  verifyAndEnableTOTP,
  verifyTOTPForLogin,
  disableTOTP,
  regenerateBackupCodes,
  isTOTPEnabled,
  getBackupCodesCount,
};
