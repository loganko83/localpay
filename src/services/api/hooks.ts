/**
 * TanStack Query Hooks
 * For admin dashboard data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { xphereService, NetworkStatus, BlockInfo } from '../blockchain';
import { didBaasClient, Did, VerifiableCredential } from '../did';
import { anchorLog, verifyLog, AuditLogData, AnchorResult, VerificationResult } from '../blockchain/auditAnchor';
import { adminService, type AuditLogFilters, type VoucherFilters } from './adminService';

// ==================== Blockchain Hooks ====================

/**
 * Hook for blockchain network status
 */
export function useNetworkStatus() {
  return useQuery<NetworkStatus>({
    queryKey: ['blockchain', 'status'],
    queryFn: () => xphereService.getNetworkStatus(),
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000,
  });
}

/**
 * Hook for current block height
 */
export function useBlockHeight() {
  return useQuery<number>({
    queryKey: ['blockchain', 'blockHeight'],
    queryFn: () => xphereService.getBlockHeight(),
    refetchInterval: 5000,
    staleTime: 3000,
  });
}

/**
 * Hook for recent blocks
 */
export function useRecentBlocks(count: number = 10) {
  return useQuery<BlockInfo[]>({
    queryKey: ['blockchain', 'recentBlocks', count],
    queryFn: () => xphereService.getLatestBlocks(count),
    refetchInterval: 15000,
    staleTime: 10000,
  });
}

/**
 * Hook for single block info
 */
export function useBlock(blockNumberOrHash: number | string | undefined) {
  return useQuery<BlockInfo | null>({
    queryKey: ['blockchain', 'block', blockNumberOrHash],
    queryFn: () => blockNumberOrHash ? xphereService.getBlock(blockNumberOrHash) : null,
    enabled: !!blockNumberOrHash,
    staleTime: Infinity, // Blocks don't change
  });
}

/**
 * Hook for transaction info
 */
export function useTransaction(hash: string | undefined) {
  return useQuery({
    queryKey: ['blockchain', 'transaction', hash],
    queryFn: () => hash ? xphereService.getTransaction(hash) : null,
    enabled: !!hash,
    staleTime: 60000, // TX status might change
  });
}

// ==================== Audit Hooks ====================

/**
 * Hook for anchoring audit log
 */
export function useAnchorLog() {
  const queryClient = useQueryClient();

  return useMutation<AnchorResult, Error, AuditLogData>({
    mutationFn: (log) => anchorLog(log),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

/**
 * Hook for verifying audit log
 */
export function useVerifyLog() {
  return useMutation<VerificationResult, Error, AuditLogData>({
    mutationFn: (log) => verifyLog(log),
  });
}

// ==================== DID Hooks ====================

/**
 * Hook for issuing DID
 */
export function useIssueDid() {
  const queryClient = useQueryClient();

  return useMutation<Did, Error, Record<string, unknown> | undefined>({
    mutationFn: (metadata) => didBaasClient.issueDid(metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dids'] });
    },
  });
}

/**
 * Hook for DID resolution
 */
export function useResolveDid(didAddress: string | undefined) {
  return useQuery({
    queryKey: ['did', 'resolve', didAddress],
    queryFn: () => didAddress ? didBaasClient.resolveDid(didAddress) : null,
    enabled: !!didAddress,
    staleTime: 60000,
  });
}

/**
 * Hook for DID verification
 */
export function useVerifyDid(didAddress: string | undefined) {
  return useQuery({
    queryKey: ['did', 'verify', didAddress],
    queryFn: () => didAddress ? didBaasClient.verifyDid(didAddress) : null,
    enabled: !!didAddress,
    staleTime: 30000,
  });
}

/**
 * Hook for listing DIDs
 */
export function useDids(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: ['dids', 'list', page, size],
    queryFn: () => didBaasClient.listDids(page, size),
    staleTime: 30000,
  });
}

// ==================== Credential Hooks ====================

/**
 * Hook for issuing credential
 */
export function useIssueCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      subjectDid: string;
      credentialType: string;
      claims: Record<string, unknown>;
      expirationDate?: string;
    }) => didBaasClient.issueCredential(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}

