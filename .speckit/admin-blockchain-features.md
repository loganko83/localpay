# LocalPay Admin Blockchain Features Enhancement Plan

> Research-based analysis and implementation plan for blockchain-integrated admin features
> Created: 2024-12-28

---

## Research Summary

### Korean Local Currency & Blockchain Trends (2024-2025)

#### Government Initiatives
1. **Project Hangang** (Bank of Korea CBDC Pilot)
   - April-June 2025 real transaction experiment
   - Proved "Programmable Money" capabilities
   - 100,000 citizens participated in 2024 pilot

2. **CBDC Digital Voucher Platform**
   - Joint effort by MSIT, FSC, and Bank of Korea
   - Testing deposit tokens with voucher functionality (education, culture, welfare)

3. **National Blockchain Platform**
   - MSIT pursuing legislation for national blockchain infrastructure
   - Plans for unified local currency & voucher platform

#### Regional Implementations
1. **Busan Blockchain Special Zone**
   - DID-based "Digital Citizen Card" via Dongbaekjeon app
   - BNK Busan Bank stablecoin-based local currency
   - Smart contract integration for welfare distribution

2. **Seongnam/Siheung (KOMSCO)**
   - Blockchain-based QR payment system
   - 40% cost reduction vs paper vouchers
   - Mobile + card + paper triple format

3. **Nowon-gu (Seoul)**
   - Blockchain system reduced maintenance costs by 60%
   - Annual operation cost ~200M KRW

#### Key Problems Identified
1. **Local Currency Fraud (2024 incidents)**
   - Gimpo, Gongju, Ulsan "fake QR" fraud cases
   - Phantom merchant registration issues
   - Need for enhanced FDS/AML systems

2. **Usage Rate Decline**
   - Nowon Coin: 20% initial -> <10% in 2023
   - Need for better incentives and user experience

---

## Current Admin Features Analysis

### Existing Features (Sprint 12)
| Category | Features | Status |
|----------|----------|--------|
| Dashboard | Volume charts, blockchain status, recent activity | Complete |
| User Management | User/merchant list, approval workflow | Complete |
| Voucher Management | Voucher issuance, tracking | Complete |
| Audit Logs | Blockchain-anchored audit trail | Complete |
| Analytics | Volume, users, regional stats | Complete |
| Blockchain Explorer | Block/tx search, audit verification | Complete |
| Settings | Platform, blockchain, DID config | Complete |

### Identified Gaps (Based on Research)

| Gap | Priority | Research Basis |
|-----|----------|----------------|
| Real-time FDS/AML monitoring | HIGH | Konaei FDS upgrade, fraud incidents |
| Programmable Money conditions | HIGH | Project Hangang, CBDC voucher |
| Welfare distribution tracking | HIGH | World Bank FundsChain |
| Carbon footprint tracking | MEDIUM | ESG trends, carbon credit integration |
| Merchant risk scoring | MEDIUM | Credit score system |
| Regional economic impact analysis | MEDIUM | 1.8x production effect data |
| DID verification dashboard | MEDIUM | Busan Digital Citizen Card |
| Cross-chain interoperability | LOW | Multiple testnet support |

---

## New Feature Specifications

### 1. Real-Time Fraud Detection System (FDS)

**Purpose**: Detect and prevent local currency fraud in real-time

**Key Features**:
- Real-time transaction monitoring dashboard
- Anomaly detection using pattern analysis
- Phantom merchant detection
- QR code validation tracking
- Alert system with severity levels
- Case management workflow

**Blockchain Integration**:
- Transaction patterns anchored for audit
- Fraud evidence immutably recorded
- Cross-reference with DID verification status

**UI Components**:
```
FDSDashboard.tsx
- Risk score overview
- Real-time transaction feed
- Alert queue with priority
- Suspicious pattern heatmap
- Merchant risk ranking
```

### 2. Programmable Money Conditions Manager

**Purpose**: Configure and manage voucher conditions using smart contract logic

**Key Features**:
- Condition builder UI (visual drag-drop)
- Expiration date management
- Usage category restrictions
- Geographic boundary settings
- Spending limit configurations
- Beneficiary eligibility rules

**Condition Types**:
| Type | Description | Example |
|------|-------------|---------|
| Time-based | Expiration, valid hours | "Valid until 2025-03-31" |
| Category | Merchant type restrictions | "Food & Beverage only" |
| Geographic | Region boundaries | "Busan Metropolitan Area" |
| Amount | Min/max per transaction | "Max 50,000 KRW per tx" |
| Identity | DID credential requirements | "Youth voucher: age 19-34" |
| Cumulative | Total usage limits | "Monthly max 300,000 KRW" |

