/**
 * Two-Factor Authentication Service
 * Frontend integration for 2FA operations
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
}

export interface TwoFactorSetupResponse {
  qrCodeDataUrl: string;
  secret: string;
  backupCodes: string[];
  message: string;
}

export interface TwoFactorVerifyRequest {
  token: string;
}

export interface TwoFactorDisableRequest {
  password: string;
  token?: string;
}

export interface BackupCodesRequest {
  password: string;
}

export interface BackupCodesResponse {
  backupCodes: string[];
  message: string;
}

// ==================== Two-Factor Service ====================

class TwoFactorService {
  /**
   * Get 2FA status for current user
   */
  async getStatus(): Promise<TwoFactorStatus> {
    return backendApiClient.get<TwoFactorStatus>('/auth/2fa/status');
  }

  /**
   * Initiate 2FA setup
   */
  async setup(): Promise<TwoFactorSetupResponse> {
    return backendApiClient.post<TwoFactorSetupResponse>('/auth/2fa/setup');
  }

  /**
   * Verify TOTP and enable 2FA
   */
  async verify(request: TwoFactorVerifyRequest): Promise<{ message: string }> {
    return backendApiClient.post<{ message: string }>('/auth/2fa/verify', request);
  }

  /**
   * Disable 2FA
   */
  async disable(request: TwoFactorDisableRequest): Promise<{ message: string }> {
    return backendApiClient.post<{ message: string }>('/auth/2fa/disable', request);
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(request: BackupCodesRequest): Promise<BackupCodesResponse> {
    return backendApiClient.post<BackupCodesResponse>('/auth/2fa/backup-codes', request);
  }
}

// Export singleton instance
export const twoFactorService = new TwoFactorService();

export default twoFactorService;