/**
 * Hook for verifying credential
 */
export function useVerifyCredential() {
  return useMutation({
    mutationFn: (credential: VerifiableCredential) =>
      didBaasClient.verifyCredential(credential),
  });
}

/**
 * Hook for listing credentials
 */
export function useCredentials(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: ['credentials', 'list', page, size],
    queryFn: () => didBaasClient.listCredentials(page, size),
    staleTime: 30000,
  });
}

// ==================== Platform Metrics ====================

import { backendApiClient, API_CONFIG } from './client';

export interface PlatformMetrics {
  totalIssuance: number;
  activeUsers: number;
  volume24h: number;
  pendingMerchants: number;
  activeMerchants: number;
  blockHeight: number;
  anchoredLogs: number;
  verificationRate: number;
  carbonPoints: number;
  co2Saved: number;
}

export interface AdminDashboardStats {
  overview: {
    totalIssuance: number;
    activeUsers: number;
    totalMerchants: number;
    volume24h: number;
    volumeChange: number;
  };
  transactions: {
    today: number;
    pending: number;
    failed: number;
    avgAmount: number;
  };
  compliance: {
    amlAlerts: number;
    pendingKyc: number;
    blockedAccounts: number;
  };
  settlements: {
    pendingAmount: number;
    todaySettled: number;
    merchantsPending: number;
  };
}

/**
 * Hook for platform metrics
 */
