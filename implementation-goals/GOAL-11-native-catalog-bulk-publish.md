# GOAL-11: Native Catalog Bulk Publish Endpoint

```yaml
id: GOAL-11-NATIVE-CATALOG-BULK-PUBLISH
status: active
owner: flipflop integration worker
created: 2026-06-30
branch: codex/flipflop-native-bulk-publish
```

## Constitution

FlipFlop must remain the storefront and checkout owner for products sold at `https://flipflop.alfares.cz/`.

## Vision

Catalog operators can select groups of products and publish them to FlipFlop through a FlipFlop-owned lifecycle instead of treating Catalog projection availability as publication.

## Business Case

Native per-item lifecycle gives operations a durable record of which Catalog products were accepted, blocked, or failed for FlipFlop storefront activation, increasing sales reach while preserving product truth in Catalog.

## System Boundary

- Catalog owns product truth, operator selection, and marketplace dispatch orchestration.
- FlipFlop owns storefront product rows, sellability gates, local active state, and publication attempts.
- Warehouse remains stock authority.
- Auth remains identity/RBAC authority.
- No order, payment, checkout, refund, cancellation, or price suggestion behavior changes.

## Feature

Add protected FlipFlop product-service endpoints:

- `POST /products/publish/bulk` to publish Catalog product IDs into FlipFlop storefront lifecycle.
- `GET /products/publish/:catalogProductId/status` to read the latest per-item lifecycle status.

## Acceptance Criteria

- Endpoint requires authenticated admin/catalog write roles.
- Each selected Catalog product is processed independently.
- FlipFlop fetches Catalog product truth and Warehouse stock before local activation.
- Blocked products return per-item reasons without failing the whole batch.
- Successful products upsert a local FlipFlop Product row with `catalogProductId`, price, media, SEO, stock, and `isActive=true`.
- Each item records a durable lifecycle attempt in `flipflop_catalog_publish_attempts`.
- Catalog bulk publication dispatch calls this native endpoint for FlipFlop.

## Non-Goals

- No external marketplace posting from FlipFlop.
- No Catalog data mutation.
- No price mutation outside copying the current Catalog price into the FlipFlop storefront row.
- No order, payment, checkout, refund, cancellation, or customer data changes.

## Parallel Execution

- Workstream A `ready now`: FlipFlop native endpoint. Allowed files: `services/product-service/src/products/*`, Goal 11 docs. Forbidden files: payment/order/checkout/schema migration secrets. Owner: FlipFlop integration worker. Validation: product-service build and protected-route smoke.
- Workstream B `dependency-gated`: Catalog caller switch. Allowed files: `catalog-microservice-goal20/src/products/*`, Goal 20 validation docs. Depends on endpoint contract from Workstream A. Owner: Catalog integration worker. Validation: focused product service spec and backend build.
- Final integration: this thread owns contract compatibility, deploy order, and live smoke. Merge order: FlipFlop endpoint first, Catalog caller second.
