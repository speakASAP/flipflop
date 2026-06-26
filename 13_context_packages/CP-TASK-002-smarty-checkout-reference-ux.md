# Context Package: TASK 002 Smarty-Reference Guest Checkout UX

```yaml
id: FF-CP-TASK-002-SMARTY-CHECKOUT-REFERENCE-UX
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

## Required Context

- `docs/reference/smarty-checkout/README.md`
- `implementation-goals/GOAL-09-smarty-checkout-reference-ux.context-package.md`
- `SPEC.md` Module 2 and Module 3
- `services/frontend/app/checkout/page.tsx`
- `services/api-gateway/src/gateway/gateway.controller.ts`
- `services/order-service/src/orders/orders.service.ts`
- `prisma/schema.prisma`

## Known Starting State

Guest cart work is already dirty and in progress. Checkout still blocks guests. Backend order creation is account-bound.

## Risks

- contract mismatch between frontend `ordersApi` and backend `createOrder`;
- schema/account model might require migration;
- magic-link contract unknown;
- provider verification gaps must remain visible.
