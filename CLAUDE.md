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

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3003)
npm run build        # TypeScript check + Vite production build
npm run lint         # TypeScript type checking (tsc --noEmit)
npm run preview      # Preview production build
```

### E2E Testing (Playwright)
```bash
npx playwright test                    # Run all tests
npx playwright test --project=chromium # Single browser
npx playwright test screens.spec.ts    # Single test file
```

---

## Architecture

### Tech Stack
React 19 + TypeScript 5.8 + Vite 6 + Zustand + TanStack Query + Recharts + ethers.js

### Three-Layout System

1. **ConsumerLayout** / **MerchantLayout** (`src/components/layout/`)
   - Mobile-first (max-width: 448px)
   - BottomNav with role-specific tabs
   - Lazy-loaded screens with Suspense

2. **AdminLayout** (`src/components/admin/`)
   - Web-first responsive design
   - Collapsible sidebar navigation
   - TopBar with search and notifications

### Service Layer (`src/services/`)

| Layer | Services |
|-------|----------|
| **Blockchain** | `blockchain/xphere.ts` (Xphere EVM), `blockchain/auditAnchor.ts` (Merkle proofs) |
| **Identity** | `did/client.ts` (DID-BaaS), `identity.ts` (VC management) |
| **Compliance** | `fds/detector.ts` (Fraud Detection), `aml/screening.ts` (KoFIU AML) |
| **Core** | `bankAPI.ts` (IBK integration), `policyEngine.ts` (spending rules) |
| **Phase 6-11** | `programmableMoney.ts`, `carbonPoints.ts`, `touristWallet.ts`, etc. |

### State Management (`src/store/`)
- `authStore.ts` - User authentication state
- `walletStore.ts` - Balance display and bank API sync
- `transactionStore.ts` - Transaction history
- `toastStore.ts` - UI notifications

### Blockchain Integration
- **Xphere**: EVM Layer1 (chainId: 20250217, RPC: https://en-bkk.x-phere.com)
- **Tamsa Explorer**: https://xp.tamsa.io
- **DID-BaaS**: https://trendy.storydot.kr/did-baas/api/v1

---

## Environment Variables

```env
VITE_XPHERE_RPC_URL=https://en-bkk.x-phere.com
VITE_XPHERE_EXPLORER_URL=https://xp.tamsa.io
VITE_DID_BAAS_URL=https://trendy.storydot.kr/did-baas/api/v1
```

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
