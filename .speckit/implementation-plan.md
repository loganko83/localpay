# Implementation Plan

> Technical architecture and implementation strategy for LocalPay

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        LocalPay App                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Consumer   │  │  Merchant   │  │   Admin     │          │
│  │    App      │  │    App      │  │    App      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│                    Shared Components                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Button  │ │  Card   │ │  Input  │ │  Modal  │  ...      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│                      State Management                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                     Zustand Store                    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │  Auth    │ │  Wallet  │ │  Tx      │   ...      │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                         Router                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               react-router-dom                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
localpay/
├── .speckit/                 # Spec-Kit artifacts
│   ├── constitution.md
│   ├── implementation-plan.md
│   └── tasks.md
├── specs/                    # Feature specifications
│   ├── consumer-app.md
│   ├── merchant-app.md
│   └── admin-app.md
├── src/
│   ├── components/
│   │   ├── common/           # Shared UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── index.ts
│   │   └── layout/           # Layout components
│   │       ├── Layout.tsx
│   │       ├── Header.tsx
│   │       ├── BottomNav.tsx
│   │       └── index.ts
│   ├── screens/
│   │   ├── consumer/         # Consumer screens
│   │   │   ├── Home.tsx
│   │   │   ├── Wallet.tsx
│   │   │   ├── Scan.tsx
│   │   │   ├── History.tsx
│   │   │   ├── Profile.tsx
│   │   │   └── index.ts
│   │   ├── merchant/         # Merchant screens
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Payments.tsx
│   │   │   ├── Employees.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── index.ts
│   │   └── admin/            # Admin screens
│   │       ├── Dashboard.tsx
│   │       ├── Users.tsx
│   │       ├── Vouchers.tsx
│   │       ├── Settlements.tsx
│   │       └── index.ts
│   ├── store/                # Zustand stores
│   │   ├── authStore.ts
│   │   ├── walletStore.ts
│   │   ├── transactionStore.ts
│   │   └── index.ts
│   ├── hooks/                # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useWallet.ts
│   │   └── index.ts
│   ├── types/                # TypeScript types
│   │   ├── user.ts
│   │   ├── transaction.ts
│   │   ├── merchant.ts
│   │   └── index.ts
│   ├── utils/                # Utility functions
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── index.ts
│   ├── styles/               # Global styles
│   │   ├── themes.ts
│   │   └── index.css
│   ├── router/               # Router configuration
│   │   └── index.tsx
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── CLAUDE.md
```

---

## Dependencies

### Production
```json
{
  "react": "^19.2.3",
  "react-dom": "^19.2.3",
  "react-router-dom": "^7.x",
  "zustand": "^5.x",
  "recharts": "^3.6.0"
}
```

### Development
```json
{
  "@vitejs/plugin-react": "^5.0.0",
  "typescript": "~5.8.2",
  "vite": "^6.2.0",
  "@types/react": "^19.x",
  "@types/react-dom": "^19.x"
}
```

---

## Routing Strategy

### Route Structure
```typescript
const routes = [
  // Landing / App Selector
  { path: '/', element: <AppSelector /> },

  // Consumer Routes
  { path: '/consumer', element: <ConsumerLayout />, children: [
    { index: true, element: <ConsumerHome /> },
    { path: 'wallet', element: <ConsumerWallet /> },
    { path: 'scan', element: <ConsumerScan /> },
    { path: 'history', element: <ConsumerHistory /> },
    { path: 'profile', element: <ConsumerProfile /> },
  ]},

  // Merchant Routes
  { path: '/merchant', children: [
    { path: 'login', element: <MerchantLogin /> },
    { path: '', element: <MerchantLayout />, children: [
      { index: true, element: <MerchantDashboard /> },
      { path: 'wallet', element: <MerchantWallet /> },
      { path: 'scan', element: <MerchantScan /> },
      { path: 'payments', element: <MerchantPayments /> },
      { path: 'employees', element: <MerchantEmployees /> },
      { path: 'settings', element: <MerchantSettings /> },
    ]},
  ]},

  // Admin Routes
  { path: '/admin', children: [
    { path: 'login', element: <AdminLogin /> },
    { path: '', element: <AdminLayout />, children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'vouchers', element: <AdminVouchers /> },
      { path: 'settlements', element: <AdminSettlements /> },
    ]},
  ]},
];
```

---

## State Management

### Store Structure
```typescript
// Auth Store
interface AuthState {
  user: User | null;
  userType: 'consumer' | 'merchant' | 'admin' | null;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

// Wallet Store
interface WalletState {
  balance: number;
  pendingBalance: number;
  cards: WalletCard[];
  fetchBalance: () => Promise<void>;
  topUp: (amount: number) => Promise<void>;
}

// Transaction Store
interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
}
```

---

## Component Design

### Button Variants
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}
```

### Card Variants
```typescript
interface CardProps {
  variant: 'default' | 'balance' | 'transaction' | 'stat';
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

### Theme Support
```typescript
type UserTheme = 'consumer' | 'merchant' | 'admin';

const themes: Record<UserTheme, ThemeConfig> = {
  consumer: {
    primary: '#ed2630',
    background: '#221011',
    surface: '#2a1617',
  },
  merchant: {
    primary: '#13ec5b',
    background: '#102216',
    surface: '#1c271f',
  },
  admin: {
    primary: '#2b8cee',
    background: '#101922',
    surface: '#1c242c',
  },
};
```

---

## Implementation Phases

### Phase 1: Foundation (Sprint 1)
1. Restructure project to src/ folder
2. Install dependencies (react-router-dom, zustand)
3. Setup routing configuration
4. Create shared components
5. Setup Zustand stores
6. Implement theme switching

### Phase 2: Consumer MVP (Sprint 2)
1. Consumer Home screen
2. Consumer Wallet screen
3. QR Scan screen
4. Payment Confirmation flow
5. Transaction History

### Phase 3: Consumer Extended (Sprint 3)
1. Top-up screens
2. Profile & Settings
3. Merchant Detail view
4. Promotional Offers

### Phase 4: Merchant MVP (Sprint 4)
1. Merchant Login
2. Merchant Dashboard
3. Payment Management
4. QR display/scanner

### Phase 5: Merchant Extended (Sprint 5)
1. Employee Management
2. Merchant Settings
3. Notifications
4. Dongbaek Tong Integration

### Phase 6: Admin (Sprint 6)
1. Admin Dashboard
2. User/Merchant Management
3. Voucher Management
4. Settlement Management
