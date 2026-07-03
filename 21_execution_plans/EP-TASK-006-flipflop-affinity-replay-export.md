# EP-TASK-006: FlipFlop Affinity Replay Export Surface

```yaml
id: EP-TASK-006
status: approved
source_task: ../11_tasks/TASK-006-flipflop-affinity-replay-export.md
vision: ../01_vision/VISION.md
constitution: ../00_constitution/CONSTITUTION.md
feature: ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
goal_impact: ../22_goal_impact/GOAL-IMPACT-TASK-006-flipflop-affinity-replay-export.md
owner: flipflop affinity replay export worker
created: 2026-07-03
last_updated: 2026-07-03
completeness_level: complete
```

## Metadata

Execution plan for `TASK-006`, a bounded source/docs/test slice for the protected FlipFlop marketplace-affinity replay candidate endpoint.

## Upstream Traceability

- Constitution: `../00_constitution/CONSTITUTION.md`
- Vision: `../01_vision/VISION.md`
- System: `../04_systems/SYS-001-commerce-platform.md`
- Feature: `../10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- Task: `../11_tasks/TASK-006-flipflop-affinity-replay-export.md`
- Prior task: `../11_tasks/TASK-005-flipflop-affinity-replay-eligibility.md`
- Goal impact: `../22_goal_impact/GOAL-IMPACT-TASK-006-flipflop-affinity-replay-export.md`
- Context package: `../13_context_packages/CP-TASK-006-flipflop-affinity-replay-export.md`
- Coding prompt: `../14_prompts/PROMPT-TASK-006-flipflop-affinity-replay-export.md`
- Validation: `../12_validation/VAL-TASK-006-flipflop-affinity-replay-export.md`

## Goal Impact

FlipFlop removes the protected replay endpoint/export blocker by exposing a read-only internal producer surface while keeping Marketing parser/scheduler and Catalog relation writes gated.

## Scope

- Protected internal order-affinity replay candidate endpoint.
- Focused verifier and package script.
- IPS artifacts and implementation-state update.
- Repair stale TASK-005 validation path metadata so IPS strict audit can pass in the current worktree.

## Non-Goals

- No live replay execution, public endpoint, checkout mutation, payment mutation, order-state mutation, stock mutation, Warehouse mutation, Catalog relation write, Marketing parser/scheduler/ledger change, Kubernetes change, secret change, deployment, migration, or raw data export.

## Files to Inspect

- `../prisma/schema.prisma`
- `../services/order-service/src/orders/orders.service.ts`
- `../services/order-service/src/orders/orders-internal.controller.ts`
- `../services/order-service/src/orders/affinity-replay-eligibility.ts`
- `/home/ssf/Documents/Github/catalog-microservice/docs/contracts/catalog-marketplace-affinity-backfill.md`

## Files to Create

- `../scripts/verify-flipflop-affinity-replay-export.js`
- `../11_tasks/TASK-006-flipflop-affinity-replay-export.md`
- `../12_validation/VAL-TASK-006-flipflop-affinity-replay-export.md`
- `../13_context_packages/CP-TASK-006-flipflop-affinity-replay-export.md`
- `../14_prompts/PROMPT-TASK-006-flipflop-affinity-replay-export.md`
- `../21_execution_plans/EP-TASK-006-flipflop-affinity-replay-export.md`
- `../22_goal_impact/GOAL-IMPACT-TASK-006-flipflop-affinity-replay-export.md`

## Files to Modify

- `../services/order-service/src/orders/orders-internal.controller.ts`
- `../services/order-service/src/orders/orders.service.ts`
- `../package.json`
- `../docs/IMPLEMENTATION_STATE.md`
- `../12_validation/VAL-TASK-005-flipflop-affinity-replay-eligibility.md`

## Files That Must Not Be Modified

Checkout UI, cart service, Warehouse client, Payments client, Kubernetes manifests, deployment scripts, secrets, migrations, Catalog source, Marketing source, Orders source, Allegro source, Aukro source, and Bazos source.

## Implementation Steps

1. Read mandatory repository instructions, TASK-005 artifacts, helper source, order-service auth/query patterns, the Catalog contract, and the cross-agent standard.
2. Run IPS pre-coding and strict documentation gates; record/fix validation debt that blocks current gates.
3. Add a protected read-only internal endpoint guarded by configured `FLIPFLOP_INTERNAL_SERVICE_SECRET`.
4. Query paid/processable orders with bounded window and cursor pagination.
5. Reuse the TASK-005 helper for all eligibility and redacted candidate construction.
6. Add focused verifier coverage and package script.
7. Update IPS artifacts and implementation state.
8. Run focused validation, diff check, order-service build, and IPS gates.

## Test Plan

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
npm run verify:flipflop-affinity-eligibility
npm run verify:flipflop-affinity-replay-export
git diff --check
cd services/order-service && npm run build
```

