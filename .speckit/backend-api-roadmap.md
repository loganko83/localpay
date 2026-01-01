# Backend API Implementation Roadmap

> Complete backend API implementation plan for LocalPay
> Created: 2024-12-31

---

## Overview

This document outlines the phased implementation plan for all missing backend APIs. The frontend UI (52 screens) is complete, but many screens use mock data. This roadmap covers the backend API development needed for full production readiness.

---

## Current State

### Implemented APIs (Production Ready)
| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/*` | POST | Login, logout, refresh token |
| `/api/wallet/*` | GET, POST | Balance, charge, redeem, limits |
| `/api/transactions/*` | GET, POST | Payment, refund, history, verify |
| `/api/merchants/*` | GET, POST, PUT | List, dashboard, CRUD |
| `/api/admin/dashboard` | GET | Admin statistics |
| `/api/admin/audit-logs` | GET | Audit log viewer |
| `/api/admin/vouchers` | GET, POST, PUT, DELETE | Voucher management |
| `/api/admin/stats/*` | GET | Transaction/user statistics |

### Missing APIs (To Be Implemented)
- 16+ API endpoint groups
- ~50+ individual endpoints
- Database schema updates required

---

## Phase 1: Compliance & Regulatory (Sprint 14-15)

**Priority: CRITICAL - Required for regulatory compliance**

### 1.1 Settlement API (Sprint 14)
**File:** `server/src/routes/settlements.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settlements` | GET | List settlements with pagination |
| `/api/settlements/:id` | GET | Settlement details |
| `/api/settlements/pending` | GET | Pending settlements |
| `/api/settlements/:id/approve` | POST | Approve settlement |
| `/api/settlements/:id/reject` | POST | Reject settlement |
| `/api/settlements/batch` | POST | Batch settlement processing |
| `/api/settlements/calendar` | GET | Calendar view data |
| `/api/settlements/export` | GET | Export to Excel/CSV |

**Database:**
```sql
CREATE TABLE settlements (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_sales INTEGER NOT NULL,
  total_refunds INTEGER NOT NULL,
  net_amount INTEGER NOT NULL,
  fee_amount INTEGER NOT NULL,
  settlement_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  scheduled_date TEXT,
  completed_date TEXT,
  bank_reference TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE TABLE settlement_items (
  id TEXT PRIMARY KEY,
  settlement_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  FOREIGN KEY (settlement_id) REFERENCES settlements(id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);
```

### 1.2 Welfare Distribution API (Sprint 14)
**File:** `server/src/routes/welfare.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/welfare/programs` | GET, POST | Welfare programs CRUD |
| `/api/welfare/programs/:id` | GET, PUT, DELETE | Program details |
| `/api/welfare/beneficiaries` | GET, POST | Beneficiary management |
| `/api/welfare/distributions` | GET, POST | Distribution records |
| `/api/welfare/distributions/:id` | GET | Distribution details |
| `/api/welfare/verify-eligibility` | POST | DID-based eligibility check |
| `/api/welfare/stats` | GET | Welfare statistics |
| `/api/welfare/impact` | GET | Economic impact analysis |

**Database:**
```sql
CREATE TABLE welfare_programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- youth, senior, disability, culture, education
  budget INTEGER NOT NULL,
  spent INTEGER DEFAULT 0,
  beneficiary_count INTEGER DEFAULT 0,
  eligibility_criteria TEXT, -- JSON
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE welfare_beneficiaries (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  did TEXT,
  verified_at TEXT,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (program_id) REFERENCES welfare_programs(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE welfare_distributions (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL,
  beneficiary_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  transaction_id TEXT,
  blockchain_hash TEXT,
  distributed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (program_id) REFERENCES welfare_programs(id),
  FOREIGN KEY (beneficiary_id) REFERENCES welfare_beneficiaries(id)
);
```

### 1.3 AML/FDS API (Sprint 15)
**File:** `server/src/routes/compliance.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/compliance/fds/alerts` | GET | FDS alerts list |
| `/api/compliance/fds/alerts/:id` | GET, PUT | Alert details, update status |
| `/api/compliance/fds/rules` | GET, POST, PUT | Detection rules |
| `/api/compliance/fds/analyze` | POST | Real-time transaction analysis |
| `/api/compliance/aml/cases` | GET, POST | AML case management |
| `/api/compliance/aml/cases/:id` | GET, PUT | Case details |
| `/api/compliance/aml/reports` | GET, POST | CTR/STR reports |
| `/api/compliance/aml/screening` | POST | User/merchant screening |
| `/api/compliance/risk-score` | GET | Risk scoring |

**Database:**
```sql
CREATE TABLE fds_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- velocity, phantom_merchant, qr_duplicate, amount_anomaly
  severity TEXT NOT NULL, -- critical, high, medium, low
  target_type TEXT NOT NULL, -- user, merchant, transaction
  target_id TEXT NOT NULL,
  description TEXT,
  details TEXT, -- JSON
  status TEXT DEFAULT 'new', -- new, investigating, resolved, false_positive
  assigned_to TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE fds_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  conditions TEXT NOT NULL, -- JSON
  severity TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE aml_cases (
  id TEXT PRIMARY KEY,
  case_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- ctr, str, sar
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  investigator_id TEXT,
  summary TEXT,
  findings TEXT, -- JSON
  reported_to_kofiu INTEGER DEFAULT 0,
  kofiu_reference TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE aml_reports (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  report_type TEXT NOT NULL, -- ctr, str
  amount INTEGER,
  report_data TEXT NOT NULL, -- JSON
  submitted_at TEXT,
  kofiu_status TEXT,
  FOREIGN KEY (case_id) REFERENCES aml_cases(id)
);
```

---

## Phase 2: Core Business (Sprint 16-17)

**Priority: HIGH - Core platform functionality**

### 2.1 User Management API (Sprint 16)
**File:** `server/src/routes/users.ts` (extend existing)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users` | GET | List users with filters |
| `/api/users/:id` | GET, PUT | User details, update |
| `/api/users/:id/kyc` | GET, PUT | KYC status management |
| `/api/users/:id/wallet` | GET | User wallet info |
| `/api/users/:id/transactions` | GET | User transactions |
| `/api/users/:id/suspend` | POST | Suspend user |
| `/api/users/:id/activate` | POST | Activate user |
| `/api/users/stats` | GET | User statistics |
| `/api/users/export` | GET | Export user data |

### 2.2 Employee Management API (Sprint 16)
**File:** `server/src/routes/employees.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/employees` | GET, POST | List/create employees |
| `/api/employees/:id` | GET, PUT, DELETE | Employee CRUD |
| `/api/employees/:id/permissions` | GET, PUT | Permission management |
| `/api/employees/:id/activity` | GET | Activity log |
| `/api/employees/invite` | POST | Send invite |

**Database:**
```sql
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL, -- owner, manager, cashier
  permissions TEXT, -- JSON array
  status TEXT DEFAULT 'active',
  invited_at TEXT,
  joined_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);
```

### 2.3 Coupon & Offers API (Sprint 17)
**File:** `server/src/routes/coupons.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/coupons` | GET | List available coupons |
| `/api/coupons/:id` | GET | Coupon details |
| `/api/coupons/my` | GET | User's coupons |
| `/api/coupons/:id/claim` | POST | Claim coupon |
| `/api/coupons/:id/use` | POST | Use coupon |
| `/api/offers` | GET | List promotional offers |
| `/api/offers/:id` | GET | Offer details |
| `/api/admin/coupons` | GET, POST, PUT, DELETE | Admin coupon management |

**Database:**
```sql
CREATE TABLE coupons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- discount_percent, discount_amount, cashback
  value INTEGER NOT NULL,
  min_purchase INTEGER DEFAULT 0,
  max_discount INTEGER,
  merchant_id TEXT, -- null for platform-wide
  category TEXT,
  valid_from TEXT,
  valid_until TEXT,
  total_quantity INTEGER,
  remaining_quantity INTEGER,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE user_coupons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  coupon_id TEXT NOT NULL,
  claimed_at TEXT DEFAULT (datetime('now')),
  used_at TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'available',
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (coupon_id) REFERENCES coupons(id)
);

CREATE TABLE offers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  merchant_id TEXT,
  discount_type TEXT,
  discount_value INTEGER,
  valid_from TEXT,
  valid_until TEXT,
  terms TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## Phase 3: Loyalty & Rewards (Sprint 18-19)

**Priority: MEDIUM - Value-added features**

### 3.1 Loyalty Points API (Sprint 18)
**File:** `server/src/routes/loyalty.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/loyalty/balance` | GET | User's loyalty points |
| `/api/loyalty/history` | GET | Points history |
| `/api/loyalty/earn` | POST | Earn points (internal) |
| `/api/loyalty/redeem` | POST | Redeem points |
| `/api/loyalty/tiers` | GET | Tier information |
| `/api/loyalty/rewards` | GET | Available rewards |
| `/api/loyalty/rewards/:id/redeem` | POST | Redeem specific reward |
| `/api/merchant/loyalty/redeem` | POST | Merchant redeems customer points |

**Database:**
```sql
CREATE TABLE loyalty_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  points_balance INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum
  tier_expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE loyalty_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL, -- earn, redeem, expire, adjust
  source TEXT, -- payment, promotion, referral
  reference_id TEXT,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES loyalty_accounts(id)
);

CREATE TABLE loyalty_rewards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  type TEXT NOT NULL, -- voucher, product, experience
  value INTEGER,
  quantity INTEGER,
  image_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 3.2 Carbon Points API (Sprint 18)
**File:** `server/src/routes/carbon.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/carbon/balance` | GET | Carbon points balance |
| `/api/carbon/history` | GET | Carbon points history |
| `/api/carbon/calculate` | POST | Calculate carbon savings |
| `/api/carbon/redeem` | POST | Redeem carbon points |
| `/api/carbon/impact` | GET | Environmental impact stats |
| `/api/admin/carbon/stats` | GET | Platform carbon statistics |
| `/api/admin/carbon/merchants` | GET | Merchant carbon rankings |

**Database:**
```sql
CREATE TABLE carbon_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  points_balance INTEGER DEFAULT 0,
  co2_saved_kg REAL DEFAULT 0,
  trees_equivalent REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE carbon_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  co2_kg REAL,
  type TEXT NOT NULL, -- earn, redeem
  activity_type TEXT, -- local_purchase, public_transport, eco_merchant
  reference_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES carbon_accounts(id)
);
```

### 3.3 Merchant Credit Score API (Sprint 19)
**File:** `server/src/routes/credit.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/merchant/credit/score` | GET | Merchant's credit score |
| `/api/merchant/credit/history` | GET | Score history |
| `/api/merchant/credit/factors` | GET | Score breakdown |
| `/api/merchant/credit/apply` | POST | Apply for credit line |
| `/api/admin/credit/applications` | GET | Credit applications |
| `/api/admin/credit/applications/:id` | GET, PUT | Application review |
| `/api/admin/credit/merchants` | GET | All merchant scores |

**Database:**
```sql
CREATE TABLE merchant_credit_scores (
  id TEXT PRIMARY KEY,
  merchant_id TEXT UNIQUE NOT NULL,
  score INTEGER NOT NULL, -- 0-1000
  grade TEXT NOT NULL, -- A, B, C, D, F
  payment_history_score INTEGER,
  volume_score INTEGER,
  tenure_score INTEGER,
  compliance_score INTEGER,
  calculated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE TABLE credit_applications (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  requested_amount INTEGER NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  approved_amount INTEGER,
  interest_rate REAL,
  reviewer_id TEXT,
  reviewed_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE TABLE merchant_credit_history (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);
```

---

## Phase 4: Extended Services (Sprint 20-21)

**Priority: MEDIUM - Additional platform features**

### 4.1 Delivery Service API (Sprint 20)
**File:** `server/src/routes/delivery.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/delivery/orders` | GET, POST | Consumer delivery orders |
| `/api/delivery/orders/:id` | GET | Order details |
| `/api/delivery/orders/:id/cancel` | POST | Cancel order |
| `/api/delivery/orders/:id/track` | GET | Track order |
| `/api/merchant/delivery/orders` | GET | Merchant's delivery orders |
| `/api/merchant/delivery/orders/:id/accept` | POST | Accept order |
| `/api/merchant/delivery/orders/:id/ready` | POST | Mark ready |
| `/api/merchant/delivery/orders/:id/complete` | POST | Complete delivery |

**Database:**
```sql
CREATE TABLE delivery_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  items TEXT NOT NULL, -- JSON array
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, accepted, preparing, ready, delivering, completed, cancelled
  estimated_delivery TEXT,
  actual_delivery TEXT,
  transaction_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE TABLE delivery_tracking (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL,
  location TEXT, -- JSON {lat, lng}
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES delivery_orders(id)
);
```

### 4.2 Tourist Wallet API (Sprint 20)
**File:** `server/src/routes/tourist.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tourist/register` | POST | Register tourist wallet |
| `/api/tourist/wallet` | GET | Tourist wallet info |
| `/api/tourist/exchange` | POST | Currency exchange |
| `/api/tourist/refund` | POST | Departure refund |
| `/api/tourist/merchants` | GET | Tourist-friendly merchants |
| `/api/tourist/tax-refund` | POST | Request tax refund |
| `/api/admin/tourist/stats` | GET | Tourist statistics |

**Database:**
```sql
CREATE TABLE tourist_wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  passport_number TEXT,
  nationality TEXT,
  entry_date TEXT,
  departure_date TEXT,
  original_currency TEXT,
  exchange_rate REAL,
  total_exchanged INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  refundable_amount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE tourist_exchanges (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  foreign_amount REAL NOT NULL,
  foreign_currency TEXT NOT NULL,
  local_amount INTEGER NOT NULL,
  exchange_rate REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (wallet_id) REFERENCES tourist_wallets(id)
);

CREATE TABLE tax_refund_requests (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  processed_at TEXT,
  refund_method TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (wallet_id) REFERENCES tourist_wallets(id)
);
```

### 4.3 Donation Platform API (Sprint 21)
**File:** `server/src/routes/donations.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/donations/campaigns` | GET | Active campaigns |
| `/api/donations/campaigns/:id` | GET | Campaign details |
| `/api/donations/donate` | POST | Make donation |
| `/api/donations/my` | GET | My donations |
| `/api/donations/receipts/:id` | GET | Donation receipt |
| `/api/admin/donations/campaigns` | GET, POST, PUT | Campaign management |
| `/api/admin/donations/stats` | GET | Donation statistics |

**Database:**
```sql
CREATE TABLE donation_campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  organization TEXT NOT NULL,
  target_amount INTEGER NOT NULL,
  raised_amount INTEGER DEFAULT 0,
  donor_count INTEGER DEFAULT 0,
  image_url TEXT,
  category TEXT, -- disaster, education, health, environment
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'active',
  blockchain_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE donations (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  anonymous INTEGER DEFAULT 0,
  message TEXT,
  transaction_id TEXT,
  blockchain_hash TEXT,
  receipt_number TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (campaign_id) REFERENCES donation_campaigns(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 4.4 Product Traceability API (Sprint 21)
**File:** `server/src/routes/traceability.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/trace/product/:code` | GET | Trace product by code |
| `/api/trace/verify` | POST | Verify authenticity |
| `/api/trace/history/:productId` | GET | Product journey |
| `/api/merchant/products` | GET, POST | Merchant products |
| `/api/merchant/products/:id/trace` | POST | Add trace point |
| `/api/admin/trace/products` | GET | All traced products |

**Database:**
```sql
CREATE TABLE traced_products (
  id TEXT PRIMARY KEY,
  product_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  origin TEXT,
  manufacturer TEXT,
  manufacture_date TEXT,
  merchant_id TEXT,
  blockchain_hash TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE trace_points (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  location TEXT NOT NULL,
  action TEXT NOT NULL, -- produced, shipped, received, sold
  actor TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  details TEXT, -- JSON
  blockchain_hash TEXT,
  FOREIGN KEY (product_id) REFERENCES traced_products(id)
);
```

---

## Phase 5: Blockchain & Token (Sprint 22-23)

**Priority: MEDIUM - Blockchain integration**

### 5.1 Token Issuance API (Sprint 22)
**File:** `server/src/routes/tokens.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/tokens/issuance` | GET | Issuance history |
| `/api/admin/tokens/issue` | POST | Issue new tokens |
| `/api/admin/tokens/burn` | POST | Burn tokens |
| `/api/admin/tokens/circulation` | GET | Circulation stats |
| `/api/admin/tokens/reserves` | GET | Reserve balances |
| `/api/tokens/programmable` | GET | Programmable money types |

**Database:**
```sql
CREATE TABLE token_issuances (
  id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- issue, burn, transfer
  purpose TEXT,
  authorized_by TEXT,
  blockchain_hash TEXT,
  block_number INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE programmable_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  total_supply INTEGER NOT NULL,
  circulating INTEGER DEFAULT 0,
  restrictions TEXT, -- JSON
  expiry_policy TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 5.2 Blockchain Explorer API (Sprint 22)
**File:** `server/src/routes/blockchain.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/blockchain/status` | GET | Network status |
| `/api/blockchain/blocks` | GET | Recent blocks |
| `/api/blockchain/blocks/:number` | GET | Block details |
| `/api/blockchain/tx/:hash` | GET | Transaction details |
| `/api/blockchain/verify/:hash` | GET | Verify audit record |
| `/api/blockchain/anchor` | POST | Anchor audit batch |

### 5.3 DID/VC Integration API (Sprint 23)
**File:** `server/src/routes/identity.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/identity/did` | GET | User's DID |
| `/api/identity/credentials` | GET | User's VCs |
| `/api/identity/verify` | POST | Verify credential |
| `/api/identity/request-vc` | POST | Request new VC |
| `/api/admin/identity/issue-vc` | POST | Issue VC |
| `/api/admin/identity/revoke-vc` | POST | Revoke VC |

---

## Phase 6: Integration & Polish (Sprint 24-25)

**Priority: HIGH - Production readiness**

### 6.1 Real-time Features (Sprint 24)
- WebSocket server setup
- Real-time notifications
- Live transaction updates
- Dashboard auto-refresh

### 6.2 Push Notifications (Sprint 24)
- FCM integration
- APNs integration
- Notification preferences
- Notification history API

### 6.3 External Integrations (Sprint 25)
- IBK Bank API connection (sandbox)
- DID-BaaS production setup
- Xphere mainnet anchoring
- KoFIU reporting interface

### 6.4 Security Hardening (Sprint 25)
- Rate limiting
- Input sanitization audit
- SQL injection prevention
- Penetration testing

---

## Database Migration Plan

### Migration Script Structure
```
server/src/db/migrations/
├── 001_initial_schema.sql      (existing)
├── 002_settlements.sql         (Phase 1)
├── 003_welfare.sql             (Phase 1)
├── 004_compliance.sql          (Phase 1)
├── 005_employees.sql           (Phase 2)
├── 006_coupons.sql             (Phase 2)
├── 007_loyalty.sql             (Phase 3)
├── 008_carbon.sql              (Phase 3)
├── 009_credit.sql              (Phase 3)
├── 010_delivery.sql            (Phase 4)
├── 011_tourist.sql             (Phase 4)
├── 012_donations.sql           (Phase 4)
├── 013_traceability.sql        (Phase 4)
├── 014_tokens.sql              (Phase 5)
└── 015_identity.sql            (Phase 5)
```

---

## Timeline Summary

| Phase | Sprints | Duration | APIs | Priority |
|-------|---------|----------|------|----------|
| Phase 1: Compliance | 14-15 | 2 sprints | 3 | CRITICAL |
| Phase 2: Core Business | 16-17 | 2 sprints | 3 | HIGH |
| Phase 3: Loyalty & Rewards | 18-19 | 2 sprints | 3 | MEDIUM |
| Phase 4: Extended Services | 20-21 | 2 sprints | 4 | MEDIUM |
| Phase 5: Blockchain & Token | 22-23 | 2 sprints | 3 | MEDIUM |
| Phase 6: Integration | 24-25 | 2 sprints | - | HIGH |

**Total: 12 sprints, 16 API modules, ~60+ endpoints**

---

## Success Metrics

### Phase Completion Criteria
- [ ] All endpoints implemented and tested
- [ ] Database migrations applied
- [ ] Frontend connected to real APIs
- [ ] E2E tests passing
- [ ] Documentation updated

### Production Readiness Checklist
- [ ] All mock data replaced with real APIs
- [ ] Error handling standardized
- [ ] Logging and monitoring in place
- [ ] Performance benchmarks met
- [ ] Security audit passed

---

## Next Steps

1. **Immediate**: Start Phase 1 Sprint 14 (Settlements + Welfare)
2. **Review**: Confirm API specifications with stakeholders
3. **Setup**: Prepare database migration framework
4. **Parallel**: Frontend team to prepare API integration
