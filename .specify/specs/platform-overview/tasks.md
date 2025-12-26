# LocalPay Task List

> Actionable items organized by priority and category

---

## Legend

- 🔴 **Critical**: Blocking issues
- 🟠 **High**: Important for next release
- 🟡 **Medium**: Should be done
- 🟢 **Low**: Nice to have
- ✅ **Done**: Completed
- 🔄 **In Progress**: Currently working
- ⏸️ **Blocked**: Waiting on dependency

---

## Current Sprint: Debugging & Documentation

### TypeScript Fixes 🟠

- [x] Remove unused imports in screen components
  - `src/screens/admin/Dashboard.tsx` - Button (FIXED)
  - `src/screens/AppSelector.tsx` - Button (FIXED)
  - `src/screens/consumer/Offers.tsx` - Header (FIXED)
  - `src/screens/consumer/TopUp.tsx` - Input (FIXED)
  - `src/screens/consumer/TransactionDetail.tsx` - Transaction (FIXED)
  - `src/screens/consumer/Wallet.tsx` - Button (FIXED)
  - `src/screens/merchant/Notifications.tsx` - Badge (FIXED)
  - `src/screens/merchant/Scan.tsx` - Input (FIXED)

- [x] Fix Recharts Formatter type
  - `src/screens/admin/Dashboard.tsx:134` (FIXED)
  - `src/screens/merchant/Dashboard.tsx:186` (FIXED)
  - Solution: Handle undefined value in formatter with null check

- [x] Fix Badge variant types
  - `src/screens/consumer/Coupons.tsx` - "primary" now valid (FIXED)
  - `src/screens/consumer/Services.tsx` - "secondary" now valid (FIXED)
  - Solution: Added 'primary', 'secondary', 'danger' variants and 'lg' size to Badge component

- [x] Fix Profile.tsx type narrowing
  - Lines 290-311: Union type property access (FIXED)
  - Solution: Added MenuItem and MenuSection interfaces with proper type definitions

- [x] Fix Admin Login permissions type
  - `src/screens/admin/Login.tsx:34` (FIXED)
  - Solution: Removed `as const` to allow array to be assignable to AdminPermission[]

### Documentation 🟡

- [x] Create `.specify/memory/constitution.md`
- [x] Create platform overview spec
- [x] Create Phase 6 spec (Programmable Money)
- [x] Create Phase 7 spec (Tourism)
- [x] Create Phase 8 spec (Delivery & Market)
- [x] Create Phase 9 spec (ESG & Carbon)
- [x] Create Phase 10 spec (B2B Services)
- [x] Create Phase 11 spec (MyData & AML)
- [x] Create implementation plan
- [x] Create task list

---

## Backlog: UI Implementation

### Consumer App ✅ COMPLETE

- [x] Integrate Programmable Money tokens to wallet view
- [x] Add carbon points display to profile
- [x] Implement loyalty points section (LoyaltyPoints.tsx)
- [x] Create merchant map with filters (MerchantMap.tsx)
- [x] Add tourist wallet with tax refund (TouristWallet.tsx)
- [x] Implement carbon points screen (CarbonPoints.tsx)
- [x] Add delivery tracking screen (Delivery.tsx)
- [x] Create donations screen (Donations.tsx)
- [x] Implement product trace screen (ProductTrace.tsx)

### Merchant App ✅ COMPLETE

- [x] Display transaction-based credit score (CreditScore.tsx)
- [x] Add employee welfare distribution UI (WelfareManagement.tsx)
- [x] Show delivery order management (DeliveryOrders.tsx)
- [x] Implement settlement calendar (SettlementCalendar.tsx)
- [x] Add loyalty point redemption (LoyaltyRedeem.tsx)

### Admin App ✅ COMPLETE

- [x] Create programmable money issuance UI (TokenIssuance.tsx)
- [x] Add AML alert dashboard (AMLDashboard.tsx)
- [x] Implement donation campaign management (DonationCampaigns.tsx)
- [x] Create merchant credit review panel (MerchantCreditReview.tsx)
- [x] Add carbon points administration (CarbonAdmin.tsx)

### Debug Dashboard ✅ COMPLETE

- [x] Create basic debug dashboard
- [x] Display all service demo data
- [x] Add JSON viewer for each service
- [x] Add data modification capability (Quick Actions tab)
- [x] Add service method tester (Method Tester tab with parameter inputs)
- [x] Add performance metrics (Performance tab with CPU, Memory, Network, Bundle analysis)

