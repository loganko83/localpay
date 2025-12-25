import { create } from 'zustand';
import { Wallet, WalletCard } from '../types';
import { bankAPI, BankPaymentRequest } from '../services/bankAPI';
import { auditLogService } from '../services/auditLog';
import { policyEngine } from '../services/policyEngine';
import type { CredentialType } from '../services/identity';

interface WalletState {
  wallet: Wallet | null;
  cards: WalletCard[];
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;

  // Basic setters
  setWallet: (wallet: Wallet) => void;
  updateBalance: (amount: number) => void;
  addCard: (card: WalletCard) => void;
  removeCard: (cardId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Bank API integrations
  syncBalanceFromBank: (userId: string) => Promise<void>;
  processTopUp: (userId: string, amount: number, sourceAccountId: string) => Promise<{ success: boolean; transactionId?: string; error?: string }>;
  processPayment: (request: BankPaymentRequest) => Promise<{ success: boolean; transactionId?: string; approvalCode?: string; error?: string }>;

  // Policy-aware payment (validates eligibility before payment)
  processPaymentWithPolicy: (
    request: BankPaymentRequest,
    userDID: string,
    userCredentials: CredentialType[]
  ) => Promise<{
    success: boolean;
    transactionId?: string;
    approvalCode?: string;
    discount?: number;
    policyViolations?: string[];
    error?: string;
  }>;
}

// Mock initial wallet data
const mockWallet: Wallet = {
  id: 'wallet-1',
  userId: 'user-1',
  balance: 1450000,
  pendingBalance: 0,
  chargeLimit: {
    daily: 500000,
    monthly: 2000000,
    total: 3000000,
    usedToday: 50000,
    usedThisMonth: 350000,
  },
  lastSyncedAt: new Date().toISOString(),
};

// Legacy card data for backward compatibility
const mockCards: WalletCard[] = [
  {
    id: 'card-1',
    type: 'digital',
    name: 'LocalPay Wallet',
    balance: 250000,
    lastFour: '8821',
    isVerified: true,
  },
  {
    id: 'card-2',
    type: 'bank',
    name: 'IBK Bank',
    balance: 1200000,
    lastFour: '4402',
    isVerified: true,
  },
];

export const useWalletStore = create<WalletState>((set, _get) => ({
  wallet: mockWallet,
  cards: mockCards,
  isLoading: false,
  error: null,
  lastSyncedAt: null,

  setWallet: (wallet) => set({ wallet }),

  updateBalance: (amount) =>
    set((state) => ({
      wallet: state.wallet
        ? { ...state.wallet, balance: state.wallet.balance + amount }
        : null,
    })),

  addCard: (card) =>
    set((state) => ({
      cards: [...state.cards, card],
    })),

  removeCard: (cardId) =>
    set((state) => ({
      cards: state.cards.filter((c) => c.id !== cardId),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  /**
   * Sync balance from IBK Bank
   * We DISPLAY what the bank returns - we don't manage the balance
   */
  syncBalanceFromBank: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await bankAPI.getBalance(userId);
      if (response.success) {
        set((state) => ({
          wallet: state.wallet
            ? { ...state.wallet, balance: response.balance }
            : null,
          lastSyncedAt: response.lastUpdated,
          isLoading: false,
        }));

        // Log sync action for audit
        await auditLogService.log({
          action: 'BALANCE_SYNC',
          actorId: userId,
          actorType: 'consumer',
          targetType: 'wallet',
          targetId: `wallet-${userId}`,
          metadata: { balance: response.balance },
        });
      } else {
        set({ error: 'Failed to sync balance', isLoading: false });
      }
    } catch (error) {
      set({ error: 'Network error during balance sync', isLoading: false });
    }
  },

  /**
   * Process top-up through IBK Bank
   * Bank handles actual fund movement - we only request and display result
   */
  processTopUp: async (userId: string, amount: number, sourceAccountId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await bankAPI.requestCharge({
        userId,
        amount,
        sourceAccountId,
      });

      if (response.success) {
        // Update local display with bank-returned balance
        set((state) => ({
          wallet: state.wallet
            ? { ...state.wallet, balance: response.newBalance || state.wallet.balance + amount }
            : null,
          isLoading: false,
        }));

        // Log top-up for audit trail
        await auditLogService.log({
          action: 'TOPUP_REQUESTED',
          actorId: userId,
          actorType: 'consumer',
          targetType: 'wallet',
          targetId: `wallet-${userId}`,
          metadata: {
            amount,
            sourceAccountId,
            transactionId: response.transactionId,
          },
        });

        return { success: true, transactionId: response.transactionId };
      } else {
        set({ error: 'Top-up request failed', isLoading: false });
        return { success: false, error: 'Bank rejected top-up request' };
      }
    } catch (error) {
      set({ error: 'Network error during top-up', isLoading: false });
      return { success: false, error: 'Network error' };
    }
  },

  /**
   * Process payment through IBK Bank
   * Bank APPROVES and EXECUTES - we only REQUEST and display result
   */
  processPayment: async (request: BankPaymentRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await bankAPI.requestPayment(request);

      if (response.success) {
        // Update local display with bank-returned balance
        set((state) => ({
          wallet: state.wallet
            ? { ...state.wallet, balance: response.newBalance || state.wallet.balance - request.amount }
            : null,
          isLoading: false,
        }));

        // Log payment for audit trail
        await auditLogService.log({
          action: 'PAYMENT_REQUESTED',
          actorId: request.userId,
          actorType: 'consumer',
          targetType: 'transaction',
          targetId: response.transactionId,
          metadata: {
            merchantId: request.merchantId,
            amount: request.amount,
            approvalCode: response.approvalCode,
          },
        });

        return {
          success: true,
          transactionId: response.transactionId,
          approvalCode: response.approvalCode,
        };
      } else {
        set({ error: 'Payment request failed', isLoading: false });
        return { success: false, error: 'Bank rejected payment request' };
      }
    } catch (error) {
      set({ error: 'Network error during payment', isLoading: false });
      return { success: false, error: 'Network error' };
    }
  },

  /**
   * Process payment with policy validation
   * Validates user eligibility and applies discounts before bank request
   */
  processPaymentWithPolicy: async (
    request: BankPaymentRequest,
    userDID: string,
    userCredentials: CredentialType[]
  ) => {
    set({ isLoading: true, error: null });

    try {
      // Step 1: Validate against policies
      const policyResult = await policyEngine.validateTransaction({
        userId: request.userId,
        merchantId: request.merchantId,
        amount: request.amount,
        timestamp: new Date().toISOString(),
        userCredentials,
      });

      if (!policyResult.allowed) {
        set({ error: 'Policy violation', isLoading: false });
        return {
          success: false,
          policyViolations: policyResult.violations.map(v => v.message),
          error: 'Transaction not allowed by policy',
        };
      }

      // Step 2: Apply discount if any
      const finalAmount = policyResult.modifiedAmount || request.amount;
      const discount = policyResult.discountApplied || 0;

      // Step 3: Request payment from bank with adjusted amount
      const response = await bankAPI.requestPayment({
        ...request,
        amount: finalAmount,
        policyId: policyResult.appliedPolicies[0],
      });

      if (response.success) {
        // Update local display
        set((state) => ({
          wallet: state.wallet
            ? { ...state.wallet, balance: response.newBalance || state.wallet.balance - finalAmount }
            : null,
          isLoading: false,
        }));

        // Log payment with policy info
        await auditLogService.log({
          action: 'PAYMENT_COMPLETED',
          actorId: request.userId,
          actorType: 'consumer',
          actorDID: userDID,
          targetType: 'transaction',
          targetId: response.transactionId,
          metadata: {
            merchantId: request.merchantId,
            originalAmount: request.amount,
            finalAmount,
            discount,
            appliedPolicies: policyResult.appliedPolicies,
            approvalCode: response.approvalCode,
          },
        });

        return {
          success: true,
          transactionId: response.transactionId,
          approvalCode: response.approvalCode,
          discount,
        };
      } else {
        set({ error: 'Bank rejected payment', isLoading: false });
        return { success: false, error: 'Bank rejected payment request' };
      }
    } catch (error) {
      set({ error: 'Payment processing error', isLoading: false });
      return { success: false, error: 'Payment processing error' };
    }
  },
}));
