/**
 * Xphere Blockchain Configuration
 */

export const XPHERE_CONFIG = {
  chainId: 20250217,
  chainName: 'Xphere Mainnet',
  rpcUrl: import.meta.env.VITE_XPHERE_RPC_URL || 'https://en-bkk.x-phere.com',
  explorerUrl: import.meta.env.VITE_XPHERE_EXPLORER_URL || 'https://xp.tamsa.io',
  nativeCurrency: {
    name: 'XP',
    symbol: 'XP',
    decimals: 18,
  },
} as const;

export const TAMSA_EXPLORER_URLS = {
  tx: (hash: string) => `${XPHERE_CONFIG.explorerUrl}/tx/${hash}`,
  block: (number: number | string) => `${XPHERE_CONFIG.explorerUrl}/block/${number}`,
  address: (address: string) => `${XPHERE_CONFIG.explorerUrl}/address/${address}`,
} as const;

export const DID_BAAS_CONFIG = {
  baseUrl: import.meta.env.VITE_DID_BAAS_URL || 'https://trendy.storydot.kr/did-baas/api/v1',
  swaggerUrl: 'https://trendy.storydot.kr/did-baas/api/swagger-ui.html',
  endpoints: {
    auth: {
      login: '/auth/login',
      refresh: '/auth/refresh',
      logout: '/auth/logout',
    },
    did: {
      issue: '/did/issue',
      resolve: '/did/resolve',
      verify: '/did/verify',
      revoke: '/did/revoke',
      list: '/did/list',
    },
    credentials: {
      issue: '/credentials/issue',
      verify: '/credentials/verify',
      revoke: '/credentials/revoke',
      list: '/credentials/list',
    },
    w3c: {
      verify: '/w3c/verify',
      presentation: '/w3c/presentation',
    },
    batch: {
      issueDids: '/batch/did/issue',
      issueCredentials: '/batch/credentials/issue',
    },
    webhooks: {
      register: '/webhooks/register',
      list: '/webhooks/list',
      delete: '/webhooks/delete',
    },
  },
} as const;

export type XphereConfig = typeof XPHERE_CONFIG;
export type DidBaasConfig = typeof DID_BAAS_CONFIG;
