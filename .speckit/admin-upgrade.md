# Admin System Upgrade Specification

> Blockchain-Based Web Admin Dashboard for LocalPay Platform
> Updated: 2024-12-28

---

## Overview

Transform the mobile-first Admin system into a professional web-based dashboard with real blockchain integration for audit trails, statistics, and verification.

### Key Objectives

1. **Web-First Layout**: Desktop sidebar navigation replacing mobile BottomNav
2. **Blockchain Integration**: Real Xphere chain anchoring for audit trails
3. **DID-BaaS Integration**: Identity verification via our DID-BaaS service
4. **Advanced Analytics**: Comprehensive statistics and reporting
5. **TanStack Integration**: Modern data fetching and table management

---

## Technology Stack

### Core Libraries

| Library | Purpose | Version |
|---------|---------|---------|
| @tanstack/react-query | Server state management | ^5.x |
| @tanstack/react-table | Data tables | ^8.x |
| ethers | Xphere blockchain interaction | ^6.x |
| recharts | Advanced charts | ^3.x |

### External Services

| Service | URL | Purpose |
|---------|-----|---------|
| Xphere Chain | RPC: https://rpc.xphere.io | Blockchain network |
| DID-BaaS API | https://trendy.storydot.kr/did-baas/api/v1/ | DID/VC management |
| Tamsa Explorer | https://xp.tamsa.io | Block/TX verification |

### Xphere Network Configuration

```typescript
const XPHERE_CONFIG = {
  chainId: 20250217,
  chainName: 'Xphere Mainnet',
  rpcUrl: 'https://rpc.xphere.io',
  explorerUrl: 'https://xp.tamsa.io',
  nativeCurrency: {
    name: 'XP',
    symbol: 'XP',
    decimals: 18,
  },
};
```

### DID-BaaS Configuration

```typescript
const DID_BAAS_CONFIG = {
  baseUrl: 'https://trendy.storydot.kr/did-baas/api/v1',
  swaggerUrl: 'https://trendy.storydot.kr/did-baas/api/swagger-ui.html',
  endpoints: {
    auth: '/auth',
    did: '/did',
    credentials: '/credentials',
    verify: '/w3c/verify',
    batch: '/batch',
    webhooks: '/webhooks',
  },
};
```

---

## Architecture

### Admin Layout Structure

```
+----------------------------------------------------------+
|  TopBar: Logo | Global Search | Notifications | Profile  |
+------------+---------------------------------------------+
|            |                                             |
|  Sidebar   |   Main Content Area                         |
|  --------  |                                             |
|  Dashboard |   +---------------------------------------+ |
|  Analytics |   |  Breadcrumbs                          | |
|  Users     |   +---------------------------------------+ |
|  Merchants |   |                                       | |
|  Vouchers  |   |  Page Content                         | |
|  Audit     |   |  - Charts                             | |
|  Blockchain|   |  - Data Tables                        | |
|  Policies  |   |  - Forms                              | |
|  Settings  |   |                                       | |
|            |   +---------------------------------------+ |
|  [Collapse]|                                             |
+------------+---------------------------------------------+
```

### File Structure

```
src/
├── components/
│   ├── admin/
│   │   ├── AdminLayout.tsx       # Web layout with sidebar
│   │   ├── AdminSidebar.tsx      # Collapsible sidebar
│   │   ├── AdminTopBar.tsx       # Top navigation bar
│   │   ├── AdminBreadcrumbs.tsx  # Breadcrumb navigation
│   │   └── index.ts
│   └── common/
│       ├── DataTable.tsx         # TanStack Table wrapper
│       ├── QueryProvider.tsx     # TanStack Query provider
│       └── ...
├── services/
│   ├── blockchain/
│   │   ├── xphere.ts             # Xphere chain connection
│   │   ├── auditAnchor.ts        # Audit log anchoring
│   │   ├── merkleTree.ts         # Merkle proof generation
│   │   └── explorer.ts           # Tamsa explorer integration
│   ├── did/
│   │   ├── client.ts             # DID-BaaS client
│   │   ├── credentials.ts        # VC management
│   │   └── resolver.ts           # DID resolution
│   └── api/
│       ├── admin.ts              # Admin API endpoints
│       └── hooks.ts              # TanStack Query hooks
├── screens/admin/
│   ├── Dashboard.tsx             # Updated dashboard
│   ├── Analytics.tsx             # NEW: Analytics hub
│   ├── BlockchainExplorer.tsx    # NEW: Chain explorer
│   ├── AuditLogs.tsx             # Enhanced audit logs
│   └── ...
└── types/
    ├── blockchain.ts             # Blockchain types
    └── did.ts                    # DID/VC types
```

