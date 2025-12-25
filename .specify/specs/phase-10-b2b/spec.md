# Phase 10: B2B Services Specification

> Corporate Welfare and Transparent Donation Platform

---

## 1. Overview

### Purpose
Enable businesses to distribute employee welfare benefits through local currency and provide a transparent donation platform where donors can track exactly how their contributions are used.

### Business Value
- Simplify corporate welfare management
- Tax benefits for businesses
- 100% transparent donation tracking
- Boost local economy through B2B channels

---

## 2. Services

### 2.1 Corporate Welfare Service

#### Features
- Company registration and budget management
- Department-based allocation
- Employee welfare distribution
- Category-restricted spending
- Usage reporting for tax purposes

#### Welfare Categories
| Category | Tax Deductible | Restrictions |
|----------|---------------|--------------|
| MEAL_ALLOWANCE | ₩100K/month | Food MCC only |
| COMMUTE_SUPPORT | Full | Transport only |
| HEALTH_BENEFIT | Full | Medical/fitness |
| CULTURE_EXPENSE | ₩100K/year | Entertainment |
| EDUCATION_SUPPORT | Full | Education MCC |
| CHILDCARE_BENEFIT | Full | Childcare facilities |
| GENERAL_WELFARE | Partial | No gambling/liquor |

#### Tax Configuration [REAL - Korea Tax Law]
- Meal allowance: ₩100,000/month non-taxable
- Culture expense: ₩100,000/year non-taxable
- Commute/health: Fully deductible
- Gift cards: Taxable as income

### 2.2 Donation Platform Service

#### Features
- Registered charity management
- Campaign creation with milestones
- Real-time fund tracking
- Blockchain-verified distribution
- Tax receipt automation

#### Charity Categories
- WELFARE: Social welfare
- EDUCATION: Educational support
- MEDICAL: Healthcare
- DISASTER: Disaster relief
- ENVIRONMENT: Environmental protection
- CULTURE: Cultural preservation
- ANIMAL: Animal welfare
- INTERNATIONAL: International aid

#### Donation Types
- DESIGNATED: Specific charity/cause
- UNDESIGNATED: General pool
- MATCHING: Corporate matching
- RECURRING: Monthly subscription

#### Tax Deduction [REAL - Korea]
| Donor Type | Deduction Limit |
|------------|-----------------|
| Individual | 30% of income |
| Corporate | 10% of income |
| Designated (special) | 50% of income |

---

## 3. API Contracts

### Register Company
```typescript
corporateWelfareService.registerCompany({
  companyName: string;
  businessNumber: string;
  adminUserId: string;
  initialBudget: number;
  fiscalYearStart: number;  // month 1-12
}): Promise<CompanyAccount>
```

### Distribute Welfare
```typescript
corporateWelfareService.bulkDistribute({
  companyId: string;
  departmentId?: string;
  category: WelfareCategory;
  amountPerEmployee: number;
  executedBy: string;
  note?: string;
}): Promise<DistributionBatch>
```

### Create Donation Campaign
```typescript
donationPlatformService.createCampaign({
  charityId: string;
  title: string;
  description: string;
  targetAmount: number;
  endDate: number;
  milestones?: Array<{amount, description}>;
}): DonationCampaign
```

### Make Donation
```typescript
donationPlatformService.makeDonation({
  donorId: string;
  donorType: 'INDIVIDUAL' | 'CORPORATE';
  donorName: string;
  charityId: string;
  campaignId?: string;
  amount: number;
  isAnonymous?: boolean;
  message?: string;
}): Promise<DonationRecord>
```

---

## 4. Data Model

### CompanyAccount
```typescript
interface CompanyAccount {
  id: string;
  companyName: string;
  businessNumber: string;
  adminUserId: string;
  totalBudget: number;
  usedBudget: number;
  fiscalYearStart: number;
  departments: Department[];
  employees: EmployeeWelfare[];
  status: 'ACTIVE' | 'SUSPENDED';
}
```

### DonationCampaign
```typescript
interface DonationCampaign {
  id: string;
  charityId: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  donorCount: number;
  startDate: number;
  endDate: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  milestones?: CampaignMilestone[];
  distributions: Distribution[];
}
```

---

## 5. Implementation Status

| Component | Status | File |
|-----------|--------|------|
| CorporateWelfareService | ✅ Complete | `src/services/corporateWelfare.ts` |
| DonationPlatformService | ✅ Complete | `src/services/donationPlatform.ts` |
| Demo Data | ✅ Complete | `src/services/demoData.ts` |
| Company Admin UI | ❌ Pending | - |
| Donation UI | ❌ Pending | - |
| Tax Integration | ❌ Pending | - |

---

## 6. Test Scenarios

### Scenario 1: Monthly Welfare Distribution
1. Company "Busan Tech" has 50 employees
2. HR distributes ₩200,000 meal allowance each
3. Total: ₩10,000,000 distributed
4. Employees spend at local restaurants
5. Monthly report generated for tax filing

### Scenario 2: Transparent Donation
1. Donor contributes ₩1,000,000 to "Winter Heating"
2. Campaign reaches ₩2,500,000 (25% milestone)
3. Charity distributes to 50 families
4. Donor sees exactly which families received
5. Blockchain hash provides verification
6. Tax receipt auto-generated

### Scenario 3: Corporate Matching
1. Company pledges 1:1 matching up to ₩10M
2. Employees donate ₩5,000,000 total
3. Company matches with ₩5,000,000
4. Campaign receives ₩10,000,000
5. Impact report shared with all donors
