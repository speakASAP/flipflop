# EP-TASK-004: Catalog Product Quality Review Consumer

```yaml
id: EP-TASK-004-CATALOG-PRODUCT-QUALITY-REVIEW-CONSUMER
status: approved
source_task: ../11_tasks/TASK-004-catalog-product-quality-review-consumer.md
vision: ../01_vision/VISION.md
constitution: ../00_constitution/CONSTITUTION.md
feature: ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
goal_impact: ../22_goal_impact/GOAL-IMPACT-TASK-004-catalog-product-quality-review-consumer.md
owner: flipflop channel consumer worker
created: 2026-07-02
last_updated: 2026-07-02
completeness_level: planned
```

## Metadata

Execution plan for `TASK-004`, a bounded FlipFlop consumer lane for Catalog Goal 25 quality blockers.

## Upstream Traceability

- Constitution: `../00_constitution/CONSTITUTION.md`
- Vision: `../01_vision/VISION.md`
- System: `../04_systems/SYS-001-commerce-platform.md`
- Feature: `../10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- Task: `../11_tasks/TASK-004-catalog-product-quality-review-consumer.md`
- Goal impact: `../22_goal_impact/GOAL-IMPACT-TASK-004-catalog-product-quality-review-consumer.md`
- Implementation goal: `../implementation-goals/GOAL-25-catalog-product-quality-review-consumer.md`

## Goal Impact

FlipFlop will block seller/admin publication when Catalog reports mandatory quality blockers, reducing customer-visible exposure risk without moving Catalog product truth or quality ownership into FlipFlop.

## Scope

- Add Catalog client support for the quality review queue lookup.
- Normalize mandatory blocker issues from Catalog response items.
- Integrate policy checks into publish/status/readiness paths.
- Add blocker state to selection response mapping and frontend types.
- Surface blocker state in seller dashboard and admin sync page.
- Add focused verification script and validation documentation.

## Non-Goals

- No Catalog activation, bulk update, mutation, or policy change.
- No storefront checkout, cart, order, payment, refund, customer account, or price approval change.
- No Kubernetes, secret, deploy, or destructive database operation.
- No attempt to make EAN a global blocker.

## Files to Inspect

- `../shared/clients/catalog-client.service.ts`
- `../services/product-service/src/products/products.controller.ts`
- `../services/product-service/src/products/products.service.ts`
- `../services/product-service/src/products/catalog-product-quality.policy.ts`
- `../services/frontend/lib/api/products.ts`
- `../services/frontend/lib/api/admin.ts`
- `../services/frontend/app/dashboard/page.tsx`
- `../services/frontend/app/admin/sync/page.tsx`
- `../implementation-goals/GOAL-11-native-catalog-bulk-publish.md`

## Files to Create

- `../scripts/verify-catalog-product-quality-blockers.js`
- `../13_context_packages/CP-TASK-004-catalog-product-quality-review-consumer.md`
- `../implementation-goals/GOAL-25-catalog-product-quality-review-consumer.md`
- `../implementation-goals/GOAL-25-catalog-product-quality-review-consumer.execution-plan.md`
- `../implementation-goals/GOAL-25-catalog-product-quality-review-consumer.coding-prompt.md`
- `../implementation-goals/GOAL-25-catalog-product-quality-review-consumer.validation-report.md`
- `../11_tasks/TASK-004-catalog-product-quality-review-consumer.md`
- `../21_execution_plans/EP-TASK-004-catalog-product-quality-review-consumer.md`
- `../22_goal_impact/GOAL-IMPACT-TASK-004-catalog-product-quality-review-consumer.md`
- `../14_prompts/PROMPT-TASK-004-catalog-product-quality-review-consumer.md`
- `../12_validation/VAL-TASK-004-catalog-product-quality-review-consumer.md`

## Files to Modify

- `../shared/clients/catalog-client.service.ts`
- `../services/product-service/src/products/products.service.ts`
- `../services/product-service/src/products/catalog-product-quality.policy.ts`
- `../services/frontend/lib/api/products.ts`
- `../services/frontend/lib/api/admin.ts`
- `../services/frontend/app/dashboard/page.tsx`
- `../services/frontend/app/admin/sync/page.tsx`
- Goal 25 validation report files

## Files That Must Not Be Modified

- `../services/order-service/**`
- `../services/cart-service/**`
- `../services/frontend/app/checkout/**`
- `../services/frontend/app/cart/**`
- `../services/supplier-service/**`
- Kubernetes manifests, Vault material, secrets, deploy scripts, and destructive migration paths
- Catalog source files outside the remote Catalog contract read

## Implementation Steps

1. Confirm worktree cleanliness and read Catalog contract/report.
2. Create Goal 25 IPS task, plan, prompt, impact, and validation artifacts.
3. Run IPS pre-coding and strict documentation gates.
4. Add Catalog client method for quality review lookup by product IDs.
5. Add product-service helper that fails closed when mandatory blockers or lookup failures exist.
6. Use the helper in publish/status/readiness and selection mapping.
7. Update frontend API types and display blocker state in seller/admin selection views.
8. Add focused verification script for mandatory blocker handling and optional EAN behavior.
9. Run validation commands and update validation reports.

## Test Plan

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
git diff --check
node scripts/verify-catalog-product-quality-blockers.js
cd services/product-service && npm run build
cd services/frontend && npm run build
```

## Validation Plan

Pass IPS gates before source edits. After implementation, verify diff whitespace, focused policy behavior, and affected builds. Record pre-existing validation debt separately from current-task failures.

## Documentation Updates

Update `../implementation-goals/GOAL-25-catalog-product-quality-review-consumer.validation-report.md` and `../12_validation/VAL-TASK-004-catalog-product-quality-review-consumer.md` with evidence and no-deploy status.

## Rollback Plan

Revert the Goal 25 consumer code, UI display changes, verification script, and documentation artifacts. No data migration rollback is required.

## Agent Handoff Prompt

Implement the bounded Catalog Goal 25 consumer lane. Use Catalog `catalog.product_quality.v1` as source of truth, fail closed for mandatory blockers, surface blockers to seller/admin selection, and do not deploy.

## Completion Checklist

- [ ] IPS gates pass before source edits.
- [ ] Catalog quality review client lookup exists.
- [ ] Mandatory blockers fail seller/admin publication.
- [ ] Selection responses include blocker state.
- [ ] Seller/admin UI shows disabled blocker state.
- [ ] Focused script and builds pass or blockers are documented.
- [ ] Validation report records evidence and no-deploy status.