**UI Components**:
```
ProgrammableMoney.tsx
- Condition template library
- Active conditions dashboard
- Condition builder wizard
- Impact simulation
- Deployment history
```

### 3. Welfare Distribution Tracker

**Purpose**: Track government subsidies and welfare funds with full transparency

**Key Features**:
- Fund allocation visualization (Sankey diagram)
- Beneficiary verification via DID
- Distribution timeline tracking
- Usage pattern analysis by welfare type
- Leakage detection alerts
- Compliance reporting

**Welfare Categories**:
- Youth support vouchers
- Senior citizen benefits
- Disability support
- Cultural vouchers
- Education subsidies
- Emergency relief funds

**Blockchain Integration**:
- Each distribution anchored to Xphere
- Merkle proof for batch verification
- Cross-check with IBK bank records

**UI Components**:
```
WelfareTracker.tsx
- Distribution flow diagram
- Beneficiary map
- Utilization rate by category
- Audit-ready reports
- DID verification status
```

### 4. Carbon Footprint & ESG Dashboard

**Purpose**: Track environmental impact of local currency transactions

**Key Features**:
- Carbon footprint per transaction category
- ESG score for merchants
- Green merchant certification
- Carbon credit equivalence display
- Sustainable consumption incentive tracking

**Metrics**:
| Metric | Calculation Basis |
|--------|-------------------|
| Carbon saved | Local vs chain store distance |
| Green tx ratio | Eco-certified merchant % |
| Packaging reduction | Delivery vs in-store |
| Energy efficiency | Merchant ESG rating |

**UI Components**:
```
CarbonDashboard.tsx
- Total carbon impact overview
- Green merchant leaderboard
- Category-wise footprint
- Monthly trends
- ESG compliance status
```

### 5. Enhanced AML Compliance Center

**Purpose**: Comprehensive anti-money laundering monitoring and reporting

**Key Features**:
- Customer Due Diligence (CDD) tracking
- Enhanced Due Diligence (EDD) workflow
- STR (Suspicious Transaction Report) generation
- CTR (Cash Transaction Report) automation
- Risk scoring per user/merchant
- FATF compliance checklist

**Integration with KoFIU**:
- Automated reporting format
- Threshold monitoring (10M KRW)
- Pattern-based alert triggers

**UI Components**:
```
AMLCenter.tsx
- Risk dashboard
- Alert queue management
- Investigation case files
- Regulatory report generator
- Compliance audit trail
```

### 6. Regional Economic Impact Analyzer

**Purpose**: Measure and visualize local currency's economic contribution

**Key Features**:
- Production-induced effect calculation
- Value-added effect tracking
- Capital retention rate
- Local vs external spending ratio
- Merchant category distribution
- Employment impact estimation

**Economic Multipliers** (based on research):
- 1T KRW issuance = 1.8T KRW production effect
- 1T KRW issuance = 0.8T KRW value-added effect

**UI Components**:
```
EconomicImpact.tsx
- Regional flow visualization
- Multiplier effect dashboard
- Comparative analysis (vs cash)
- Time-series impact trends
- Export reports for policymakers
```

### 7. DID Verification Management

**Purpose**: Manage decentralized identity verification across the platform

**Key Features**:
- DID issuance statistics
- Credential type management
- Verification success/failure rates
- Revocation management
- Zero-knowledge proof logs
- Cross-platform DID status

**Credential Types**:
| Type | Issuer | Purpose |
|------|--------|---------|
| Resident VC | Government | Identity verification |
| Age VC | Government | Youth/senior vouchers |
| Income VC | Bank/Tax | Welfare eligibility |
| Merchant VC | Chamber | Business verification |
| Employee VC | Merchant | Staff authorization |

**UI Components**:
```
DIDManagement.tsx
- Credential issuance dashboard
- Verification flow monitor
- Revocation management
- DID-BaaS integration status
- Privacy compliance checker
```

### 8. Settlement Intelligence

**Purpose**: Advanced settlement analysis and prediction

**Key Features**:
- Settlement prediction (ML-based)
- Liquidity forecasting
- Merchant payment scheduling
- Settlement dispute tracker
- Cross-bank reconciliation
- T+n optimization suggestions

**UI Components**:
```
SettlementIntelligence.tsx
- Settlement forecast chart
- Pending settlements queue
- Dispute case management
- Bank reconciliation status
- Performance analytics
```

---

## Implementation Priority

### Phase 1 (Immediate - High Priority)
1. **FDS Dashboard** - Critical for fraud prevention
2. **AML Center Enhancement** - Regulatory compliance
3. **Welfare Tracker** - Government accountability

### Phase 2 (Medium Priority)
4. **Programmable Money Manager** - Core differentiator
5. **DID Management Enhancement** - Trust infrastructure
6. **Settlement Intelligence** - Operational efficiency

