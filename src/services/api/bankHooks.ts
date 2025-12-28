/**
 * Bank API TanStack Query Hooks
 * Hooks for balance, transactions, payments, and settlements
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankAPI } from '../bankAPI';
import type {
  BankBalanceResponse,
  BankPaymentRequest,
  BankPaymentResponse,
  BankChargeRequest,
  BankChargeResponse,
  BankRefundRequest,
  BankRefundResponse,
  BankSettlementData,
  TransactionListResponse,
} from '../bankAPI';

// ==================== Query Keys ====================

export const bankQueryKeys = {
  all: ['bank'] as const,
  balance: (userId: string) => [...bankQueryKeys.all, 'balance', userId] as const,
  transactions: (userId: string, filters?: Record<string, unknown>) =>
    [...bankQueryKeys.all, 'transactions', userId, filters] as const,
  transaction: (transactionId: string) => [...bankQueryKeys.all, 'transaction', transactionId] as const,
  settlement: (merchantId: string, period?: string) =>
    [...bankQueryKeys.all, 'settlement', merchantId, period] as const,
  merchantSettlements: (merchantId: string, filters?: Record<string, unknown>) =>
    [...bankQueryKeys.all, 'merchantSettlements', merchantId, filters] as const,
};

// ==================== Balance Hooks ====================

/**
 * Hook for fetching user balance from bank
 */
export function useBalance(userId: string | undefined) {
  return useQuery<BankBalanceResponse>({
    queryKey: bankQueryKeys.balance(userId || ''),
    queryFn: () => bankAPI.getBalance(userId!),
    enabled: !!userId,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

/**
 * Hook for syncing balance (manual refresh)
 */
export function useSyncBalance() {
  const queryClient = useQueryClient();

  return useMutation<BankBalanceResponse, Error, string>({
    mutationFn: (userId) => bankAPI.getBalance(userId),
    onSuccess: (data, userId) => {
      queryClient.setQueryData(bankQueryKeys.balance(userId), data);
    },
  });
}

// ==================== Transaction Hooks ====================

/**
 * Hook for fetching transaction list
 */
export function useTransactions(
  userId: string | undefined,
  options?: {
    page?: number;
    size?: number;
    type?: 'payment' | 'charge' | 'refund' | 'all';
    startDate?: string;
    endDate?: string;
  }
) {
  return useQuery<TransactionListResponse>({
    queryKey: bankQueryKeys.transactions(userId || '', options),
    queryFn: () => bankAPI.getTransactions(userId!, options),
    enabled: !!userId,
    staleTime: 30000,
  });
}

/**
 * Hook for verifying a single transaction
 */
export function useVerifyTransaction(transactionId: string | undefined) {
  return useQuery({
    queryKey: bankQueryKeys.transaction(transactionId || ''),
    queryFn: () => bankAPI.verifyTransaction(transactionId!),
    enabled: !!transactionId,
    staleTime: 60000, // Transaction verification can be cached longer
  });
}

// ==================== Payment Hooks ====================

/**
 * Hook for requesting payment
 */
export function usePayment() {
  const queryClient = useQueryClient();

  return useMutation<BankPaymentResponse, Error, BankPaymentRequest>({
    mutationFn: (request) => bankAPI.requestPayment(request),
    onSuccess: (_data, variables) => {
      // Invalidate balance after successful payment
      queryClient.invalidateQueries({
        queryKey: bankQueryKeys.balance(variables.userId),
      });
      // Invalidate transactions
      queryClient.invalidateQueries({
        queryKey: bankQueryKeys.transactions(variables.userId, {}),
      });
    },
  });
}

/**
 * Hook for requesting charge (top-up)
 */
export function useCharge() {
  const queryClient = useQueryClient();

  return useMutation<BankChargeResponse, Error, BankChargeRequest>({
    mutationFn: (request) => bankAPI.requestCharge(request),
    onSuccess: (_data, variables) => {
      // Invalidate balance after successful charge
      queryClient.invalidateQueries({
        queryKey: bankQueryKeys.balance(variables.userId),
      });
      // Invalidate transactions
      queryClient.invalidateQueries({
        queryKey: bankQueryKeys.transactions(variables.userId, {}),
      });
    },
  });
}

/**
 * Hook for requesting refund
 */
export function useRefund() {
  const queryClient = useQueryClient();

  return useMutation<BankRefundResponse, Error, BankRefundRequest & { userId: string }>({
    mutationFn: ({ userId: _userId, ...request }) => bankAPI.requestRefund(request),
    onSuccess: (_data, variables) => {
      // Invalidate balance after refund request
      queryClient.invalidateQueries({
        queryKey: bankQueryKeys.balance(variables.userId),
      });
      // Invalidate transactions
      queryClient.invalidateQueries({
        queryKey: bankQueryKeys.transactions(variables.userId, {}),
      });
    },
  });
}

// ==================== Settlement Hooks ====================

/**
 * Hook for fetching settlement data for a period
 */
export function useSettlement(merchantId: string | undefined, period?: string) {
  return useQuery<BankSettlementData>({
    queryKey: bankQueryKeys.settlement(merchantId || '', period),
    queryFn: () => bankAPI.getSettlementData(merchantId!, period || new Date().toISOString()),
    enabled: !!merchantId,
    staleTime: 300000, // 5 minutes - settlements don't change often
  });
}

/**
 * Hook for fetching merchant settlement history
 */
export function useMerchantSettlements(
  merchantId: string | undefined,
  options?: { page?: number; size?: number; year?: number; month?: number }
) {
  return useQuery({
    queryKey: bankQueryKeys.merchantSettlements(merchantId || '', options),
    queryFn: () => bankAPI.getMerchantSettlements(merchantId!, options),
    enabled: !!merchantId,
    staleTime: 300000, // 5 minutes
  });
}

// ==================== Utility Hooks ====================

/**
 * Hook for prefetching balance
 */
export function usePrefetchBalance() {
  const queryClient = useQueryClient();

  return (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: bankQueryKeys.balance(userId),
      queryFn: () => bankAPI.getBalance(userId),
      staleTime: 10000,
    });
  };
}

/**
 * Hook for prefetching transactions
 */
export function usePrefetchTransactions() {
  const queryClient = useQueryClient();

  return (userId: string, options?: { page?: number; size?: number }) => {
    queryClient.prefetchQuery({
      queryKey: bankQueryKeys.transactions(userId, options),
      queryFn: () => bankAPI.getTransactions(userId, options),
      staleTime: 30000,
    });
  };
}

/**
 * Hook for invalidating all bank data
 */
export function useInvalidateBankData() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: bankQueryKeys.all });
  };
}

