# LocalPay Constitution

> Governing principles and development guidelines for the Jeonbuk Local Currency Payment Platform

## Vision

Build a blockchain-based local prepaid currency payment ecosystem for Jeonbuk (Jeonju City), Korea, serving three user types: consumers, merchants, and administrators. This is a PoC project in partnership with IBK Bank.

---

## Legal & Business Structure (Critical)

### Regulatory Framework

This platform operates under Korean Electronic Financial Transactions Act.
**Key principle: "Money is handled by the bank, proof is handled by technology"**

### Role Separation (Mandatory for Compliance)

#### IBK Bank (Electronic Financial Business License Holder)
- Prepaid electronic payment instrument issuance
- Deposit custody and trust account management
- Payment approval and settlement execution
- Refund processing (final authority)
- Terms of service and financial complaints
- Regulatory compliance and audit response

#### SW Developer (Non-Financial Technology Partner)
- User app and admin portal development
- Policy engine (usage limits, regional restrictions, eligible merchants)
- Merchant management system
- Settlement auxiliary data provision
- DID / VC / Digital signatures
- Audit logs and blockchain integrity management

### What We CAN Do (Safe Zone)
- Our brand app and UX
- Our merchant network management
- Our local currency policy design
- Our settlement logic (non-financial, data only)
- Blockchain for audit trail and immutability

### What We CANNOT Do (Prohibited)
- Hold prepaid funds in our name
- Manage balance ledger (financial authority)
- Execute refunds independently
- Payment approval authority

### Architecture Principle
```
[User] -> [Our App] -> [API] -> [IBK Bank] -> [Trust Account]
                                    |
                            [Final Ledger]

Our DB: "Logical balance display" only
Actual funds: Bank's trust account
```

### Required Documentation Language
Must include in contracts/proposals:
- "This system does not perform electronic financial transactions"
- "Prepaid instrument issuance/management/refund handled by partner bank"
- "We perform only information processing, system development, and history management"
- "Blockchain used only for transaction verification, audit, and integrity purposes"

### Prohibited Language in Documentation
Never use these terms for our role:
- "Charge management" (implies financial control)
- "Balance management" (implies ledger authority)
- "Payment processing" (implies transaction execution)
- "Refund logic" (implies financial decision)

---

## Core Principles

### 1. Mobile-First Design
- All UIs optimized for mobile devices (max-width: 448px)
- Touch-friendly interactions (min 44x44px tap targets)
- Responsive layouts with bottom navigation

### 2. User Type Separation
| User Type | Primary Color | Target User |
|-----------|--------------|-------------|
| Consumer | #ed2630 (Red) | Citizens paying with B-Coin |
| Merchant | #13ec5b (Green) | Stores receiving payments |
| Admin | #2b8cee (Blue) | Platform operators |

### 3. Korean Localization
- All user-facing text in Korean
- Currency format: Korean Won (₩) and B-Coin
- Date/time in Korean format

### 4. Code Standards
- **Language**: English only in source code (no Korean in comments/variables)
- **No Emojis**: No emojis in source files
- **TypeScript**: Strict type checking enabled
- **Component-Based**: Reusable React components

## Tech Stack

### Core
- React 19
- TypeScript 5.8+
- Vite 6

### Routing & State
- react-router-dom
- Zustand

### UI
- Tailwind-style utility classes
- Material Symbols (icons)
- Recharts (data visualization)

## Directory Structure

```
src/
  components/
    common/       # Shared UI components
    layout/       # Layout components
  screens/
    consumer/     # Consumer screens
    merchant/     # Merchant screens
    admin/        # Admin screens
  store/          # Zustand stores
  hooks/          # Custom hooks
  types/          # TypeScript types
  utils/          # Utility functions
```

## Design Tokens

### Consumer Theme
```css
--primary: #ed2630;
--background: #221011;
--surface: #2a1617;
--text-primary: #ffffff;
--text-secondary: #a88889;
```

### Merchant Theme
```css
--primary: #13ec5b;
--background: #102216;
--surface: #1c271f;
--text-primary: #ffffff;
--text-secondary: #5c7263;
```

### Admin Theme
```css
--primary: #2b8cee;
--background: #101922;
--surface: #1c242c;
--text-primary: #ffffff;
--text-secondary: #5c6a7a;
```
