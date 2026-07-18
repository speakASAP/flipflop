# CP-TASK-006: FlipFlop Affinity Replay Export Surface

```yaml
id: CP-TASK-006
status: approved
owner: flipflop affinity replay export worker
created: 2026-07-03
last_updated: 2026-07-03
completeness_level: complete
upstream:
  - ../11_tasks/TASK-006-flipflop-affinity-replay-export.md
downstream:
  - ../14_prompts/PROMPT-TASK-006-flipflop-affinity-replay-export.md
```

## Target task

`TASK-006` in `../11_tasks/TASK-006-flipflop-affinity-replay-export.md`.

## Upstream traceability

- `../00_constitution/CONSTITUTION.md`
- `../01_vision/VISION.md`
- `../04_systems/SYS-001-commerce-platform.md`
- `../10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- `../11_tasks/TASK-005-flipflop-affinity-replay-eligibility.md`
- `../22_goal_impact/GOAL-IMPACT-TASK-006-flipflop-affinity-replay-export.md`
- `../21_execution_plans/EP-TASK-006-flipflop-affinity-replay-export.md`

## Included documents

- `../prisma/schema.prisma`
- `../services/order-service/src/orders/orders.service.ts`
- `../services/order-service/src/orders/orders-internal.controller.ts`
- `../services/order-service/src/orders/affinity-replay-eligibility.ts`
- `/home/ssf/Documents/Github/catalog-microservice/docs/contracts/catalog-marketplace-affinity-backfill.md`

## Excluded documents

Checkout UI, cart, Warehouse, Payments, Kubernetes, deployment, secrets, migrations, Catalog, Marketing, Orders, Allegro, Aukro, and Bazos source.

## Constraints

- Endpoint must be internal-service only and fail closed when the internal secret is not configured or mismatched.
- Endpoint must be read-only and must not run live replay publish.
- Events must be produced through the TASK-005 helper.
- Output must include only aggregate-safe replay candidates and aggregate diagnostics.
- Customer, address, payment provider, token, credential, raw checkout, raw marketplace payload, and raw production order data are forbidden.

## Agent prompt

Implement only the protected FlipFlop-owned read-only replay surface for `marketplace.order_affinity_replay_candidates.v1`. Keep the endpoint under internal order-service routes, use `X-Flipflop-Internal-Key`, require the configured internal secret, query only paid/processable candidate orders, and reuse `getFlipFlopAffinityReplayEligibility` for filtering and event construction. Do not modify Catalog, Marketing, Orders, payment, stock, checkout, Kubernetes, deploy scripts, secrets, migrations, or other marketplace source.

## Validation instructions

Run `python3 scripts/pre_coding_gate.py --root .`, `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`, `npm run verify:flipflop-affinity-eligibility`, `npm run verify:flipflop-affinity-replay-export`, `git diff --check`, and `cd services/order-service && npm run build`.
