/**
 * Bank API Service
 *
 * IMPORTANT: This service handles ALL communication with IBK Bank.
 * Our platform NEVER manages actual funds - we only display what the bank returns.
 *
 * Architecture:
 * [User] -> [Our App] -> [This Service] -> [IBK Bank API] -> [Trust Account]
 *
 * We are a "display layer" only. All financial authority rests with the bank.
 */

import { BankError } from './errors';
import { bankApiClient, API_CONFIG } from './api/client';

// Response types from Bank API
export interface BankBalanceResponse {
  success: boolean;
  balance: number;
  availableBalance?: number;
  pendingBalance?: number;
  lastUpdated: string;
  accountId: string;
  currency?: string;
}

export interface BankPaymentRequest {
  userId: string;
  merchantId: string;
  merchantName?: string;
  amount: number;
  policyId?: string;
  fundType?: string;
  description?: string;
  idempotencyKey?: string;
}

export interface BankPaymentResponse {
  success: boolean;
  transactionId: string;
  newBalance: number;
  timestamp: string;
  approvalCode: string;
  receiptNumber?: string;
  merchantName?: string;
  // Bank is the authority - we display what they return
}

export interface BankChargeRequest {
  userId: string;
  amount: number;
  sourceAccountId: string;
  sourceBank?: string;
  bonusAmount?: number;
}

export interface BankChargeResponse {
  success: boolean;
  transactionId: string;
  chargedAmount: number;
  bonusAmount?: number;
  newBalance: number;
  timestamp: string;
  // Actual fund movement happens in bank's trust account
}

export interface BankRefundRequest {
  transactionId: string;
  amount?: number; // Partial refund amount, if not provided = full refund
  reason: string;
  requestedBy: string;
}

export interface BankRefundResponse {
  success: boolean;
  refundId: string;
  refundAmount: number;
  newBalance: number;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  estimatedCompletionTime?: string;
  // Refund EXECUTION is bank's responsibility
  // We only REQUEST and display status
}

export interface BankSettlementData {
  merchantId: string;
  merchantName?: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  netAmount: number;
  feeAmount: number;
  transactionCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  settlementDate?: string;
  bankAccountLast4?: string;
  // This is AUXILIARY data - bank's ledger is authoritative
}

export interface BankTransactionRecord {
  transactionId: string;
  type: 'payment' | 'charge' | 'refund' | 'settlement';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  merchantId?: string;
  merchantName?: string;
  userId: string;
  approvalCode?: string;
  description?: string;
}

export interface TransactionListResponse {
  transactions: BankTransactionRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * Bank API Client
 *
 * In production, this connects to IBK Bank's actual API.
 * Falls back to mock data when VITE_USE_MOCK_DATA is true or no API URL is configured.
 */
class BankAPIService {
  private useMockData: boolean;

  constructor() {
    this.useMockData = API_CONFIG.useMockData;
  }

  /**
   * Get API configuration (for debugging)
   */
  getConfig(): { baseUrl: string; useMockData: boolean } {
    return {
      baseUrl: API_CONFIG.bank.baseUrl,
      useMockData: this.useMockData,
    };
  }

