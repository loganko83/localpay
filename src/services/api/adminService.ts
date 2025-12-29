/**
 * Admin API Service
 * Backend integration for admin operations
 */

import { backendApiClient } from './client';
import type { AuditLogEntry, AuditActionType, UserType, Voucher } from '../../types';

// ==================== Types ====================

export interface DashboardStats {
  users: {
    total: number;
    consumers: number;
    merchants: number;
    admins: number;
  };
  merchants: {
    total: number;
    verified: number;
    pending: number;
  };
  transactions: {
    volume24h: number;
    volume30d: number;
    count24h: number;
  };
  issuance: {
    total: number;
  };
  audit: {
    total: number;
    today: number;
    verifiedPercentage: number;
  };
  vouchers: {
    active: number;
  };
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export interface AuditLogListResponse {
  logs: AuditLogEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuditLogFilters {
  page?: number;
  size?: number;
  action?: AuditActionType;
  actorType?: UserType;
  startDate?: string;
  endDate?: string;
}

export interface VoucherListResponse {
  vouchers: Voucher[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface VoucherFilters {
  page?: number;
  size?: number;
  status?: 'active' | 'paused' | 'expired';
  type?: 'welcome' | 'promo' | 'subsidy' | 'partner';
}

export interface CreateVoucherRequest {
  name: string;
  code: string;
  amount: number;
  type: 'welcome' | 'promo' | 'subsidy' | 'partner';
  usageLimit?: number;
  validFrom: string;
  validUntil: string;
}

export interface TransactionStats {
  period: string;
  daily: Array<{
    date: string;
    count: number;
    volume: number;
    type: string;
  }>;
  byType: Array<{
    type: string;
    count: number;
    volume: number;
  }>;
}

export interface UserStats {
  newUsers: Array<{
    date: string;
    user_type: string;
    count: number;
  }>;
  kyc: {
    verified: number;
    pending: number;
  };
  levels: Array<{
    level: string;
    count: number;
  }>;
}

// ==================== Admin Service ====================

class AdminService {
  /**
   * Get dashboard statistics
   */
  async getDashboard(): Promise<DashboardStats> {
    return backendApiClient.get<DashboardStats>('/admin/dashboard');
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters?: AuditLogFilters): Promise<AuditLogListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.action) params.append('action', filters.action);
    if (filters?.actorType) params.append('actorType', filters.actorType);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const endpoint = queryString ? `/admin/audit-logs?${queryString}` : '/admin/audit-logs';

    return backendApiClient.get<AuditLogListResponse>(endpoint);
  }

  /**
   * Get single audit log entry
   */
  async getAuditLog(id: string): Promise<AuditLogEntry> {
    return backendApiClient.get<AuditLogEntry>(`/admin/audit-logs/${id}`);
  }

  /**
   * Get voucher list
   */
  async getVouchers(filters?: VoucherFilters): Promise<VoucherListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);

    const queryString = params.toString();
    const endpoint = queryString ? `/admin/vouchers?${queryString}` : '/admin/vouchers';

    return backendApiClient.get<VoucherListResponse>(endpoint);
  }

  /**
   * Create voucher
   */
  async createVoucher(request: CreateVoucherRequest): Promise<Voucher> {
    return backendApiClient.post<Voucher>('/admin/vouchers', request);
  }

  /**
   * Update voucher
   */
  async updateVoucher(id: string, updates: Partial<Voucher>): Promise<Voucher> {
    return backendApiClient.put<Voucher>(`/admin/vouchers/${id}`, updates);
  }

  /**
   * Delete voucher
   */
  async deleteVoucher(id: string): Promise<void> {
    return backendApiClient.delete(`/admin/vouchers/${id}`);
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(period?: '24h' | '7d' | '30d'): Promise<TransactionStats> {
    const endpoint = period ? `/admin/stats/transactions?period=${period}` : '/admin/stats/transactions';
    return backendApiClient.get<TransactionStats>(endpoint);
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    return backendApiClient.get<UserStats>('/admin/stats/users');
  }

  /**
   * Verify merchant
   */
  async verifyMerchant(merchantId: string): Promise<void> {
    return backendApiClient.post(`/merchants/${merchantId}/verify`);
  }

  /**
   * Suspend merchant
   */
  async suspendMerchant(merchantId: string, reason: string): Promise<void> {
    return backendApiClient.post(`/merchants/${merchantId}/suspend`, { reason });
  }
}

// Export singleton instance
export const adminService = new AdminService();

export default adminService;