## Validation Plan

The commands in the test plan validate the protected replay surface. The replay verifier checks protected access, contract envelope, helper reuse, paid/processable filtering, bounded pagination, window metadata, and forbidden-field exclusion. The order-service build validates TypeScript integration. IPS gates validate traceability and documentation readiness.

## Documentation Updates

Update TASK-006, EP-TASK-006, CP-TASK-006, PROMPT-TASK-006, GOAL-IMPACT-TASK-006, VAL-TASK-006, `docs/IMPLEMENTATION_STATE.md`, and `graph/project_graph.example.yaml`. Repair the stale TASK-005 validation repository path that blocks strict documentation audit in this worktree.

## Rollback Plan

Revert the endpoint, service method, verifier, package script, TASK-006 docs, implementation-state entry, graph entries, and TASK-005 metadata path repair. No runtime deployment or data migration is involved.

## Parallel Execution

| Workstream | Status | Owner role | Objective | Allowed files | Forbidden files | Dependencies | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W1 FlipFlop replay endpoint | ready now | FlipFlop worker | Add protected read-only candidates endpoint | order-service internal controller/service, verifier, TASK-006 docs | checkout/cart/Warehouse/Payments/Kubernetes/secrets/Catalog/Marketing/Orders/other marketplaces | TASK-005 merged helper and Catalog contract | focused verifier, eligibility verifier, order-service build, diff check, IPS gates |
| W2 Marketing parser | dependency-gated | Marketing worker | Accept `marketplace.order_affinity_replay_candidates.v1` FlipFlop events | Marketing parser/docs/tests | FlipFlop/Catalog source | W1 response shape accepted | parser/backfill tests |
| W3 Marketing scheduler/ledger | dependency-gated | Marketing worker | Add durable ledger and dry-run-first scheduling | Marketing scheduler/ledger/tests/docs | marketplace source/Catalog source | W2 parser support | scheduler/ledger tests, dry-run evidence |
| W4 Integration validation | final integration | Catalog/Marketing validator | Run dry-run matrix and owner-approved publish windows | validation/status docs | unapproved runtime mutation | W1-W3 complete | dry-run summaries and Catalog readback aggregates |

Integration owner: Catalog Goal 24 orchestrator until a commerce/data integration owner is assigned.
Validation owner: integration validator.
Merge order: W1 FlipFlop endpoint, W2 Marketing parser, W3 Marketing ledger, W4 dry-run validation.


## Agent Handoff Prompt

Continue after this branch is merged by implementing Marketing parser support for `marketplace.order_affinity_replay_candidates.v1`, preserving `sourceOwner=flipflop-service` and `channel=flipflop`. Do not run live replay or publish Catalog relations until the Marketing ledger and owner-approved dry-run window gates are complete.

## Completion Checklist

- [x] Mandatory reading completed.
- [x] Protected read-only endpoint added.
- [x] TASK-005 helper reused.
- [x] Focused replay verifier added.
- [x] IPS docs and graph updated.
- [x] Validation commands passed or blockers recorded.