---

## Backlog: Service Enhancements

### Phase 6: Programmable Money 🟡

- [ ] Add batch token issuance
- [ ] Implement clawback scheduler
- [ ] Add spending analytics
- [ ] Create budget utilization reports

### Phase 7: Tourism 🟡

- [ ] Add multi-language support
- [ ] Implement departure verification flow
- [ ] Add currency rate alerts
- [ ] Create tourist spending reports

### Phase 8: Delivery & Market 🟡

- [ ] Add real-time order tracking
- [ ] Implement rider assignment algorithm
- [ ] Add product freshness alerts
- [ ] Create loyalty tier upgrade notifications

### Phase 9: ESG & Carbon 🟢

- [ ] Add IoT sensor integration stubs
- [ ] Implement transport card API mock
- [ ] Create carbon certificate generation
- [ ] Add community challenges

### Phase 10: B2B 🟢

- [ ] Add bulk welfare distribution
- [ ] Implement corporate matching
- [ ] Create impact visualization
- [ ] Add tax receipt PDF generation

### Phase 11: MyData & AML 🟢

- [ ] Add consent management UI
- [ ] Implement credit score simulator
- [ ] Create STR filing workflow
- [ ] Add travel rule compliance check

---

## Backlog: Infrastructure

### Testing 🟡

- [ ] Setup Vitest for unit testing
- [ ] Write service unit tests
- [ ] Write component tests
- [x] Setup Playwright for E2E (playwright.config.ts + e2e/screenshot-test.spec.ts)
- [x] Screenshot tests for all 36 routes (all passing)
- [ ] Write critical path E2E tests

### Build & Deploy 🟢

- [ ] Configure production build
- [ ] Setup CI/CD pipeline
- [ ] Add environment configuration
- [ ] Create Docker containerization
- [ ] Setup staging environment

### Monitoring 🟢

- [ ] Add error boundary components
- [ ] Setup error logging
- [ ] Add performance tracking
- [ ] Create health check endpoint

---

## Completed Tasks ✅

### Sprint: Phase 6-11 UI Implementation (2024-12-25)
- [x] Consumer screens: CarbonPoints, LoyaltyPoints, TouristWallet, Delivery, Donations, ProductTrace, MerchantMap
- [x] Merchant screens: CreditScore, WelfareManagement, DeliveryOrders, SettlementCalendar, LoyaltyRedeem
- [x] Admin screens: TokenIssuance, AMLDashboard, CarbonAdmin, DonationCampaigns, MerchantCreditReview
- [x] Updated Wallet with Programmable Money tokens display
- [x] Updated Profile with Carbon Points & Loyalty Points sections
- [x] Added Performance tab to Debug Dashboard
- [x] Updated router with all new routes
- [x] Setup Playwright E2E testing
- [x] Screenshot tests for all 36 routes (all passing)
- [x] Fixed all TypeScript compilation errors

### Sprint: Phase 6-11 Services
- [x] Implement ProgrammableMoneyService
- [x] Implement TokenLifecycleService
- [x] Implement TouristWalletService
- [x] Implement TaxRefundService
- [x] Implement PublicDeliveryService
- [x] Implement ProductTraceabilityService
- [x] Implement SharedLoyaltyService
- [x] Implement CarbonPointsService
- [x] Implement CorporateWelfareService
- [x] Implement DonationPlatformService
- [x] Implement MyDataService
- [x] Implement MerchantCreditService
- [x] Implement AMLComplianceService

### Sprint: Demo Data & Debugging
- [x] Create comprehensive demo data
- [x] Fix TypeScript service errors
- [x] Add demo data initialization to main.tsx
- [x] Create Debug Dashboard
- [x] Export all services from index.ts

### Sprint: Spec-Kit Setup
- [x] Create folder structure
- [x] Write constitution
- [x] Write specifications
- [x] Write implementation plan
- [x] Create task list

---

## Notes

### Priority Definitions
- **Critical**: System cannot function
- **High**: Major feature incomplete
- **Medium**: Enhancement needed
- **Low**: Polish and optimization

### Estimation Guide
- 🔹 Small: < 2 hours
- 🔸 Medium: 2-8 hours
- 🔶 Large: 1-3 days
- 🔷 XLarge: 1+ week

### Dependencies
- UI implementation depends on TypeScript fixes
- E2E tests depend on UI completion
- Production deploy depends on all testing
