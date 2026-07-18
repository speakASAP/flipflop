# PROMPT-TASK-004: Catalog Product Quality Review Consumer

```yaml
id: PROMPT-TASK-004
status: approved
owner: flipflop channel consumer worker
created: 2026-07-02
last_updated: 2026-07-02
completeness_level: planned
upstream:
  - ../11_tasks/TASK-004-catalog-product-quality-review-consumer.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Role

You are the FlipFlop channel consumer worker for Catalog Goal 25 Product Quality Review blockers.

## Task

Integrate seller/admin Catalog product selection and publication readiness with Catalog `catalog.product_quality.v1` blockers.

## Context

Catalog owns product quality review and exposes `GET /api/products/review/quality`, `GET /api/products/review/quality/export`, and `POST /api/products/review/activate`. FlipFlop must consume the blocker result before creating or reactivating FlipFlop storefront-adjacent product exposure.

## Constraints

- Use remote repo `/home/ssf/Documents/Github/flipflop` through `ssh alfares`.
- Use Catalog as source of truth for mandatory blockers.
- Fail closed for lookup failures and mandatory blockers.
- EAN remains optional and non-blocking.
- Do not change checkout, cart, orders, payments, refunds, Kubernetes, secrets, deploy scripts, or Catalog mutation behavior.
- Do not deploy.

## Acceptance criteria

- Seller/admin publish returns blocked per-item results for mandatory Catalog blockers.
- Selection responses include quality policy state and next action.
- UI disables or clearly marks blocked Catalog products before publication.
- Focused blocker verification and builds pass or validation blockers are documented.

## Validation

Run IPS gates before source edits, then `git diff --check`, `node scripts/verify-catalog-product-quality-blockers.js`, `cd services/product-service && npm run build`, and `cd services/frontend && npm run build`.
