# Cypress E2E Tests - Quick Start

## Quick Start

### 1. Prerequisites

Ensure both backend and frontend are running:

```bash
# Terminal 1: Backend (port 3000)
cd ../backend
npm run start:dev

# Terminal 2: Frontend (port 4200)
cd frontend
npm start
```

### 2. Run Tests

**Interactive Mode** (recommended for development):
```bash
npm run e2e:open
```

**Headless Mode** (CI/CD):
```bash
npm run e2e
```

---

## Test Files

| File | Tests | Description |
|------|-------|-------------|
| `01-complete-reservation-flow.cy.ts` | 6 | Complete booking flow |
| `02-step-navigation-guard.cy.ts` | 25+ | URL jump prevention |
| `03-lock-timer-countdown.cy.ts` | 12 | 5-minute countdown timer |
| `04-validation-and-errors.cy.ts` | 20+ | Form validations & business rules |

**Total: 63+ tests**

---

## Custom Commands

```typescript
// Complete all steps quickly
cy.completeStep1('2025-07-24', '19:00');
cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
cy.completeStep3(4, 1, false);
cy.completeStep4('Main Hall', false);
```

---