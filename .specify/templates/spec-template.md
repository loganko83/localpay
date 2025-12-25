# [Feature Name] Specification

> [One-line description of the feature]

---

## 1. Overview

### Purpose
[Why does this feature exist? What problem does it solve?]

### Business Value
- [Value point 1]
- [Value point 2]
- [Value point 3]

---

## 2. Functional Requirements

### 2.1 [Requirement Group 1]

#### Features
- [Feature 1]
- [Feature 2]
- [Feature 3]

#### Rules/Constraints
| Rule | Value | Source |
|------|-------|--------|
| [Rule 1] | [Value] | [REAL/MOCK] |

### 2.2 [Requirement Group 2]

[Continue as needed...]

---

## 3. API Contracts

### [Method Name]
```typescript
service.methodName({
  param1: string;
  param2: number;
}): Promise<ReturnType>
```

---

## 4. Data Model

### [Entity Name]
```typescript
interface EntityName {
  id: string;
  field1: string;
  field2: number;
  createdAt: number;
}
```

---

## 5. User Flows

### Flow 1: [Flow Name]
```
Step 1 → Step 2 → Step 3 → Step 4
```

---

## 6. Implementation Status

| Component | Status | File |
|-----------|--------|------|
| [Component 1] | ⏳ Pending | - |
| [Component 2] | ⏳ Pending | - |

---

## 7. Test Scenarios

### Scenario 1: [Scenario Name]
1. [Step 1]
2. [Step 2]
3. [Expected Result]

---

## 8. Open Questions

- [ ] [Question 1]
- [ ] [Question 2]

---

## 9. References

- [Link to external documentation]
- [Link to design files]
