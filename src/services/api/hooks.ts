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
import { couponService, type CouponFilters, type CouponListResponse, type UserCouponListResponse, type OfferListResponse, type CouponDetail, type CouponStats } from './couponService';
import { employeeService, type EmployeeFilters, type EmployeeListResponse, type Employee, type CreateEmployeeRequest, type UpdateEmployeeRequest, type InviteEmployeeRequest } from './employeeService';
import { settlementService, type SettlementFilters, type SettlementListResponse, type Settlement, type SettlementStats, type CalendarSettlement } from './settlementService';
import { welfareService, type WelfareProgram, type WelfareProgramListResponse, type WelfareDistributionListResponse, type WelfareStats } from './welfareService';
import { complianceService, type FDSAlertListResponse, type FDSRule, type FDSStats, type AMLCaseListResponse, type AMLCase, type AMLStats, type RiskScore } from './complianceService';
import { carbonService, type CarbonBalance, type CarbonHistoryResponse, type CarbonImpact, type CarbonLeaderboard, type ActivityType } from './carbonService';
import { loyaltyService, type LoyaltyBalance, type LoyaltyHistoryResponse, type LoyaltyRewardsResponse, type LoyaltyTiersResponse } from './loyaltyService';
import { donationService, type DonationCampaignListResponse, type CampaignDetailResponse, type MyDonationsResponse, type CampaignCategory } from './donationService';
import { creditService, type CreditScore, type CreditScoreDetail, type CreditApplicationListResponse } from './creditService';
import { deliveryService, type DeliveryOrderListResponse, type DeliveryOrderDetail, type DeliveryStats } from './deliveryService';

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

/**
 * Hook for merchant detail (public)
 */
export function useMerchantDetail(merchantId: string | undefined) {
  return useQuery({
    queryKey: ['merchants', merchantId],
    queryFn: () => merchantService.getMerchant(merchantId!),
    enabled: !!merchantId,
    staleTime: 60000,
  });
}

/**
 * Hook for merchants list
 */
