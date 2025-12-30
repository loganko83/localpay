# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LocalPay is a blockchain-based local digital currency payment platform for Busan/Jeonbuk, Korea. The platform serves three user types with distinct UIs:
- **Consumer** (`/consumer`): Citizens paying with B-Coin - Red theme (#ed2630)
- **Merchant** (`/merchant`): Local businesses receiving payments - Green theme (#13ec5b)
- **Admin** (`/admin`): Platform operators with web dashboard - Blue theme (#2b8cee)

## CRITICAL: Business & Legal Structure

### Core Principle: "Money handled by bank, Proof handled by technology"

This platform operates as a **non-financial technology partner** with IBK Bank under Korean Electronic Financial Transactions Act.

| Our Platform Does | IBK Bank Does |
|-------------------|---------------|
| User app/web UI | Prepaid instrument issuance |
| Policy engine | Deposit custody |
| Merchant management | Payment approval |
| DID/VC/Signatures | Refund execution |
| Audit logs/Blockchain | Settlement |

### Architecture Flow
```
[User] -> [Our App] -> [Bank API] -> [IBK] -> [Trust Account]

Our DB: "Logical balance display" ONLY
Actual funds: Bank's trust account (we never touch money)
```

### Prohibited Code Patterns
```typescript
// NEVER: Direct balance manipulation
wallet.balance -= amount;  // WRONG

// CORRECT: Request to bank, display returned value
const result = await bankAPI.requestPayment(amount);
wallet.balance = result.newBalance;  // Display what bank returns
```

### Documentation Language
- Use: "balance display", "policy management", "audit logging"
- Never use: "payment processing", "balance management", "refund execution"

See `.speckit/constitution.md` for full regulatory details.

---

## Commands

### Frontend (React + Vite)
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3003)
npm run build        # TypeScript check + Vite production build
npm run lint         # TypeScript type checking (tsc --noEmit)
npm run preview      # Preview production build
```

### Backend (Express + SQLite)
```bash
cd server
npm install          # Install server dependencies
npm run dev          # Start dev server with hot reload (tsx watch)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled server (port 8080)
```

### E2E Testing (Playwright)
```bash
npx playwright test                    # Run all tests
npx playwright test --project=chromium # Single browser
npx playwright test screens.spec.ts    # Single test file
```

---

## Deployment

- **Frontend**: https://trendy.storydot.kr/localpay/
- **API**: https://trendy.storydot.kr/localpay/api/
- **Server**: PM2 process `localpay-api` on port 8080
- **Nginx**: Proxies `/localpay/api/*` to backend

### Test Accounts
| Type | Email | Password |
|------|-------|----------|
| Consumer | user@localpay.kr | user123 |
| Merchant | merchant@localpay.kr | merchant123 |
| Admin | admin@localpay.kr | admin123 |

---

## Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript 5.8 + Vite 6 + Zustand + TanStack Query + Recharts
- **Backend**: Express + TypeScript + better-sqlite3 + JWT + bcryptjs

### Frontend Structure (`src/`)

| Directory | Purpose |
|-----------|---------|
| `components/common/` | Reusable UI (Button, Card, Input, Modal, Toggle) |
| `components/layout/` | ConsumerLayout, MerchantLayout with BottomNav |
| `components/admin/` | AdminLayout with sidebar navigation |
| `screens/{consumer,merchant,admin}/` | Role-specific screens (lazy-loaded) |
| `services/` | Business logic and API clients |
| `store/` | Zustand stores (auth, wallet, transaction, toast) |
| `router/` | Route configuration with lazy loading |

### Backend Structure (`server/src/`)

| File | Purpose |
|------|---------|
| `index.ts` | Express app setup, middleware, route mounting |
| `db/index.ts` | SQLite initialization, schema, seed data |
| `routes/auth.ts` | Login, logout, token refresh |
| `routes/wallet.ts` | Balance, charge, redeem vouchers |
| `routes/transactions.ts` | Payments, refunds, history |
| `routes/merchants.ts` | Merchant CRUD, dashboard, settlements |
| `routes/admin.ts` | Admin dashboard, audit logs, vouchers |
| `middleware/auth.ts` | JWT authentication, role guards |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/wallet/balance` | Get wallet balance |
| POST | `/api/wallet/charge` | Top-up wallet |
| POST | `/api/wallet/redeem` | Redeem voucher code |
| GET | `/api/transactions` | Transaction history |
| POST | `/api/transactions/payment` | Make payment |
| POST | `/api/transactions/refund` | Request refund |
| GET | `/api/merchants` | List merchants |
| GET | `/api/merchants/dashboard` | Merchant stats |
| GET | `/api/admin/audit-logs` | Audit log history |

### Blockchain Integration
- **Xphere**: EVM Layer1 (chainId: 20250217, RPC: https://en-bkk.x-phere.com)
- **Tamsa Explorer**: https://xp.tamsa.io
- **DID-BaaS**: https://trendy.storydot.kr/did-baas/api/v1

---

## Routing Structure

Routes defined in `src/router/index.tsx`. All screens are lazy-loaded.

| Path | Layout | Screens |
|------|--------|---------|
| `/` | None | AppSelector (user type chooser) |
| `/consumer/*` | ConsumerLayout | 19 screens (Home, Wallet, Scan, History, etc.) |
| `/merchant/*` | MerchantLayout | 13 screens (Dashboard, Payments, Employees, etc.) |
| `/admin/*` | AdminLayout | 19 screens (Dashboard, Analytics, FDS, AML, etc.) |
| `/debug` | None | DebugDashboard (dev only) |

---

## Spec-Kit Documentation

```
.speckit/
  constitution.md       # Legal/business principles (MUST READ)
  implementation-plan.md # Technical architecture
  tasks.md              # Sprint task tracking
  ibk-proposal.md       # IBK partnership details
```

**Always refer to specs before implementing new features.**

---

## Code Standards

- English only in source code (no Korean in comments/variables)
- No emojis in source files
- Korean text only in user-facing strings
- Path alias: `@/*` maps to `src/`
- Icons: Material Symbols (class="material-symbols-outlined")
