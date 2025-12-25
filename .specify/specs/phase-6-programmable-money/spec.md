# Phase 6: Programmable Money Specification

> Purpose-Bound Money (PBM) and Token Lifecycle Management

---

## 1. Overview

### Purpose
Implement programmable money capabilities that allow local currency tokens to have embedded spending rules, enabling targeted policy fund distribution with automatic enforcement.

### Business Value
- Precise policy fund targeting (disaster relief, youth allowance)
- Automatic compliance with spending restrictions
- Transparent fund utilization tracking
- Reduced fraud through programmatic controls

---

## 2. Services

### 2.1 Programmable Money Service

#### Features
- Issue tokens with embedded restrictions
- Validate transactions against token rules
- Automatic expiry and clawback
- Real-time spending limit enforcement

#### Token Types (PolicyFundType)
| Type | Description | Restrictions |
|------|-------------|--------------|
| DISASTER_RELIEF | Emergency support | Essential goods only, 90-day expiry |
| CHILD_MEAL | School meal support | Food MCC only, 30-day expiry |
| YOUTH_ALLOWANCE | Employment support | No gambling/liquor, 180-day expiry |
| SENIOR_WELFARE | Elder care | Medical/grocery priority |
| FARMER_SUPPORT | Agriculture | Equipment/supplies |
| TRADITIONAL_MARKET | Market promotion | Traditional markets only |
| GENERAL | Standard local currency | Region-restricted |

#### Restriction Rules
```typescript
interface TokenRestriction {
  allowedMCC: string[];        // Allowed merchant categories
  blockedMCC: string[];        // Blocked categories
  allowedRegions?: string[];   // Geographic limits
  maxSingleTransaction?: number;
  dailyLimit?: number;
  expiryDate: number;
  bonusRate?: number;          // Cashback rate
}
```

#### MCC Categories [REAL]
- GROCERY: 5411, 5422, 5441, 5451, 5462
- RESTAURANT: 5812, 5813, 5814
- PHARMACY: 5912
- HOSPITAL: 8011, 8021, 8031...
- LIQUOR (blocked): 5921
- GAMBLING (blocked): 7995, 7800, 7801, 7802

### 2.2 Token Lifecycle Service

#### Features
- Track token from minting to burning
- Calculate circulation metrics
- Budget tracking by fiscal code
- Multiplier effect measurement

#### Lifecycle Stages
```
MINTED → CIRCULATING → BURNED
              ↓
          CLAWBACK (expired/recalled)
```

#### Event Types
- MINT: Initial issuance from budget
- TRANSFER: User to merchant payment
- SETTLE: Merchant settlement
- REDEEM: Convert to KRW
- EXPIRE: Time-based expiry
- CLAWBACK: Forced return
- BURN: Final destruction

#### Metrics
- Total minted/circulating/burned
- Average circulation count
- Velocity (transactions/day)
- Multiplier effect
- Regional distribution

---

## 3. API Contracts

### Issue Tokens
```typescript
programmableMoneyService.issueTokens({
  userId: string;
  amount: number;
  fundType: PolicyFundType;
  expiryDays: number;
  issuedBy: string;
  budgetCode?: string;
  customRestrictions?: Partial<TokenRestriction>;
}): Promise<ProgrammableToken>
```

### Validate Transaction
```typescript
programmableMoneyService.validateTransaction({
  userId: string;
  merchantId: string;
  merchantMCC: string;
  merchantRegion: string;
  amount: number;
}): Promise<ValidationResult>
```

### Mint Token (Lifecycle)
```typescript
tokenLifecycleService.mint({
  amount: number;
  budgetCode: string;
  budgetYear: number;
  issuerId: string;
  recipientId: string;
}): Promise<TrackedToken>
```

### Record Transfer
```typescript
tokenLifecycleService.recordTransfer({
  tokenId: string;
  fromEntity: string;
  toEntity: string;
  amount: number;
  transactionId: string;
  merchantId?: string;
}): Promise<TokenEvent>
```

---

## 4. Data Model

### ProgrammableToken
```typescript
interface ProgrammableToken {
  id: string;
  userId: string;
  amount: number;
  fundType: PolicyFundType;
  restrictions: TokenRestriction;
  issuedAt: number;
  issuedBy: string;
  budgetCode?: string;
}
```

### TrackedToken
```typescript
interface TrackedToken {
  id: string;
  originalAmount: number;
  currentAmount: number;
  stage: LifecycleStage;
  mintedAt: number;
  mintedBy: string;
  budgetCode: string;
  budgetYear: number;
  currentHolder: string;
  events: TokenEvent[];
  circulationCount: number;
}
```

---

## 5. Implementation Status

| Component | Status | File |
|-----------|--------|------|
| ProgrammableMoneyService | ✅ Complete | `src/services/programmableMoney.ts` |
| TokenLifecycleService | ✅ Complete | `src/services/tokenLifecycle.ts` |
| Demo Data | ✅ Complete | `src/services/demoData.ts` |
| Admin UI | ❌ Pending | - |
| API Integration | ❌ Pending | - |

---

## 6. Test Scenarios

### Scenario 1: Disaster Relief Distribution
1. Admin issues DISASTER_RELIEF tokens to affected residents
2. Resident attempts purchase at grocery store → Allowed
3. Resident attempts purchase at liquor store → Blocked
4. Token expires after 90 days → Clawback

### Scenario 2: Youth Allowance Spending
1. Youth receives monthly allowance token
2. Can spend at restaurants, education, transport
3. Cannot spend at gambling, adult content
4. Bonus rate applied at traditional markets

### Scenario 3: Token Lifecycle Tracking
1. Mint 10M KRW from budget BUD-2024-001
2. Distribute to 100 users (100K each)
3. Users spend at merchants
4. Track circulation count and velocity
5. Generate monthly utilization report
