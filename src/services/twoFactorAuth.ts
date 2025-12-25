/**
 * Two-Factor Authentication Service
 *
 * Provides additional security layer for sensitive operations:
 * - OTP generation and verification
 * - SMS/Push notification integration hooks
 * - Recovery code management
 * - Session security with 2FA status
 *
 * Architecture Note:
 * OTP uses TOTP (Time-based One-Time Password) algorithm.
 * In production, integrate with actual SMS gateway (e.g., Twilio, NHN Cloud).
 */

import { auditLogService } from './auditLog';

// OTP configuration
const OTP_CONFIG = {
  digits: 6,
  validityMs: 180000, // 3 minutes
  resendCooldownMs: 60000, // 1 minute cooldown
  maxAttempts: 3,
  lockoutDurationMs: 900000, // 15 minutes after max attempts
};

// Recovery code configuration
const RECOVERY_CONFIG = {
  codeCount: 8,
  codeLength: 8,
};

// 2FA methods
type TwoFactorMethod = 'sms' | 'push' | 'email' | 'authenticator';

// OTP storage entry
interface OTPEntry {
  code: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
  method: TwoFactorMethod;
}

// User 2FA settings
interface UserTwoFactorSettings {
  enabled: boolean;
  preferredMethod: TwoFactorMethod;
  phone?: string;
  email?: string;
  recoveryCodes: string[];
  usedRecoveryCodes: string[];
  lastVerifiedAt?: number;
}

// 2FA verification result
interface TwoFactorResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  lockedUntil?: number;
}

// In-memory stores (use Redis in production)
const otpStore = new Map<string, OTPEntry>();
const userSettingsStore = new Map<string, UserTwoFactorSettings>();
const lockoutStore = new Map<string, number>(); // userId -> lockout until timestamp

