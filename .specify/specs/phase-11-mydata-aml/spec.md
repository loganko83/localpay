# Phase 11: MyData & AML Compliance Specification

> Data Portability, Merchant Credit, and Anti-Money Laundering

---

## 1. Overview

### Purpose
Implement Korea's MyData framework for user data portability, provide transaction-based credit scoring for merchants, and ensure AML/CFT compliance with automated monitoring and reporting.

### Business Value
- User control over personal financial data
- Alternative credit for underbanked merchants
- Regulatory compliance (FATF, Korean AML Act)
- Fraud prevention and risk management

---

## 2. Services

### 2.1 MyData Service

#### Features
- User data inventory management
- Consent-based data sharing
- Multi-source data aggregation
- Privacy settings control
- Data access request handling

#### Data Categories [REAL - Korea MyData]
| Category | Provider Type | Data Elements |
|----------|--------------|---------------|
| BANK_ACCOUNT | Banks | Balance, transactions |
| CARD_USAGE | Card companies | Spending history |
| INVESTMENT | Securities | Portfolio, trades |
| INSURANCE | Insurers | Policies, claims |
| TELECOM | Carriers | Usage, billing |
| LOCAL_CURRENCY | LocalPay | Wallet, payments |
| TAX | NTS | Income, deductions |

#### Consent Framework
- Purpose specification required
- Duration limits (max 1 year)
- Scope restrictions (summary vs detail)
- Revocation at any time
- Audit trail of access

#### Data Purposes
- SPENDING_ANALYSIS: Budget insights
- CREDIT_ASSESSMENT: Loan eligibility
- FINANCIAL_PLANNING: Wealth management
- TAX_FILING: Tax preparation
- IDENTITY_VERIFICATION: KYC
- MARKETING: With explicit consent

### 2.2 Merchant Credit Service

#### Features
- Transaction-based credit scoring
- Real-time metric calculation
- Loan eligibility assessment
- Working capital financing
- Credit profile tracking

#### Credit Scoring Factors
| Factor | Weight | Measurement |
|--------|--------|-------------|
| Transaction Volume | 25% | Monthly average |
| Customer Base | 20% | Unique customers |
| Repeat Rate | 15% | Return customers |
| Growth Trend | 15% | MoM/YoY growth |
| Payment Reliability | 15% | Settlement history |
| Platform Tenure | 10% | Days on platform |

#### Credit Grades
| Grade | Score Range | Max Loan | Interest |
|-------|------------|----------|----------|
| AAA | 900-1000 | ₩100M | 4% |
| AA | 800-899 | ₩50M | 6% |
| A | 700-799 | ₩30M | 8% |
| BBB | 600-699 | ₩15M | 10% |
| BB | 500-599 | ₩5M | 12% |
| B | 400-499 | ₩2M | 15% |
| C | Below 400 | Not eligible | - |

#### Loan Types
- WORKING_CAPITAL: Operating expenses
- EQUIPMENT: Asset purchase
- EXPANSION: Store expansion
- EMERGENCY: Short-term bridge

### 2.3 AML Compliance Service

#### Features
- Real-time transaction monitoring
- Risk-based customer profiling
- Automated alert generation
- STR/CTR filing
- Travel rule compliance

#### AML Thresholds [REAL - Korea]
| Threshold | Amount | Action |
|-----------|--------|--------|
| CTR (Cash) | ≥₩10M | Automatic report |
| CTR (Wire) | ≥₩10M | Automatic report |
| STR Trigger | Suspicious | Manual review |
| Enhanced Due Diligence | High-risk | Additional verification |
| PEP Check | All | Political exposure |

#### Alert Types
| Type | Trigger | Severity |
|------|---------|----------|
| HIGH_VOLUME | >₩50M/day | High |
| STRUCTURING | Multiple near-threshold | Critical |
| VELOCITY | Unusual frequency | Medium |
| GEOGRAPHIC | High-risk country | High |
| PATTERN_BREAK | Deviation from normal | Medium |
| DORMANT_ACTIVATION | Sudden activity | Low |