  /**
   * Get user's balance from Bank
   * We DISPLAY this value, we don't MANAGE it
   */
  async getBalance(userId: string): Promise<BankBalanceResponse> {
    if (this.useMockData) {
      return this.mockGetBalance(userId);
    }

    try {
      const response = await bankApiClient.get<BankBalanceResponse>(`/balance/${userId}`);
      return response;
    } catch (error) {
      console.error('[BankAPI] getBalance error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Request payment to Bank
   * Bank APPROVES and EXECUTES - we only REQUEST
   */
  async requestPayment(request: BankPaymentRequest): Promise<BankPaymentResponse> {
    if (this.useMockData) {
      return this.mockRequestPayment(request);
    }

    try {
      // Add idempotency key for duplicate prevention
      const requestWithKey = {
        ...request,
        idempotencyKey: request.idempotencyKey || `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const response = await bankApiClient.post<BankPaymentResponse>('/payment', requestWithKey);
      return response;
    } catch (error) {
      console.error('[BankAPI] requestPayment error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Request charge (top-up) to Bank
   * Funds move from user's bank account to Bank's trust account
   * We never touch the actual money
   */
  async requestCharge(request: BankChargeRequest): Promise<BankChargeResponse> {
    if (this.useMockData) {
      return this.mockRequestCharge(request);
    }

    try {
      const response = await bankApiClient.post<BankChargeResponse>('/charge', request);
      return response;
    } catch (error) {
      console.error('[BankAPI] requestCharge error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Request refund to Bank
   * We REQUEST - Bank DECIDES and EXECUTES
   */
  async requestRefund(request: BankRefundRequest): Promise<BankRefundResponse> {
    if (this.useMockData) {
      return this.mockRequestRefund(request);
    }

    try {
      const response = await bankApiClient.post<BankRefundResponse>('/refund', request);
      return response;
    } catch (error) {
      console.error('[BankAPI] requestRefund error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get settlement data (AUXILIARY)
   * This is for display/reporting only
   * Bank's ledger is the authoritative source
   */
  async getSettlementData(merchantId: string, period: string): Promise<BankSettlementData> {
    if (this.useMockData) {
      return this.mockGetSettlementData(merchantId, period);
    }

    try {
      const response = await bankApiClient.get<BankSettlementData>(
        `/settlement/${merchantId}?period=${encodeURIComponent(period)}`
      );
      return response;
    } catch (error) {
      console.error('[BankAPI] getSettlementData error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    userId: string,
    options?: {
      page?: number;
      size?: number;
      type?: 'payment' | 'charge' | 'refund' | 'all';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<TransactionListResponse> {
    if (this.useMockData) {
      return this.mockGetTransactions(userId, options);
    }

    try {
      const params = new URLSearchParams();
      if (options?.page !== undefined) params.append('page', options.page.toString());
      if (options?.size !== undefined) params.append('size', options.size.toString());
      if (options?.type && options.type !== 'all') params.append('type', options.type);
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);

      const queryString = params.toString();
      const response = await bankApiClient.get<TransactionListResponse>(
        `/transactions/${userId}${queryString ? `?${queryString}` : ''}`
      );
      return response;
    } catch (error) {
      console.error('[BankAPI] getTransactions error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Verify transaction with Bank
   * Used for audit trail - Bank is source of truth
   */
  async verifyTransaction(transactionId: string): Promise<{
    verified: boolean;
    bankRecord: BankTransactionRecord | null;
    discrepancies?: string[];
  }> {
    if (this.useMockData) {
      return this.mockVerifyTransaction(transactionId);
    }

    try {
      const response = await bankApiClient.get<{
        verified: boolean;
        bankRecord: BankTransactionRecord | null;
        discrepancies?: string[];
      }>(`/verify/${transactionId}`);
      return response;
    } catch (error) {
      console.error('[BankAPI] verifyTransaction error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get merchant settlement list
   */
  async getMerchantSettlements(
    merchantId: string,
    options?: { page?: number; size?: number; year?: number; month?: number }
  ): Promise<{
    settlements: BankSettlementData[];
    page: number;
    size: number;
    totalElements: number;
  }> {
    if (this.useMockData) {
      return this.mockGetMerchantSettlements(merchantId, options);
    }

    try {
      const params = new URLSearchParams();
      if (options?.page !== undefined) params.append('page', options.page.toString());
      if (options?.size !== undefined) params.append('size', options.size.toString());
      if (options?.year) params.append('year', options.year.toString());
      if (options?.month) params.append('month', options.month.toString());

      const queryString = params.toString();
      const response = await bankApiClient.get<{
        settlements: BankSettlementData[];
        page: number;
        size: number;
        totalElements: number;
      }>(`/merchant/${merchantId}/settlements${queryString ? `?${queryString}` : ''}`);
      return response;
    } catch (error) {
      console.error('[BankAPI] getMerchantSettlements error:', error);
      throw this.handleError(error);
    }
  }

  // ==================== Error Handling ====================

  private handleError(error: unknown): BankError {
    if (error instanceof BankError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        return new BankError('Bank system timeout', 'BANK_TIMEOUT');
      }
      if (error.message.includes('network') || error.message.includes('NETWORK')) {
        return new BankError('Network connection error', 'NETWORK_ERROR');
      }
      if (error.message.includes('401') || error.message.includes('UNAUTHORIZED')) {
        return new BankError('Authentication failed', 'UNAUTHORIZED');
      }
      return new BankError(error.message, 'SYSTEM_ERROR');
    }

    return new BankError('Unknown error occurred', 'SYSTEM_ERROR');
  }

  // ==================== Mock Implementations ====================

  private async mockGetBalance(userId: string): Promise<BankBalanceResponse> {
    await this.mockDelay(300);

    if (userId === 'error-user') {
      throw new BankError('Bank system unavailable', 'SYSTEM_ERROR');
    }

    // Return realistic mock balance
    const mockBalances: Record<string, number> = {
      'user-1': 1450000,
      'consumer1': 125000,
      'consumer2': 350000,
      'tourist1': 85000,
    };

    return {
      success: true,
      balance: mockBalances[userId] || 125000,
      availableBalance: mockBalances[userId] || 125000,
      pendingBalance: 0,
      lastUpdated: new Date().toISOString(),
      accountId: `IBK-${userId}`,
      currency: 'KRW',
    };
  }

  private async mockRequestPayment(request: BankPaymentRequest): Promise<BankPaymentResponse> {
    await this.mockDelay(500);

    if (request.amount <= 0) {
      throw new BankError('Invalid payment amount', 'SYSTEM_ERROR');
    }

    if (request.amount > 1000000) {
      throw new BankError('Payment amount exceeds single transaction limit', 'LIMIT_EXCEEDED');
    }

    const transactionId = `TXN-${Date.now()}`;
    const approvalCode = `APR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return {
      success: true,
      transactionId,
      newBalance: 0, // Bank returns actual balance in production
      timestamp: new Date().toISOString(),
      approvalCode,
      receiptNumber: `RCP-${Date.now()}`,
      merchantName: request.merchantName,
    };
  }

  private async mockRequestCharge(request: BankChargeRequest): Promise<BankChargeResponse> {
    await this.mockDelay(800);

    if (request.amount > 1000000) {
      throw new BankError('Daily top-up limit exceeded', 'LIMIT_EXCEEDED');
    }

    if (request.amount < 10000) {
      throw new BankError('Minimum charge amount is 10,000 KRW', 'SYSTEM_ERROR');
    }

    // Calculate bonus (5% for amounts >= 50,000)
    const bonusAmount = request.amount >= 50000 ? Math.floor(request.amount * 0.05) : 0;

    return {
      success: true,
      transactionId: `CHG-${Date.now()}`,
      chargedAmount: request.amount,
      bonusAmount,
      newBalance: 0, // Bank returns actual balance
      timestamp: new Date().toISOString(),
    };
  }

  private async mockRequestRefund(request: BankRefundRequest): Promise<BankRefundResponse> {
    await this.mockDelay(600);

    return {
      success: true,
      refundId: `RFD-${Date.now()}`,
      refundAmount: request.amount || 0,
      newBalance: 0,
      status: 'pending',
      estimatedCompletionTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private async mockGetSettlementData(merchantId: string, period: string): Promise<BankSettlementData> {
    await this.mockDelay(400);

    const now = new Date();
    const periodDate = period ? new Date(period) : now;

    return {
      merchantId,
      merchantName: 'Sample Merchant',
      periodStart: new Date(periodDate.getFullYear(), periodDate.getMonth(), 1).toISOString(),
      periodEnd: new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).toISOString(),
      totalAmount: 5250000,
      netAmount: 5092500,
      feeAmount: 157500,
      transactionCount: 245,
      status: 'completed',
      settlementDate: new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 5).toISOString(),
      bankAccountLast4: '1234',
    };
  }

  private async mockGetTransactions(
    userId: string,
    options?: {
      page?: number;
      size?: number;
      type?: 'payment' | 'charge' | 'refund' | 'all';
    }
  ): Promise<TransactionListResponse> {
    await this.mockDelay(400);

    const page = options?.page || 0;
    const size = options?.size || 20;

    // Generate mock transactions
    const allTransactions: BankTransactionRecord[] = [
      {
        transactionId: 'TX-2024-001',
        type: 'payment',
        amount: 12000,
        status: 'completed',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        merchantId: 'merchant-1',
        merchantName: 'Starbucks Haeundae',
        userId,
        approvalCode: 'APR-ABC123',
      },
      {
        transactionId: 'TX-2024-002',
        type: 'charge',
        amount: 100000,
        status: 'completed',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        userId,
        description: 'IBK Bank top-up',
      },
      {
        transactionId: 'TX-2024-003',
        type: 'payment',
        amount: 35000,
        status: 'completed',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        merchantId: 'merchant-2',
        merchantName: 'Olive Young',
        userId,
        approvalCode: 'APR-DEF456',
      },
      {
        transactionId: 'TX-2024-004',
        type: 'payment',
        amount: 8500,
        status: 'completed',
        timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        merchantId: 'merchant-3',
        merchantName: 'CU Convenience Store',
        userId,
        approvalCode: 'APR-GHI789',
      },
      {
        transactionId: 'TX-2024-005',
        type: 'refund',
        amount: 5000,
        status: 'completed',
        timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
        merchantId: 'merchant-1',
        merchantName: 'Starbucks Haeundae',
        userId,
        description: 'Partial refund',
      },
    ];

    // Filter by type
    let filtered = allTransactions;
    if (options?.type && options.type !== 'all') {
      filtered = allTransactions.filter(tx => tx.type === options.type);
    }

    // Paginate
    const start = page * size;
    const end = start + size;
    const transactions = filtered.slice(start, end);

    return {
      transactions,
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    };
  }

  private async mockVerifyTransaction(transactionId: string): Promise<{
    verified: boolean;
    bankRecord: BankTransactionRecord | null;
    discrepancies?: string[];
  }> {
    await this.mockDelay(300);

    if (!transactionId || transactionId.startsWith('INVALID')) {
      return {
        verified: false,
        bankRecord: null,
        discrepancies: ['Transaction not found in bank records'],
      };
    }

    return {
      verified: true,
      bankRecord: {
        transactionId,
        type: 'payment',
        amount: 12000,
        status: 'completed',
        timestamp: new Date().toISOString(),
        userId: 'user-1',
        approvalCode: 'APR-VERIFIED',
      },
    };
  }

  private async mockGetMerchantSettlements(
    merchantId: string,
    options?: { page?: number; size?: number; year?: number; month?: number }
  ): Promise<{
    settlements: BankSettlementData[];
    page: number;
    size: number;
    totalElements: number;
  }> {
    await this.mockDelay(400);

    const page = options?.page || 0;
    const size = options?.size || 12;
    const year = options?.year || new Date().getFullYear();

    // Generate mock settlements for past months
    const settlements: BankSettlementData[] = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(year, now.getMonth() - i, 1);
      if (date.getFullYear() < year - 1) break;

      settlements.push({
        merchantId,
        merchantName: 'Sample Merchant',
        periodStart: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
        periodEnd: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString(),
        totalAmount: 3000000 + Math.floor(Math.random() * 3000000),
        netAmount: 2850000 + Math.floor(Math.random() * 2850000),
        feeAmount: 150000 + Math.floor(Math.random() * 150000),
        transactionCount: 150 + Math.floor(Math.random() * 150),
        status: i < 2 ? 'pending' : 'completed',
        settlementDate: i < 2 ? undefined : new Date(date.getFullYear(), date.getMonth() + 1, 5).toISOString(),
        bankAccountLast4: '5678',
      });
    }

    // Filter by month if specified
    let filtered = settlements;
    if (options?.month) {
      filtered = settlements.filter(s => {
        const sMonth = new Date(s.periodStart).getMonth() + 1;
        return sMonth === options.month;
      });
    }

    const start = page * size;
    const end = start + size;

    return {
      settlements: filtered.slice(start, end),
      page,
      size,
      totalElements: filtered.length,
    };
  }

  private mockDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const bankAPI = new BankAPIService();
export default bankAPI;
