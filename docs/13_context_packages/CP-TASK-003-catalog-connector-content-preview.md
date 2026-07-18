# CP-TASK-003: Catalog Connector Content Preview

```yaml
id: CP-TASK-003
status: approved
owner: project owner
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: planned
upstream:
  - ../11_tasks/TASK-003-catalog-connector-content-preview.md
downstream:
  - ../14_prompts/PROMPT-TASK-003-catalog-connector-content-preview.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Target task

`docs/11_tasks/TASK-003-catalog-connector-content-preview.md` exposes Catalog canonical content connector previews in the FlipFlop admin product flow through a read-only product-service endpoint.

## Upstream traceability

- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- `docs/02_business_case/BUSINESS_CASE.md`
- `docs/10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- `docs/11_tasks/TASK-003-catalog-connector-content-preview.md`
- `docs/21_execution_plans/EP-TASK-003-catalog-connector-content-preview.md`
- `docs/22_goal_impact/GOAL-IMPACT-TASK-003-catalog-connector-content-preview.md`

## Included documents

- `docs/INTENT_MEMORY.md`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/process/OPERATIONAL_GATES.md`
- `services/api-gateway/src/gateway/gateway.controller.ts`
- `shared/clients/catalog-client.service.ts`
- `services/product-service/src/products/products.controller.ts`
- `services/product-service/src/products/products.service.ts`
- `services/frontend/lib/api/admin.ts`
- `services/frontend/app/admin/sync/page.tsx`

## Excluded documents

- Supplier-service deployment wiring.
- Allegro route repair docs and implementation.
- Checkout, cart, order, payment, pricing, stock, Prisma migration, Kubernetes, secret, and deploy artifacts.

## Constraints

- Use Catalog marketplace key `flipflop`.
- Keep the endpoint read-only and admin-protected.
- Forward authorization to Catalog without logging token values.
- Do not deploy.
- Do not alter storefront ownership, checkout ownership, or payment/order/pricing state.
- Do not invent unavailable facts; record them explicitly in state or validation reports.

## Agent prompt

Read this context package and implement only the bounded preview lane. Preserve the IPS chain, avoid forbidden files, and update validation/state docs with command evidence.

## Validation instructions

Run the IPS gates before source edits, then run `git diff --check`, `cd services/product-service && npm run build`, and `cd services/frontend && npm run build`. If any command fails, separate current-task failures from pre-existing validation debt.
