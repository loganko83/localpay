# LocalPay Platform Specification

> Busan Digital Local Currency Payment Platform

---

## 1. Overview

### Purpose
LocalPay is a blockchain-verified local digital currency platform for Busan Metropolitan City, enabling:
- Digital payments between consumers and merchants
- Policy-based fund distribution (welfare, disaster relief)
- Tourism services (foreign currency exchange, tax refunds)
- ESG initiatives (carbon points, sustainable consumption)

### Target Users

| User Type | Description | Key Features |
|-----------|-------------|--------------|
| Consumer | Busan residents and visitors | Payments, top-up, rewards |
| Merchant | Local businesses | Payment acceptance, settlement |
| Admin | City government operators | Policy management, oversight |
| Tourist | Foreign visitors | Currency exchange, tax refund |

---

## 2. Functional Requirements

### 2.1 Consumer App

#### Authentication
- Phone number + OTP login
- DID-based identity verification
- Biometric authentication (optional)

#### Wallet
- View balance (from bank API)
- Transaction history
- Multiple card support
- QR code for receiving payments

#### Payments
- QR scan to pay merchants
- NFC payment (future)
- Payment confirmation with PIN
- Transaction receipts

#### Top-up
- Bank account transfer
- Credit/debit card
- Convenience store (future)

#### Rewards
- Loyalty points from purchases
- Carbon points for eco-actions
- Promotional vouchers

### 2.2 Merchant App

#### Registration
- Business verification
- Bank account linking
- MCC category assignment

#### Payment Acceptance
- Generate payment QR
- Receive push notifications
- Transaction history

#### Settlement
- Daily/weekly settlement view
- Settlement status tracking
- Bank transfer confirmation

#### Management
- Employee sub-accounts
- Sales analytics
- Notification settings

### 2.3 Admin Dashboard

#### User Management
- Consumer/merchant list
- Account status control
- KYC verification review

#### Policy Management
- Create spending policies
- Geographic restrictions
- Category restrictions
- Time-based rules

#### Voucher Management
- Issue programmable tokens
- Set expiry dates
- Track utilization

#### Settlement Management
- Merchant settlement batches
- Dispute resolution
- Audit trail access

#### Analytics
- Transaction volume
- User growth
- Regional distribution

---

## 3. Non-Functional Requirements

### 3.1 Performance
- Page load: < 2 seconds
- API response: < 500ms
- Support 100K concurrent users

### 3.2 Security
- TLS 1.3 for all connections
- AES-256 for data at rest
- PCI-DSS compliance ready
- GDPR/PIPA compliance

### 3.3 Availability
- 99.9% uptime SLA
- Graceful degradation
- Offline payment queue

### 3.4 Scalability
- Horizontal scaling
- Microservices-ready
- Event-driven architecture

---

## 4. Integration Points

### 4.1 Bank API (IBK)
- Balance inquiry
- Payment processing
- Settlement execution
- Refund handling

### 4.2 Identity (DID/VC)
- Credential issuance
- Verification
- Revocation check

### 4.3 Blockchain (Xphere)
- Transaction anchoring
- Audit log immutability
- Public verification

### 4.4 External Services
- Customs API (tax refund)
- Transport card API (carbon points)
- Open Banking API (top-up)

---

## 5. Data Model Overview

### Core Entities
```
User
├── id: string
├── type: 'consumer' | 'merchant' | 'admin'
├── did: string
├── phone: string
├── status: 'active' | 'suspended'
└── createdAt: timestamp

Wallet
├── id: string
├── userId: string
├── balance: number (from bank)
├── lastSyncedAt: timestamp
└── cards: Card[]

Transaction
├── id: string
├── type: 'payment' | 'topup' | 'refund'
├── fromUserId: string
├── toUserId: string
├── amount: number
├── status: 'pending' | 'completed' | 'failed'
├── bankTxId: string
├── blockchainHash: string
└── createdAt: timestamp

Policy
├── id: string
├── name: string
├── rules: PolicyRule[]
├── status: 'active' | 'inactive'
└── createdBy: string
```

---

## 6. Screen Inventory

### Consumer (14 screens)
- Home/Main
- Wallet
- QR Scan
- Payment Confirmation
- Transaction History
- Transaction Detail
- Profile
- Settings
- Top-up
- Merchant Detail
- Offers
- Coupons
- Services
- Merchant Map

### Merchant (10 screens)
- Login
- Dashboard
- Wallet
- Scan (receive payment)
- Payments (history)
- Employees
- Notifications
- Settings
- Profile
- Analytics

### Admin (8 screens)
- Login
- Dashboard
- Users
- Vouchers
- Settlements
- Policies
- Audit Logs
- Security

---

## 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Monthly Active Users | 100K+ | Unique logins |
| Transaction Volume | ₩10B/month | Total processed |
| Merchant Adoption | 5,000+ | Active merchants |
| Settlement Time | T+1 | Days to settlement |
| User Satisfaction | 4.5/5 | App store rating |
