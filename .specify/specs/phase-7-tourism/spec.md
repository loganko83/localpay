# Phase 7: Tourism Services Specification

> Tourist Wallet and Instant Tax Refund

---

## 1. Overview

### Purpose
Provide seamless local currency services for foreign tourists visiting Busan, including multi-currency exchange, stablecoin support, and instant VAT refunds that encourage spending in the local economy.

### Business Value
- Increase tourist spending in local economy
- Reduce VAT refund fraud through verification
- Support cashless tourism experience
- Promote Busan as fintech-forward destination

---

## 2. Services

### 2.1 Tourist Wallet Service

#### Features
- Create wallet with passport verification
- Multi-currency exchange (USD, JPY, EUR, CNY)
- Stablecoin support (USDT, USDC)
- Real-time exchange rates
- Stay duration tracking

#### Supported Currencies [REAL Rates]
| Currency | Base Rate | Fee | Bonus |
|----------|-----------|-----|-------|
| USD | 1,380 KRW | 1.5% | 0% |
| JPY | 9.2 KRW | 1.5% | 0% |
| EUR | 1,480 KRW | 1.5% | 0% |
| CNY | 190 KRW | 1.5% | 0% |
| USDT | 1,375 KRW | 0.5% | 1% bonus |
| USDC | 1,375 KRW | 0.5% | 1% bonus |

#### Charge Methods
- Credit/Debit Card
- Bank Transfer
- Stablecoin (blockchain)

### 2.2 Tax Refund Service

#### Features
- Instant VAT refund to wallet
- Merchant tax-free registration
- Eligibility verification (passport, stay duration)
- Departure verification integration

#### Tax Refund Rules [REAL - Korea Tax-Free]
| Parameter | Value |
|-----------|-------|
| VAT Rate | 10% |
| Min Purchase | ₩15,000 |
| Max Refund/Receipt | ₩500,000 |
| Max Total Refund | ₩5,000,000 |
| Stay Limit | 90 days |
| Effective Refund Rate | ~7% (after fees) |

#### Process Flow
```
1. Tourist makes purchase at tax-free merchant
2. DID/passport verification confirms eligibility
3. VAT refund calculated and issued to wallet
4. Tourist spends refund in local economy
5. Verification at departure (customs)
```

---

## 3. API Contracts

### Create Tourist Wallet
```typescript
touristWalletService.createWallet({
  visitorId: string;
  passportCountry: string;
  passportNumber: string;
  entryDate: number;
  plannedDepartureDate?: number;
}): Promise<TouristWallet>
```

### Charge from Currency
```typescript
touristWalletService.chargeFromCurrency({
  visitorId: string;
  sourceCurrency: SupportedCurrency;
  sourceAmount: number;
  method: 'CARD' | 'BANK' | 'CASH';
}): Promise<ChargeRecord>
```

### Charge from Stablecoin
```typescript
touristWalletService.chargeFromStablecoin({
  visitorId: string;
  stablecoin: StablecoinType;
  amount: number;
  txHash?: string;
}): Promise<ChargeRecord>
```

### Process Tax Refund
```typescript
taxRefundService.processRefund({
  visitorId: string;
  merchantId: string;
  purchaseAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    category: string;
  }>;
}): Promise<TaxRefundRecord>
```

---

## 4. Data Model

### TouristWallet
```typescript
interface TouristWallet {
  visitorId: string;
  passportCountry: string;
  passportNumber: string;
  entryDate: number;
  plannedDepartureDate?: number;
  balanceKRW: number;
  chargeHistory: ChargeRecord[];
  status: 'ACTIVE' | 'DEPARTED' | 'EXPIRED';
}
```

### TaxRefundRecord
```typescript
interface TaxRefundRecord {
  id: string;
  visitorId: string;
  passportCountry: string;
  purchase: TaxFreePurchase;
  refundAmount: number;
  status: RefundStatus;
  createdAt: number;
  expiryDate: number;
  blockchainTxHash?: string;
}
```

---

## 5. Implementation Status

| Component | Status | File |
|-----------|--------|------|
| TouristWalletService | ✅ Complete | `src/services/touristWallet.ts` |
| TaxRefundService | ✅ Complete | `src/services/taxRefund.ts` |
| Demo Data | ✅ Complete | `src/services/demoData.ts` |
| Tourist UI | ❌ Pending | - |
| Customs Integration | ❌ Pending | - |

---

## 6. Test Scenarios

### Scenario 1: US Tourist Currency Exchange
1. Tourist arrives with $500 USD
2. Creates wallet with passport verification
3. Exchanges $500 → ₩679,350 (after 1.5% fee)
4. Spends at local merchants
5. Checks remaining balance before departure

### Scenario 2: Crypto-Savvy Tourist
1. Tourist has 200 USDT
2. Exchanges to local currency with 1% bonus
3. Gets ₩277,750 (better rate than card)
4. Uses for purchases throughout stay

### Scenario 3: Tax Refund Flow
1. Japanese tourist buys ₩250,000 cosmetics
2. Instant refund of ₩17,500 to wallet
3. Uses refund at traditional market
4. Customs verifies at Gimhae Airport
