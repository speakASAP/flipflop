# EP-TASK-005: FlipFlop Affinity Replay Eligibility

```yaml
id: EP-TASK-005
status: approved
source_task: ../11_tasks/TASK-005-flipflop-affinity-replay-eligibility.md
vision: ../01_vision/VISION.md
constitution: ../00_constitution/CONSTITUTION.md
feature: ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
goal_impact: ../22_goal_impact/GOAL-IMPACT-TASK-005-flipflop-affinity-replay-eligibility.md
owner: flipflop affinity replay worker
created: 2026-07-03
last_updated: 2026-07-03
completeness_level: complete
```

## Metadata

Execution plan for `TASK-005`, a bounded source/docs/test slice for Catalog Goal 24 FlipFlop marketplace-affinity eligibility mapping.

## Upstream Traceability

- Constitution: `../00_constitution/CONSTITUTION.md`
- Vision: `../01_vision/VISION.md`
- System: `../04_systems/SYS-001-commerce-platform.md`
- Feature: `../10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- Task: `../11_tasks/TASK-005-flipflop-affinity-replay-eligibility.md`
- Goal impact: `../22_goal_impact/GOAL-IMPACT-TASK-005-flipflop-affinity-replay-eligibility.md`
- Context package: `../13_context_packages/CP-TASK-005-flipflop-affinity-replay-eligibility.md`
- Coding prompt: `../14_prompts/PROMPT-TASK-005-flipflop-affinity-replay-eligibility.md`
- Validation: `../12_validation/VAL-TASK-005-flipflop-affinity-replay-eligibility.md`

## Goal Impact

FlipFlop removes its unknown paid multi-product eligibility blocker by documenting and encoding the local state mapping needed before a protected replay endpoint/export can be implemented.

## Scope

- Source helper for eligibility and redacted candidate shape.
- Focused static/logic verifier.
- Package script for verifier execution.
- IPS artifacts and implementation-state update.

## Non-Goals

- No live replay endpoint, CLI export execution, checkout mutation, payment mutation, order-state mutation, stock mutation, Catalog relation write, Marketing parser, Kubernetes change, secret change, deployment, or migration.

## Files to Inspect

- `../prisma/schema.prisma`
- `../services/order-service/src/orders/orders.service.ts`
- `/home/ssf/Documents/Github/catalog-microservice/docs/contracts/catalog-marketplace-affinity-backfill.md`

## Files to Create

- `../services/order-service/src/orders/affinity-replay-eligibility.ts`
- `../scripts/verify-flipflop-affinity-eligibility.js`
- `../11_tasks/TASK-005-flipflop-affinity-replay-eligibility.md`
- `../12_validation/VAL-TASK-005-flipflop-affinity-replay-eligibility.md`
- `../13_context_packages/CP-TASK-005-flipflop-affinity-replay-eligibility.md`
- `../14_prompts/PROMPT-TASK-005-flipflop-affinity-replay-eligibility.md`
- `../21_execution_plans/EP-TASK-005-flipflop-affinity-replay-eligibility.md`
- `../22_goal_impact/GOAL-IMPACT-TASK-005-flipflop-affinity-replay-eligibility.md`

## Files to Modify

- `../package.json`
- `../docs/IMPLEMENTATION_STATE.md`

## Files That Must Not Be Modified

- Checkout UI, cart service, Warehouse client, Payments client, Kubernetes manifests, deployment scripts, secrets, migrations, Catalog source, Marketing source, Orders source, Allegro source, Aukro source, and Bazos source.

## Implementation Steps

1. Read mandatory repository instructions and Catalog contract.
2. Inspect FlipFlop schema and order-service status/payment mapping.
3. Run IPS pre-coding and strict documentation gates.
4. Add fail-closed eligibility helper.
5. Add focused verifier and package script.
6. Update IPS artifacts and implementation state.
7. Run focused validation, diff check, order-service build, and IPS gates.

## Test Plan

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
npm run verify:flipflop-affinity-eligibility
git diff --check
cd services/order-service && npm run build
```

## Validation Plan

The same commands in the test plan validate the mapping. The verifier checks status/payment allowlists, distinct Catalog product-id gating, provenance fields, synthetic replay refs, and forbidden-field absence.

## Documentation Updates

Update TASK-005, EP-TASK-005, CP-TASK-005, PROMPT-TASK-005, GOAL-IMPACT-TASK-005, VAL-TASK-005, and `docs/IMPLEMENTATION_STATE.md`.

## Rollback Plan

Revert the helper, verifier, package script, TASK-005 docs, and implementation-state entry. No runtime deployment or data migration is involved.

## Parallel Execution

| Workstream | Status | Owner role | Objective | Allowed files | Dependencies | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| W1 FlipFlop mapping | ready now | FlipFlop worker | Define paid/processable multi-product mapping | files listed above | Catalog contract read | focused verifier, order-service build, diff check |
| W2 Marketing parser | dependency-gated | Marketing worker | Accept marketplace-owned replay envelopes | Marketing parser docs/source | marketplace endpoint shape and parser plan | parser tests |
| W3 FlipFlop replay endpoint/export | dependency-gated | FlipFlop worker | Expose protected read-only candidates | future order-service controller/service/docs/tests | W1 plus Marketing parser decision | endpoint tests/build |
| W4 Integration validation | final integration | Catalog/Marketing validator | Run dry-run matrix and publish only with approval | validation reports | W2/W3 plus scheduler ledger | dry-run evidence |

Integration owner: Catalog Goal 24 orchestrator until a commerce/data integration owner is assigned.
Validation owner: integration validator.
Merge order: W1 mapping, W2 parser, W3 endpoint/export, W4 dry-run validation.

## Agent Handoff Prompt

Continue only after this mapping is merged. Implement a protected read-only FlipFlop replay endpoint or owner-run CLI export for `marketplace.order_affinity_replay_candidates.v1`; do not run live replay or expose raw order/customer/payment/address data.

## Completion Checklist

- [x] Mandatory reading completed.
- [x] Eligibility helper added.
- [x] Focused verifier added.
- [x] IPS docs updated.
- [x] Validation commands passed or blockers recorded.