---

## Implementation Phases

### Phase 1: Web Layout (Priority: HIGH)

#### 1.1 Admin Layout Components

- [ ] Create `AdminLayout.tsx` - Desktop-first responsive layout
- [ ] Create `AdminSidebar.tsx` - Collapsible sidebar with icons
- [ ] Create `AdminTopBar.tsx` - Search, notifications, profile
- [ ] Create `AdminBreadcrumbs.tsx` - Navigation breadcrumbs
- [ ] Update router to use new AdminLayout

#### 1.2 TanStack Integration

- [ ] Install @tanstack/react-query, @tanstack/react-table
- [ ] Create QueryProvider with devtools
- [ ] Create reusable DataTable component
- [ ] Create API hooks factory

#### 1.3 Sidebar Navigation

```typescript
const adminNavItems = [
  { path: '/admin', icon: 'dashboard', label: 'Dashboard' },
  { path: '/admin/analytics', icon: 'analytics', label: 'Analytics' },
  { path: '/admin/users', icon: 'people', label: 'Users' },
  { path: '/admin/merchants', icon: 'storefront', label: 'Merchants' },
  { path: '/admin/vouchers', icon: 'confirmation_number', label: 'Vouchers' },
  { path: '/admin/audit', icon: 'history', label: 'Audit Logs' },
  { path: '/admin/blockchain', icon: 'token', label: 'Blockchain' },
  { path: '/admin/policies', icon: 'policy', label: 'Policies' },
  { path: '/admin/settlements', icon: 'payments', label: 'Settlements' },
  { path: '/admin/aml', icon: 'security', label: 'AML' },
  { path: '/admin/settings', icon: 'settings', label: 'Settings' },
];
```

---

### Phase 2: Blockchain Integration (Priority: HIGH)

#### 2.1 Xphere Chain Service

```typescript
// src/services/blockchain/xphere.ts
interface XphereService {
  connect(): Promise<void>;
  getBlockHeight(): Promise<number>;
  getTransaction(hash: string): Promise<Transaction>;
  getBlock(numberOrHash: string | number): Promise<Block>;
  anchorData(data: string): Promise<string>; // Returns TX hash
  verifyAnchor(txHash: string, data: string): Promise<boolean>;
}
```

#### 2.2 Audit Anchoring Service

```typescript
// src/services/blockchain/auditAnchor.ts
interface AuditAnchorService {
  anchorLog(log: AuditLogEntry): Promise<AnchorResult>;
  anchorBatch(logs: AuditLogEntry[]): Promise<BatchAnchorResult>;
  verifyLog(log: AuditLogEntry): Promise<VerificationResult>;
  getMerkleProof(logId: string): Promise<MerkleProof>;
}

interface AnchorResult {
  txHash: string;
  blockNumber: number;
  timestamp: number;
  merkleRoot: string;
}
```

#### 2.3 Explorer Integration

```typescript
// src/services/blockchain/explorer.ts
interface TamsaExplorer {
  getTxUrl(hash: string): string;
  getBlockUrl(number: number): string;
  getAddressUrl(address: string): string;
  fetchTxDetails(hash: string): Promise<TxDetails>;
}

// URL patterns
const TAMSA_URLS = {
  tx: 'https://xp.tamsa.io/tx/{hash}',
  block: 'https://xp.tamsa.io/block/{number}',
  address: 'https://xp.tamsa.io/address/{address}',
};
```

---

### Phase 3: DID-BaaS Integration (Priority: HIGH)

#### 3.1 DID Client Service

