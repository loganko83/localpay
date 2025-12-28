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

// Response types from Bank API
export interface BankBalanceResponse {
  success: boolean;
  balance: number;
  lastUpdated: string;
  accountId: string;
}

export interface BankPaymentRequest {
  userId: string;
  merchantId: string;
  amount: number;
  policyId?: string;
}

export interface BankPaymentResponse {
  success: boolean;
  transactionId: string;
  newBalance: number;
  timestamp: string;
  approvalCode: string;
  // Bank is the authority - we display what they return
}

export interface BankChargeRequest {
  userId: string;
  amount: number;
  sourceAccountId: string;
}

export interface BankChargeResponse {
  success: boolean;
  transactionId: string;
  newBalance: number;
  timestamp: string;
  // Actual fund movement happens in bank's trust account
}

export interface BankRefundRequest {
  transactionId: string;
  reason: string;
  requestedBy: string;
}

export interface BankRefundResponse {
  success: boolean;
  refundId: string;
  newBalance: number;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  // Refund EXECUTION is bank's responsibility
  // We only REQUEST and display status
}

export interface BankSettlementData {
  merchantId: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  transactionCount: number;
  status: 'pending' | 'processing' | 'completed';
  // This is AUXILIARY data - bank's ledger is authoritative
}

/**
 * Bank API Client
 *
 * NOTE: In production, this connects to IBK Bank's actual API.
 * Currently using mock data for development.
 */
class BankAPIService {
  // Production: IBK Bank API configuration
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // In production: IBK Bank API endpoint
    this.baseUrl = import.meta.env.VITE_BANK_API_URL || '/api/bank';
    this.apiKey = import.meta.env.VITE_BANK_API_KEY || '';
  }

  /**
   * Get API configuration (for production use)
   */
  getConfig(): { baseUrl: string; hasApiKey: boolean } {
    return {
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
    };
  }

  /**
   * Get user's balance from Bank
   * We DISPLAY this value, we don't MANAGE it
   */
  async getBalance(userId: string): Promise<BankBalanceResponse> {
    // TODO: Replace with actual IBK API call
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (userId === 'error-user') {
      throw new BankError('Bank system unavailable', 'SYSTEM_ERROR');
    }

    // Mock response for development
    return {
      success: true,
      balance: 125000,
      lastUpdated: new Date().toISOString(),
      accountId: `IBK-${userId}`,
    };
  }

  /**
   * Request payment to Bank
   * Bank APPROVES and EXECUTES - we only REQUEST
   */
  async requestPayment(request: BankPaymentRequest): Promise<BankPaymentResponse> {
    // TODO: Replace with actual IBK API call
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock validation logic
    if (request.amount <= 0) {
      throw new BankError('Invalid payment amount', 'SYSTEM_ERROR');
    }

    if (request.amount > 1000000) {
      throw new BankError('Payment amount exceeds single transaction limit', 'LIMIT_EXCEEDED');
    }

    // The bank validates, approves, and executes the payment
    // We receive the result and display it
    return {
      success: true,
      transactionId: `TXN-${Date.now()}`,
      newBalance: 0, // In production, bank returns actual new balance
      timestamp: new Date().toISOString(),
      approvalCode: `APR-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  /**
   * Request charge (top-up) to Bank
   * Funds move from user's bank account to Bank's trust account
   * We never touch the actual money
   */
  async requestCharge(request: BankChargeRequest): Promise<BankChargeResponse> {
    // TODO: Replace with actual IBK API call
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (request.amount > 1000000) {
      throw new BankError('Daily top-up limit exceeded', 'LIMIT_EXCEEDED');
    }

    // Bank handles Open Banking API call to source account
    // Bank deposits to trust account
    // We display the result
    return {
      success: true,
      transactionId: `CHG-${Date.now()}`,
      newBalance: 0, // In production, bank returns actual new balance
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Request refund to Bank
   * We REQUEST - Bank DECIDES and EXECUTES
   */
  async requestRefund(_request: BankRefundRequest): Promise<BankRefundResponse> {
    // TODO: Replace with actual IBK API call
    // Bank reviews and processes refund
    // We display status updates
    return {
      success: true,
      refundId: `RFD-${Date.now()}`,
      newBalance: 0,
      status: 'pending', // Bank determines final status
    };
  }

  /**
   * Get settlement data (AUXILIARY)
   * This is for display/reporting only
   * Bank's ledger is the authoritative source
   */
  async getSettlementData(merchantId: string, _period: string): Promise<BankSettlementData> {
    // TODO: Replace with actual IBK API call
    return {
      merchantId,
      periodStart: '',
      periodEnd: '',
      totalAmount: 0,
      transactionCount: 0,
      status: 'pending',
    };
  }

  /**
   * Verify transaction with Bank
   * Used for audit trail - Bank is source of truth
   */
  async verifyTransaction(_transactionId: string): Promise<{
    verified: boolean;
    bankRecord: object;
  }> {
    // TODO: Replace with actual IBK API call
    return {
      verified: true,
      bankRecord: {},
    };
  }
}

// Singleton instance
export const bankAPI = new BankAPIService();
export default bankAPI;
