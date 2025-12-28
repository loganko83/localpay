# UI Improvement Sprint

> Korean Localization & Feature Completion
> Created: 2024-12-28

---

## Overview

This sprint focuses on:
1. Complete Korean localization for all user-facing UI
2. UI/UX improvements for Consumer, Merchant, and Admin apps
3. API integration completion and mock data removal

---

## Phase 1: Korean Localization (Priority: Critical)

### Current State
- Most screens contain English text in user-facing elements
- Numbers already formatted with `Intl.NumberFormat('ko-KR')`
- No i18n library currently implemented

### Implementation Approach
Direct string replacement (inline Korean) rather than i18n library for PoC speed.

### Consumer App (19 screens)

| Screen | File | Status |
|--------|------|--------|
| Home | Home.tsx | Pending |
| Wallet | Wallet.tsx | Pending |
| Scan | Scan.tsx | Pending |
| History | History.tsx | Pending |
| Profile | Profile.tsx | Pending |
| TopUp | TopUp.tsx | Pending |
| MerchantDetail | MerchantDetail.tsx | Pending |
| Offers | Offers.tsx | Pending |
| Coupons | Coupons.tsx | Pending |
| Services | Services.tsx | Pending |
| PaymentConfirmation | PaymentConfirmation.tsx | Pending |
| TransactionDetail | TransactionDetail.tsx | Pending |
| CarbonPoints | CarbonPoints.tsx | Pending |
| LoyaltyPoints | LoyaltyPoints.tsx | Pending |
| TouristWallet | TouristWallet.tsx | Pending |
| Delivery | Delivery.tsx | Pending |
| Donations | Donations.tsx | Pending |
| ProductTrace | ProductTrace.tsx | Pending |
| MerchantMap | MerchantMap.tsx | Pending |

### Merchant App (13 screens)

| Screen | File | Status |
|--------|------|--------|
| Login | Login.tsx | Pending |
| Dashboard | Dashboard.tsx | Pending |
| Wallet | Wallet.tsx | Pending |
| Scan | Scan.tsx | Pending |
| Payments | Payments.tsx | Pending |
| History | History.tsx | Pending |
| Employees | Employees.tsx | Pending |
| Settings | Settings.tsx | Pending |
| Notifications | Notifications.tsx | Pending |
| CreditScore | CreditScore.tsx | Pending |
| WelfareManagement | WelfareManagement.tsx | Pending |
| DeliveryOrders | DeliveryOrders.tsx | Pending |
| SettlementCalendar | SettlementCalendar.tsx | Pending |
| LoyaltyRedeem | LoyaltyRedeem.tsx | Pending |

### Admin App (19 screens)

| Screen | File | Status |
|--------|------|--------|
| Login | Login.tsx | Pending |
| Dashboard | Dashboard.tsx | Pending |
| Analytics | Analytics.tsx | Pending |
| Users | Users.tsx | Pending |
| Vouchers | Vouchers.tsx | Pending |
| Settlements | Settlements.tsx | Pending |
| AuditLogs | AuditLogs.tsx | Pending |
| BlockchainExplorer | BlockchainExplorer.tsx | Pending |
| Security | Security.tsx | Pending |
| Policies | Policies.tsx | Pending |
| TokenIssuance | TokenIssuance.tsx | Pending |
| AMLDashboard | AMLDashboard.tsx | Pending |
| CarbonAdmin | CarbonAdmin.tsx | Pending |
| DonationCampaigns | DonationCampaigns.tsx | Pending |
| MerchantCreditReview | MerchantCreditReview.tsx | Pending |
| Settings | Settings.tsx | Pending |
| FDSDashboard | FDSDashboard.tsx | Pending |
| AMLCenter | AMLCenter.tsx | Pending |
| WelfareTracker | WelfareTracker.tsx | Pending |

---

## Phase 2: UI/UX Improvements

### Consumer App
- [ ] Home: Add seasonal banner/event area
- [ ] Wallet: Improve card carousel UX
- [ ] History: Add pull-to-refresh
- [ ] Profile: Add avatar upload placeholder