export function usePlatformMetrics() {
  const { data: networkStatus } = useNetworkStatus();

  return useQuery<PlatformMetrics>({
    queryKey: ['platformMetrics'],
    queryFn: async () => {
      if (API_CONFIG.useMockData) {
        // Mock data for development
        return {
          totalIssuance: 45200000000,
          activeUsers: 342100,
          volume24h: 2100000000,
          pendingMerchants: 12,
          activeMerchants: 1847,
          blockHeight: networkStatus?.blockHeight || 12404200,
          anchoredLogs: 156789,
          verificationRate: 99.8,
          carbonPoints: 2845000,
          co2Saved: 142.5,
        };
      }

      try {
        const response = await backendApiClient.get<PlatformMetrics>('/admin/metrics');
        return {
          ...response,
          blockHeight: networkStatus?.blockHeight || response.blockHeight,
        };
      } catch (error) {
        console.error('[PlatformMetrics] API error, falling back to mock:', error);
        return {
          totalIssuance: 45200000000,
          activeUsers: 342100,
          volume24h: 2100000000,
          pendingMerchants: 12,
          activeMerchants: 1847,
          blockHeight: networkStatus?.blockHeight || 12404200,
          anchoredLogs: 156789,
          verificationRate: 99.8,
          carbonPoints: 2845000,
          co2Saved: 142.5,
        };
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

/**
 * Hook for admin dashboard statistics
 */
export function useAdminDashboardStats() {
  return useQuery<AdminDashboardStats>({
    queryKey: ['adminDashboardStats'],
    queryFn: async () => {
      if (API_CONFIG.useMockData) {
        return {
          overview: {
            totalIssuance: 45200000000,
            activeUsers: 342100,
            totalMerchants: 1847,
            volume24h: 2100000000,
            volumeChange: 12.5,
          },
          transactions: {
            today: 15420,
            pending: 234,
            failed: 12,
            avgAmount: 35000,
          },
          compliance: {
            amlAlerts: 3,
            pendingKyc: 45,
            blockedAccounts: 2,
          },
          settlements: {
            pendingAmount: 125000000,
            todaySettled: 450000000,
            merchantsPending: 156,
          },
        };
      }

      try {
        return await backendApiClient.get<AdminDashboardStats>('/admin/dashboard/stats');
      } catch (error) {
        console.error('[AdminDashboardStats] API error:', error);
        throw error;
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// ==================== Auth & User Hooks ====================

import { authService, type LoginRequest, type RegisterRequest, type AuthUser } from './authService';
import { walletService, type WalletBalance, type ChargeRequest, type ChargeResponse } from './walletService';
import { transactionService, type TransactionFilters, type TransactionListResponse, type PaymentRequest, type PaymentResponse } from './transactionService';
import { merchantService, type MerchantDashboard, type MerchantTransactionFilters, type MerchantTransactionListResponse } from './merchantService';
import { twoFactorService, type TwoFactorStatus, type TwoFactorSetupResponse } from './twoFactorService';
import { notificationService, type NotificationListResponse, type NotificationPreferences } from './notificationService';
import { webhookService, type Webhook, type WebhookCreateRequest, type WebhookDelivery } from './webhookService';

/**
 * Hook for login
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LoginRequest) => authService.login(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

/**
 * Hook for register
 */
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RegisterRequest) => authService.register(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

/**
 * Hook for logout
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

/**
 * Hook for current user
 */
export function useCurrentUser() {
  return useQuery<AuthUser | null>({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 60000,
    retry: false,
  });
}

// ==================== Wallet Hooks ====================

/**
 * Hook for wallet balance
 */
export function useWalletBalance() {
  return useQuery<WalletBalance>({
    queryKey: ['wallet', 'balance'],
    queryFn: () => walletService.getBalance(),
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

/**
 * Hook for wallet charge
 */
export function useWalletCharge() {
  const queryClient = useQueryClient();

  return useMutation<ChargeResponse, Error, ChargeRequest>({
    mutationFn: (request) => walletService.charge(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// ==================== Transaction Hooks ====================

/**
 * Hook for transaction history (backend API)
 */
export function useBackendTransactions(filters?: TransactionFilters) {
  return useQuery<TransactionListResponse>({
    queryKey: ['backend-transactions', filters],
    queryFn: () => transactionService.getTransactions(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for payment (backend API)
 */
export function useBackendPayment() {
  const queryClient = useQueryClient();

  return useMutation<PaymentResponse, Error, PaymentRequest>({
    mutationFn: (request) => transactionService.requestPayment(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['backend-transactions'] });
    },
  });
}

// ==================== Merchant Hooks ====================

/**
 * Hook for merchant dashboard (backend API)
 */
export function useBackendMerchantDashboard() {
  return useQuery<MerchantDashboard>({
    queryKey: ['merchant', 'dashboard'],
    queryFn: () => merchantService.getDashboard(),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

/**
 * Hook for merchant transactions
 */
export function useMerchantTransactions(filters?: MerchantTransactionFilters) {
  return useQuery<MerchantTransactionListResponse>({
    queryKey: ['merchant', 'transactions', filters],
    queryFn: () => merchantService.getTransactions(filters),
    staleTime: 30000,
  });
}

// ==================== Two-Factor Auth Hooks ====================

/**
 * Hook for 2FA status
 */
export function useTwoFactorStatus() {
  return useQuery<TwoFactorStatus>({
    queryKey: ['auth', '2fa', 'status'],
    queryFn: () => twoFactorService.getStatus(),
    staleTime: 60000,
  });
}

/**
 * Hook for 2FA setup
 */
export function useTwoFactorSetup() {
  const queryClient = useQueryClient();

  return useMutation<TwoFactorSetupResponse, Error, void>({
    mutationFn: () => twoFactorService.setup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', '2fa'] });
    },
  });
}

/**
 * Hook for 2FA verify
 */
export function useTwoFactorVerify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => twoFactorService.verify({ token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', '2fa'] });
    },
  });
}

/**
 * Hook for 2FA disable
 */
export function useTwoFactorDisable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { password: string; token?: string }) => twoFactorService.disable(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', '2fa'] });
    },
  });
}

// ==================== Notification Hooks ====================

/**
 * Hook for notifications
 */
export function useNotifications(page: number = 1, size: number = 20) {
  return useQuery<NotificationListResponse>({
    queryKey: ['notifications', page, size],
    queryFn: () => notificationService.getNotifications(page, size),
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

/**
 * Hook for unread notification count
 */
export function useUnreadNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 15000,
    staleTime: 5000,
  });
}

/**
 * Hook for notification preferences
 */
export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => notificationService.getPreferences(),
    staleTime: 60000,
  });
}

/**
 * Hook for updating notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: Partial<NotificationPreferences>) =>
      notificationService.updatePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
    },
  });
}

// ==================== Webhook Hooks ====================

/**
 * Hook for webhooks list
 */
export function useWebhooks() {
  return useQuery<Webhook[]>({
    queryKey: ['webhooks'],
    queryFn: () => webhookService.listWebhooks(),
    staleTime: 60000,
  });
}

/**
 * Hook for creating webhook
 */
export function useCreateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: WebhookCreateRequest) => webhookService.createWebhook(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });
}

/**
 * Hook for deleting webhook
 */
export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (webhookId: string) => webhookService.deleteWebhook(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });
}

/**
 * Hook for webhook deliveries
 */
export function useWebhookDeliveries(webhookId: string) {
  return useQuery<WebhookDelivery[]>({
    queryKey: ['webhooks', webhookId, 'deliveries'],
    queryFn: () => webhookService.getDeliveries(webhookId),
    enabled: !!webhookId,
    staleTime: 30000,
  });
}

// ==================== Admin Hooks ====================

/**
 * Hook for audit logs
 */
export function useAuditLogs(filters?: { page?: number; size?: number; action?: string }) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', filters],
    queryFn: () => adminService.getAuditLogs(filters as AuditLogFilters),
    staleTime: 30000,
  });
}

/**
 * Hook for admin dashboard stats
 */
export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminService.getDashboard(),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

/**
 * Hook for admin vouchers
 */
export function useAdminVouchers(filters?: { page?: number; size?: number; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'vouchers', filters],
    queryFn: () => adminService.getVouchers(filters as VoucherFilters),
    staleTime: 30000,
  });
}

/**
 * Hook for admin user stats
 */
export function useAdminUserStats() {
  return useQuery({
    queryKey: ['admin', 'stats', 'users'],
    queryFn: () => adminService.getUserStats(),
    staleTime: 60000,
  });
}

/**
 * Hook for verifying merchant
 */
export function useVerifyMerchant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (merchantId: string) => adminService.verifyMerchant(merchantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    },
  });
}