#### Risk Levels
- LOW: Normal customers, typical patterns
- MEDIUM: Elevated activity, minor flags
- HIGH: Multiple flags, requires review
- CRITICAL: Immediate investigation

#### Travel Rule [REAL - FATF]
For transfers ≥₩1M:
- Originator: Name, account, address
- Beneficiary: Name, account
- Transaction: Amount, date, purpose

---

## 3. API Contracts

### Connect Data Source
```typescript
myDataService.connectDataSource({
  userId: string;
  category: DataCategory;
  provider: string;
  providerId: string;
}): Promise<DataInventoryItem>
```

### Request Data Access
```typescript
myDataService.requestDataAccess({
  requesterId: string;
  requesterName: string;
  userId: string;
  purpose: DataPurpose;
  categories: DataCategory[];
  scope: 'FULL' | 'SUMMARY';
  validityDays: number;
}): Promise<DataRequest>
```

### Assess Merchant Credit
```typescript
merchantCreditService.assessCredit(
  merchantId: string,
  metrics: FinancialMetrics
): Promise<CreditAssessment>
```

### Monitor Transaction (AML)
```typescript
amlComplianceService.monitorTransaction({
  id: string;
  timestamp: number;
  senderId: string;
  senderName: string;
  senderType: 'INDIVIDUAL' | 'MERCHANT' | 'CORPORATE';
  recipientId: string;
  recipientName: string;
  recipientType: string;
  amount: number;
  transactionType: string;
  channel: 'MOBILE' | 'ONLINE' | 'OFFLINE';
}): Promise<MonitoredTransaction>
```

---

## 4. Data Model

### MyDataProfile
```typescript
interface MyDataProfile {
  userId: string;
  did: string;
  dataInventory: DataInventoryItem[];
  consents: DataConsent[];
  accessLog: DataAccessLog[];
  privacySettings: PrivacySettings;
}
```

### MerchantCreditProfile
```typescript
interface MerchantCreditProfile {
  merchantId: string;
  merchantName: string;
  creditScore: number;
  creditGrade: CreditGrade;
  assessmentHistory: CreditAssessment[];
  activeLoans: LoanRecord[];
  maxLoanAmount: number;
  interestRate: number;
  lastAssessedAt: number;
}
```

### AMLAlert
```typescript
interface AMLAlert {
  id: string;
  customerId: string;
  alertType: AlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  transactionIds: string[];
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'CLOSED';
  assignedTo?: string;
  createdAt: number;
  resolvedAt?: number;
  resolution?: string;
}
```

---

## 5. Implementation Status

| Component | Status | File |
|-----------|--------|------|
| MyDataService | ✅ Complete | `src/services/myDataService.ts` |
| MerchantCreditService | ✅ Complete | `src/services/merchantCredit.ts` |
| AMLComplianceService | ✅ Complete | `src/services/amlCompliance.ts` |
| Demo Data | ✅ Complete | `src/services/demoData.ts` |
| MyData UI | ❌ Pending | - |
| Credit Dashboard | ❌ Pending | - |
| AML Admin UI | ❌ Pending | - |
| FIU Integration | ❌ Pending | - |

---

## 6. Test Scenarios

### Scenario 1: MyData Consent Flow
1. User connects bank account to LocalPay
2. Fintech app requests spending analysis access
3. User reviews scope and grants consent
4. App receives aggregated spending summary
5. User revokes consent after 6 months

### Scenario 2: Merchant Credit Assessment
1. Coffee shop on platform for 400 days
2. Monthly volume: ₩15M, 450 transactions
3. 45% repeat customers, 8% growth
4. Credit score: 720 (Grade A)
5. Eligible for ₩30M at 8% interest

### Scenario 3: AML Detection
1. Account receives 9 transfers of ₩9.9M each
2. System flags STRUCTURING pattern
3. Alert escalated to compliance officer
4. Investigation confirms intentional splitting
5. STR filed with Korea FIU
