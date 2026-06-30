# EP-TASK-003: Catalog Connector Content Preview

```yaml
id: EP-TASK-003
status: approved
source_task: ../11_tasks/TASK-003-catalog-connector-content-preview.md
vision: ../01_vision/VISION.md
constitution: ../00_constitution/CONSTITUTION.md
feature: ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
goal_impact: ../22_goal_impact/GOAL-IMPACT-TASK-003-catalog-connector-content-preview.md
owner: project owner
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: planned
```

## Metadata

Execution plan for `TASK-003`, a bounded FlipFlop lane that exposes Catalog canonical content connector previews in the admin product flow.

## Upstream Traceability

- Constitution: `00_constitution/CONSTITUTION.md`
- Vision: `01_vision/VISION.md`
- Business case: `02_business_case/BUSINESS_CASE.md`
- Feature: `10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- Task: `11_tasks/TASK-003-catalog-connector-content-preview.md`
- Goal impact: `22_goal_impact/GOAL-IMPACT-TASK-003-catalog-connector-content-preview.md`
- Implementation goal: `implementation-goals/GOAL-10-catalog-connector-content-preview.md`

## Goal Impact

The plan makes canonical Catalog content visible to FlipFlop admins while preserving existing FlipFlop ownership of storefront rendering, checkout, cart, order, pricing, stock, and publication decisions.

## Project Invariants

Preserve all invariants in `17_governance/PROJECT_INVARIANTS.md`. This plan especially protects shared ecosystem service integration, no unapproved money-state changes, no customer-visible publication without review, and no sensitive-data leakage.

## Sensitive-Data Handling

No secret values, bearer tokens, raw customer data, or private production records may be printed or persisted in docs or validation reports. The request should forward the existing admin authorization header to Catalog without logging its value.

## Contract Validation Plan

- Keep the new FlipFlop endpoint read-only.
- Use marketplace key `flipflop` when calling Catalog.
- Return the Catalog preview data without reshaping away `content`, `source`, `overridesApplied`, or `warnings`.
- Preserve gateway path ownership by serving the endpoint under the products gateway content-preview path through product-service.
- Do not modify the Allegro API route, supplier-service wiring, database schemas, checkout, cart, order, pricing, warehouse, Kubernetes, or secrets.

## Replay/Determinism Plan

The endpoint performs one Catalog GET per request. It must not enqueue jobs, publish events, write database rows, generate new canonical content, or change local product state. Repeated calls for the same product and Catalog version should return the same Catalog data unless Catalog itself changes.

## Scope

- Shared Catalog client read method.
- Product-service protected controller/service method.
- Admin frontend API type and method.
- Admin sync page display for Catalog products and selected `flipflop` preview.
- IPS docs and state updates.

## Non-Goals

- No Allegro route repair or supplier-service deployment wiring.
- No storefront, checkout, cart, order, payment, refund, cancellation, price, discount, stock, warehouse, or Prisma migration change.
- No Kubernetes, secret, or deployment change.
- No automatic publication of canonical content to customer-facing pages.

## Files to Inspect

- `shared/clients/catalog-client.service.ts`
- `services/product-service/src/products/products.controller.ts`
- `services/product-service/src/products/products.service.ts`
- `services/api-gateway/src/gateway/gateway.controller.ts`
- `services/frontend/lib/api/admin.ts`
- `services/frontend/lib/api/products.ts`
- `services/frontend/app/admin/sync/page.tsx`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/VALIDATION_DEBT.md`

## Files to Create

- `implementation-goals/GOAL-10-catalog-connector-content-preview.md`
- `implementation-goals/GOAL-10-catalog-connector-content-preview.execution-plan.md`
- `implementation-goals/GOAL-10-catalog-connector-content-preview.context-package.md`
- `implementation-goals/GOAL-10-catalog-connector-content-preview.coding-prompt.md`
- `implementation-goals/GOAL-10-catalog-connector-content-preview.validation-report.md`
- `11_tasks/TASK-003-catalog-connector-content-preview.md`
- `21_execution_plans/EP-TASK-003-catalog-connector-content-preview.md`
- `22_goal_impact/GOAL-IMPACT-TASK-003-catalog-connector-content-preview.md`
- `13_context_packages/CP-TASK-003-catalog-connector-content-preview.md`
- `14_prompts/PROMPT-TASK-003-catalog-connector-content-preview.md`
- `12_validation/VAL-TASK-003-catalog-connector-content-preview.md`

## Files to Modify

- `shared/clients/catalog-client.service.ts`
- `services/product-service/src/products/products.controller.ts`
- `services/product-service/src/products/products.service.ts`
- `services/frontend/lib/api/admin.ts`
- `services/frontend/app/admin/sync/page.tsx`
- `implementation-goals/README.md`
- `docs/IMPLEMENTATION_STATE.md`
- validation reports for this task and goal.

## Files That Must Not Be Modified

- `services/api-gateway/src/gateway/gateway.controller.ts` unless inspection proves the existing products gateway path cannot carry the endpoint.
- `services/supplier-service/**`
- Allegro API route handlers and frontend calls outside removing this page's dependency on them.
- `services/order-service/**`, `services/cart-service/**`, checkout pages, payment services, pricing approval code, Prisma migrations, Kubernetes manifests, secrets, and deploy scripts.
- Existing dirty files owned by other agents.

## Implementation Steps

1. Inspect remote `git status` and classify dirty files.
2. Create/update IPS artifacts for the lane.
3. Run IPS pre-coding and strict documentation gates.
4. Add `CatalogClientService.getProductContentPreview(productId, marketplace, authorizationHeader)`.
5. Add `ProductsService.getCatalogContentPreview(productId, authorizationHeader)` with marketplace fixed to `flipflop`.
6. Add protected `GET /products/:id/catalog-content-preview` to admin product-service controller.
7. Add frontend admin API type and method.
8. Replace admin sync page Allegro dependency with Catalog products plus selected connector preview display.
9. Run validation commands and update validation/state docs.

## Test Plan

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
git diff --check
cd services/product-service && npm run build
cd services/frontend && npm run build
```

## Validation Plan

Pass the IPS gates before source edits. After implementation, verify the source diff avoids forbidden files and Allegro API route repair, then run whitespace diff validation plus product-service and frontend builds. Record any pre-existing validation debt separately from current-task failures.

## Documentation Updates

Update `implementation-goals/GOAL-10-catalog-connector-content-preview.validation-report.md`, `12_validation/VAL-TASK-003-catalog-connector-content-preview.md`, and `docs/IMPLEMENTATION_STATE.md` with command results, blockers, and no-deploy status.

## Rollback Plan

Because the runtime change is read-only and does not alter data, rollback is limited to removing the new endpoint/client method and restoring the admin sync page to its previous source. No data migration rollback, stock repair, payment repair, or deployment rollback is required.

## Agent Handoff Prompt

Implement the bounded Catalog connector content preview lane. Use only the allowed source files, keep marketplace key `flipflop`, do not touch the Allegro API route, supplier-service, checkout, cart, orders, Prisma migrations, Kubernetes, secrets, or deployment. Validate with IPS gates, `git diff --check`, product-service build, and frontend build.

## Completion Checklist

- [ ] IPS task, goal impact, execution plan, context package, coding prompt, and validation artifacts exist.
- [ ] IPS pre-coding and strict documentation gates pass.
- [ ] Product-service read-only preview endpoint exists and is protected.
- [ ] Admin sync page lists Catalog products and shows selected connector preview.
- [ ] No forbidden files changed.
- [ ] Required builds pass or blockers are recorded.
- [ ] Implementation state is updated.