/**
 * Hook for suspending merchant
 */
export function useSuspendMerchant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ merchantId, reason }: { merchantId: string; reason: string }) =>
      adminService.suspendMerchant(merchantId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    },
  });
}

export default {
  // Blockchain
  useNetworkStatus,
  useBlockHeight,
  useRecentBlocks,
  useBlock,
  useTransaction,
  // Audit
  useAnchorLog,
  useVerifyLog,
  // DID
  useIssueDid,
  useResolveDid,
  useVerifyDid,
  useDids,
  // Credentials
  useIssueCredential,
  useVerifyCredential,
  useCredentials,
  // Metrics
  usePlatformMetrics,
  useAdminDashboardStats,
  // Auth
  useLogin,
  useRegister,
  useLogout,
  useCurrentUser,
  // Wallet
  useWalletBalance,
  useWalletCharge,
  // Transactions (backend)
  useBackendTransactions,
  useBackendPayment,
  // Merchant (backend)
  useBackendMerchantDashboard,
  useMerchantTransactions,
  // 2FA
  useTwoFactorStatus,
  useTwoFactorSetup,
  useTwoFactorVerify,
  useTwoFactorDisable,
  // Notifications
  useNotifications,
  useUnreadNotificationCount,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  // Webhooks
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
  useWebhookDeliveries,
  // Admin
  useAuditLogs,
  useAdminDashboard,
  useAdminVouchers,
  useAdminUserStats,
  useVerifyMerchant,
  useSuspendMerchant,
};
