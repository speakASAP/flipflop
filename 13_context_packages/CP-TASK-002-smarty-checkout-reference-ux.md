# CP-TASK-002: Smarty-Reference Guest Checkout UX

```yaml
id: CP-TASK-002
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
upstream:
  - ../21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md
downstream:
  - ../14_prompts/PROMPT-TASK-002-smarty-checkout-reference-ux.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Target task

`11_tasks/TASK-002-smarty-checkout-reference-ux.md` implements guest checkout and optional magic-link account creation using the Smarty.cz screenshot reference.

## Upstream traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `02_business_case/BUSINESS_CASE.md`
- `10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- `21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md`
- `docs/reference/smarty-checkout/README.md`

## Included documents

- `docs/reference/smarty-checkout/README.md`
- `implementation-goals/GOAL-09-smarty-checkout-reference-ux.md`
- `implementation-goals/GOAL-09-smarty-checkout-reference-ux.execution-plan.md`
- `SPEC.md`
- `docs/INTENT_MEMORY.md`
- `docs/IMPLEMENTATION_STATE.md`
- `services/frontend/app/checkout/page.tsx`
- `services/api-gateway/src/gateway/gateway.controller.ts`
- `services/order-service/src/orders/orders.service.ts`
- `prisma/schema.prisma`

## Excluded documents

- Secret and environment files.
- Payment provider private credentials.
- Real customer records.
- Production database dumps.

## Constraints

Do not require registration before purchase. Do not add password fields to checkout. Do not fake payment success, stock state, account activation, provider webhook verification, or order status. Preserve dirty work unless explicitly accepted or replaced.

## Agent prompt

Implement guest checkout from the Smarty reference after choosing the backend guest-order contract. Keep login optional, account creation magic-link based, and payment/stock/order safety intact.

## Validation instructions

Run IPS gates before coding. After code changes, run frontend and affected service builds, guest checkout smoke, authenticated checkout regression smoke, and visual QA. Record blockers for unknown auth magic-link, legal, shipping, or service-product contracts.