// Generate random numeric OTP
const generateOTP = (digits: number): string => {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

// Generate random alphanumeric recovery code
const generateRecoveryCode = (length: number): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars (O, 0, I, 1)
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Format as XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4)}`;
};

// Get OTP key
const getOTPKey = (userId: string, purpose: string): string => {
  return `${userId}:${purpose}`;
};

// Mask phone number for display
const maskPhone = (phone: string): string => {
  if (phone.length < 8) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
};

// Mask email for display
const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.slice(0, 2) + '***';
  return `${maskedLocal}@${domain}`;
};

class TwoFactorAuthService {
  /**
   * Check if user has 2FA enabled
   */
  isEnabled(userId: string): boolean {
    const settings = userSettingsStore.get(userId);
    return settings?.enabled ?? false;
  }

  /**
   * Enable 2FA for user
   */
  async enable(
    userId: string,
    method: TwoFactorMethod,
    contact: string
  ): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
    // Generate recovery codes
    const recoveryCodes: string[] = [];
    for (let i = 0; i < RECOVERY_CONFIG.codeCount; i++) {
      recoveryCodes.push(generateRecoveryCode(RECOVERY_CONFIG.codeLength));
    }

    const settings: UserTwoFactorSettings = {
      enabled: true,
      preferredMethod: method,
      recoveryCodes,
      usedRecoveryCodes: [],
    };

    if (method === 'sms') {
      settings.phone = contact;
    } else if (method === 'email') {
      settings.email = contact;
    }

    userSettingsStore.set(userId, settings);

    // Log 2FA enablement
    await auditLogService.log({
      action: 'TWO_FACTOR_ENABLED',
      actorId: userId,
      actorType: 'consumer',
      targetType: 'user',
      targetId: userId,
      metadata: {
        method,
        contact: method === 'sms' ? maskPhone(contact) : maskEmail(contact),
      },
    });

    return { success: true, recoveryCodes };
  }

  /**
   * Disable 2FA for user
   */
  async disable(userId: string): Promise<{ success: boolean }> {
    const settings = userSettingsStore.get(userId);
    if (settings) {
      settings.enabled = false;
      userSettingsStore.set(userId, settings);
    }

    // Log 2FA disablement
    await auditLogService.log({
      action: 'TWO_FACTOR_DISABLED',
      actorId: userId,
      actorType: 'consumer',
      targetType: 'user',
      targetId: userId,
    });

    return { success: true };
  }

  /**
   * Request OTP for verification
   */
  async requestOTP(
    userId: string,
    purpose: string
  ): Promise<{
    success: boolean;
    maskedContact?: string;
    expiresIn?: number;
    error?: string;
  }> {
    const settings = userSettingsStore.get(userId);
    if (!settings?.enabled) {
      return { success: false, error: '2FA is not enabled for this user' };
    }

    // Check lockout
    const lockoutUntil = lockoutStore.get(userId);
    if (lockoutUntil && lockoutUntil > Date.now()) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      return {
        success: false,
        error: `Account temporarily locked. Try again in ${remainingSeconds} seconds`,
      };
    }

    // Check resend cooldown
    const key = getOTPKey(userId, purpose);
    const existingOTP = otpStore.get(key);
    if (existingOTP) {
      const timeSinceCreated = Date.now() - existingOTP.createdAt;
      if (timeSinceCreated < OTP_CONFIG.resendCooldownMs) {
        const remainingCooldown = Math.ceil(
          (OTP_CONFIG.resendCooldownMs - timeSinceCreated) / 1000
        );
        return {
          success: false,
          error: `Please wait ${remainingCooldown} seconds before requesting a new code`,
        };
      }
    }

    // Generate new OTP
    const code = generateOTP(OTP_CONFIG.digits);
    const now = Date.now();
    const entry: OTPEntry = {
      code,
      createdAt: now,
      expiresAt: now + OTP_CONFIG.validityMs,
      attempts: 0,
      verified: false,
      method: settings.preferredMethod,
    };

    otpStore.set(key, entry);

    // In production: Send OTP via SMS/Email/Push
    // For PoC: Log the OTP (would be sent via actual channel)
    console.log(`[2FA] OTP for ${userId}/${purpose}: ${code}`);

    // Log OTP request
    await auditLogService.log({
      action: 'OTP_REQUESTED',
      actorId: userId,
      actorType: 'consumer',
      targetType: 'otp',
      targetId: purpose,
      metadata: {
        method: settings.preferredMethod,
        expiresAt: new Date(entry.expiresAt).toISOString(),
      },
    });

    let maskedContact = '';
    if (settings.preferredMethod === 'sms' && settings.phone) {
      maskedContact = maskPhone(settings.phone);
    } else if (settings.preferredMethod === 'email' && settings.email) {
      maskedContact = maskEmail(settings.email);
    }

    return {
      success: true,
      maskedContact,
      expiresIn: OTP_CONFIG.validityMs / 1000,
    };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(
    userId: string,
    purpose: string,
    code: string
  ): Promise<TwoFactorResult> {
    // Check lockout
    const lockoutUntil = lockoutStore.get(userId);
    if (lockoutUntil && lockoutUntil > Date.now()) {
      return {
        success: false,
        error: 'Account temporarily locked due to too many failed attempts',
        lockedUntil: lockoutUntil,
      };
    }

    const key = getOTPKey(userId, purpose);
    const entry = otpStore.get(key);

    if (!entry) {
      return { success: false, error: 'No OTP requested. Please request a new code.' };
    }

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(key);
      return { success: false, error: 'OTP has expired. Please request a new code.' };
    }

    // Check if already verified
    if (entry.verified) {
      return { success: false, error: 'OTP already used. Please request a new code.' };
    }

    // Increment attempts
    entry.attempts++;

    // Verify code
    if (entry.code !== code) {
      const remainingAttempts = OTP_CONFIG.maxAttempts - entry.attempts;

      // Log failed attempt
      await auditLogService.log({
        action: 'OTP_VERIFY_FAILED',
        actorId: userId,
        actorType: 'consumer',
        targetType: 'otp',
        targetId: purpose,
        metadata: {
          attempts: entry.attempts,
          maxAttempts: OTP_CONFIG.maxAttempts,
        },
      });

      if (remainingAttempts <= 0) {
        // Lock account
        const lockUntil = Date.now() + OTP_CONFIG.lockoutDurationMs;
        lockoutStore.set(userId, lockUntil);
        otpStore.delete(key);

        await auditLogService.log({
          action: 'ACCOUNT_LOCKED',
          actorId: userId,
          actorType: 'consumer',
          targetType: 'user',
          targetId: userId,
          metadata: {
            reason: 'Too many failed OTP attempts',
            lockDuration: OTP_CONFIG.lockoutDurationMs,
            lockedUntil: new Date(lockUntil).toISOString(),
          },
        });

        return {
          success: false,
          error: 'Too many failed attempts. Account temporarily locked.',
          lockedUntil: lockUntil,
        };
      }

      return {
        success: false,
        error: 'Invalid code',
        remainingAttempts,
      };
    }

    // Mark as verified
    entry.verified = true;
    otpStore.set(key, entry);

    // Update last verified time
    const settings = userSettingsStore.get(userId);
    if (settings) {
      settings.lastVerifiedAt = Date.now();
      userSettingsStore.set(userId, settings);
    }

    // Log successful verification
    await auditLogService.log({
      action: 'OTP_VERIFIED',
      actorId: userId,
      actorType: 'consumer',
      targetType: 'otp',
      targetId: purpose,
    });

    return { success: true };
  }

  /**
   * Verify using recovery code
   */
  async verifyRecoveryCode(
    userId: string,
    code: string
  ): Promise<TwoFactorResult> {
    const settings = userSettingsStore.get(userId);
    if (!settings) {
      return { success: false, error: '2FA is not set up for this user' };
    }

    // Normalize code format
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const formattedCode = `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`;

    // Check if code is valid and unused
    const codeIndex = settings.recoveryCodes.indexOf(formattedCode);
    if (codeIndex === -1) {
      // Check if already used
      if (settings.usedRecoveryCodes.includes(formattedCode)) {
        return { success: false, error: 'Recovery code already used' };
      }
      return { success: false, error: 'Invalid recovery code' };
    }

    // Mark code as used
    settings.recoveryCodes.splice(codeIndex, 1);
    settings.usedRecoveryCodes.push(formattedCode);
    settings.lastVerifiedAt = Date.now();
    userSettingsStore.set(userId, settings);

    // Clear any lockout
    lockoutStore.delete(userId);

    // Log recovery code usage
    await auditLogService.log({
      action: 'RECOVERY_CODE_USED',
      actorId: userId,
      actorType: 'consumer',
      targetType: 'user',
      targetId: userId,
      metadata: {
        remainingCodes: settings.recoveryCodes.length,
      },
    });

    return { success: true };
  }

  /**
   * Generate new recovery codes
   */
  async regenerateRecoveryCodes(userId: string): Promise<{
    success: boolean;
    recoveryCodes?: string[];
    error?: string;
  }> {
    const settings = userSettingsStore.get(userId);
    if (!settings?.enabled) {
      return { success: false, error: '2FA is not enabled' };
    }

    const recoveryCodes: string[] = [];
    for (let i = 0; i < RECOVERY_CONFIG.codeCount; i++) {
      recoveryCodes.push(generateRecoveryCode(RECOVERY_CONFIG.codeLength));
    }

    settings.recoveryCodes = recoveryCodes;
    settings.usedRecoveryCodes = [];
    userSettingsStore.set(userId, settings);

    await auditLogService.log({
      action: 'RECOVERY_CODES_REGENERATED',
      actorId: userId,
      actorType: 'consumer',
      targetType: 'user',
      targetId: userId,
    });

    return { success: true, recoveryCodes };
  }

  /**
   * Get user 2FA status
   */
  getStatus(userId: string): {
    enabled: boolean;
    method?: TwoFactorMethod;
    contact?: string;
    remainingRecoveryCodes?: number;
    lastVerifiedAt?: string;
  } {
    const settings = userSettingsStore.get(userId);
    if (!settings) {
      return { enabled: false };
    }

    let contact = '';
    if (settings.preferredMethod === 'sms' && settings.phone) {
      contact = maskPhone(settings.phone);
    } else if (settings.preferredMethod === 'email' && settings.email) {
      contact = maskEmail(settings.email);
    }

    return {
      enabled: settings.enabled,
      method: settings.preferredMethod,
      contact,
      remainingRecoveryCodes: settings.recoveryCodes.length,
      lastVerifiedAt: settings.lastVerifiedAt
        ? new Date(settings.lastVerifiedAt).toISOString()
        : undefined,
    };
  }

  /**
   * Check if 2FA verification is required for operation
   */
  isVerificationRequired(
    userId: string,
    operation: 'payment' | 'withdrawal' | 'settings' | 'login'
  ): boolean {
    const settings = userSettingsStore.get(userId);
    if (!settings?.enabled) return false;

    // Always require for sensitive operations
    if (operation === 'withdrawal' || operation === 'settings') {
      return true;
    }

    // Require for payments above threshold
    if (operation === 'payment') {
      return true; // Could add amount threshold check
    }

    // For login, check if recently verified
    if (operation === 'login' && settings.lastVerifiedAt) {
      const hoursSinceVerified = (Date.now() - settings.lastVerifiedAt) / 3600000;
      return hoursSinceVerified > 24; // Require re-verification after 24 hours
    }

    return true;
  }

  /**
   * Clear OTP for testing
   */
  clearOTP(userId: string, purpose: string): void {
    otpStore.delete(getOTPKey(userId, purpose));
  }

  /**
   * Clear lockout for testing/admin
   */
  clearLockout(userId: string): void {
    lockoutStore.delete(userId);
  }
}

// Export singleton instance
export const twoFactorAuthService = new TwoFactorAuthService();

// Export types
export type { TwoFactorMethod, TwoFactorResult, UserTwoFactorSettings };
