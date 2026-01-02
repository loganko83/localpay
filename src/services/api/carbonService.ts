/**
 * Carbon Points Service
 * Frontend integration for carbon points and environmental impact tracking
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface CarbonBalance {
  pointsBalance: number;
  lifetimePoints: number;
  co2SavedKg: number;
  treesEquivalent: number;
  updatedAt: string;
}

export interface CarbonTransaction {
  id: string;
  points: number;
  co2Kg: number | null;
  type: 'earn' | 'redeem' | 'expire';
  activityType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface CarbonHistoryResponse {
  transactions: CarbonTransaction[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CarbonImpact {
  summary: {
    lifetimePoints: number;
    currentBalance: number;
    co2SavedKg: number;
    treesEquivalent: number;
  };
  activityBreakdown: Array<{
    activityType: string;
    count: number;
    totalPoints: number;
    totalCo2Kg: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    earned: number;
    redeemed: number;
    co2SavedKg: number;
  }>;
  equivalents: {
    treesPlanted: number;
    carKmAvoided: number;
    electricityKwhSaved: number;
    plasticBottlesRecycled: number;
  };
}

export interface CarbonLeaderboard {
  period: string;
  leaderboard: Array<{
    rank: number;
    userId: string;
    userName: string;
    totalPoints: number;
    co2SavedKg: number;
    isCurrentUser: boolean;
  }>;
  currentUser: {
    rank: number | null;
    points: number;
    co2SavedKg: number;
  };
}

export type ActivityType = 'local_purchase' | 'public_transport' | 'eco_merchant' | 'bike_share' | 'recycling';

// ==================== Carbon Service ====================

class CarbonService {
  /**
   * Get carbon points balance
   */
  async getBalance(): Promise<CarbonBalance> {
    const response = await backendApiClient.get<{ success: boolean; data: CarbonBalance }>('/carbon/balance');
    return response.data;
  }

  /**
   * Get carbon transaction history
   */
  async getHistory(filters?: {
    page?: number;
    size?: number;
    type?: 'earn' | 'redeem' | 'expire';
    activityType?: ActivityType;
  }): Promise<CarbonHistoryResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.type) params.append('type', filters.type);
    if (filters?.activityType) params.append('activityType', filters.activityType);

    const queryString = params.toString();
    const endpoint = queryString ? `/carbon/history?${queryString}` : '/carbon/history';

    const response = await backendApiClient.get<{ success: boolean; data: CarbonHistoryResponse }>(endpoint);
    return response.data;
  }

  /**
   * Earn carbon points
   */
  async earn(data: {
    activityType: ActivityType;
    amount?: number;
    distance?: number;
    quantity?: number;
    referenceId?: string;
    description?: string;
    isEcoMerchant?: boolean;
  }): Promise<{
    transactionId: string;
    pointsEarned: number;
    co2SavedKg: number;
    newBalance: number;
    treesEquivalent: number;
  }> {
    const response = await backendApiClient.post<{ success: boolean; data: {
      transactionId: string;
      pointsEarned: number;
      co2SavedKg: number;
      newBalance: number;
      treesEquivalent: number;
    } }>('/carbon/earn', data);
    return response.data;
  }

  /**
   * Calculate carbon savings preview
   */
  async calculate(data: {
    activityType: ActivityType;
    amount?: number;
    distance?: number;
    quantity?: number;
    isEcoMerchant?: boolean;
  }): Promise<{
    activityType: string;
    points: number;
    co2Kg: number;
    treesEquivalent: number;
  }> {
    const response = await backendApiClient.post<{ success: boolean; data: {
      activityType: string;
      points: number;
      co2Kg: number;
      treesEquivalent: number;
    } }>('/carbon/calculate', data);
    return response.data;
  }

  /**
   * Redeem carbon points
   */
  async redeem(data: {
    points: number;
    rewardType?: string;
    description?: string;
  }): Promise<{
    transactionId: string;
    pointsRedeemed: number;
    newBalance: number;
  }> {
    const response = await backendApiClient.post<{ success: boolean; data: {
      transactionId: string;
      pointsRedeemed: number;
      newBalance: number;
    } }>('/carbon/redeem', data);
    return response.data;
  }

  /**
   * Get environmental impact summary
   */
  async getImpact(): Promise<CarbonImpact> {
    const response = await backendApiClient.get<{ success: boolean; data: CarbonImpact }>('/carbon/impact');
    return response.data;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(period: 'all' | 'month' | 'week' = 'all', limit: number = 10): Promise<CarbonLeaderboard> {
    const response = await backendApiClient.get<{ success: boolean; data: CarbonLeaderboard }>(
      `/carbon/leaderboard?period=${period}&limit=${limit}`
    );
    return response.data;
  }
}

// Export singleton instance
export const carbonService = new CarbonService();

export default carbonService;