export function useMerchantsList(filters?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: ['merchants', 'list', filters],
    queryFn: () => merchantService.listMerchants(filters),
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

// ==================== Coupon Hooks ====================

/**
 * Hook for available coupons
 */
export function useCoupons(filters?: CouponFilters) {
  return useQuery<CouponListResponse>({
    queryKey: ['coupons', filters],
    queryFn: () => couponService.getCoupons(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for user's coupons
 */
export function useMyCoupons(status?: 'available' | 'used' | 'expired', page: number = 1) {
  return useQuery<UserCouponListResponse>({
    queryKey: ['coupons', 'my', status, page],
    queryFn: () => couponService.getMyCoupons(status, page),
    staleTime: 30000,
  });
}

/**
 * Hook for coupon details
 */
export function useCouponDetail(couponId: string | undefined) {
  return useQuery<CouponDetail>({
    queryKey: ['coupons', couponId],
    queryFn: () => couponService.getCoupon(couponId!),
    enabled: !!couponId,
    staleTime: 60000,
  });
}

/**
 * Hook for claiming a coupon
 */
export function useClaimCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (couponId: string) => couponService.claimCoupon(couponId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

/**
 * Hook for using a coupon
 */
export function useUseCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userCouponId, purchaseAmount, transactionId }: { userCouponId: string; purchaseAmount: number; transactionId?: string }) =>
      couponService.useCoupon(userCouponId, purchaseAmount, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

/**
 * Hook for offers
 */
export function useOffers(page: number = 1, limit: number = 20) {
  return useQuery<OfferListResponse>({
    queryKey: ['offers', page, limit],
    queryFn: () => couponService.getOffers(page, limit),
    staleTime: 30000,
  });
}

/**
 * Hook for coupon stats
 */
export function useCouponStats() {
  return useQuery<CouponStats>({
    queryKey: ['coupons', 'stats'],
    queryFn: () => couponService.getCouponStats(),
    staleTime: 60000,
  });
}

// ==================== Employee Hooks ====================

/**
 * Hook for employee list
 */
export function useEmployees(filters?: EmployeeFilters) {
  return useQuery<EmployeeListResponse>({
    queryKey: ['employees', filters],
    queryFn: () => employeeService.getEmployees(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for single employee
 */
export function useEmployee(employeeId: string | undefined) {
  return useQuery<Employee>({
    queryKey: ['employees', employeeId],
    queryFn: () => employeeService.getEmployee(employeeId!),
    enabled: !!employeeId,
    staleTime: 30000,
  });
}

/**
 * Hook for adding employee
 */
export function useAddEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeRequest) => employeeService.addEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

/**
 * Hook for updating employee
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: UpdateEmployeeRequest }) =>
      employeeService.updateEmployee(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

/**
 * Hook for deleting employee
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) => employeeService.deleteEmployee(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

/**
 * Hook for inviting employee
 */
export function useInviteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteEmployeeRequest) => employeeService.inviteEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

/**
 * Hook for revoking employee access
 */
export function useRevokeEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, reason }: { employeeId: string; reason?: string }) =>
      employeeService.revokeAccess(employeeId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

/**
 * Hook for activating employee
 */
export function useActivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) => employeeService.activateEmployee(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
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

// ==================== Settlement Hooks ====================

/**
 * Hook for settlements list (admin)
 */
export function useSettlements(filters?: SettlementFilters) {
  return useQuery<SettlementListResponse>({
    queryKey: ['settlements', filters],
    queryFn: () => settlementService.getSettlements(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for merchant's settlements (backend API)
 */
export function useBackendMerchantSettlements(filters?: SettlementFilters) {
  return useQuery<SettlementListResponse>({
    queryKey: ['backend-settlements', 'merchant', filters],
    queryFn: () => settlementService.getMerchantSettlements(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for single settlement (backend API)
 */
export function useSettlementDetail(settlementId: string | undefined) {
  return useQuery<Settlement>({
    queryKey: ['backend-settlements', settlementId],
    queryFn: () => settlementService.getSettlement(settlementId!),
    enabled: !!settlementId,
    staleTime: 30000,
  });
}

/**
 * Hook for settlement stats
 */
export function useSettlementStats() {
  return useQuery<SettlementStats>({
    queryKey: ['settlements', 'stats'],
    queryFn: () => settlementService.getStats(),
    staleTime: 60000,
  });
}

/**
 * Hook for settlement calendar
 */
export function useSettlementCalendar(year: number, month: number) {
  return useQuery<CalendarSettlement[]>({
    queryKey: ['settlements', 'calendar', year, month],
    queryFn: () => settlementService.getCalendar(year, month),
    staleTime: 60000,
  });
}

/**
 * Hook for pending settlements
 */
export function usePendingSettlements() {
  return useQuery<SettlementListResponse>({
    queryKey: ['settlements', 'pending'],
    queryFn: () => settlementService.getPending(),
    staleTime: 30000,
  });
}

/**
 * Hook for approving settlement
 */
export function useApproveSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ settlementId, notes }: { settlementId: string; notes?: string }) =>
      settlementService.approveSettlement(settlementId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
}

/**
 * Hook for rejecting settlement
 */
export function useRejectSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ settlementId, reason }: { settlementId: string; reason: string }) =>
      settlementService.rejectSettlement(settlementId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
}

// ==================== Welfare Hooks ====================

/**
 * Hook for welfare programs
 */
export function useWelfarePrograms(filters?: { page?: number; size?: number; type?: string; status?: string }) {
  return useQuery<WelfareProgramListResponse>({
    queryKey: ['welfare', 'programs', filters],
    queryFn: () => welfareService.getPrograms(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for single welfare program
 */
export function useWelfareProgram(programId: string | undefined) {
  return useQuery<WelfareProgram>({
    queryKey: ['welfare', 'programs', programId],
    queryFn: () => welfareService.getProgram(programId!),
    enabled: !!programId,
    staleTime: 30000,
  });
}

/**
 * Hook for creating welfare program
 */
export function useCreateWelfareProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<WelfareProgram>) => welfareService.createProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welfare'] });
    },
  });
}

/**
 * Hook for updating welfare program
 */
export function useUpdateWelfareProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ programId, data }: { programId: string; data: Partial<WelfareProgram> }) =>
      welfareService.updateProgram(programId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welfare'] });
    },
  });
}

/**
 * Hook for welfare distributions
 */
export function useWelfareDistributions(filters?: { page?: number; size?: number; programId?: string; status?: string }) {
  return useQuery<WelfareDistributionListResponse>({
    queryKey: ['welfare', 'distributions', filters],
    queryFn: () => welfareService.getDistributions(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for welfare stats
 */
export function useWelfareStats() {
  return useQuery<WelfareStats>({
    queryKey: ['welfare', 'stats'],
    queryFn: () => welfareService.getStats(),
    staleTime: 60000,
  });
}

/**
 * Hook for welfare eligibility check
 */
export function useVerifyWelfareEligibility() {
  return useMutation({
    mutationFn: ({ userId, programId }: { userId: string; programId: string }) =>
      welfareService.verifyEligibility(userId, programId),
  });
}

/**
 * Hook for welfare impact analysis
 */
export function useWelfareImpact() {
  return useQuery({
    queryKey: ['welfare', 'impact'],
    queryFn: () => welfareService.getImpact(),
    staleTime: 120000,
  });
}

// ==================== Compliance Hooks (FDS/AML) ====================

/**
 * Hook for FDS alerts
 */
export function useFDSAlerts(filters?: { page?: number; size?: number; severity?: string; status?: string }) {
  return useQuery<FDSAlertListResponse>({
    queryKey: ['compliance', 'fds', 'alerts', filters],
    queryFn: () => complianceService.getFDSAlerts(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for updating FDS alert
 */
export function useUpdateFDSAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, data }: { alertId: string; data: { status?: string; resolution?: string; assignedTo?: string } }) =>
      complianceService.updateFDSAlert(alertId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'fds'] });
    },
  });
}

/**
 * Hook for FDS rules
 */
export function useFDSRules() {
  return useQuery<FDSRule[]>({
    queryKey: ['compliance', 'fds', 'rules'],
    queryFn: () => complianceService.getFDSRules(),
    staleTime: 60000,
  });
}

/**
 * Hook for FDS stats
 */
export function useFDSStats() {
  return useQuery<FDSStats>({
    queryKey: ['compliance', 'fds', 'stats'],
    queryFn: () => complianceService.getFDSStats(),
    staleTime: 30000,
  });
}

/**
 * Hook for AML cases
 */
export function useAMLCases(filters?: { page?: number; size?: number; type?: string; status?: string; priority?: string }) {
  return useQuery<AMLCaseListResponse>({
    queryKey: ['compliance', 'aml', 'cases', filters],
    queryFn: () => complianceService.getAMLCases(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for single AML case
 */
export function useAMLCase(caseId: string | undefined) {
  return useQuery<AMLCase>({
    queryKey: ['compliance', 'aml', 'cases', caseId],
    queryFn: () => complianceService.getAMLCase(caseId!),
    enabled: !!caseId,
    staleTime: 30000,
  });
}

/**
 * Hook for updating AML case
 */
export function useUpdateAMLCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Partial<AMLCase> }) =>
      complianceService.updateAMLCase(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'aml'] });
    },
  });
}