### Phase 3 (Lower Priority)
7. **Carbon/ESG Dashboard** - Future compliance
8. **Economic Impact Analyzer** - Policy support

---

## Technical Architecture

### New Service Layer
```
src/services/
  fds/
    detector.ts       # Anomaly detection engine
    patterns.ts       # Pattern matching rules
    alerts.ts         # Alert management
  aml/
    screening.ts      # Customer screening
    reporting.ts      # STR/CTR generation
    riskScore.ts      # Risk calculation
  welfare/
    distribution.ts   # Fund tracking
    verification.ts   # Eligibility check
  programmable/
    conditions.ts     # Condition engine
    simulator.ts      # Impact simulation
  economics/
    multiplier.ts     # Effect calculations
    impact.ts         # Regional analysis
```

### New Admin Screens
```
src/screens/admin/
  FDSDashboard.tsx
  AMLCenter.tsx
  WelfareTracker.tsx
  ProgrammableMoney.tsx
  DIDManagement.tsx
  SettlementIntelligence.tsx
  CarbonDashboard.tsx
  EconomicImpact.tsx
```

### Database Schema Extensions (Conceptual)
```sql
-- FDS Alerts
fds_alerts (id, type, severity, merchant_id, user_id, details, status, created_at)

-- AML Cases
aml_cases (id, type, risk_score, subject_type, subject_id, status, investigator_id)

-- Welfare Distributions
welfare_distributions (id, program_id, beneficiary_did, amount, category, tx_hash, verified)

-- Programmable Conditions
programmable_conditions (id, voucher_id, condition_type, parameters, active, deployed_at)

-- Carbon Metrics
carbon_metrics (id, merchant_id, category, footprint_kg, period, calculated_at)
```

---

## Sources

### Korean Local Currency & Blockchain
- [National Blockchain Platform - Hankyung](https://www.hankyung.com/article/2025101017311)
- [CBDC Digital Voucher - FSC](https://www.fsc.go.kr/no010101/83337)
- [Local Currency Blockchain Alternative - NewsWorks](https://www.newsworks.co.kr/news/articleView.html?idxno=790521)
- [Konaei FDS Upgrade - EBN](http://www.ebn.co.kr/news/articleView.html?idxno=1475658)

### CBDC & Programmable Money
- [CBDC Local Currency Ecosystem - Wepin](https://www.wepin.io/en/blog/cbdc-local-currency-ecosystem)
- [Programmable CBDCs - Blockchain Magazine](https://www.blockchainmagazine.net/programmable-cbdcs-smart-contracts/)
- [Bank of Korea CBDC - BIS](https://www.bis.org/publ/bppdf/bispap123_m.pdf)
- [South Korea CBDC Pilot - CoinDesk](https://www.coindesk.com/policy/2023/11/23/south-korea-to-pilot-cbdc-with-100000-citizens-in-2024-report)

### Blockchain Audit & Transparency
- [World Bank FundsChain](https://blogs.worldbank.org/en/governance/enhancing-transparency--the-impact-of-blockchain-based-audit-tra)
- [Blockchain Audit Trails - ISACA](https://www.isaca.org/resources/news-and-trends/industry-news/2024/how-blockchain-technology-is-revolutionizing-audit-and-control-in-information-systems)
- [Government Blockchain - Blocksys](https://blocsys.com/blockchain-in-government-services-enhancing-transparency-and-accountability-through-decentralization/)

### AML & Compliance
- [Elliptic Blockchain Analytics](https://www.elliptic.co/)
- [TRM Labs Compliance](https://www.trmlabs.com/)
- [AML Korea - SAS](https://www.sas.com/ko_kr/insights/fraud/anti-money-laundering.html)

### ESG & Carbon
- [Blockchain ESG - Upbit Care](https://m.upbitcare.com/academy/advice/59)
- [Carbon Credit Blockchain - KCMI](https://www.kcmi.re.kr/publications/pub_detail_view?syear=2022&zcd=002001016&zno=1672&cno=5959)

### Regional Implementations
- [Busan Blockchain Zone](https://blockchainbusan.kr/)
- [Busan Citizen Platform - SmartCity](https://smartcity.go.kr/2024/05/14/블록체인-기반-통합-시민플랫폼-시범사업-서비스-개)
- [Busan Blockchain - Coinplug](https://coinplug.com/busan)

### DID & Identity
- [Blockchain Identity Guide - Dock](https://www.dock.io/post/blockchain-identity-management)
- [Verifiable Credentials - Dock](https://www.dock.io/post/verifiable-credentials)
- [IBM Blockchain Identity](https://www.ibm.com/blockchain-identity)
