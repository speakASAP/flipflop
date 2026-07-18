# TASK-005: FlipFlop Affinity Replay Eligibility

```yaml
id: TASK-005
status: approved
owner: flipflop affinity replay worker
created: 2026-07-03
last_updated: 2026-07-03
completeness_level: complete
upstream:
  - ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-005-flipflop-affinity-replay-eligibility.md
execution_plan:
  - ../21_execution_plans/EP-TASK-005-flipflop-affinity-replay-eligibility.md
```

## Objective

Catalog Goal 24 needs a FlipFlop-owned answer for which local orders may contribute marketplace-affinity evidence. This task records that answer from approved FlipFlop source: paid orders in processable or fulfilled local states, with at least two distinct mapped Catalog product ids after unmapped lines are excluded. The work resolves the FlipFlop paid multi-product replay eligibility mapping gap without moving checkout, payment, stock, Marketing aggregation, or Catalog relation ownership.

## Upstream Links

- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- `docs/04_systems/SYS-001-commerce-platform.md`
- `docs/10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- `docs/17_governance/PROJECT_INVARIANTS.md`
- Catalog contract `/home/ssf/Documents/Github/catalog-microservice/docs/contracts/catalog-marketplace-affinity-backfill.md`

## Goal Impact

Catalog Goal 24 can proceed with a FlipFlop-owned eligibility decision instead of an unknown mapping, while Marketing remains the future replay aggregation owner and Catalog remains the relation persistence owner.

## Project Invariant Impact

Preserves checkout-to-first-revenue safety by avoiding live checkout, payment, stock, order-state, or provider mutation. Preserves shared ecosystem ownership by using Catalog product ids as evidence without writing Catalog relations.

## Sensitive-Data Classification

Classification: aggregate-safe source and synthetic examples only. Customer, address, payment provider, token, credential, raw checkout, and raw production order data are forbidden.

## Contract/Schema Impact

Defines producer-side mapping for `marketplace.order_affinity_replay_candidates.v1`. No database migration, public API, replay endpoint, Marketing parser change, or Catalog relation write is included.

## Replay/Determinism Impact

The helper is deterministic for a given order snapshot. It hashes local order identifiers into a synthetic replay reference and fails closed when status, payment status, lines, or distinct Catalog product mappings are insufficient.

## Scope

- Add a source helper for FlipFlop affinity replay eligibility.
- Add a focused verification script and package script.
- Add IPS task, execution plan, context package, coding prompt, goal impact, validation, and implementation-state evidence.

## Non-Goals

- No live checkout, order, payment, stock, Warehouse, Catalog, Marketing, Kubernetes, secret, or deployment mutation.
- No protected replay endpoint or owner-run CLI export in this slice.
- No Catalog relation write and no Marketing scheduler/parser implementation.

## Acceptance Criteria

- [x] Paid/processable local states are identified from FlipFlop schema and order-service behavior.
- [x] Fail-closed distinct Catalog product-id requirement is encoded.
- [x] Candidate shape preserves marketplace provenance and redacts forbidden fields.
- [x] Focused verifier and TypeScript build pass.
- [x] Remaining integration blockers are explicit.

## Required Context

- `prisma/schema.prisma`
- `services/order-service/src/orders/orders.service.ts`
- `services/order-service/src/orders/affinity-replay-eligibility.ts`
- `scripts/verify-flipflop-affinity-eligibility.js`
- Catalog contract `/home/ssf/Documents/Github/catalog-microservice/docs/contracts/catalog-marketplace-affinity-backfill.md`

## Validation Task

Run IPS gates, the focused eligibility verifier, whitespace diff validation, and the order-service build.

## Execution Plan Requirement

Implementation must follow `../21_execution_plans/EP-TASK-005-flipflop-affinity-replay-eligibility.md`, preserve the Catalog/Marketing/FlipFlop ownership boundary, and keep live replay execution blocked until a protected endpoint/export and Marketing parser are available.
