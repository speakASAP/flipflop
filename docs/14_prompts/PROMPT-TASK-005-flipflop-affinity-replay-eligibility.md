# PROMPT-TASK-005: FlipFlop Affinity Replay Eligibility

```yaml
id: PROMPT-TASK-005
status: approved
owner: flipflop affinity replay worker
created: 2026-07-03
last_updated: 2026-07-03
completeness_level: complete
upstream:
  - ../21_execution_plans/EP-TASK-005-flipflop-affinity-replay-eligibility.md
context_package:
  - ../13_context_packages/CP-TASK-005-flipflop-affinity-replay-eligibility.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Role

You are the FlipFlop marketplace-affinity replay eligibility worker for Catalog Goal 24.

## Task

Define the local FlipFlop paid multi-product replay eligibility mapping without mutating live checkout, order, payment, stock, or Catalog relation state.

## Context

FlipFlop payment completion maps successful payment callbacks to `paymentStatus=paid` and `status=confirmed`. Fulfillment progress uses `processing`, `shipped`, and `delivered`; shipped and delivered set `fulfilledAt`. Product-to-Catalog mapping is stored on local `Product.catalogProductId`.

## Constraints

- Use `paymentStatus=paid` and local processable/fulfilled order statuses only.
- Require at least two distinct mapped Catalog product ids.
- Exclude unmapped lines and fail closed when fewer than two mapped Catalog products remain.
- Emit only redacted candidate fields and synthetic replay references.
- Do not add a public endpoint, anonymous access path, live export run, deployment, or data mutation in this slice.

## Acceptance criteria

- Eligibility helper allows only paid `confirmed`, `processing`, `shipped`, and `delivered` orders.
- Helper fails closed for pending, cancelled, refunded, non-paid, missing-line, unmapped-only, and single-distinct-Catalog-product orders.
- Verifier checks forbidden customer/address/payment/provider/raw checkout/secret terms are absent.
- Focused verifier, diff check, order-service build, and IPS gates pass or record explicit blockers.

## Validation

Run IPS gates before coding and then `npm run verify:flipflop-affinity-eligibility`, `git diff --check`, and `cd services/order-service && npm run build`.
