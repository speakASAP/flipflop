# Execution Plan: GOAL-25 Catalog Product Quality Review Consumer

```yaml
id: EP-GOAL-25-CATALOG-PRODUCT-QUALITY-REVIEW-CONSUMER
status: active
created: 2026-07-02
owner: flipflop channel consumer worker
source_goal: GOAL-25-catalog-product-quality-review-consumer.md
```

## Intent Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

## Scope

Add a minimal fail-closed consumer integration for Catalog `catalog.product_quality.v1` blockers in FlipFlop Catalog-backed publication, status, and selection flows.

## Allowed Files

- `shared/clients/catalog-client.service.ts`
- `services/product-service/src/products/products.service.ts`
- `services/product-service/src/products/catalog-product-quality.policy.ts`
- `services/frontend/lib/api/products.ts`
- `services/frontend/lib/api/admin.ts`
- `services/frontend/app/dashboard/page.tsx`
- `services/frontend/app/admin/sync/page.tsx`
- `scripts/verify-catalog-product-quality-blockers.js`
- Goal 25 IPS and validation documentation

## Forbidden Files

- Payment, order, cart, checkout, refund, cancellation, customer account, Kubernetes, secret, and deploy files.
- Destructive database migrations or cleanup scripts.
- Catalog policy mutation, Catalog activation, or Catalog product write paths.

## Contract Impact

FlipFlop consumes Catalog:

- `GET /api/products/review/quality`
- policy id `catalog.product_quality.v1`
- mandatory blocker codes: `missing_sku`, `duplicate_sku`, `missing_title`, `missing_description`, `missing_current_price`, `missing_image`, `placeholder_image_only`, `archived_product`

No new public cross-service contract is introduced by FlipFlop.

## Sensitive Data

Forward authorization headers to Catalog when needed but do not log or persist token values. Reports must only include product IDs, blocker codes, and non-secret operational metadata.

## Replay And Determinism

Policy checks are read-only Catalog GET calls. Repeated checks for the same Catalog product and policy version should return stable results unless Catalog product state changes.

## Parallel Execution

- Backend policy consumer `ready now`: add Catalog client method and product-service publish/status policy integration.
- Frontend blocker surfacing `dependency-gated`: update selection UI after backend response shape is known.
- Validation/reporting `final integration`: run focused script and builds after both code paths compile.

## Rollback

Revert the added client method, policy helper, frontend display fields, verification script, and Goal 25 docs. Existing product publish attempts remain readable and no data cleanup is required.

## Validation Plan

- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `git diff --check`
- `node scripts/verify-catalog-product-quality-blockers.js`
- `cd services/product-service && npm run build`
- `cd services/frontend && npm run build`

## Current Checkpoint

Documentation created. Source edits are pending pre-coding gate evidence.