```typescript
// src/services/did/client.ts
interface DidBaasClient {
  // Authentication
  login(email: string, password: string): Promise<AuthResponse>;
  refreshToken(): Promise<string>;

  // DID Operations
  issueDid(metadata?: Record<string, unknown>): Promise<Did>;
  resolveDid(didAddress: string): Promise<DidDocument>;
  verifyDid(didAddress: string): Promise<VerifyDidResponse>;
  revokeDid(didAddress: string, reason: string): Promise<void>;

  // Credentials
  issueCredential(request: IssueCredentialRequest): Promise<VerifiableCredential>;
  verifyCredential(vc: VerifiableCredential): Promise<VerificationResult>;
  revokeCredential(credentialId: string): Promise<void>;

  // Batch Operations
  batchIssueDids(count: number): Promise<Did[]>;
  batchIssueCredentials(requests: IssueCredentialRequest[]): Promise<VerifiableCredential[]>;
}
```

#### 3.2 Credential Types for LocalPay

```typescript
// LocalPay-specific credential types
type LocalPayCredentialType =
  | 'ResidentCredential'      // Jeonbuk resident
  | 'YouthCredential'         // Age 19-34
  | 'SeniorCredential'        // Age 65+
  | 'MerchantCredential'      // Verified merchant
  | 'WelfareCredential'       // Welfare recipient
  | 'DisabilityCredential'    // Disability status
  | 'FarmerCredential'        // Farmer/agricultural
  | 'CarbonCredential';       // Carbon point eligibility

interface LocalPayCredentialSubject {
  id: string;                 // DID of the subject
  type: LocalPayCredentialType;
  issuedBy: string;           // Issuing authority
  validFrom: string;
  validUntil?: string;
  attributes: Record<string, unknown>;
}
```

---

### Phase 4: Enhanced Audit System (Priority: HIGH)

#### 4.1 Audit Log Structure

```typescript
interface EnhancedAuditLog {
  // Basic Info
  id: string;
  timestamp: string;
  action: AuditActionType;

  // Actor Info
  actorId: string;
  actorType: 'consumer' | 'merchant' | 'admin' | 'system';
  actorDid?: string;

  // Target Info
  targetType: string;
  targetId: string;

  // Change Tracking
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;

  // Blockchain Anchoring
  blockchain: {
    network: 'xphere';
    txHash: string;
    blockNumber: number;
    blockTimestamp: number;
    merkleRoot: string;
    merkleProof: string[];
  };

  // Digital Signature
  signature: {
    algorithm: 'ECDSA' | 'BBS+';
    value: string;
    signedBy: string; // DID
    signedAt: string;
  };

  // Verification
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}
```

#### 4.2 Hash Chain Implementation

```typescript
// Each log includes previous log's hash for chain integrity
interface HashChainLog extends EnhancedAuditLog {
  previousLogHash: string;
  currentLogHash: string;
}

// Hash calculation
function calculateLogHash(log: AuditLog, previousHash: string): string {
  const data = JSON.stringify({
    id: log.id,
    timestamp: log.timestamp,
    action: log.action,
    actorId: log.actorId,
    targetId: log.targetId,
    previousHash,
  });
  return keccak256(data);
}
```

---

### Phase 5: Analytics Dashboard (Priority: MEDIUM)

#### 5.1 Analytics Components

- [ ] Transaction Volume Chart (hourly/daily/weekly/monthly)
- [ ] User Growth Chart (cumulative/new users)
- [ ] Regional Heatmap (Jeonbuk districts)
- [ ] Merchant Category Distribution (pie chart)
- [ ] Settlement Status Overview
- [ ] Carbon Impact Metrics
- [ ] Welfare Distribution Analytics

#### 5.2 Real-time Metrics

```typescript
interface PlatformMetrics {
  // Volume
  totalIssuance: number;
  volume24h: number;
  volumeChange24h: number;

  // Users
  activeUsers: number;
  newUsers24h: number;
  userGrowthRate: number;

  // Merchants
  activeMerchants: number;
  pendingMerchants: number;
  merchantApprovalRate: number;

  // Blockchain
  blockHeight: number;
  anchoredLogs: number;
  verificationRate: number;

  // Carbon
  totalCarbonPoints: number;
  co2Saved: number;
}
```

---

### Phase 6: Blockchain Explorer Screen (Priority: MEDIUM)

#### 6.1 Explorer Features