/**
 * Hook for AML stats
 */
export function useAMLStats() {
  return useQuery<AMLStats>({
    queryKey: ['compliance', 'aml', 'stats'],
    queryFn: () => complianceService.getAMLStats(),
    staleTime: 30000,
  });
}

/**
 * Hook for risk score
 */
export function useRiskScore(entityType: 'user' | 'merchant' | undefined, entityId: string | undefined) {
  return useQuery<RiskScore>({
    queryKey: ['compliance', 'risk-score', entityType, entityId],
    queryFn: () => complianceService.getRiskScore(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
    staleTime: 60000,
  });
}

/**
 * Hook for AML screening
 */
export function useAMLScreening() {
  return useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: 'user' | 'merchant'; entityId: string }) =>
      complianceService.screenEntity(entityType, entityId),
  });
}

// ==================== Carbon Hooks ====================

/**
 * Hook for carbon balance
 */
export function useCarbonBalance() {
  return useQuery<CarbonBalance>({
    queryKey: ['carbon', 'balance'],
    queryFn: () => carbonService.getBalance(),
    staleTime: 30000,
  });
}

/**
 * Hook for carbon history
 */
export function useCarbonHistory(filters?: { page?: number; size?: number; type?: 'earn' | 'redeem' | 'expire'; activityType?: ActivityType }) {
  return useQuery<CarbonHistoryResponse>({
    queryKey: ['carbon', 'history', filters],
    queryFn: () => carbonService.getHistory(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for carbon impact
 */
export function useCarbonImpact() {
  return useQuery<CarbonImpact>({
    queryKey: ['carbon', 'impact'],
    queryFn: () => carbonService.getImpact(),
    staleTime: 60000,
  });
}

/**
 * Hook for carbon leaderboard
 */
export function useCarbonLeaderboard(period: 'all' | 'month' | 'week' = 'all', limit: number = 10) {
  return useQuery<CarbonLeaderboard>({
    queryKey: ['carbon', 'leaderboard', period, limit],
    queryFn: () => carbonService.getLeaderboard(period, limit),
    staleTime: 60000,
  });
}

/**
 * Hook for earning carbon points
 */
export function useEarnCarbonPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: carbonService.earn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carbon'] });
    },
  });
}

