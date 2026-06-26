# TASK-002: Smarty-Reference Guest Checkout UX

```yaml
id: TASK-002
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
upstream:
  - ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
  - ../docs/reference/smarty-checkout/README.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-002-smarty-checkout-reference-ux.md
execution_plan:
  - ../21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md
```

## Objective

Replace mandatory registration/login before purchase with guest checkout and optional post-order account creation, using the documented Smarty.cz checkout screenshots as the UX reference.

## Upstream Links

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `02_business_case/BUSINESS_CASE.md`
- `10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- `SPEC.md` Module 2 and Module 3
- `docs/reference/smarty-checkout/README.md`

## Goal Impact

This task reduces checkout friction and preserves checkout-to-first-revenue intent by allowing customers to buy without mandatory registration while keeping optional account creation available.

## Project Invariant Impact

Applies all invariants in `17_governance/PROJECT_INVARIANTS.md`, especially the rules for checkout-to-first-revenue, payment safety, pricing/order total safety, shared ecosystem services, and sensitive-data handling.

## Sensitive-Data Classification

Classification: customer personal data. Implementation will process email, phone, name, invoice address, optional delivery address, and order notes. Documentation and validation must use synthetic data and must not store raw real customer data.

## Contract/Schema Impact

Potential runtime contract changes are expected. Current order, cart, and address flows are account-bound. Implementation must choose and document a guest order contract before code edits:

1. create or reuse a customer user record and send account activation by magic link;
2. add guest order/address/customer fields;
3. add server-side guest checkout sessions.

## Replay/Determinism Impact

Order creation and payment initiation must remain deterministic for a fixed cart, customer data, delivery method, payment method, and stock state. Magic-link email dispatch must be idempotent or safely retryable.

## Scope

- Cart-to-checkout UX.
- Delivery/payment/expedition steps.
- Contact and address form.
- Optional login prefill.
- Optional account creation by magic link.
- Completion/payment instruction page.
- Backend/API contract required to support guest orders safely.

## Non-Goals

- No fake payment completion.
- No provider credential verification.
- No price, discount, refund, cancellation, or order-total changes.
- No rental checkout.
- No operator-tip accounting.

## Acceptance Criteria

- [ ] Guest customer can buy without registering first.
- [ ] Optional account checkbox does not expose password fields.
- [ ] Magic-link account activation is triggered after order submission when selected.
- [ ] All 13 Smarty reference screenshots are mapped to implementation outcomes.
- [ ] Payment, stock, and order safety invariants remain intact.

## Required Context

- `docs/reference/smarty-checkout/README.md`
- `implementation-goals/GOAL-09-smarty-checkout-reference-ux.md`
- `implementation-goals/GOAL-09-smarty-checkout-reference-ux.execution-plan.md`
- `services/frontend/app/checkout/page.tsx`
- `services/api-gateway/src/gateway/gateway.controller.ts`
- `services/order-service/src/orders/orders.service.ts`
- `prisma/schema.prisma`

## Validation Task

Run strict documentation audit, pre-coding gate, frontend build, affected service builds, guest checkout smoke, authenticated checkout regression smoke, and browser visual QA before marking the task complete.

## Required Gates

- Strict documentation audit.
- Pre-coding gate.
- Frontend and affected service build gates after code changes.
- Payment gate only for payment initiation evidence; provider webhook readiness must remain separate unless verified.

## Execution Plan Requirement

This task must not be converted into coding work until `21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md` exists, includes a validation plan, and the backend guest-order contract decision is recorded.
