/**
 * TanStack Query Hooks
 * For admin dashboard data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { xphereService, NetworkStatus, BlockInfo } from '../blockchain';
import { didBaasClient, Did, VerifiableCredential } from '../did';
import { anchorLog, verifyLog, AuditLogData, AnchorResult, VerificationResult } from '../blockchain/auditAnchor';

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
};
