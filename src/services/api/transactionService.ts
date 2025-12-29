/**
 * Transaction API Service
 * Backend integration for transaction operations
 */

import { backendApiClient } from './client';
import type { Transaction, TransactionType, TransactionStatus } from '../../types';

// ==================== Types ====================

export interface TransactionListResponse {
  transactions: Transaction[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface TransactionFilters {
  page?: number;
  size?: number;
  type?: TransactionType | 'all';
  startDate?: string;
  endDate?: string;
}

export interface PaymentRequest {
  merchantId: string;
  amount: number;
  description?: string;
}

export interface PaymentResponse {
  transactionId: string;
  amount: number;
  merchantName: string;
  approvalCode: string;
  receiptNumber: string;
  newBalance: number;
  status: TransactionStatus;
  createdAt: string;
}

export interface RefundRequest {
  originalTransactionId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResponse {
  transactionId: string;
  originalTransactionId: string;
  amount: number;
  status: TransactionStatus;
  createdAt: string;
}

export interface TransactionVerification {
  txId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  merchantName?: string;
  approvalCode?: string;
  receiptNumber?: string;
  createdAt: string;
  verified: boolean;
  verifiedAt: string;
}

// ==================== Transaction Service ====================

class TransactionService {
  /**
   * Get transaction history with pagination
   */
  async getTransactions(filters?: TransactionFilters): Promise<TransactionListResponse> {
    const params = new URLSearchParams();

    if (filters?.page !== undefined) params.append('page', filters.page.toString());
    if (filters?.size !== undefined) params.append('size', filters.size.toString());
    if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const endpoint = queryString ? `/transactions?${queryString}` : '/transactions';

    return backendApiClient.get<TransactionListResponse>(endpoint);
  }

  /**
   * Get single transaction details
   */
  async getTransaction(id: string): Promise<Transaction> {
    return backendApiClient.get<Transaction>(`/transactions/${id}`);
  }

  /**
   * Request payment
   */
  async requestPayment(request: PaymentRequest): Promise<PaymentResponse> {
    return backendApiClient.post<PaymentResponse>('/transactions/payment', request);
  }

  /**
   * Request refund (merchant only)
   */
  async requestRefund(request: RefundRequest): Promise<RefundResponse> {
    return backendApiClient.post<RefundResponse>('/transactions/refund', request);
  }

  /**
   * Verify transaction (for receipt validation)
   */
  async verifyTransaction(txId: string): Promise<TransactionVerification> {
    return backendApiClient.get<TransactionVerification>(`/transactions/verify/${txId}`);
  }
}

// Export singleton instance
export const transactionService = new TransactionService();

export default transactionService;