// ==================== Combined Hooks ====================

/**
 * Hook for dashboard data (balance + recent transactions)
 */
export function useDashboardData(userId: string | undefined) {
  const balanceQuery = useBalance(userId);
  const transactionsQuery = useTransactions(userId, { page: 0, size: 5 });

  return {
    balance: balanceQuery.data,
    transactions: transactionsQuery.data?.transactions || [],
    isLoading: balanceQuery.isLoading || transactionsQuery.isLoading,
    isError: balanceQuery.isError || transactionsQuery.isError,
    error: balanceQuery.error || transactionsQuery.error,
    refetch: () => {
      balanceQuery.refetch();
      transactionsQuery.refetch();
    },
  };
}

/**
 * Hook for merchant dashboard data
 */
export function useMerchantDashboard(merchantId: string | undefined) {
  const currentMonth = new Date().toISOString();
  const settlementQuery = useSettlement(merchantId, currentMonth);
  const settlementsQuery = useMerchantSettlements(merchantId, { page: 0, size: 6 });

  return {
    currentSettlement: settlementQuery.data,
    recentSettlements: settlementsQuery.data?.settlements || [],
    isLoading: settlementQuery.isLoading || settlementsQuery.isLoading,
    isError: settlementQuery.isError || settlementsQuery.isError,
    error: settlementQuery.error || settlementsQuery.error,
    refetch: () => {
      settlementQuery.refetch();
      settlementsQuery.refetch();
    },
  };
}

export default {
  // Balance
  useBalance,
  useSyncBalance,
  // Transactions
  useTransactions,
  useVerifyTransaction,
  // Payments
  usePayment,
  useCharge,
  useRefund,
  // Settlements
  useSettlement,
  useMerchantSettlements,
  // Utilities
  usePrefetchBalance,
  usePrefetchTransactions,
  useInvalidateBankData,
  // Combined
  useDashboardData,
  useMerchantDashboard,
};
