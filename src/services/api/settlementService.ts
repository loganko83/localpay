/**
 * Settlement Service
 * Frontend integration for settlement management
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface Settlement {
  id: string;
  merchantId: string;
  merchantName?: string;
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  totalRefunds: number;
  feeRate: number;
  feeAmount: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledDate: string | null;
  completedDate: string | null;
  bankReference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SettlementListResponse {
  settlements: Settlement[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SettlementFilters {
  page?: number;
  size?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  merchantId?: string;
  startDate?: string;
  endDate?: string;
}

export interface SettlementStats {
  totalPending: number;
  totalPendingAmount: number;
  completedToday: number;
  completedTodayAmount: number;
  processingCount: number;
  failedCount: number;
}

export interface CalendarSettlement {
  date: string;
  count: number;
  amount: number;
  status: string;
}

// ==================== Settlement Service ====================

class SettlementService {
  /**
   * Get settlements list
   */
  async getSettlements(filters?: SettlementFilters): Promise<SettlementListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.merchantId) params.append('merchantId', filters.merchantId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const endpoint = queryString ? `/settlements?${queryString}` : '/settlements';

    const response = await backendApiClient.get<{ success: boolean; data: SettlementListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Get merchant's settlements
   */
  async getMerchantSettlements(filters?: SettlementFilters): Promise<SettlementListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const endpoint = queryString ? `/settlements/merchant?${queryString}` : '/settlements/merchant';

    const response = await backendApiClient.get<{ success: boolean; data: SettlementListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Get settlement details
   */
  async getSettlement(settlementId: string): Promise<Settlement> {
    const response = await backendApiClient.get<{ success: boolean; data: { settlement: Settlement } }>(`/settlements/${settlementId}`);
    return response.data.settlement;
  }

  /**
   * Approve settlement
   */
  async approveSettlement(settlementId: string, notes?: string): Promise<Settlement> {
    const response = await backendApiClient.post<{ success: boolean; data: { settlement: Settlement } }>(
      `/settlements/${settlementId}/approve`,
      { notes }
    );
    return response.data.settlement;
  }

  /**
   * Reject settlement
   */
  async rejectSettlement(settlementId: string, reason: string): Promise<Settlement> {
    const response = await backendApiClient.post<{ success: boolean; data: { settlement: Settlement } }>(
      `/settlements/${settlementId}/reject`,
      { reason }
    );
    return response.data.settlement;
  }

  /**
   * Get settlement statistics
   */
  async getStats(): Promise<SettlementStats> {
    const response = await backendApiClient.get<{ success: boolean; data: SettlementStats }>('/settlements/stats');
    return response.data;
  }

  /**
   * Get calendar data
   */
  async getCalendar(year: number, month: number): Promise<CalendarSettlement[]> {
    const response = await backendApiClient.get<{ success: boolean; data: { calendar: CalendarSettlement[] } }>(
      `/settlements/calendar?year=${year}&month=${month}`
    );
    return response.data.calendar;
  }

  /**
   * Get pending settlements
   */
  async getPending(): Promise<SettlementListResponse> {
    const response = await backendApiClient.get<{ success: boolean; data: SettlementListResponse }>('/settlements/pending');
    return response.data;
  }
}

// Export singleton instance
export const settlementService = new SettlementService();

export default settlementService;
