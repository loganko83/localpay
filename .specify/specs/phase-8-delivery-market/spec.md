# Phase 8: Delivery & Market Specification

> Zero-Commission Delivery, Product Traceability, and Shared Loyalty

---

## 1. Overview

### Purpose
Create a public delivery infrastructure with zero platform fees, implement blockchain-based product traceability for local produce, and establish a shared loyalty program across Busan merchants.

### Business Value
- Support local restaurants with fee-free delivery
- Fair wages for delivery riders
- Transparent food supply chain
- Unified loyalty across small merchants

---

## 2. Services

### 2.1 Public Delivery Service

#### Features
- Zero platform commission (only delivery fee)
- Fair rider compensation
- Real-time order tracking
- Work history for riders

#### Fee Structure [Compared to Private Platforms]
| Component | Private Platform | LocalPay |
|-----------|-----------------|----------|
| Platform Commission | 15-25% | 0% |
| Delivery Fee (base) | ₩3,000 | ₩3,000 |
| Delivery Fee (per km) | ₩500 | ₩500 |
| PG Fee | 2.5% | 2.5% |
| Rider Share | 70% | 85% |

#### Order Status Flow
```
PLACED → ACCEPTED → PREPARING → PICKED_UP → DELIVERING → DELIVERED
                                                           ↓
                                                      COMPLETED
```

### 2.2 Product Traceability Service

#### Features
- QR-based product tracking
- Full supply chain visibility
- Certification verification (GAP, HACCP, Organic)
- Temperature/humidity logging
- Consumer-facing product history

#### Tracking Events
| Event | Actor | Data Captured |
|-------|-------|---------------|
| HARVESTED | Producer | Date, location, quantity |
| INSPECTED | Inspector | Certifications, quality |
| TRANSPORTED | Logistics | Temperature, route |
| STORED | Warehouse | Conditions, duration |
| PROCESSED | Processor | Methods, batch |
| RETAILED | Merchant | Final location |
| SOLD | Consumer | Purchase record |

#### Certification Types [REAL - Korea NAQS]
- GAP: Good Agricultural Practices
- HACCP: Food safety
- ORGANIC: Certified organic
- HALAL: Halal certification
- TRACEABILITY: National traceability

### 2.3 Shared Loyalty Service

#### Features
- Cross-merchant point earning
- Unified point redemption
- Tier-based benefits
- Alliance merchant network

#### Point Structure
| Tier | Min Spending | Earn Rate | Benefits |
|------|-------------|-----------|----------|
| BRONZE | ₩0 | 1% | Basic |
| SILVER | ₩500K | 1.5% | +Birthday bonus |
| GOLD | ₩2M | 2% | +Priority support |
| PLATINUM | ₩5M | 3% | +VIP events |

#### Point Economics
- 1 point = ₩1 KRW
- Min redemption: 1,000 points
- Expiry: 12 months from earn
- Transfer: Not allowed

---

## 3. API Contracts

### Place Delivery Order
```typescript
publicDeliveryService.placeOrder({
  customerId: string;
  merchantId: string;
  items: Array<{name, quantity, unitPrice}>;
  deliveryAddress: string;
  deliveryDistance: number;
}): Promise<DeliveryOrder>
```

### Register Product
```typescript
productTraceabilityService.registerProduct({
  productName: string;
  category: ProductCategory;
  producerId: string;
  harvestDate: number;
  expiryDate: number;
  quantity: number;
  unit: string;
  certifications: Certification[];
  location: Location;
}): Promise<TrackedProduct>
```

### Earn Loyalty Points
```typescript
sharedLoyaltyService.earnPoints({
  userId: string;
  merchantId: string;
  purchaseAmount: number;
  transactionId: string;
}): Promise<PointTransaction>
```

---

## 4. Implementation Status

| Component | Status | File |
|-----------|--------|------|
| PublicDeliveryService | ✅ Complete | `src/services/publicDelivery.ts` |
| ProductTraceabilityService | ✅ Complete | `src/services/productTraceability.ts` |
| SharedLoyaltyService | ✅ Complete | `src/services/sharedLoyalty.ts` |
| Demo Data | ✅ Complete | `src/services/demoData.ts` |
| Consumer UI | ❌ Pending | - |
| Merchant Integration | ❌ Pending | - |

---

## 5. Test Scenarios

### Scenario 1: Zero-Commission Delivery
1. Customer orders ₩33,000 meal
2. Delivery fee: ₩4,750 (3km)
3. Merchant receives: ₩32,175 (after PG fee only)
4. Rider receives: ₩4,037 (85% of delivery fee)
5. Compare: Private platform would take ₩6,600+

### Scenario 2: Product Traceability
1. Scan QR on cherry tomatoes
2. View: Gimhae Organic Farm, harvested 2 days ago
3. See: GAP + Organic certified
4. Track: 3°C cold chain maintained
5. Verify: All inspections passed

### Scenario 3: Shared Loyalty
1. Customer at Silver tier (₩750K lifetime)
2. Buys ₩45,000 at cafe → earns 675 points
3. Next day: ₩85,000 at restaurant → earns 1,275 points
4. Redeems 1,000 points at market
5. Points work across all alliance merchants
