# GOAL-IMPACT-TASK-005: FlipFlop Affinity Replay Eligibility

```yaml
id: GOAL-IMPACT-TASK-005
artifact_type: task
artifact_id: TASK-005
artifact_path: ../11_tasks/TASK-005-flipflop-affinity-replay-eligibility.md
primary_goal: ../GOALS.md
secondary_goals:
  - ../implementation-goals/GOAL-13-ecosystem-related-products-order-affinity-plan.md
impact_level: medium
impact_description: Removes the unknown FlipFlop marketplace-affinity eligibility blocker while preserving checkout, payment, stock, Marketing, and Catalog ownership boundaries.
success_metric: FlipFlop documents and source-encodes paid multi-product eligibility for at least two distinct mapped Catalog product ids with focused validation evidence.
upstream_links:
  - ../01_vision/VISION.md
  - ../04_systems/SYS-001-commerce-platform.md
  - ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
  - ../17_governance/PROJECT_INVARIANTS.md
downstream_links:
  - ../21_execution_plans/EP-TASK-005-flipflop-affinity-replay-eligibility.md
validation_method: IPS gates, focused eligibility verifier, git diff validation, and order-service build.
status: approved
```

## Explanation

Catalog Goal 24 needs each marketplace owner to define which local order records are safe replay candidates. FlipFlop order-service owns local checkout/order status and the local product-to-Catalog mapping, so this task defines the paid multi-product mapping in FlipFlop instead of making Catalog infer it.

## Evidence

- `prisma/schema.prisma` defines `OrderStatus` values `confirmed`, `processing`, `shipped`, and `delivered`, plus `PaymentStatus.paid`.
- `services/order-service/src/orders/orders.service.ts` sets paid payment callbacks to `paymentStatus=paid` and `status=confirmed`.
- The same order service sets `fulfilledAt` for `shipped` and `delivered`.
- Product mapping is available through `Product.catalogProductId`, and central Orders forwarding already fails closed when that mapping is absent.

## Validation

Validate with IPS gates, `npm run verify:flipflop-affinity-eligibility`, `git diff --check`, and `cd services/order-service && npm run build`. Deployment and live replay execution remain out of scope.
