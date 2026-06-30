# GOAL-IMPACT-TASK-003: Catalog Connector Content Preview

```yaml
id: GOAL-IMPACT-TASK-003
artifact_type: task
artifact_id: TASK-003
artifact_path: ../11_tasks/TASK-003-catalog-connector-content-preview.md
primary_goal: ../GOALS.md
secondary_goals:
  - ../implementation-goals/GOAL-10-catalog-connector-content-preview.md
impact_level: medium
impact_description: Makes Catalog canonical content visible to FlipFlop admins without changing storefront publication, checkout, pricing, or supplier ownership.
success_metric: Admin product sync flow can inspect the Catalog `flipflop` connector preview for Catalog products through a protected read-only FlipFlop product-service endpoint.
upstream_links:
  - ../01_vision/VISION.md
  - ../02_business_case/BUSINESS_CASE.md
  - ../docs/INTENT_MEMORY.md
downstream_links:
  - ../21_execution_plans/EP-TASK-003-catalog-connector-content-preview.md
validation_method: IPS gates, git diff validation, product-service build, and frontend build.
status: approved
```

## Explanation

Catalog now owns canonical content preview generation for marketplace connector key `flipflop`. FlipFlop needs an admin inspection surface so operators can review the content that Catalog would provide, while FlipFlop keeps storefront rendering, checkout, cart, order, pricing, and publication decisions in their existing service boundaries.

## Evidence

- Owner request on 2026-06-30 names the Catalog contract and marketplace key `flipflop`.
- `SYSTEM.md` and project invariants prefer shared ecosystem services, including catalog-microservice.
- `SPEC.md` Module 1 already treats catalog-microservice as the master product catalogue while preserving local pricing safety rules.
- The existing admin sync page is Allegro-oriented, so this lane must avoid the Allegro API route and surface Catalog previews through product-service instead.

## Validation

Validate traceability with IPS gates, then validate implementation with `git diff --check`, `cd services/product-service && npm run build`, and `cd services/frontend && npm run build`. Do not deploy for this lane.
