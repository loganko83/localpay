/**
 * Credit Score Service
 * Frontend integration for merchant credit scoring and applications
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface CreditScore {
  id: string;
  merchantId: string;
  score: number;
  grade: string;
  paymentHistoryScore: number;
  volumeScore: number;
  tenureScore: number;
  complianceScore: number;
  growthScore: number;
  calculatedAt: string;
}

export interface CreditScoreDetail extends CreditScore {
  factors: {
    factor: string;
    score: number;
    maxScore: number;
    description: string;
  }[];
  history: {
    month: string;
    score: number;
    grade: string;
  }[];
  recommendations: string[];
}

export interface CreditApplication {
  id: string;
  merchantId: string;
  requestedAmount: number;
  purpose: string | null;
  termMonths: number | null;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'cancelled';
  approvedAmount: number | null;
  interestRate: number | null;
  reviewerId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreditApplicationListResponse {
  applications: CreditApplication[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ==================== Credit Service ====================

class CreditService {
  /**
   * Get merchant's credit score
   */
  async getScore(): Promise<CreditScore> {
    const response = await backendApiClient.get<{ success: boolean; data: { score: CreditScore } }>('/credit/score');
    return response.data.score;
  }

  /**
   * Get detailed credit score with factors
   */
  async getScoreDetail(): Promise<CreditScoreDetail> {
    const response = await backendApiClient.get<{ success: boolean; data: CreditScoreDetail }>('/credit/score/detail');
    return response.data;
  }

  /**
   * Get credit applications
   */
  async getApplications(filters?: {
    page?: number;
    size?: number;
    status?: string;
  }): Promise<CreditApplicationListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const endpoint = queryString ? `/credit/applications?${queryString}` : '/credit/applications';

    const response = await backendApiClient.get<{ success: boolean; data: CreditApplicationListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Apply for credit
   */
  async apply(data: {
    requestedAmount: number;
    purpose?: string;
    termMonths?: number;
    notes?: string;
  }): Promise<CreditApplication> {
    const response = await backendApiClient.post<{ success: boolean; data: { application: CreditApplication } }>(
      '/credit/apply',
      data
    );
    return response.data.application;
  }

  /**
   * Cancel application
   */
  async cancelApplication(applicationId: string): Promise<void> {
    await backendApiClient.post<{ success: boolean }>(`/credit/applications/${applicationId}/cancel`, {});
  }
}

// Export singleton instance
export const creditService = new CreditService();

export default creditService;