- Block search by number/hash
- Transaction search by hash
- Address lookup
- Audit log verification
- Merkle proof visualization
- Link to Tamsa explorer

#### 6.2 Explorer Component

```typescript
interface BlockchainExplorerProps {
  // Search
  searchQuery: string;
  searchType: 'block' | 'tx' | 'address' | 'audit';

  // Results
  latestBlocks: Block[];
  latestTransactions: Transaction[];
  auditAnchors: AnchorResult[];
}
```

---

## API Integration

### TanStack Query Hooks

```typescript
// src/services/api/hooks.ts
export function useAuditLogs(filters: AuditFilters) {
  return useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: () => fetchAuditLogs(filters),
    staleTime: 30000,
  });
}

export function usePlatformMetrics() {
  return useQuery({
    queryKey: ['platformMetrics'],
    queryFn: fetchPlatformMetrics,
    refetchInterval: 10000, // Real-time updates
  });
}

export function useBlockchainStatus() {
  return useQuery({
    queryKey: ['blockchainStatus'],
    queryFn: fetchBlockchainStatus,
    refetchInterval: 5000,
  });
}

export function useVerifyAuditLog() {
  return useMutation({
    mutationFn: (logId: string) => verifyAuditLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}
```

---

## Routes

```typescript
const adminRoutes = [
  { path: '/admin', element: <AdminDashboard /> },
  { path: '/admin/analytics', element: <Analytics /> },
  { path: '/admin/users', element: <Users /> },
  { path: '/admin/merchants', element: <Merchants /> },
  { path: '/admin/vouchers', element: <Vouchers /> },
  { path: '/admin/audit', element: <AuditLogs /> },
  { path: '/admin/blockchain', element: <BlockchainExplorer /> },
  { path: '/admin/policies', element: <Policies /> },
  { path: '/admin/settlements', element: <Settlements /> },
  { path: '/admin/aml', element: <AMLDashboard /> },
  { path: '/admin/carbon', element: <CarbonAdmin /> },
  { path: '/admin/donations', element: <DonationCampaigns /> },
  { path: '/admin/tokens', element: <TokenIssuance /> },
  { path: '/admin/settings', element: <Settings /> },
];
```

---

## Security Considerations

### Admin Authentication

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Session management with timeout
- Two-factor authentication (2FA) ready
- Audit logging for all admin actions

### Blockchain Security

- Transaction signing with admin keys
- Multi-signature for critical operations
- Rate limiting on anchor operations
- Verification before display

---

## Testing Strategy

### Unit Tests

- Blockchain service mocking
- DID-BaaS API mocking
- Component isolation tests

### Integration Tests

- Xphere testnet connection
- DID-BaaS staging environment
- End-to-end audit flow

### E2E Tests

- Admin workflow scenarios
- Blockchain verification flows
- Report generation

---

## Deployment

### Environment Variables

```env
# Xphere
VITE_XPHERE_RPC_URL=https://rpc.xphere.io
VITE_XPHERE_CHAIN_ID=20250217
VITE_XPHERE_EXPLORER_URL=https://xp.tamsa.io

# DID-BaaS
VITE_DID_BAAS_URL=https://trendy.storydot.kr/did-baas/api/v1
VITE_DID_BAAS_API_KEY=

# Admin
VITE_ADMIN_API_URL=
```

---

## Progress Tracking

### Phase 1: Web Layout
- [ ] AdminLayout.tsx
- [ ] AdminSidebar.tsx
- [ ] AdminTopBar.tsx
- [ ] TanStack Query setup
- [ ] TanStack Table setup
- [ ] Update all admin screens

### Phase 2: Blockchain
- [ ] Xphere service
- [ ] Audit anchor service
- [ ] Merkle tree service
- [ ] Explorer integration

### Phase 3: DID-BaaS
- [ ] DID client service
- [ ] Credential service
- [ ] Resolver integration

### Phase 4: Audit Enhancement
- [ ] Hash chain implementation
- [ ] Real anchoring
- [ ] Verification UI

### Phase 5: Analytics
- [ ] Analytics dashboard
- [ ] Advanced charts
- [ ] Report generation

### Phase 6: Explorer
- [ ] Blockchain explorer screen
- [ ] Search functionality
- [ ] Verification UI