### Merchant App
- [ ] Dashboard: Add real-time notification badge
- [ ] Payments: Improve filter UX
- [ ] Settings: Add business hours editor

### Admin App
- [ ] Dashboard: Add system health indicators
- [ ] Analytics: Add export functionality
- [ ] Users: Add bulk action support

---

## Phase 3: API Integration Completion

### Critical (Bank API)
- [ ] bankAPI.getBalance() - Connect to IBK API
- [ ] bankAPI.requestPayment() - Connect to IBK API
- [ ] bankAPI.requestCharge() - Connect to IBK API
- [ ] bankAPI.requestRefund() - Connect to IBK API

### High Priority
- [ ] auditLog persistence to database
- [ ] identity.ts DID-BaaS integration
- [ ] policyEngine merchant lookups

### Medium Priority
- [ ] Exchange rate API (Korea Eximbank)
- [ ] Blockchain anchoring persistence

---

## Korean Text Standards

### Common Translations

| English | Korean |
|---------|--------|
| Home | 홈 |
| Wallet | 지갑 |
| History | 내역 |
| Profile | 프로필 |
| Settings | 설정 |
| Top Up | 충전 |
| Pay | 결제 |
| Send | 보내기 |
| Receive | 받기 |
| Transfer | 송금 |
| Scan | 스캔 |
| QR Code | QR코드 |
| Balance | 잔액 |
| Amount | 금액 |
| Total | 합계 |
| Today | 오늘 |
| Yesterday | 어제 |
| This Week | 이번 주 |
| This Month | 이번 달 |
| See All | 전체보기 |
| View All | 전체보기 |
| Search | 검색 |
| Filter | 필터 |
| Cancel | 취소 |
| Confirm | 확인 |
| Submit | 제출 |
| Save | 저장 |
| Edit | 수정 |
| Delete | 삭제 |
| Back | 뒤로 |
| Next | 다음 |
| Done | 완료 |
| Loading | 로딩 중 |
| Error | 오류 |
| Success | 성공 |
| Pending | 대기 중 |
| Completed | 완료 |
| Failed | 실패 |
| Active | 활성 |
| Inactive | 비활성 |
| Verified | 인증됨 |
| Login | 로그인 |
| Logout | 로그아웃 |
| Password | 비밀번호 |
| Email | 이메일 |
| Name | 이름 |
| Phone | 전화번호 |
| Address | 주소 |
| Date | 날짜 |
| Time | 시간 |
| Status | 상태 |
| Type | 유형 |
| Category | 카테고리 |
| Merchant | 가맹점 |
| Customer | 고객 |
| Transaction | 거래 |
| Payment | 결제 |
| Refund | 환불 |
| Settlement | 정산 |
| Voucher | 바우처 |
| Coupon | 쿠폰 |
| Points | 포인트 |
| Rewards | 리워드 |
| Notification | 알림 |
| Dashboard | 대시보드 |
| Analytics | 분석 |
| Reports | 리포트 |
| Export | 내보내기 |
| Import | 가져오기 |
| Download | 다운로드 |
| Upload | 업로드 |

### Status Labels

| English | Korean |
|---------|--------|
| Active | 활성 |
| Pending | 대기 중 |
| Completed | 완료됨 |
| Failed | 실패 |
| Expired | 만료됨 |
| Cancelled | 취소됨 |
| Processing | 처리 중 |
| Approved | 승인됨 |
| Rejected | 거부됨 |
| Suspended | 정지됨 |

### Time Expressions

| English | Korean |
|---------|--------|
| Just now | 방금 |
| X minutes ago | X분 전 |
| X hours ago | X시간 전 |
| X days ago | X일 전 |
| Today | 오늘 |
| Yesterday | 어제 |
| This week | 이번 주 |
| Last week | 지난주 |
| This month | 이번 달 |
| Last month | 지난달 |

---

## Progress Tracking

- Total Screens: 51
- Localized: 0
- Remaining: 51
- Completion: 0%

---
