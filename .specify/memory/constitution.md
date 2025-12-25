# LocalPay Constitution

> Project principles and guidelines for the Busan Local Currency Payment Platform

---

## 1. Project Identity

### Name
**LocalPay** - Busan Digital Local Currency Platform

### Vision
Build a blockchain-based local digital currency payment ecosystem for Busan, Korea, serving consumers, merchants, and administrators with transparent, efficient, and inclusive financial services.

### Mission
- Promote local economic circulation
- Support small and medium businesses
- Provide inclusive financial services
- Ensure regulatory compliance and transparency

---

## 2. Core Principles

### 2.1 Architecture Principles

#### Bank-Platform Separation
- **Bank**: Handles all financial operations (custody, settlement, compliance)
- **Platform**: Handles UX, policy management, and verification
- Quote: "Money handled by bank, Proof handled by technology"

#### Data Source Classification
Every data point must be classified:
- `[REAL]` - Actual regulatory/official data
- `[MOCK]` - Simulated for development
- `[INTEGRATION READY]` - API placeholder for production

#### Blockchain Usage
- Used for verification, audit, and integrity purposes only
- NOT for payment processing or fund custody
- Anchoring critical events to public chain (Xphere)

### 2.2 Development Principles

#### Mobile-First Design
- All UIs optimized for mobile devices (max-w-md)
- Touch-friendly interactions
- Offline-capable core features

#### User Type Separation
| User Type | Primary Color | Theme |
|-----------|--------------|-------|
| Consumer | #ed2630 (Red) | Dark with red accents |
| Merchant | #13ec5b (Green) | Dark with green accents |
| Admin | #2b8cee (Blue) | Dark with blue accents |

#### Korean Localization
- All user-facing text in Korean
- Currency format: ₩ with comma separators
- Date format: Korean standard

### 2.3 Code Standards

#### Language Policy
- **Code**: English only (variables, functions, comments)
- **UI Text**: Korean for user-facing content
- **No emojis** in source code

#### TypeScript Strict Mode
- Enable all strict checks
- No `any` types without justification
- Proper error handling

#### Component Architecture
- React functional components with hooks
- Zustand for state management
- React Router for navigation

---

## 3. Technical Stack

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Recharts (data visualization)
- react-router-dom (routing)
- Zustand (state management)

### Backend (Future)
- Node.js / Express or NestJS
- PostgreSQL (primary database)
- Redis (caching)
- IBK Bank API (financial operations)

### Blockchain
- Xphere (public chain anchoring)
- DID/VC for identity

---

## 4. Service Phases

| Phase | Sprint | Focus Area | Services |
|-------|--------|------------|----------|
| 1-5 | 1-20 | Core Platform | Auth, Wallet, Payments, Admin |
| 6 | 21-22 | Programmable Money | Purpose-bound tokens, Lifecycle |
| 7 | 23-24 | Tourism | Tourist wallet, Tax refund |
| 8 | 25-26 | Delivery & Market | Public delivery, Traceability, Loyalty |
| 9 | 27-28 | ESG & Carbon | Carbon points, Green rewards |
| 10 | 29-30 | B2B Services | Corporate welfare, Donations |
| 11 | 31-32 | MyData & AML | Data portability, Compliance |

---

## 5. Quality Standards

### Testing Requirements
- Unit tests for all services
- Integration tests for critical flows
- E2E tests for user journeys

### Documentation Requirements
- JSDoc comments for public APIs
- README for each service module
- Spec-Kit specifications for features

### Security Requirements
- No hardcoded secrets
- Input validation at boundaries
- Rate limiting on APIs
- Audit logging for sensitive operations

---

## 6. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-01 | Use Zustand over Redux | Simpler API, less boilerplate |
| 2024-01 | Vite over CRA | Faster builds, better DX |
| 2024-01 | Bank-Platform separation | Regulatory compliance, clear responsibility |
| 2024-12 | Spec-Kit adoption | Systematic development, AI-assisted implementation |

---

## 7. Glossary

| Term | Definition |
|------|------------|
| DID | Decentralized Identifier - self-sovereign identity |
| VC | Verifiable Credential - signed attestation |
| PBM | Purpose-Bound Money - tokens with spending restrictions |
| MCC | Merchant Category Code - business classification |
| AML | Anti-Money Laundering compliance |
| CTR | Currency Transaction Report (≥10M KRW) |
| STR | Suspicious Transaction Report |
| MyData | Korean data portability framework |
