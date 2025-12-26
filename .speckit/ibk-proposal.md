# IBK Open Innovation PoC Proposal

> Blockchain-based Next-Generation Local Currency Operation PoC
> IBK Bank x Jeonju City x SW Developer

---

## Executive Summary

This proposal does not expand IBK's electronic financial risk.
It is a non-financial technology Open Innovation that strengthens IBK's public finance role and data competitiveness through policy/operation/audit automation.

### Key Structure
- **Electronic Finance Entity**: IBK Bank
- **Business Requester/Policy Entity**: Jeonbuk Jeonju City
- **Technology Executor**: SW Developer (Non-financial)
- **PoC Scope**: Payment/fund transfer X, Policy/audit/operation enhancement O

---

## 1. Problem Definition (IBK Perspective)

### Structural Limitations of Local Currency Operation
- Different policies per municipality -> Increased bank core/operation change costs
- Audit response requires:
  - Policy change history
  - Approval authority tracking
  - Settlement evidence data
  - -> Manual, post-processing focused
- Post-responsibility focus for fraud prevention and merchant management

### Bank's Dilemma
- Bank bears electronic financial responsibility
- But policy/operation areas are non-financial in nature
- Internally, efficiency is low compared to risk

---

## 2. Proposed Structure

### Core Principle
**"Money handled by bank, Proof handled by technology"**

### IBK (Unchanged)
- Prepaid electronic payment instrument issuance
- Deposit custody/refund/settlement final execution

### SW Developer
- Policy/operation/audit/history only through technology
- No financial activities whatsoever

---

## 3. PoC Architecture

```
[Jeonbuk Jeonju City]
  - Policy setting
  - Audit requests
    |
    v
[SW Developer System]
  - User app
  - Admin portal
  - Policy engine
  - Merchant management
  - Settlement auxiliary data
  - DID / VC / Digital signatures
  - Blockchain audit logs
    | API
    v
[IBK Bank]
  - Prepaid instrument issuance
  - Payment approval
  - Deposit custody/refund
  - Final ledger
```

**Blockchain is NOT a payment method, used only as audit/integrity tool**

---

## 4. Development Scope (Jeonju City PoC)

### 4.1 User Area
- Jeonju City local currency app
- Usage history and policy information

### 4.2 Admin Area
- Policy management (business type restrictions, regional restrictions, usage period, limits)
- Merchant registration/modification/suspension
- Automatic policy change history recording

### 4.3 Audit/Proof Area (Core)
- Policy changes -> DID signature of responsible person
- Policy/settlement data -> Stored as VC (Verifiable Credential)
- All change/approval logs -> Blockchain-based immutable logs
- **Immediately verifiable during audit, not "creating materials"**

---

## 5. Legal/Regulatory Summary

- SW Developer does NOT perform electronic financial transactions
- Prepaid instrument issuance/custody/refund -> ALL handled by IBK
- Blockchain is NOT a financial ledger
- Structure NOT subject to Electronic Financial Business registration
- **No changes to existing IBK electronic finance structure**

---

## 6. PoC Operation Plan

| Item | Content |
|------|---------|
| Target | Jeonbuk Jeonju City |
| Scope | Limited users / Limited merchants |
| Duration | 3-6 months |
| Purpose | Audit efficiency verification, Policy change cost reduction measurement, Expansion feasibility review |

---

## 7. Expected Benefits for IBK

### Risk Reduction
- Automated audit logs
- Clear responsibility attribution

### Operation Cost Reduction
- Minimize core modifications for municipality policy changes

### Public Finance Image Enhancement
- Transparent local currency
- SME protection

### Scalability
- Other Jeonbuk municipalities
- Policy finance points
- Welfare/environmental incentives

---

## 8. Post-PoC Expansion Scenarios

1. Jeonbuk province-wide expansion
2. Multi-municipality standard model
3. IBK public finance dedicated operation framework

---

## 9. Key Message for Internal Review

**"This PoC does not expand electronic financial risk,
It is a demonstration that strengthens IBK's public finance role and data competitiveness."**

This sentence is critical for internal approval.

---

## 10. Frequently Asked Questions in IBK Review

| Question | Pre-emptive Answer |
|----------|-------------------|
| "Who's responsible if there's an incident?" | Financial incidents = Bank (unchanged), System failures = Joint response |
| "Is there a loss for the bank if we don't do this?" | Current operation is inefficient, competitors may take the lead |
| "Why IBK instead of other banks?" | IBK's SME/public finance identity alignment |
| "Can this expand to our affiliates?" | Yes, scalable to welfare points, vouchers, etc. |

---

## PPT Structure (10 pages)

1. **Cover**: Title, target, proposer info
2. **Background & Problem**: Current local currency operation limitations
3. **Proposal Overview**: One-page summary with role separation
4. **Architecture**: Role separation emphasized diagram
5. **User Apps**: Citizen and merchant interfaces
6. **Admin Systems**: Municipality and bank joint admin
7. **Policy Automation & Audit**: DID/VC/Blockchain usage
8. **PoC Scope**: Jeonju City specific plan
9. **IBK Expected Benefits**: Short and long-term value
10. **Timeline & Collaboration Request**: Next steps

---

## Review Criteria Understanding

### 1st Cut: "Can IBK legally do this?"
- Electronic finance entity must be clear -> PASS (IBK is entity)
- No responsibility expansion -> PASS (unchanged structure)

### 2nd Cut: Electronic Finance/Security Risk
- User account access minimized -> PASS
- Open Banking called by IBK only -> PASS
- Platform only queries token status -> PASS

### 3rd Cut: "What's in it for the bank?"
- Replicable to other municipalities -> YES
- Bank not becoming platform's subcontractor -> YES
- IBK brand can be front and center -> YES

### Blockchain/DID Perception
- Audit/tracking/tamper-prevention -> Positive
- Payment/balance/settlement -> Immediate rejection
- DID = Policy automation tool (not identity replacement)
- VC = Administrative efficiency tool

---

## Contact

[To be filled by proposing company]
