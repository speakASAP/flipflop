# Execution Plan: GOAL-11 Native Catalog Bulk Publish Endpoint

```yaml
id: EP-GOAL-11-NATIVE-CATALOG-BULK-PUBLISH
status: implemented
created: 2026-06-30
updated: 2026-06-30T21:21:28Z
owner: flipflop integration worker
```

## Intent Chain

Constitution -> Vision -> Business Case -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

## Scope

Implement a protected native FlipFlop product-service bulk publication lifecycle for Catalog product IDs and wire Catalog Goal 20 to call it for FlipFlop dispatch.

## Allowed Files

- `services/product-service/src/products/products.controller.ts`
- `services/product-service/src/products/products.service.ts`
- `implementation-goals/GOAL-11-native-catalog-bulk-publish*`
- `docs/IMPLEMENTATION_STATE.md`
- `reports/validation/*GOAL-11*`

## Forbidden Files

- Payment, order, cart, checkout, refund, cancellation, and customer account flows.
- Kubernetes secrets or Vault material.
- Destructive database migrations.
- Catalog product mutation behavior.

## Contract Impact

Adds protected product-service routes:

- `POST /products/publish/bulk`
- `GET /products/publish/:catalogProductId/status`

The public gateway can expose them through `/api/products/publish/...`; Catalog uses the internal product-service URL.

## Sensitive Data

Request/attempt records store bounded actor id/email/roles, product IDs, policy snapshots, and result snapshots. No tokens, payment data, customer addresses, or raw secrets are stored.

## Replay And Determinism

Each item uses a request/product idempotency key. Caller-provided `requestId` is idempotent; default calls create unique lifecycle attempts. Product upsert is idempotent by `catalogProductId` or SKU.

## Rollback

Revert the code commit and redeploy FlipFlop product-service. The attempt table is additive and can remain inert; no destructive cleanup is required.

## Validation Plan

- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `git diff --check`
- `cd services/product-service && npm run build`
- `python3 scripts/deployment_readiness_gate.py --root .`
- Post-deploy: health check and unauthorized `POST /api/products/publish/bulk` returns 401.
