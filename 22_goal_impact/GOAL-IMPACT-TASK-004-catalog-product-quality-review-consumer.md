# GOAL-IMPACT-TASK-004: Catalog Product Quality Review Consumer

```yaml
id: GOAL-IMPACT-TASK-004
artifact_type: task
artifact_id: TASK-004
artifact_path: ../11_tasks/TASK-004-catalog-product-quality-review-consumer.md
primary_goal: ../GOALS.md
secondary_goals:
  - ../implementation-goals/GOAL-25-catalog-product-quality-review-consumer.md
impact_level: high
impact_description: Prevents incomplete Catalog products from becoming FlipFlop seller and admin storefront exposure while preserving Catalog as product truth.
success_metric: Seller and admin publication returns blocked results for mandatory Catalog Goal 25 blockers and selection UI displays the quality policy state.
upstream_links:
  - ../01_vision/VISION.md
  - ../04_systems/SYS-001-commerce-platform.md
  - ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
  - ../17_governance/PROJECT_INVARIANTS.md
downstream_links:
  - ../21_execution_plans/EP-TASK-004-catalog-product-quality-review-consumer.md
validation_method: IPS gates, focused blocker script, git diff validation, product-service build, and frontend build.
status: approved
```

## Explanation

Catalog Goal 25 creates a stable quality blocker contract for global product publishability. FlipFlop needs to consume that contract at its seller/admin publication boundary so incomplete Catalog records cannot become customer-visible FlipFlop listings.

## Evidence

- FlipFlop already publishes Catalog products through the native Goal 11 product-service endpoint.
- The existing seller dashboard lists effective Catalog products and lets sellers publish selected products.
- The Catalog Goal 25 contract defines mandatory blockers and keeps EAN optional.
- FlipFlop project invariants prefer shared ecosystem services and require content safety before customer exposure.

## Validation

Validate with IPS gates, a focused blocker verification script, `git diff --check`, product-service build, and frontend build. Deployment remains out of scope without explicit approval.