/**
 * Hook for redeeming carbon points
 */
export function useRedeemCarbonPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: carbonService.redeem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carbon'] });
    },
  });
}

// ==================== Loyalty Hooks ====================

/**
 * Hook for loyalty balance
 */
export function useLoyaltyBalance() {
  return useQuery<LoyaltyBalance>({
    queryKey: ['loyalty', 'balance'],
    queryFn: () => loyaltyService.getBalance(),
    staleTime: 30000,
  });
}

/**
 * Hook for loyalty history
 */
export function useLoyaltyHistory(filters?: { page?: number; limit?: number; type?: 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus' }) {
  return useQuery<LoyaltyHistoryResponse>({
    queryKey: ['loyalty', 'history', filters],
    queryFn: () => loyaltyService.getHistory(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for loyalty tiers
 */
export function useLoyaltyTiers() {
  return useQuery<LoyaltyTiersResponse>({
    queryKey: ['loyalty', 'tiers'],
    queryFn: () => loyaltyService.getTiers(),
    staleTime: 300000,
  });
}

/**
 * Hook for loyalty rewards
 */
export function useLoyaltyRewards(filters?: { page?: number; limit?: number; type?: 'voucher' | 'product' | 'experience' | 'cashback'; merchantId?: string }) {
  return useQuery<LoyaltyRewardsResponse>({
    queryKey: ['loyalty', 'rewards', filters],
    queryFn: () => loyaltyService.getRewards(filters),
    staleTime: 60000,
  });
}

/**
 * Hook for redeeming loyalty points
 */
export function useRedeemLoyaltyPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (points: number) => loyaltyService.redeem(points),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

/**
 * Hook for redeeming a loyalty reward
 */
export function useRedeemLoyaltyReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rewardId: string) => loyaltyService.redeemReward(rewardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty'] });
    },
  });
}

// ==================== Donation Hooks ====================

/**
 * Hook for donation campaigns
 */
export function useDonationCampaigns(filters?: { category?: CampaignCategory; search?: string; limit?: number; offset?: number }) {
  return useQuery<DonationCampaignListResponse>({
    queryKey: ['donations', 'campaigns', filters],
    queryFn: () => donationService.getCampaigns(filters),
    staleTime: 60000,
  });
}

/**
 * Hook for single donation campaign
 */
export function useDonationCampaign(campaignId: string | undefined) {
  return useQuery<CampaignDetailResponse>({
    queryKey: ['donations', 'campaigns', campaignId],
    queryFn: () => donationService.getCampaign(campaignId!),
    enabled: !!campaignId,
    staleTime: 30000,
  });
}

/**
 * Hook for my donations
 */
export function useMyDonations(filters?: { limit?: number; offset?: number }) {
  return useQuery<MyDonationsResponse>({
    queryKey: ['donations', 'my', filters],
    queryFn: () => donationService.getMyDonations(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for making a donation
 */
export function useMakeDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: donationService.donate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

// ==================== Credit Hooks ====================

/**
 * Hook for credit score
 */
export function useCreditScore() {
  return useQuery<CreditScore>({
    queryKey: ['credit', 'score'],
    queryFn: () => creditService.getScore(),
    staleTime: 60000,
  });
}

/**
 * Hook for detailed credit score
 */
export function useCreditScoreDetail() {
  return useQuery<CreditScoreDetail>({
    queryKey: ['credit', 'score', 'detail'],
    queryFn: () => creditService.getScoreDetail(),
    staleTime: 60000,
  });
}

/**
 * Hook for credit applications
 */
export function useCreditApplications(filters?: { page?: number; size?: number; status?: string }) {
  return useQuery<CreditApplicationListResponse>({
    queryKey: ['credit', 'applications', filters],
    queryFn: () => creditService.getApplications(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for applying for credit
 */
export function useApplyForCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: creditService.apply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit'] });
    },
  });
}

// ==================== Delivery Hooks ====================

/**
 * Hook for consumer's delivery orders
 */
export function useMyDeliveryOrders(filters?: { page?: number; size?: number; status?: string }) {
  return useQuery<DeliveryOrderListResponse>({
    queryKey: ['delivery', 'orders', 'my', filters],
    queryFn: () => deliveryService.getMyOrders(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for delivery order detail
 */
export function useDeliveryOrder(orderId: string | undefined) {
  return useQuery<DeliveryOrderDetail>({
    queryKey: ['delivery', 'orders', orderId],
    queryFn: () => deliveryService.getOrder(orderId!),
    enabled: !!orderId,
    staleTime: 10000,
  });
}

/**
 * Hook for merchant's delivery orders
 */
export function useMerchantDeliveryOrders(filters?: { page?: number; size?: number; status?: string }) {
  return useQuery<DeliveryOrderListResponse>({
    queryKey: ['delivery', 'orders', 'merchant', filters],
    queryFn: () => deliveryService.getMerchantOrders(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for merchant delivery stats
 */
export function useMerchantDeliveryStats() {
  return useQuery<DeliveryStats>({
    queryKey: ['delivery', 'stats', 'merchant'],
    queryFn: () => deliveryService.getMerchantStats(),
    staleTime: 60000,
  });
}

/**
 * Hook for creating delivery order
 */
export function useCreateDeliveryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deliveryService.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

/**
 * Hook for updating order status (merchant)
 */
export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status, note, estimatedMinutes }: { orderId: string; status: string; note?: string; estimatedMinutes?: number }) =>
      deliveryService.updateOrderStatus(orderId, status, note, estimatedMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery'] });
    },
  });
}

/**
 * Hook for cancelling order
 */
export function useCancelDeliveryOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      deliveryService.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery'] });
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
  useMerchantDetail,
  useMerchantsList,
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
  // Coupons
  useCoupons,
  useMyCoupons,
  useCouponDetail,
  useClaimCoupon,
  useUseCoupon,
  useOffers,
  useCouponStats,
  // Employees
  useEmployees,
  useEmployee,
  useAddEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useInviteEmployee,
  useRevokeEmployee,
  useActivateEmployee,
  // Admin
  useAuditLogs,
  useAdminDashboard,
  useAdminVouchers,
  useAdminUserStats,
  useVerifyMerchant,
  useSuspendMerchant,
  // Settlements
  useSettlements,
  useBackendMerchantSettlements,
  useSettlementDetail,
  useSettlementStats,
  useSettlementCalendar,
  usePendingSettlements,
  useApproveSettlement,
  useRejectSettlement,
  // Welfare
  useWelfarePrograms,
  useWelfareProgram,
  useCreateWelfareProgram,
  useUpdateWelfareProgram,
  useWelfareDistributions,
  useWelfareStats,
  useVerifyWelfareEligibility,
  useWelfareImpact,
  // Compliance (FDS/AML)
  useFDSAlerts,
  useUpdateFDSAlert,
  useFDSRules,
  useFDSStats,
  useAMLCases,
  useAMLCase,
  useUpdateAMLCase,
  useAMLStats,
  useRiskScore,
  useAMLScreening,
  // Carbon
  useCarbonBalance,
  useCarbonHistory,
  useCarbonImpact,
  useCarbonLeaderboard,
  useEarnCarbonPoints,
  useRedeemCarbonPoints,
  // Loyalty
  useLoyaltyBalance,
  useLoyaltyHistory,
  useLoyaltyTiers,
  useLoyaltyRewards,
  useRedeemLoyaltyPoints,
  useRedeemLoyaltyReward,
  // Donations
  useDonationCampaigns,
  useDonationCampaign,
  useMyDonations,
  useMakeDonation,
  // Credit
  useCreditScore,
  useCreditScoreDetail,
  useCreditApplications,
  useApplyForCredit,
  // Delivery
  useMyDeliveryOrders,
  useDeliveryOrder,
  useMerchantDeliveryOrders,
  useMerchantDeliveryStats,
  useCreateDeliveryOrder,
  useUpdateDeliveryStatus,
  useCancelDeliveryOrder,
};
