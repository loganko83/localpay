/**
 * Loyalty Points Service
 * Frontend integration for loyalty program management
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface LoyaltyBalance {
  pointsBalance: number;
  lifetimePoints: number;
  tier: {
    current: string;
    name: string;
    points: number;
    earnMultiplier: number;
    expiresAt: string | null;
  };
  nextTier: {
    tier: string;
    name: string;
    pointsRequired: number;
    pointsNeeded: number;
  } | null;
  benefits: string[];
}

export interface LoyaltyTransaction {
  id: string;
  points: number;
  type: 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus';
  source: string | null;
  referenceId: string | null;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface LoyaltyHistoryResponse {
  transactions: LoyaltyTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  pointsRequired: number;
  rewardType: 'voucher' | 'product' | 'experience' | 'cashback';
  value: number | null;
  imageUrl: string | null;
  merchantId: string | null;
  merchantName: string | null;
  availableQuantity: number | null;
  validUntil: string | null;
  canRedeem: boolean;
}

export interface LoyaltyRewardsResponse {
  rewards: LoyaltyReward[];
  userPointsBalance: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  earnMultiplier: number;
  benefits: string[];
}

export interface LoyaltyTiersResponse {
  tiers: LoyaltyTier[];
  earningRate: {
    base: number;
    description: string;
  };
  redemptionRate: {
    rate: number;
    description: string;
  };
}

// ==================== Loyalty Service ====================

class LoyaltyService {
  /**
   * Get loyalty balance and tier info
   */
  async getBalance(): Promise<LoyaltyBalance> {
    const response = await backendApiClient.get<{ success: boolean; data: LoyaltyBalance }>('/loyalty/balance');
    return response.data;
  }

  /**
   * Get loyalty transaction history
   */
  async getHistory(filters?: {
    page?: number;
    limit?: number;
    type?: 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus';
  }): Promise<LoyaltyHistoryResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.type) params.append('type', filters.type);

    const queryString = params.toString();
    const endpoint = queryString ? `/loyalty/history?${queryString}` : '/loyalty/history';

    const response = await backendApiClient.get<{ success: boolean; data: LoyaltyHistoryResponse }>(endpoint);
    return response.data;
  }

  /**
   * Earn loyalty points (after payment)
   */
  async earn(data: {
    amount: number;
    transactionId: string;
    source?: string;
    description?: string;
  }): Promise<{
    pointsEarned: number;
    basePoints: number;
    bonusMultiplier: number;
    newBalance: number;
    newTierPoints: number;
    tier: string;
    expiresAt: string;
  }> {
    const response = await backendApiClient.post<{ success: boolean; data: {
      pointsEarned: number;
      basePoints: number;
      bonusMultiplier: number;
      newBalance: number;
      newTierPoints: number;
      tier: string;
      expiresAt: string;
    } }>('/loyalty/earn', data);
    return response.data;
  }

  /**
   * Redeem points for wallet value
   */
  async redeem(points: number): Promise<{
    pointsRedeemed: number;
    valueReceived: number;
    newPointsBalance: number;
    newWalletBalance: number | null;
  }> {
    const response = await backendApiClient.post<{ success: boolean; data: {
      pointsRedeemed: number;
      valueReceived: number;
      newPointsBalance: number;
      newWalletBalance: number | null;
    } }>('/loyalty/redeem', { points });
    return response.data;
  }

  /**
   * Get tier information
   */
  async getTiers(): Promise<LoyaltyTiersResponse> {
    const response = await backendApiClient.get<{ success: boolean; data: LoyaltyTiersResponse }>('/loyalty/tiers');
    return response.data;
  }

  /**
   * Get available rewards
   */
  async getRewards(filters?: {
    page?: number;
    limit?: number;
    type?: 'voucher' | 'product' | 'experience' | 'cashback';
    merchantId?: string;
  }): Promise<LoyaltyRewardsResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.type) params.append('type', filters.type);
    if (filters?.merchantId) params.append('merchantId', filters.merchantId);

    const queryString = params.toString();
    const endpoint = queryString ? `/loyalty/rewards?${queryString}` : '/loyalty/rewards';

    const response = await backendApiClient.get<{ success: boolean; data: LoyaltyRewardsResponse }>(endpoint);
    return response.data;
  }

  /**
   * Get reward details
   */
  async getReward(rewardId: string): Promise<LoyaltyReward & {
    merchant: { id: string; name: string; address: string } | null;
    quantity: number | null;
    redeemedCount: number;
    status: string;
    isExpired: boolean;
    isExhausted: boolean;
    pointsNeeded: number;
  }> {
    const response = await backendApiClient.get<{ success: boolean; data: LoyaltyReward & {
      merchant: { id: string; name: string; address: string } | null;
      quantity: number | null;
      redeemedCount: number;
      status: string;
      isExpired: boolean;
      isExhausted: boolean;
      pointsNeeded: number;
    } }>(`/loyalty/rewards/${rewardId}`);
    return response.data;
  }

  /**
   * Redeem a specific reward
   */
  async redeemReward(rewardId: string): Promise<{
    redemptionCode: string;
    reward: {
      id: string;
      name: string;
      rewardType: string;
      value: number | null;
    };
    pointsSpent: number;
    newPointsBalance: number;
    instructions: string;
  }> {
    const response = await backendApiClient.post<{ success: boolean; data: {
      redemptionCode: string;
      reward: {
        id: string;
        name: string;
        rewardType: string;
        value: number | null;
      };
      pointsSpent: number;
      newPointsBalance: number;
      instructions: string;
    } }>(`/loyalty/rewards/${rewardId}/redeem`, {});
    return response.data;
  }
}

// Export singleton instance
export const loyaltyService = new LoyaltyService();

export default loyaltyService;
