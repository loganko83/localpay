/**
 * Welfare Service
 * Frontend integration for welfare program management
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface WelfareProgram {
  id: string;
  name: string;
  description: string | null;
  type: 'youth' | 'senior' | 'disability' | 'culture' | 'education' | 'housing' | 'medical';
  budget: number;
  spent: number;
  beneficiaryCount: number;
  eligibilityCriteria: string | null;
  amountPerPerson: number | null;
  startDate: string | null;
  endDate: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface WelfareBeneficiary {
  id: string;
  programId: string;
  programName?: string;
  userId: string;
  userName?: string;
  did: string | null;
  verificationType: string | null;
  verifiedAt: string | null;
  status: 'pending' | 'verified' | 'rejected' | 'suspended';
  notes: string | null;
  createdAt: string;
}

export interface WelfareDistribution {
  id: string;
  programId: string;
  programName?: string;
  beneficiaryId: string;
  beneficiaryName?: string;
  amount: number;
  transactionId: string | null;
  blockchainHash: string | null;
  status: 'pending' | 'completed' | 'failed';
  distributedAt: string | null;
  createdAt: string;
}

export interface WelfareStats {
  totalPrograms: number;
  activePrograms: number;
  totalBudget: number;
  totalSpent: number;
  totalBeneficiaries: number;
  distributionsToday: number;
  utilizationRate: number;
}

export interface WelfareProgramListResponse {
  programs: WelfareProgram[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface WelfareDistributionListResponse {
  distributions: WelfareDistribution[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ==================== Welfare Service ====================

class WelfareService {
  /**
   * Get welfare programs
   */
  async getPrograms(filters?: { page?: number; size?: number; type?: string; status?: string }): Promise<WelfareProgramListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const endpoint = queryString ? `/welfare/programs?${queryString}` : '/welfare/programs';

    const response = await backendApiClient.get<{ success: boolean; data: WelfareProgramListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Get program details
   */
  async getProgram(programId: string): Promise<WelfareProgram> {
    const response = await backendApiClient.get<{ success: boolean; data: { program: WelfareProgram } }>(`/welfare/programs/${programId}`);
    return response.data.program;
  }

  /**
   * Create welfare program
   */
  async createProgram(data: Partial<WelfareProgram>): Promise<WelfareProgram> {
    const response = await backendApiClient.post<{ success: boolean; data: { program: WelfareProgram } }>('/welfare/programs', data);
    return response.data.program;
  }

  /**
   * Update welfare program
   */
  async updateProgram(programId: string, data: Partial<WelfareProgram>): Promise<WelfareProgram> {
    const response = await backendApiClient.put<{ success: boolean; data: { program: WelfareProgram } }>(`/welfare/programs/${programId}`, data);
    return response.data.program;
  }

  /**
   * Get distributions
   */
  async getDistributions(filters?: { page?: number; size?: number; programId?: string; status?: string }): Promise<WelfareDistributionListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.programId) params.append('programId', filters.programId);
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const endpoint = queryString ? `/welfare/distributions?${queryString}` : '/welfare/distributions';

    const response = await backendApiClient.get<{ success: boolean; data: WelfareDistributionListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Get welfare statistics
   */
  async getStats(): Promise<WelfareStats> {
    const response = await backendApiClient.get<{ success: boolean; data: WelfareStats }>('/welfare/stats');
    return response.data;
  }

  /**
   * Verify eligibility
   */
  async verifyEligibility(userId: string, programId: string): Promise<{ eligible: boolean; reason?: string }> {
    const response = await backendApiClient.post<{ success: boolean; data: { eligible: boolean; reason?: string } }>(
      '/welfare/verify-eligibility',
      { userId, programId }
    );
    return response.data;
  }

  /**
   * Get impact analysis
   */
  async getImpact(): Promise<{ economicMultiplier: number; capitalRetention: number; jobsCreated: number }> {
    const response = await backendApiClient.get<{ success: boolean; data: { economicMultiplier: number; capitalRetention: number; jobsCreated: number } }>('/welfare/impact');
    return response.data;
  }
}

// Export singleton instance
export const welfareService = new WelfareService();

export default welfareService;
