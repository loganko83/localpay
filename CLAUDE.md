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
| `db/index.ts` | SQLite initialization, schema (40+ tables), seed data |
| `middleware/auth.ts` | JWT authentication, role guards (`requireUserType`) |

**Route Modules (23 files):**

| Category | Routes | Description |
|----------|--------|-------------|
| Core | `auth`, `wallet`, `transactions`, `users` | Authentication, balance, payments |
| Business | `merchants`, `admin`, `settlements` | Merchant ops, admin dashboard |
| Loyalty | `loyalty`, `coupons`, `carbon` | Points, offers, ESG rewards |
| Compliance | `compliance`, `security`, `identity` | FDS/AML, DID/VC, API keys |
| Services | `welfare`, `credit`, `donations` | Corporate benefits, credit scoring |
| Operations | `delivery`, `tourist`, `employees` | Delivery, tourism, staff management |
| Blockchain | `tokens`, `blockchain`, `traceability` | Token lifecycle, audit anchoring |
| System | `notifications` | Push notifications, device tokens |

### Authentication & Authorization

```typescript
// JWT payload structure
{
  userId: string,
  userType: 'consumer' | 'merchant' | 'admin',
  email: string,
  merchantId?: string,  // Only for merchant users
  iat: number,
  exp: number
}

// Role-based route protection
router.post('/refund', authenticate, requireUserType('merchant'), ...)
router.get('/dashboard', authenticate, requireUserType('admin'), ...)
```

### Core API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | None | Returns JWT token + user data |
| GET | `/api/wallet/balance` | Consumer | Current balance, limits |
| POST | `/api/wallet/redeem` | Consumer | Redeem voucher code |
| POST | `/api/transactions/payment` | Consumer | Pay to merchant |
| POST | `/api/transactions/refund` | Merchant | Refund a payment |
| GET | `/api/merchants/dashboard` | Merchant | Sales stats, recent txns |
| POST | `/api/admin/vouchers` | Admin | Create voucher codes |
| GET | `/api/admin/dashboard` | Admin | Platform statistics |

### Database Schema (Key Tables)

```
users, wallets, merchants, transactions, vouchers, voucher_usage,
audit_logs, loyalty_points, carbon_points, welfare_allocations,
merchant_credit_scores, delivery_orders, donation_campaigns,
programmable_tokens, blockchain_blocks, user_dids, verifiable_credentials,
notifications, device_tokens, security_events, api_keys, ip_blocks
```

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

---

## Important Implementation Details

### Frontend Base Path
Router configured with `basename: '/localpay'` for production deployment:
```typescript
// src/router/index.tsx
createBrowserRouter(routes, { basename: '/localpay' })
```

### API Validation Pattern
All routes use express-validator:
```typescript
router.post('/endpoint', authenticate, [
  body('field').notEmpty().withMessage('Required'),
  body('amount').isInt({ min: 100 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ValidationError('Validation failed');
  // ...
});
```

### Transaction Flow
1. Consumer: `POST /api/transactions/payment` → deducts balance
2. Merchant: `POST /api/transactions/refund` with `originalTransactionId` → restores balance
3. All transactions create audit_logs entries automatically

### Voucher Flow
1. Admin: `POST /api/admin/vouchers` with `{name, code, amount, type, usageLimit, validFrom, validUntil}`
2. Consumer: `POST /api/wallet/redeem` with `{code}` → adds to balance
3. Duplicate redemption blocked per user
