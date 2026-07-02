# CP-TASK-004: Catalog Product Quality Review Consumer

```yaml
id: CP-TASK-004
status: approved
owner: flipflop channel consumer worker
created: 2026-07-02
last_updated: 2026-07-02
completeness_level: planned
upstream:
  - ../11_tasks/TASK-004-catalog-product-quality-review-consumer.md
downstream:
  - ../14_prompts/PROMPT-TASK-004-catalog-product-quality-review-consumer.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Target task

`11_tasks/TASK-004-catalog-product-quality-review-consumer.md` integrates FlipFlop seller/admin Catalog selection and publication readiness with Catalog Goal 25 product-quality blockers.

## Upstream traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `04_systems/SYS-001-commerce-platform.md`
- `10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- `11_tasks/TASK-004-catalog-product-quality-review-consumer.md`
- `21_execution_plans/EP-TASK-004-catalog-product-quality-review-consumer.md`
- `22_goal_impact/GOAL-IMPACT-TASK-004-catalog-product-quality-review-consumer.md`
- `implementation-goals/GOAL-25-catalog-product-quality-review-consumer.md`

## Included documents

- `shared/clients/catalog-client.service.ts`
- `services/product-service/src/products/products.controller.ts`
- `services/product-service/src/products/products.service.ts`
- `services/frontend/lib/api/products.ts`
- `services/frontend/lib/api/admin.ts`
- `services/frontend/app/dashboard/page.tsx`
- `services/frontend/app/admin/sync/page.tsx`
- `implementation-goals/GOAL-11-native-catalog-bulk-publish.md`

## Excluded documents

- Checkout, cart, order, payment, refund, customer account, Kubernetes, secret, and deploy files.
- Catalog source mutation files and Catalog activation flows.
- Destructive database migration or cleanup files.

## Constraints

- Use Catalog `catalog.product_quality.v1` as source of truth for mandatory quality blockers.
- Fail closed when mandatory blockers or quality lookup failures remain.
- Keep EAN optional and non-blocking.
- Surface blockers in selection and publication flows without moving storefront or checkout ownership.
- Do not deploy.

## Agent prompt

Read this package, implement the bounded consumer lane, preserve the IPS chain, avoid forbidden files, and update validation reports with command evidence.

## Validation instructions

Run IPS gates before source edits, then run `git diff --check`, `node scripts/verify-catalog-product-quality-blockers.js`, `cd services/product-service && npm run build`, and `cd services/frontend && npm run build`.
