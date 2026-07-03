# VAL-TASK-006: FlipFlop Affinity Replay Export Surface

```yaml
id: VAL-TASK-006
status: passed
created: 2026-07-03
last_updated: 2026-07-03
repository: /home/ssf/Documents/Github/codex-worktrees/flipflop-goal24-replay-export
branch: codex-goal24-flipflop-replay-export
deployment: not_run
```

## Summary

Validation target for the bounded FlipFlop protected replay endpoint/export slice. This slice resolves the protected FlipFlop replay surface blocker by adding a read-only internal endpoint for `marketplace.order_affinity_replay_candidates.v1`.

No deployment, live replay, checkout mutation, payment mutation, order-state mutation, stock mutation, Warehouse mutation, Catalog relation write, Marketing scheduler/parser mutation, Kubernetes change, migration, secret change, or raw production data export is in scope.

## Upstream goal

`TASK-006` adds the protected producer surface after `TASK-005` established FlipFlop paid multi-product eligibility.

## Criteria checked

- Endpoint is protected by configured `FLIPFLOP_INTERNAL_SERVICE_SECRET`.
- Endpoint response uses `sourceOwner=flipflop-service`, `consumerOwner=marketing-microservice`, `contract=marketplace.order_affinity_replay_candidates.v1`, and `channel=flipflop`.
- Query is bounded by `from`, `to`, `limit`, and opaque cursor.
- Events are generated through `getFlipFlopAffinityReplayEligibility`.
- Forbidden customer/address/payment/provider/raw checkout/secret fields are not selected or emitted by the replay method.
- Empty/unmapped/insufficient cases fail closed through helper diagnostics.

## Commands

```bash
python3 scripts/pre_coding_gate.py --root .
# PASS

python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
# PASS

npm run verify:flipflop-affinity-eligibility
# PASS

npm run verify:flipflop-affinity-replay-export
# PASS

git diff --check
# PASS

cd services/order-service && npm run build
# PASS
```

## Issues found

- No current-task validation failures.
- `npm install` in the root and order-service dependency trees reported existing npm audit vulnerabilities; no `npm audit fix` was run because vulnerability remediation is outside this task.
- The strict documentation audit initially failed on a stale TASK-005 validation repository path and missing TASK-006 graph/template sections; both were repaired in this branch.

## Recommendation

Ready for Catalog Goal 24 orchestrator review as the FlipFlop protected producer surface slice. Deployment, runtime smoke, Marketing parser support, Marketing ledger, and owner-approved dry-run windows remain downstream gates.

## Traceability confirmation

Validation maps to `11_tasks/TASK-006-flipflop-affinity-replay-export.md`, `21_execution_plans/EP-TASK-006-flipflop-affinity-replay-export.md`, `13_context_packages/CP-TASK-006-flipflop-affinity-replay-export.md`, `14_prompts/PROMPT-TASK-006-flipflop-affinity-replay-export.md`, and `22_goal_impact/GOAL-IMPACT-TASK-006-flipflop-affinity-replay-export.md`.

## Remaining Blockers

- `[MISSING: Marketing parser support for marketplace-owned replay source envelopes]`
- `[MISSING: durable Marketing backfill run ledger and idempotency key registry]`
- `[MISSING: owner-approved dry-run window before live FlipFlop replay execution]`
- `[MISSING: FlipFlop deployment and runtime smoke for the protected replay endpoint]`

## Intent Compliance Report

- Vision: FlipFlop remains a safe revenue-capable storefront using shared ecosystem services.
- Goal Impact: Catalog Goal 24 receives a FlipFlop-owned protected producer surface instead of a missing replay/export blocker.
- System: FlipFlop owns local order eligibility and replay candidate production; Marketing/Catalog ownership remains unchanged.
- Feature: Marketplace-affinity replay readiness.
- Task: TASK-006 protected replay endpoint/export slice.
- Execution Plan: EP-TASK-006 followed.
- Coding Prompt: PROMPT-TASK-006 constraints followed.
- Code: internal order-service endpoint, service query method, verifier, and package script.
- Validation: focused verifier, eligibility verifier, diff check, order-service build, and IPS gates passed.
