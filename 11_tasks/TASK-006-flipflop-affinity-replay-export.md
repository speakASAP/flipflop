# TASK-006: FlipFlop Affinity Replay Export Surface

```yaml
id: TASK-006
status: approved
owner: flipflop affinity replay export worker
created: 2026-07-03
last_updated: 2026-07-03
completeness_level: complete
upstream:
  - ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
  - ./TASK-005-flipflop-affinity-replay-eligibility.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-006-flipflop-affinity-replay-export.md
execution_plan:
  - ../21_execution_plans/EP-TASK-006-flipflop-affinity-replay-export.md
```

## Objective

Add the protected FlipFlop-owned read-only replay surface for Catalog Goal 24 by exposing an internal endpoint that returns aggregate-safe order-affinity replay candidates for Marketing under `marketplace.order_affinity_replay_candidates.v1`.

## Upstream Links

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `04_systems/SYS-001-commerce-platform.md`
- `10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- `11_tasks/TASK-005-flipflop-affinity-replay-eligibility.md`
- `/home/ssf/Documents/Github/catalog-microservice/docs/contracts/catalog-marketplace-affinity-backfill.md`

## Goal Impact

Catalog Goal 24 now has a FlipFlop-owned producer shape for future marketplace-affinity replay dry-runs. The endpoint preserves Marketing as aggregation/scheduling owner and Catalog as relation persistence owner.

## Project Invariant Impact

Preserves payment/order/stock safety by staying read-only and by never changing checkout, payment status, order status, stock, Warehouse, Catalog, Marketing, Kubernetes, deployment, or secrets.

## Sensitive-Data Classification

Classification: aggregate-safe replay candidates and aggregate diagnostics only. Forbidden content includes customer names, emails, phones, buyer ids, delivery/billing/pickup addresses, payment provider ids, transaction ids, refunds, shipping/tracking values, raw checkout/marketplace payloads, OAuth tokens, service tokens, credentials, and secret names.

## Contract/Schema Impact

Implements a protected internal endpoint for `marketplace.order_affinity_replay_candidates.v1` with:

- `sourceOwner=flipflop-service`
- `consumerOwner=marketing-microservice`
- `channel=flipflop`
- bounded `from`, `to`, `limit`, `dryRun`, `cursorBefore`, `cursorAfter`, and window metadata
- aggregate-safe `events[]` produced through the merged TASK-005 eligibility helper

No database migration, public API, Marketing parser, scheduler, ledger, Catalog write, or relation replacement is included.

## Replay/Determinism Impact

The endpoint is read-only and deterministic for a stable order snapshot, query window, and cursor. Pagination is ordered by `createdAt` and `id`; cursors are opaque producer-owned values. Each returned candidate uses the TASK-005 synthetic replay reference.

## Scope

- Add a protected internal `GET /internal/orders/order-affinity/replay-candidates` endpoint.
- Reuse the merged TASK-005 eligibility helper.
- Add focused verifier coverage for protected access, contract envelope, filtering, pagination, forbidden-field exclusion, and fail-closed shape.
- Add IPS task, execution plan, context package, coding prompt, validation, goal impact, and implementation-state evidence.

## Non-Goals

- No live replay run, public endpoint, anonymous access, owner-browser endpoint, checkout/order/payment/stock mutation, Warehouse mutation, Catalog relation write, Marketing parser/scheduler/ledger change, Kubernetes/deploy/secrets change, or raw data export.

## Acceptance Criteria

- [x] Endpoint requires configured `FLIPFLOP_INTERNAL_SERVICE_SECRET` and matching `X-Flipflop-Internal-Key`.
- [x] Endpoint emits the required `marketplace.order_affinity_replay_candidates.v1` envelope for `flipflop-service` and `flipflop`.
- [x] Query is bounded by `from`, `to`, `limit`, and opaque cursor.
- [x] Returned events reuse the TASK-005 eligibility helper and exclude forbidden fields.
- [x] Empty/unmapped/insufficient orders fail closed through the helper and aggregate diagnostics.
- [x] Focused verifier, existing eligibility verifier, order-service build, diff check, and IPS gates pass or record explicit blockers.

## Required Context

- `prisma/schema.prisma`
- `services/order-service/src/orders/orders.service.ts`
- `services/order-service/src/orders/orders-internal.controller.ts`
- `services/order-service/src/orders/affinity-replay-eligibility.ts`
- `scripts/verify-flipflop-affinity-eligibility.js`
- Catalog contract `/home/ssf/Documents/Github/catalog-microservice/docs/contracts/catalog-marketplace-affinity-backfill.md`

## Validation Task

Run `python3 scripts/pre_coding_gate.py --root .`, `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`, `npm run verify:flipflop-affinity-eligibility`, `npm run verify:flipflop-affinity-replay-export`, `git diff --check`, and `cd services/order-service && npm run build`.

## Execution Plan Requirement

Implementation must follow `../21_execution_plans/EP-TASK-006-flipflop-affinity-replay-export.md`, preserve the Catalog/Marketing/FlipFlop ownership boundary, and keep Marketing parser, Marketing ledger, live dry-run windows, Catalog relation writes, deployment, and runtime smoke as explicit downstream gates.
