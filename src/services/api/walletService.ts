/**
 * Wallet API Service
 * Backend integration for wallet operations
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface WalletBalance {
  balance: number;
  pendingBalance: number;
  chargeLimit: {
    daily: number;
    monthly: number;
    total: number;
    usedToday: number;
    usedThisMonth: number;
  };
  lastSyncedAt: string | null;
}

export interface ChargeLimits {
  daily: {
    limit: number;
    used: number;
    remaining: number;
  };
  monthly: {
    limit: number;
    used: number;
    remaining: number;
  };
  total: {
    limit: number;
    current: number;
    remaining: number;
  };
}

export interface ChargeRequest {
  amount: number;
  bankAccountId?: string;
}

export interface ChargeResponse {
  transactionId: string;
  amount: number;
  newBalance: number;
  status: string;
}

export interface SyncResponse {
  balance: number;
  lastSyncedAt: string;
  message: string;
}

// ==================== Wallet Service ====================

class WalletService {
  /**
   * Get wallet balance
   */
  async getBalance(): Promise<WalletBalance> {
    return backendApiClient.get<WalletBalance>('/wallet/balance');
  }

  /**
   * Sync balance with bank
   */
  async syncBalance(): Promise<SyncResponse> {
    return backendApiClient.post<SyncResponse>('/wallet/sync');
  }

  /**
   * Request balance charge (top-up)
   */
  async charge(request: ChargeRequest): Promise<ChargeResponse> {
    return backendApiClient.post<ChargeResponse>('/wallet/charge', request);
  }

  /**
   * Get charge limits and usage
   */
  async getLimits(): Promise<ChargeLimits> {
    return backendApiClient.get<ChargeLimits>('/wallet/limits');
  }
}

// Export singleton instance
export const walletService = new WalletService();

export default walletService;
