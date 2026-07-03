# PROMPT-TASK-006: FlipFlop Affinity Replay Export Surface

```yaml
id: PROMPT-TASK-006
status: approved
owner: flipflop affinity replay export worker
created: 2026-07-03
last_updated: 2026-07-03
completeness_level: complete
upstream:
  - ../21_execution_plans/EP-TASK-006-flipflop-affinity-replay-export.md
context_package:
  - ../13_context_packages/CP-TASK-006-flipflop-affinity-replay-export.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Role

You are the FlipFlop marketplace-affinity replay export worker for Catalog Goal 24.

## Task

Add a protected read-only FlipFlop-owned internal endpoint or equivalent owner-run export for `marketplace.order_affinity_replay_candidates.v1`.

## Context

TASK-005 already merged the eligibility helper. Eligible orders require `paymentStatus=paid`, local status in `confirmed`, `processing`, `shipped`, or `delivered`, and at least two distinct mapped Catalog product ids after unmapped lines are excluded.

## Constraints

- Use the merged eligibility helper; do not duplicate eligibility logic.
- Protected access must be internal-service only and must fail closed when the configured internal secret is absent or mismatched.
- Response must include `sourceOwner=flipflop-service`, `consumerOwner=marketing-microservice`, `contract=marketplace.order_affinity_replay_candidates.v1`, and `channel=flipflop`.
- Include bounded `from`, `to`, `limit`, `cursorBefore`, `cursorAfter`, `dryRun`, and window metadata.
- Emit only aggregate-safe candidate events and aggregate diagnostics.
- Do not expose customer/address/payment/provider/raw checkout/secret data.
- Do not run live checkout, payment, order-state, stock, Warehouse, Catalog, Marketing, Kubernetes, deploy, secret, or migration mutations.

## Acceptance criteria

- Endpoint/export is read-only and protected.
- Candidate shape preserves FlipFlop provenance and uses synthetic replay refs.
- Filtering and empty/unmapped/insufficient orders fail closed through the helper.
- Focused verifier checks protected access/export shape, filtering, forbidden-field exclusion, window metadata, pagination, and helper reuse.
- Required validation commands pass or blockers are explicit.

## Validation

Run IPS gates, the existing eligibility verifier, the new replay export verifier, `git diff --check`, and the order-service build.
