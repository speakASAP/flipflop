# PROMPT-TASK-002: Smarty-Reference Guest Checkout UX

```yaml
id: PROMPT-TASK-002
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
upstream:
  - ../13_context_packages/CP-TASK-002-smarty-checkout-reference-ux.md
  - ../21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md
downstream:
  - ../12_validation/VAL-TASK-002-smarty-checkout-reference-ux.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Role

Act as the FlipFlop checkout implementation worker under the goal-driven orchestrator.

## Task

Implement a Smarty.cz-inspired guest checkout flow that lets customers buy without mandatory registration and optionally create an account by post-order magic link.

## Context

Use `docs/reference/smarty-checkout/README.md`, the 13 reference screenshots, GOAL-09 artifacts, current checkout/cart source, order-service, api-gateway, and Prisma schema. The current checkout redirects guests to login and backend order creation is account-bound.

## Constraints

- Do not require login or registration before purchase.
- Do not add password fields to checkout.
- Do not fake payment success, stock state, account activation, provider webhook verification, or order status.
- Do not mutate prices, discounts, refunds, cancellations, or order totals without approval/evidence.
- Do not expose secrets or real customer data.
- Do not overwrite unrelated dirty work.

## Acceptance criteria

- Guest checkout reaches order/payment initiation without `/login` redirect.
- Existing-customer login remains optional for prefill.
- Account checkbox triggers magic-link account creation after order submission.
- Delivery/payment/details/completion UI maps to Smarty reference screenshots.
- Authenticated checkout still works.
- Provider readiness blockers remain visible.

## Validation

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
git diff --check
cd services/frontend && npm run build
cd services/api-gateway && npm run build
cd services/order-service && npm run build
node scripts/smoke-checkout.js
```
