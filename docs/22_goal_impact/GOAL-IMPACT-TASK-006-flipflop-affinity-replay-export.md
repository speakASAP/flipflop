# GOAL-IMPACT-TASK-006: FlipFlop Affinity Replay Export Surface

```yaml
id: GOAL-IMPACT-TASK-006
artifact_type: task
artifact_id: TASK-006
artifact_path: ../11_tasks/TASK-006-flipflop-affinity-replay-export.md
primary_goal: ../GOALS.md
secondary_goals:
  - ../implementation-goals/GOAL-13-ecosystem-related-products-order-affinity-plan.md
impact_level: medium
impact_description: Removes the FlipFlop protected replay endpoint and export blocker while preserving checkout, payment, stock, Marketing, and Catalog ownership boundaries.
success_metric: FlipFlop exposes a protected read-only aggregate-safe replay candidate surface for Marketing dry-runs.
upstream_links:
  - ../01_vision/VISION.md
  - ../04_systems/SYS-001-commerce-platform.md
  - ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
  - ../17_governance/PROJECT_INVARIANTS.md
downstream_links:
  - ../21_execution_plans/EP-TASK-006-flipflop-affinity-replay-export.md
validation_method: IPS gates, focused eligibility verifier, replay export verifier, git diff validation, and order-service build.
status: approved
```

## Explanation

Catalog Goal 24 needs each marketplace owner to provide a durable protected replay surface before Marketing can run scheduled affinity dry-runs. FlipFlop owns local order history and product-to-Catalog mapping, so this task exposes the FlipFlop-owned replay candidates without requiring Catalog or Marketing to query FlipFlop internals directly.

## Evidence

- TASK-005 provides the merged eligibility helper and redacted candidate shape.
- The internal order-service route uses `X-Flipflop-Internal-Key`.
- The TASK-006 endpoint requires the configured internal secret and returns only bounded candidate events and aggregate diagnostics.
- The response envelope identifies `sourceOwner=flipflop-service`, `consumerOwner=marketing-microservice`, `contract=marketplace.order_affinity_replay_candidates.v1`, and `channel=flipflop`.

## Validation

Validate with IPS gates, `npm run verify:flipflop-affinity-eligibility`, `npm run verify:flipflop-affinity-replay-export`, `git diff --check`, and `cd services/order-service && npm run build`.

Marketing parser/scheduler/ledger, owner-approved dry-run windows, Catalog relation publishing, deployment, and live replay execution remain out of scope.
