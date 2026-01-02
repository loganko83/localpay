/**
 * Donation Service
 * Frontend integration for donation campaigns and contributions
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface DonationCampaign {
  id: string;
  title: string;
  description: string | null;
  organization: string;
  targetAmount: number;
  raisedAmount: number;
  donorCount: number;
  imageUrl: string | null;
  category: string | null;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  verified: boolean;
  blockchainAddress: string | null;
}

export interface DonationCampaignListResponse {
  campaigns: DonationCampaign[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface DonationCampaignDetail extends DonationCampaign {
  organizationId: string | null;
  status: string;
  createdAt: string;
}

export interface RecentDonor {
  id: string;
  amount: number;
  displayName: string;
  message: string | null;
  createdAt: string;
}

export interface CampaignDetailResponse {
  campaign: DonationCampaignDetail;
  recentDonors: RecentDonor[];
  userDonation: {
    hasContributed: boolean;
    totalAmount: number;
    donationCount: number;
  };
}

export interface Donation {
  id: string;
  campaignId: string;
  campaignTitle: string;
  organization: string;
  campaignImage: string | null;
  campaignCategory: string | null;
  amount: number;
  anonymous: boolean;
  displayName: string | null;
  message: string | null;
  receiptNumber: string | null;
  taxDeductible: boolean;
  createdAt: string;
}

export interface MyDonationsResponse {
  donations: Donation[];
  summary: {
    totalDonated: number;
    totalDonations: number;
    campaignsSupported: number;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface DonationReceipt {
  receiptNumber: string;
  donationId: string;
  amount: number;
  taxDeductible: boolean;
  donatedAt: string;
  campaign: {
    title: string;
    organization: string;
    organizationId: string | null;
    verified: boolean;
    blockchainAddress: string | null;
  };
  donor: {
    name: string;
    email: string | null;
  };
  transactionId: string | null;
  blockchainHash: string | null;
  message: string | null;
}

export type CampaignCategory = 'disaster' | 'education' | 'health' | 'environment' | 'poverty' | 'animal' | 'culture' | 'other';

// ==================== Donation Service ====================

class DonationService {
  /**
   * Get donation campaigns
   */
  async getCampaigns(filters?: {
    category?: CampaignCategory;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<DonationCampaignListResponse> {
    const params = new URLSearchParams();

    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/donations/campaigns?${queryString}` : '/donations/campaigns';

    const response = await backendApiClient.get<{ success: boolean; data: DonationCampaignListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Get campaign details
   */
  async getCampaign(campaignId: string): Promise<CampaignDetailResponse> {
    const response = await backendApiClient.get<{ success: boolean; data: CampaignDetailResponse }>(
      `/donations/campaigns/${campaignId}`
    );
    return response.data;
  }

  /**
   * Make a donation
   */
  async donate(data: {
    campaignId: string;
    amount: number;
    anonymous?: boolean;
    displayName?: string;
    message?: string;
    taxDeductible?: boolean;
  }): Promise<{
    donationId: string;
    receiptNumber: string;
    amount: number;
    campaignTitle: string;
    organization: string;
    taxDeductible: boolean;
    newBalance: number;
  }> {
    const response = await backendApiClient.post<{ success: boolean; data: {
      donationId: string;
      receiptNumber: string;
      amount: number;
      campaignTitle: string;
      organization: string;
      taxDeductible: boolean;
      newBalance: number;
    } }>('/donations/donate', data);
    return response.data;
  }

  /**
   * Get my donations
   */
  async getMyDonations(filters?: {
    limit?: number;
    offset?: number;
  }): Promise<MyDonationsResponse> {
    const params = new URLSearchParams();

    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
    if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/donations/my?${queryString}` : '/donations/my';

    const response = await backendApiClient.get<{ success: boolean; data: MyDonationsResponse }>(endpoint);
    return response.data;
  }

  /**
   * Get donation receipt
   */
  async getReceipt(donationId: string): Promise<{ receipt: DonationReceipt }> {
    const response = await backendApiClient.get<{ success: boolean; data: { receipt: DonationReceipt } }>(
      `/donations/receipts/${donationId}`
    );
    return response.data;
  }
}

// Export singleton instance
export const donationService = new DonationService();

export default donationService;
