# Coding Prompt: GOAL-25 Catalog Product Quality Review Consumer

You are the FlipFlop channel consumer worker for Catalog Goal 25 Product Quality Review blockers.

## Read First

```text
docs/00_constitution/CONSTITUTION.md
docs/01_vision/VISION.md
docs/10_features/FEAT-001-intent-preserved-revenue-readiness.md
docs/17_governance/PROJECT_INVARIANTS.md
docs/11_tasks/TASK-004-catalog-product-quality-review-consumer.md
docs/21_execution_plans/EP-TASK-004-catalog-product-quality-review-consumer.md
```

## Task

Consume Catalog `catalog.product_quality.v1` blockers in FlipFlop seller/admin Catalog selection and publication readiness flows.

## Constraints

- Remote-only Alfares repo work.
- Fail closed when Catalog quality review lookup fails or mandatory blockers remain.
- Do not redefine Catalog product truth in FlipFlop.
- Do not mutate Catalog, Warehouse, checkout, cart, order, payment, refunds, or customer account flows.
- Do not deploy without explicit approval.

## Required Output

- Changed files.
- Focused blocker verification evidence.
- Build/diff evidence.
- Validation report and handoff notes.
