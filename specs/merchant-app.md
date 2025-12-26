# Merchant App Specification

> Dongbaek merchant management application for Busan local businesses

## Overview

The Merchant app enables local businesses to:
- Receive B-Coin payments
- Manage transactions and settlements
- View sales analytics
- Manage employees and permissions

## User Flows

### 1. Receive Payment Flow
```
Dashboard → Scan/Show QR → Customer Pays → Notification → History
```

### 2. Settlement Flow
```
Dashboard → Wallet → Withdraw → Confirm → Bank Transfer
```

### 3. Employee Management Flow
```
Profile → Employees → Add/Edit → Set Permissions → Save
```

---

## Screens

### Login Screen
**Source**: `merchant_login_screen/code.html`

**Components**:
- Merchant Portal branding
- Email/Merchant ID input
- Password input with toggle
- Keep me logged in checkbox
- Forgot Password link
- Login button
- Biometric Login option
- Apply for merchant account link

**Validation**:
- Email format
- Password min length

---

### Dashboard Screen
**Source**: `merchant_dashboard_1~4/code.html`

**Components**:
- Greeting section
- Total balance card with trend indicator
- Exchange and Withdraw buttons
- Quick actions grid (Receive QR, History, Staff, Reports)
- Horizontal stats row (Today's Sales, Tx Count, Avg Ticket)
- Sales trend chart (7 days)
- Recent transactions list
- Bottom navigation (Home, Wallet, QR FAB, Staff, Settings)

**Data**:
- Merchant balance
- Today's sales summary
- Transaction count
- Weekly trend data
- Recent transactions (last 5)

---

### Payment Management Screen
**Source**: `payment_management_screen_1~3/code.html`

**Components**:
- Search and filter bar
- Date range selector
- Transaction list with status
- Pagination
- Export options
- Refund actions

**Filters**:
- Date range
- Status (All, Confirmed, Pending, Failed)
- Type (Payment, Refund)
- Amount range

---

### Employee Management Screen
**Source**: `employee_management_screen/code.html`

**Components**:
- Team members list
- Search bar
- Status filter (All, Active, Pending, Revoked)
- Employee cards with:
  - Avatar/photo
  - Name and ID
  - Role (Manager, Cashier)
  - Permission level (Full Access, POS Only)
  - Status indicator
  - More options menu
- Add employee FAB

**Data**:
- Employee list
- Permissions matrix
- Activity status

---

### Merchant Profile Settings Screen
**Source**: `merchant_profile_settings_screen_1~2/code.html`

**Components**:
- Store information section
  - Store name
  - Business registration number
  - Category
  - Description
- Business hours editor
- Contact details
- Address with map
- Payment settings
  - QR code refresh
  - Auto-settlement toggle
  - Settlement account

---

### Notifications Screen
**Source**: `merchant_notifications_screen/code.html`

**Components**:
- Notification list by category
- Mark as read actions
- Notification types:
  - Payment received
  - Settlement completed
  - System alerts
  - Customer inquiries
- Clear all button

---

### Dongbaek Tong Integration Screen
**Source**: `dongbaek_tong_merchant_integration_screen/code.html`

**Components**:
- Store status toggle
- Performance metrics (Today's Orders, DT Revenue, Views)
- Quick actions grid (Store Profile, Menu Items, Promotions, Settlement)
- Promotional banner
- Recent activity feed

---

## Data Models

### Merchant
```typescript
interface Merchant {
  id: string;
  name: string;
  businessNumber: string;
  category: string;
  description?: string;
  address: string;
  phone: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
}
```

### MerchantWallet
```typescript
interface MerchantWallet {
  id: string;
  merchantId: string;
  balance: number;
  pendingBalance: number;
  settlementAccount: {
    bankName: string;
    accountNumber: string;
    holderName: string;
  };
}
```

### Employee
```typescript
interface Employee {
  id: string;
  merchantId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'manager' | 'cashier';
  permissions: Permission[];
  status: 'active' | 'pending' | 'revoked';
  lastActiveAt?: string;
  createdAt: string;
}

type Permission = 'full_access' | 'pos_only' | 'view_reports' | 'manage_staff';
```

### MerchantTransaction
```typescript
interface MerchantTransaction {
  id: string;
  txId: string;
  merchantId: string;
  customerId: string;
  customerName: string;
  amount: number;
  type: 'payment' | 'refund';
  status: 'confirmed' | 'pending' | 'failed';
  createdAt: string;
}
```

---

## Routes

```
/merchant/login       → Login
/merchant             → Dashboard
/merchant/wallet      → Wallet
/merchant/scan        → QR Scanner/Display
/merchant/history     → Payment Management
/merchant/employees   → Employee Management
/merchant/settings    → Profile Settings
/merchant/notifications → Notifications
/merchant/dongbaek    → Dongbaek Tong Integration
```

---

## Priority

| Screen | Priority | Status |
|--------|----------|--------|
| Login | P0 | Not started |
| Dashboard | P0 | Partial (existing) |
| Payment Management | P0 | Not started |
| QR Scan/Display | P0 | Partial (existing) |
| Wallet | P1 | Partial (existing) |
| Employee Management | P1 | Not started |
| Profile Settings | P1 | Not started |
| Notifications | P1 | Not started |
| Dongbaek Tong | P2 | Not started |
