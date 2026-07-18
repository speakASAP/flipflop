# GOAL 10 Context Package: Catalog Connector Content Preview

## Target task

`TASK-003` and `GOAL-10` add a read-only admin preview surface for Catalog canonical connector content.

## Upstream traceability

- `docs/00_constitution/CONSTITUTION.md`
- `docs/01_vision/VISION.md`
- `docs/02_business_case/BUSINESS_CASE.md`
- `docs/INTENT_MEMORY.md`
- `docs/11_tasks/TASK-003-catalog-connector-content-preview.md`
- `docs/21_execution_plans/EP-TASK-003-catalog-connector-content-preview.md`

## Included documents

- `services/api-gateway/src/gateway/gateway.controller.ts`
- `shared/clients/catalog-client.service.ts`
- `services/product-service/src/products/products.controller.ts`
- `services/product-service/src/products/products.service.ts`
- `services/frontend/lib/api/admin.ts`
- `services/frontend/lib/api/products.ts`
- `services/frontend/app/admin/sync/page.tsx`

## Excluded documents

- Allegro route repair implementation.
- Supplier deployment wiring.
- Checkout, cart, order, payment, pricing, stock, Prisma, Kubernetes, secrets, and deploy files.

## Constraints

- Marketplace key: `flipflop`.
- Read-only admin endpoint only.
- Forward authorization to Catalog; do not log token values.
- No deployment.
- Preserve other agents' edits.

## Agent prompt

Implement the Catalog preview lane inside the allowed files and update validation/state docs. Avoid forbidden files and keep all customer-facing publication unchanged.

## Validation instructions

Run IPS gates, `git diff --check`, product-service build, and frontend build. Record blockers precisely if any command fails.
