# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LocalPay is a blockchain-based local digital currency payment platform for Busan, Korea. The platform serves three user types:
- **Consumer**: Citizens paying with B-Coin
- **Merchant**: Local businesses receiving payments
- **Admin**: Platform operators managing the system

---

## CRITICAL: Business & Legal Structure

### Partnership Model (IBK Bank Open Innovation)

This platform operates as a **non-financial technology partner** with IBK Bank.
**Core Principle: "Money handled by bank, Proof handled by technology"**

### Role Separation (Mandatory for Legal Compliance)

| Responsibility | IBK Bank | Our Platform |
|----------------|----------|--------------|
| Prepaid instrument issuance | O | X |
| Deposit custody | O | X |
| Payment approval | O | X |
| Refund execution | O | X |
| User app/web | - | O |
| Policy engine | - | O |
| Merchant management | - | O |
| DID/VC/Signatures | - | O |
| Audit logs/Blockchain | - | O |

### Architecture Principle
```
[User] -> [Our App] -> [Bank API] -> [IBK] -> [Trust Account]

Our DB: "Logical balance display" ONLY
Actual funds: Bank's trust account (we never touch money)
```

### Code Implications
- `walletStore.balance` = Display value from Bank API, NOT our managed value
- All payment/refund actions = API calls to Bank, we don't execute
- Blockchain = Audit trail only, NOT a payment ledger
- Settlement data = Auxiliary/reporting only, NOT authoritative

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

See `.speckit/constitution.md` and `.speckit/ibk-proposal.md` for full details.

---

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server on port 3000
npm run build     # Production build with Vite
npm run preview   # Preview production build
```

## Spec-Kit Documentation

Project specifications are maintained using Spec-Kit format:

```
.speckit/
  constitution.md       # Project principles and guidelines
  implementation-plan.md # Technical architecture
  tasks.md              # Actionable task list

specs/
  consumer-app.md       # Consumer feature specification
  merchant-app.md       # Merchant feature specification
  admin-app.md          # Admin feature specification
```

**Always refer to these specs before implementing new features.**

## Architecture

**Tech Stack**: React 19 + TypeScript + Vite + Recharts + react-router-dom + Zustand

**User Type Themes**:
| Type | Primary Color | Usage |
|------|--------------|-------|
| Consumer | #ed2630 (Red) | B-Coin payment app |
| Merchant | #13ec5b (Green) | Business management |
| Admin | #2b8cee (Blue) | Platform operations |

**Target Project Structure** (see `.speckit/implementation-plan.md`):
```
src/
  components/common/    # Shared UI (Button, Card, Input, Modal)
  components/layout/    # Layout, Header, BottomNav
  screens/consumer/     # Consumer screens
  screens/merchant/     # Merchant screens
  screens/admin/        # Admin screens
  store/                # Zustand stores
  hooks/                # Custom hooks
  types/                # TypeScript types
  router/               # Route configuration
```

**Path Alias**: `@/*` maps to project root

**UI Framework**: Tailwind-style utility classes + Material Symbols icons

## Design Prototypes

HTML prototypes in subdirectories (`*_screen/code.html`) are design references:
- `home/main_screen/` - Consumer home
- `merchant_dashboard_*/` - Merchant dashboards
- `admin_dashboard/` - Admin dashboard
- 35+ total screen prototypes

## Code Standards

- English only in source code (no Korean in comments/variables)
- No emojis in source files
- Korean text only in user-facing strings
