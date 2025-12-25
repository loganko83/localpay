# Phase 9: ESG & Carbon Points Specification

> Carbon Reduction Rewards and Green Incentives

---

## 1. Overview

### Purpose
Implement an ESG reward system that incentivizes eco-friendly behaviors through carbon points, which can be exchanged for local currency. Based on Korea's Ministry of Environment Carbon Neutral Points program.

### Business Value
- Promote sustainable consumption
- Align with city's carbon neutrality goals
- Gamify environmental responsibility
- Connect green actions to economic benefits

---

## 2. Services

### 2.1 Carbon Points Service

#### Features
- Record eco-friendly actions
- Calculate carbon reduction
- Convert to exchangeable points
- Leaderboards and badges
- Monthly report cards

#### Carbon Reduction Values [REAL - Korea MoE]
| Action | CO2 Reduced | Points | KRW Value |
|--------|------------|--------|-----------|
| E-Receipt | 3.51g | 0 | ₩0 |
| Tumbler Use | 50.7g | 0 | ₩0 |
| Multi-use Container | 114.6g | 1 | ₩10 |
| Refill Station | 112g | 1 | ₩10 |
| No Plastic Bag | 16g | 0 | ₩0 |
| Public Bus (per km) | 80g | 0 | ₩0 |
| Subway (per km) | 102g | 1 | ₩10 |
| Bike Sharing (per km) | 150g | 1 | ₩10 |
| Walking (per km) | 210g | 2 | ₩20 |
| EV Charging | 200g | 2 | ₩20 |
| Recycling (per kg) | 50g | 0 | ₩0 |
| E-Waste Recycling | 500g | 5 | ₩50 |

#### Point Conversion
- 100g CO2 = 1 point
- 1 point = ₩10 KRW
- Daily limit: 1,000 points
- Monthly limit: 10,000 points

#### User Levels
| Level | CO2 Reduced | Badge |
|-------|------------|-------|
| SEED | 0 - 10kg | Starting |
| SPROUT | 10 - 100kg | Growing |
| TREE | 100kg - 1 ton | Established |
| FOREST | 1+ ton | Champion |

#### Verification Methods
- QR_SCAN: At participating venues
- RECEIPT_SCAN: Electronic receipt verification
- IOT_SENSOR: Smart device data
- TRANSPORT_CARD: Public transit tap
- GPS_TRACKING: Walking/biking verification
- MANUAL_REVIEW: Admin verification

---

## 3. API Contracts

### Record Eco Action
```typescript
carbonPointsService.recordAction({
  userId: string;
  actionType: EcoActionType;
  quantity?: number;
  verificationMethod: VerificationMethod;
  verificationData?: {
    merchantId?: string;
    transactionId?: string;
    gpsCoordinates?: Coordinate[];
    sensorId?: string;
  };
}): Promise<EcoAction>
```

### Exchange to Currency
```typescript
carbonPointsService.exchangeToLocalCurrency(
  userId: string,
  points: number
): Promise<{
  success: boolean;
  krwAmount?: number;
  remainingPoints?: number;
}>
```

### Generate Report Card
```typescript
carbonPointsService.generateReportCard(
  userId: string,
  startDate: string,
  endDate: string
): CarbonReportCard
```

---

## 4. Data Model

### CarbonAccount
```typescript
interface CarbonAccount {
  userId: string;
  totalPoints: number;
  availablePoints: number;
  totalCarbonReduced: number;  // grams
  todayPoints: number;
  monthlyPoints: number;
  level: 'SEED' | 'SPROUT' | 'TREE' | 'FOREST';
  badges: string[];
  actions: EcoAction[];
}
```

### CarbonReportCard
```typescript
interface CarbonReportCard {
  userId: string;
  period: { start: string; end: string };
  totalCarbonReduced: number;
  equivalentTrees: number;  // 1 tree = 21kg CO2/year
  topActions: Array<{
    type: EcoActionType;
    count: number;
    carbon: number;
  }>;
  ranking?: number;
  certificate?: {
    id: string;
    blockchainHash?: string;
  };
}
```

---

## 5. Implementation Status

| Component | Status | File |
|-----------|--------|------|
| CarbonPointsService | ✅ Complete | `src/services/carbonPoints.ts` |
| Demo Data | ✅ Complete | `src/services/demoData.ts` |
| Consumer UI | ❌ Pending | - |
| IoT Integration | ❌ Pending | - |
| Transport Card API | ❌ Pending | - |

---

## 6. Test Scenarios

### Scenario 1: Daily Eco Actions
1. User brings tumbler to cafe → 50.7g CO2 saved
2. Takes subway 5km to work → 510g CO2 saved
3. Uses e-receipt at lunch → 3.51g CO2 saved
4. Walks home 2km → 420g CO2 saved
5. Daily total: ~984g = 9 points = ₩90

### Scenario 2: Monthly Exchange
1. User accumulates 5,000 points in month
2. Exchanges 5,000 points → ₩50,000 local currency
3. Uses at traditional market
4. Creates economic circulation + carbon reduction

### Scenario 3: Level Up Journey
1. New user starts at SEED level
2. After 3 months of eco actions: 15kg CO2 saved
3. Achieves SPROUT level
4. Earns "100 Actions" badge
5. Appears on city leaderboard
