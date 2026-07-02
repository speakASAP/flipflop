# GOAL-25: Catalog Product Quality Review Consumer

```yaml
id: GOAL-25-CATALOG-PRODUCT-QUALITY-REVIEW-CONSUMER
status: active
owner: flipflop channel consumer worker
created: 2026-07-02
source_contract: ../catalog-microservice/docs/contracts/catalog-product-quality-review.md
```

## Constitution

FlipFlop remains the storefront, checkout, cart, order, payment, and customer UX owner. Catalog remains the product truth and product quality policy owner.

## Vision

FlipFlop serves sellable products from shared Catalog and Warehouse data while preserving production readiness and first-revenue safety.

## Goal Impact

Seller and admin Catalog publication paths must fail closed when Catalog says mandatory product quality blockers remain. Operators and sellers should see those blockers before or during selection instead of creating customer-visible FlipFlop exposure for incomplete Catalog records.

## System Boundary

- Catalog owns product identity, quality policy `catalog.product_quality.v1`, lifecycle readiness, and mandatory blocker evaluation.
- FlipFlop owns storefront projection, local listing lifecycle attempts, seller/admin selection UX, and checkout UX.
- Warehouse remains stock authority.
- Auth remains identity and RBAC authority.

## Feature

Consume Catalog Goal 25 product-quality blockers in FlipFlop seller/admin Catalog selection and publication readiness paths.

## Task

Implement `TASK-004` as a narrow consumer integration in product-service and frontend selection surfaces.

## Acceptance Criteria

- FlipFlop calls Catalog product-quality review contract before seller/admin publication or exposure-adjacent sync.
- Mandatory blockers fail closed for publish and status paths.
- Selection APIs/UI surface `catalog.product_quality.v1` policy details where Catalog products are listed.
- EAN remains optional and non-blocking.
- FlipFlop does not redefine Catalog product truth or mutate Catalog quality state.
- No deployment is performed without explicit approval.

## Non-Goals

- No Catalog policy reimplementation as product truth.
- No checkout, cart, order, payment, refund, discount, or customer account behavior changes.
- No Prisma migration or destructive database operation.
- No Catalog mutation or activation call from FlipFlop.

## Parallel Execution

- Workstream A `ready now`: FlipFlop consumer integration in `shared/clients/catalog-client.service.ts` and `services/product-service/src/products/*`. Owner: channel consumer worker. Validation owner: same worker. Merge order: first.
- Workstream B `ready now`: frontend selection surfacing in `services/frontend/lib/api/*`, `services/frontend/app/dashboard/page.tsx`, and `services/frontend/app/admin/sync/page.tsx`. Owner: channel consumer worker. Validation owner: same worker. Merge order: after backend type shape is stable.
- Workstream C `final integration`: focused verification script, build checks, and validation report. Owner: channel consumer worker.

## Validation

Required evidence: IPS gates before source edits, `git diff --check`, focused Catalog blocker verification script, and repo-equivalent build commands.
