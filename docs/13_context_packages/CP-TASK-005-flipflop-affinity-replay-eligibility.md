# CP-TASK-005: FlipFlop Affinity Replay Eligibility

```yaml
id: CP-TASK-005
status: approved
owner: flipflop affinity replay worker
created: 2026-07-03
last_updated: 2026-07-03
completeness_level: complete
upstream:
  - ../11_tasks/TASK-005-flipflop-affinity-replay-eligibility.md
downstream:
  - ../14_prompts/PROMPT-TASK-005-flipflop-affinity-replay-eligibility.md
```

## Target task

`TASK-005` in `../11_tasks/TASK-005-flipflop-affinity-replay-eligibility.md`.

## Upstream traceability

- `../00_constitution/CONSTITUTION.md`
- `../01_vision/VISION.md`
- `../04_systems/SYS-001-commerce-platform.md`
- `../10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- `../22_goal_impact/GOAL-IMPACT-TASK-005-flipflop-affinity-replay-eligibility.md`
- `../21_execution_plans/EP-TASK-005-flipflop-affinity-replay-eligibility.md`

## Included documents

- `../prisma/schema.prisma`
- `../services/order-service/src/orders/orders.service.ts`
- `../services/order-service/src/orders/affinity-replay-eligibility.ts`
- `../scripts/verify-flipflop-affinity-eligibility.js`
- Catalog contract `/home/ssf/Documents/Github/catalog-microservice/docs/contracts/catalog-marketplace-affinity-backfill.md`

## Excluded documents

- Checkout UI source.
- Cart, Warehouse, Payments, Kubernetes, deployment, secrets, and migration files.
- Catalog, Marketing, Orders, Allegro, Aukro, and Bazos repository source.

## Constraints

- Eligible orders require `paymentStatus=paid`.
- Eligible statuses are `confirmed`, `processing`, `shipped`, and `delivered`.
- At least two distinct mapped Catalog product ids must remain after unmapped lines are excluded.
- Output must not contain customer, address, payment provider, token, credential, raw checkout, or raw production data.
- This task must not run live checkout/order/payment/stock mutations.

## Agent prompt

Read the listed FlipFlop schema, order-service, and Catalog contract sources. Maintain the bounded worker role: add or review only the FlipFlop-owned eligibility helper, verifier, and IPS artifacts for paid multi-product mapping. Keep future protected endpoint/export work blocked in the dedicated blocker sections, and preserve Catalog/Marketing ownership boundaries by avoiding relation writes, scheduler changes, live order/payment/stock mutations, and raw customer or provider data exposure.

## Validation instructions

Run `python3 scripts/pre_coding_gate.py --root .`, `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`, `npm run verify:flipflop-affinity-eligibility`, `git diff --check`, and `cd services/order-service && npm run build`.
