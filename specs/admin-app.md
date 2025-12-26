# Admin App Specification

> Platform administration dashboard for LocalPay operators

## Overview

The Admin app enables platform operators to:
- Monitor system health and blockchain status
- Manage users and merchants
- Issue and manage vouchers
- Process settlements

## User Flows

### 1. Merchant Approval Flow
```
Dashboard → User Management → Pending Merchants → Review → Approve/Reject
```

### 2. Voucher Issuance Flow
```
Dashboard → Voucher Management → Create → Set Parameters → Issue
```

### 3. Settlement Processing Flow
```
Dashboard → Settlement → Review Batch → Verify → Process
```

---

## Screens

### Admin Dashboard
**Source**: `admin_dashboard/code.html`

**Components**:
- System status indicator (healthy/unhealthy)
- Block height tracking (blockchain)
- Platform stats cards:
  - Total Issuance
  - Active Users
  - 24h Volume
  - Pending Merchants
- Transaction volume chart (7-day comparison)
- Management quick links (Users, Merchants, Vouchers, Audit)
- Recent activity alerts
- Bottom navigation (Dashboard, Analytics, QR, Ledger, Settings)

**Data**:
- System health status
- Block height
- Platform metrics
- Volume chart data
- Recent alerts

---

### User & Merchant Management Screen
**Source**: `user_&_merchant_management_screen/code.html`

**Components**:
- Segmented tabs (Citizens, Merchants)
- Search bar (wallet ID, registration number)
- Stat cards (Pending, Active, Suspended)
- Merchant request section:
  - Pending applications list
  - Review/Decline buttons
- Management list:
  - User/Merchant items
  - Wallet address with copy
  - Status indicators
  - Last transaction time
  - Action menu

**Filters**:
- Status (All, Pending, Active, Suspended)
- Date range
- Search query

**Actions**:
- Approve merchant
- Reject merchant
- Suspend user/merchant
- Reactivate account

---

### Voucher Issuance & Management Screen
**Source**: `voucher_issuance_&_management_screen/code.html`

**Components**:
- Voucher creation form:
  - Name
  - Amount
  - Validity period
  - Target users
  - Usage limits
- Active vouchers list
- Usage statistics
- Distribution tracking
- Expiration management

**Voucher Types**:
- Welcome bonus
- Promotional campaign
- Government subsidy
- Partner rewards

---

### Settlement Management Screen
**Source**: `settlement_management_screen/code.html`

**Components**:
- Period selector (Daily, Weekly, Monthly)
- Total settled amount display
- Secondary stats (Pending, Error Rate)
- Discrepancy alert banner
- Search bar (Merchant ID, Batch #)
- Batch list:
  - Merchant name
  - Settlement amount
  - Batch number
  - Verification status
  - Status indicators
- Download daily report button
- Manual verification actions

**Settlement States**:
- Processing
- Verified
- Error
- Completed

---

## Data Models

### AdminUser
```typescript
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'operator' | 'viewer';
  permissions: AdminPermission[];
  lastLoginAt: string;
  createdAt: string;
}

type AdminPermission =
  | 'manage_users'
  | 'manage_merchants'
  | 'issue_vouchers'
  | 'process_settlements'
  | 'view_analytics'
  | 'system_config';
```

### PlatformStats
```typescript
interface PlatformStats {
  totalIssuance: number;
  activeUsers: number;
  activeMerchants: number;
  volume24h: number;
  pendingMerchants: number;
  blockHeight: number;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
}
```

### Voucher
```typescript
interface Voucher {
  id: string;
  name: string;
  code: string;
  amount: number;
  type: 'welcome' | 'promo' | 'subsidy' | 'partner';
  targetUserType: 'all' | 'new' | 'specific';
  targetUserIds?: string[];
  usageLimit: number;
  usageCount: number;
  validFrom: string;
  validUntil: string;
  status: 'active' | 'paused' | 'expired';
  createdAt: string;
  createdBy: string;
}
```

### SettlementBatch
```typescript
interface SettlementBatch {
  id: string;
  batchNumber: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  transactionCount: number;
  period: {
    from: string;
    to: string;
  };
  status: 'processing' | 'verified' | 'error' | 'completed';
  verifiedAt?: string;
  verifiedBy?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
}
```

### ActivityLog
```typescript
interface ActivityLog {
  id: string;
  type: 'merchant_application' | 'high_volume' | 'policy_update' | 'system_alert';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
  createdAt: string;
}
```

---

## Routes

```
/admin                → Dashboard
/admin/users          → User Management
/admin/merchants      → Merchant Management
/admin/vouchers       → Voucher Management
/admin/settlements    → Settlement Management
/admin/analytics      → Analytics (future)
/admin/ledger         → Blockchain Ledger (future)
/admin/settings       → System Settings (future)
```

---

## Priority

| Screen | Priority | Status |
|--------|----------|--------|
| Dashboard | P0 | Not started |
| User & Merchant Management | P0 | Not started |
| Voucher Management | P1 | Not started |
| Settlement Management | P1 | Not started |
| Analytics | P2 | Not started |
| Blockchain Ledger | P2 | Not started |
| System Settings | P2 | Not started |
