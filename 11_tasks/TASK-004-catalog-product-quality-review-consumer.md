# TASK-004: Catalog Product Quality Review Consumer

```yaml
id: TASK-004
status: approved
owner: flipflop channel consumer worker
created: 2026-07-02
last_updated: 2026-07-02
completeness_level: planned
upstream:
  - ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
  - ../01_vision/VISION.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-004-catalog-product-quality-review-consumer.md
execution_plan:
  - ../21_execution_plans/EP-TASK-004-catalog-product-quality-review-consumer.md
```

## Objective

Integrate FlipFlop seller/admin Catalog product selection and publication readiness with the Catalog Goal 25 product-quality blocker contract so mandatory blockers prevent FlipFlop storefront exposure.

## Upstream Links

- `../00_constitution/CONSTITUTION.md`
- `../01_vision/VISION.md`
- `../04_systems/SYS-001-commerce-platform.md`
- `../10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- `../17_governance/PROJECT_INVARIANTS.md`
- `../implementation-goals/GOAL-25-catalog-product-quality-review-consumer.md`

## Goal Impact

The task protects revenue readiness by keeping incomplete Catalog products out of FlipFlop seller/admin publication workflows while preserving FlipFlop ownership of storefront projection and checkout UX.

## Scope

- Consume Catalog product-quality review data through the shared Catalog client.
- Add mandatory blocker checks to Catalog-backed publish/status/readiness decisions.
- Surface policy id, blockers, and next action on seller/admin selection responses and UI.
- Add focused blocker verification and validation report evidence.

## Non-Goals

- No Catalog product mutation or Catalog activation call.
- No local redefinition of Catalog product truth beyond consumer fail-closed gating.
- No checkout, cart, order, payment, refund, pricing approval, Kubernetes, secret, or deploy change.
- No Prisma migration or destructive database operation.

## Acceptance Criteria

- [ ] Mandatory Catalog blockers prevent seller/admin FlipFlop publication.
- [ ] Catalog quality-review lookup failures fail closed before publication.
- [ ] Seller/admin Catalog selection surfaces blocker details and disables blocked selection.
- [ ] EAN is not treated as a blocking issue.
- [ ] Focused verification and build commands pass or record explicit blockers.

## Required Context

- `../shared/clients/catalog-client.service.ts`
- `../services/product-service/src/products/products.service.ts`
- `../services/frontend/lib/api/products.ts`
- `../services/frontend/lib/api/admin.ts`
- `../services/frontend/app/dashboard/page.tsx`
- `../services/frontend/app/admin/sync/page.tsx`
- Catalog contract `catalog-product-quality-review.md` from `catalog-microservice`

## Validation Task

Run IPS gates before source edits, then run the focused blocker verification script, whitespace diff validation, and product-service/frontend builds.

## Execution Plan Requirement

Implementation must follow `../21_execution_plans/EP-TASK-004-catalog-product-quality-review-consumer.md` and preserve the Catalog/FlipFlop ownership boundary.
