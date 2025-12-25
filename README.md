# LocalPay

Blockchain-based local currency payment platform for Busan, Korea.

## Overview

LocalPay is a comprehensive digital payment ecosystem that connects consumers, merchants, and administrators through a unified local currency platform. Built with React, TypeScript, and Vite.

### Key Features

- **Consumer App**: Wallet management, QR payments, transaction history, coupons
- **Merchant App**: Dashboard, payment processing, employee management
- **Admin Dashboard**: User management, voucher issuance, settlements, audit logs
- **Phase 6-11 Services**: Programmable money, tourism, delivery, ESG/carbon, B2B, MyData/AML

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 |
| Language | TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Routing | react-router-dom |
| State | Zustand |
| Charts | Recharts |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/loganko83/localpay.git
cd localpay
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Open in browser:
```
http://localhost:3000
```

### Build for Production

```bash
npm run build
```

Build output will be in the `dist/` directory.

## Project Structure

```
src/
├── components/
│   ├── common/          # Button, Card, Badge, Input, Modal, Toggle
│   └── layout/          # Header, BottomNav, Layout
├── screens/
│   ├── consumer/        # Home, Wallet, Scan, History, Profile, etc.
│   ├── merchant/        # Dashboard, Payments, Employees, Settings
│   ├── admin/           # Dashboard, Users, Vouchers, Settlements, Audit
│   └── debug/           # DebugDashboard (development only)
├── services/            # Business logic (13 service modules)
├── store/               # Zustand stores (auth, wallet, transaction)
├── router/              # Route configuration
├── styles/              # Global styles, theme configuration
├── types/               # TypeScript type definitions
└── middleware/          # Security middleware

.specify/                # Spec-Kit documentation
├── memory/              # Project constitution
├── specs/               # Feature specifications
└── templates/           # Spec templates
```

## Available Routes

| Route | Description |
|-------|-------------|
| `/` | App Selector (Consumer/Merchant/Admin) |
| `/consumer` | Consumer App |
| `/merchant` | Merchant App |
| `/admin` | Admin Dashboard |
| `/debug` | Debug Dashboard (dev only) |

## Services (Phase 6-11)

| Phase | Service | Description |
|-------|---------|-------------|
| 6 | Programmable Money | Token issuance with spending restrictions |
| 6 | Token Lifecycle | Mint, circulate, burn, budget tracking |
| 7 | Tourist Wallet | Multi-currency support, exchange |
| 7 | Tax Refund | VAT refund for tourists |
| 8 | Public Delivery | Zero-commission delivery |
| 8 | Product Traceability | Farm-to-table tracking |
| 8 | Shared Loyalty | Cross-merchant loyalty points |
| 9 | Carbon Points | ESG rewards for eco actions |
| 10 | Corporate Welfare | Employee benefit distribution |
| 10 | Donation Platform | Transparent charity donations |
| 11 | MyData | User data portability |
| 11 | Merchant Credit | Transaction-based credit scoring |
| 11 | AML Compliance | Anti-money laundering monitoring |

## Debug Dashboard

Access `/debug` to:
- **View Data**: Inspect all service demo data
- **Quick Actions**: Execute common operations (issue tokens, earn points)
- **Method Tester**: Test service methods with custom parameters

## Theme System

Three distinct themes based on user type:

| User Type | Primary Color | Background |
|-----------|--------------|------------|
| Consumer | Red (#ed2630) | #221011 |
| Merchant | Green (#13ec5b) | #102216 |
| Admin | Blue (#2b8cee) | #101922 |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Documentation

Detailed specifications are in `.specify/specs/`:
- `platform-overview/` - Overall architecture and task list
- `phase-6-programmable-money/` - Token system specification
- `phase-7-tourism/` - Tourist services specification
- `phase-8-delivery-market/` - Delivery and loyalty specs
- `phase-9-esg-carbon/` - Carbon points specification
- `phase-10-b2b/` - Corporate welfare and donations
- `phase-11-mydata-aml/` - Data portability and compliance

## License

Private - All rights reserved.
