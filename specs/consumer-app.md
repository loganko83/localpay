# Consumer App Specification

> B-Coin mobile payment application for Busan citizens

## Overview

The Consumer app enables Busan citizens to:
- Pay at local merchants using B-Coin
- Top-up their wallet
- View transaction history
- Access promotional offers

## User Flows

### 1. Payment Flow
```
Home → Scan QR → Confirm Payment → Success → History
```

### 2. Top-up Flow
```
Wallet → Top-up → Enter Amount → Select Source → Confirm → Success
```

### 3. View Merchant Flow
```
Home/Map → Merchant Detail → View Info → Pay with B-Coin
```

---

## Screens

### Home/Main Screen
**Source**: `home/main_screen/code.html`

**Components**:
- Header with location (Busan)
- Wallet balance card (B-Coin)
- Top-up and Send buttons
- Quick actions grid (Exchange, Coupons, Metro, Rewards)
- Recent activity list
- Floating QR scan button
- Bottom navigation (Home, Wallet, Map, Settings)

**Data**:
- User balance
- Recent transactions (last 5)
- Quick action items

---

### Wallet Screen
**Source**: `my_card/wallet_screen/code.html`

**Components**:
- Total balance display
- Card carousel (multiple payment methods)
- Add card button
- Quick action grid (Top Up, QR Pay, History, Manage)
- Recent activity list
- Floating add button

**Data**:
- Wallet cards list
- Card details (name, type, balance, status)
- Recent transactions

---

### QR Scan Screen
**Source**: `qr_scan_payment_screen/code.html`

**Components**:
- Camera feed (simulated)
- QR scanner frame with animation
- Tabs (Scan QR, My QR Code)
- Manual entry option
- Gallery and History buttons
- Zoom controls (1x, 2x)
- Flashlight toggle

**States**:
- Scanning mode
- My QR code display

---

### Transaction History Screen
**Source**: `transaction_history_screen/code.html`

**Components**:
- Balance card
- Stats row (Total Spent, Total Received)
- Filter chips (All, Payments, Top-ups, Refunds, Calendar)
- Grouped transaction list (Today, Yesterday, Date)
- Transaction items with merchant info
- Loading indicator

**Data**:
- Transaction list with:
  - ID, merchant, amount, date, status, type
  - TX ID (blockchain)

---

### Payment Confirmation Screen
**Source**: `payment_confirmation_screen_1~10/code.html`

**Components**:
- Success animation (checkmark)
- Transaction amount
- Receipt card (merchant, time, balance)
- Blockchain TX ID
- Action buttons (Home, View Receipt)

**States**:
- Processing
- Success
- Failed

---

### Profile & Settings Screen
**Source**: `user_profile_and_settings_screen/code.html`

**Components**:
- User profile header (avatar, level)
- Quick actions (My QR, Support, Share)
- Account & Security section
  - Edit Profile
  - Biometric Login toggle
  - Change PIN
  - Wallet Backup (action required)
- Preferences
  - Notifications
  - Currency Display
  - Language
- About (Terms, Privacy)
- Logout button

---

### Top-up Screens
**Source**: `top-up_local_currency_screen_1~2/code.html`

**Components**:
- Current balance card
- Amount input field
- Quick add chips (+10k, +50k, +100k, Max)
- Bonus info (5% bonus)
- Payment source selector
- Total charge display
- Confirm button

---

### Merchant Detail Screen
**Source**: `merchant_detail_screen/code.html`

**Components**:
- Hero image
- Merchant name and status
- Rating and reviews
- Action buttons (Call, Route, Website, Share)
- Cashback banner
- Address and hours
- Mini map
- Popular items carousel
- Amenities tags
- Review snippet
- Sticky footer (Chat, Pay)

---

### Promotional Offers Screen
**Source**: `promotional_offers_screen/code.html`

**Components**:
- Header with wallet balance
- Hot deals carousel
- Category filter chips
- Nearby offers list
- Offer cards with claim buttons
- Expiration info

---

### Taxi Integration Screen
**Source**: `dongbaek_taxi_integration_screen_1~2/code.html`

**Components**:
- Taxi wallet balance
- Link Dongbaek Taxi CTA
- Quick actions (Call Taxi, Manage Card, Benefits, Support)
- Recent rides list
- Cashback info

---

## Data Models

### User
```typescript
interface ConsumerUser {
  id: string;
  name: string;
  phone: string;
  level: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  avatarUrl?: string;
  createdAt: string;
}
```

### Wallet
```typescript
interface ConsumerWallet {
  id: string;
  userId: string;
  balance: number;
  cards: WalletCard[];
}

interface WalletCard {
  id: string;
  type: 'digital' | 'bank' | 'card';
  name: string;
  balance: number;
  lastFour?: string;
  isVerified: boolean;
}
```

### Transaction
```typescript
interface ConsumerTransaction {
  id: string;
  txId: string; // blockchain ID
  userId: string;
  merchantId?: string;
  merchantName?: string;
  amount: number;
  type: 'payment' | 'topup' | 'refund' | 'transfer';
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}
```

---

## Routes

```
/                     → Home
/wallet               → Wallet
/scan                 → QR Scan
/history              → Transaction History
/history/:id          → Transaction Detail
/profile              → Profile & Settings
/profile/edit         → Edit Profile
/topup                → Top-up
/merchant/:id         → Merchant Detail
/offers               → Promotional Offers
/taxi                 → Taxi Integration
```

---

## Priority

| Screen | Priority | Status |
|--------|----------|--------|
| Home | P0 | Not started |
| Wallet | P0 | Not started |
| QR Scan | P0 | Not started |
| Payment Confirmation | P0 | Not started |
| Transaction History | P0 | Not started |
| Profile & Settings | P1 | Not started |
| Top-up | P1 | Not started |
| Merchant Detail | P1 | Not started |
| Promotional Offers | P2 | Not started |
| Taxi Integration | P2 | Not started |
