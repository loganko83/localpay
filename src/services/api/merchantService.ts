/**
 * Merchant Service
 * Frontend integration for merchant operations
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface Merchant {
  id: string;
  storeName: string;
  businessNumber: string;
  category: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  imageUrl?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isOpen: boolean;
  createdAt: string;
}

export interface MerchantDashboard {
  todaySales: number;
  todayTransactions: number;
  monthSales: number;
  monthTransactions: number;
  averageTransaction: number;
  topProducts: Array<{ name: string; count: number; revenue: number }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    customerName: string;
    createdAt: string;
    status: string;
  }>;
}

export interface MerchantTransaction {
  id: string;
  amount: number;
  customerName: string;
  status: string;
  type: string;
  description?: string;
  createdAt: string;
}

export interface MerchantTransactionFilters {
  page?: number;
  size?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface MerchantTransactionListResponse {
  transactions: MerchantTransaction[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface MerchantSettlement {
  id: string;
  amount: number;
  transactionCount: number;
  fee: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  periodStart: string;
  periodEnd: string;
  settledAt?: string;
  createdAt: string;
}

export interface MerchantSettlementListResponse {
  settlements: MerchantSettlement[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface MerchantEmployee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'owner' | 'manager' | 'cashier';
  status: 'active' | 'pending' | 'revoked';
  permissions: string[];
  createdAt: string;
}

export interface MerchantEmployeeCreateRequest {
  name: string;
  email?: string;
  phone?: string;
  role: 'manager' | 'cashier';
  permissions?: string[];
}

// ==================== Merchant Service ====================

class MerchantService {
  /**
   * Get merchant dashboard data
   */
  async getDashboard(): Promise<MerchantDashboard> {
    return backendApiClient.get<MerchantDashboard>('/merchants/dashboard');
  }

  /**
   * Get merchant profile
   */
  async getProfile(): Promise<Merchant> {
    return backendApiClient.get<Merchant>('/merchants/profile');
  }

  /**
   * Update merchant profile
   */
  async updateProfile(data: Partial<Merchant>): Promise<Merchant> {
    return backendApiClient.patch<Merchant>('/merchants/profile', data);
  }

  /**
   * Get merchant transactions
   */
  async getTransactions(filters?: MerchantTransactionFilters): Promise<MerchantTransactionListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const endpoint = queryString ? `/merchants/transactions?${queryString}` : '/merchants/transactions';

    return backendApiClient.get<MerchantTransactionListResponse>(endpoint);
  }

  /**
   * Get settlements
   */
  async getSettlements(page: number = 1, size: number = 10): Promise<MerchantSettlementListResponse> {
    return backendApiClient.get<MerchantSettlementListResponse>(`/settlements?page=${page}&size=${size}`);
  }

  /**
   * Get settlement details
   */
  async getSettlement(settlementId: string): Promise<MerchantSettlement> {
    return backendApiClient.get<MerchantSettlement>(`/settlements/${settlementId}`);
  }

  /**
   * Get employees
   */
  async getEmployees(): Promise<MerchantEmployee[]> {
    return backendApiClient.get<MerchantEmployee[]>('/employees');
  }

  /**
   * Add employee
   */
  async addEmployee(data: MerchantEmployeeCreateRequest): Promise<MerchantEmployee> {
    return backendApiClient.post<MerchantEmployee>('/employees', data);
  }

  /**
   * Update employee
   */
  async updateEmployee(employeeId: string, data: Partial<MerchantEmployee>): Promise<MerchantEmployee> {
    return backendApiClient.patch<MerchantEmployee>(`/employees/${employeeId}`, data);
  }

  /**
   * Delete employee
   */
  async deleteEmployee(employeeId: string): Promise<{ message: string }> {
    return backendApiClient.delete<{ message: string }>(`/employees/${employeeId}`);
  }

  /**
   * List all merchants (public)
   */
  async listMerchants(filters?: { category?: string; search?: string }): Promise<Merchant[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const endpoint = queryString ? `/merchants?${queryString}` : '/merchants';

    return backendApiClient.get<Merchant[]>(endpoint);
  }

  /**
   * Get merchant by ID (public)
   */
  async getMerchant(merchantId: string): Promise<Merchant> {
    return backendApiClient.get<Merchant>(`/merchants/${merchantId}`);
  }
}

// Export singleton instance
export const merchantService = new MerchantService();

export default merchantService;
