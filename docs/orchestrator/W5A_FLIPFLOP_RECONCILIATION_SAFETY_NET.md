# W5a FlipFlop Reconciliation Safety Net

## Intent Preservation Chain

Vision -> FlipFlop must not keep selling products after Catalog or Warehouse authority declares them unavailable, even if an event is missed.

Goal Impact -> Adds a periodic/manual source-level safety net behind the existing request-time gates and proactive event consumers.

System -> FlipFlop product-service, shared Catalog client, shared Warehouse client, local products cache, and bounded reconciliation audit table.

Feature -> Catalog/Warehouse linked-offer reconciliation for local products with `catalogProductId`.

Task -> Scan linked local offers, read live Catalog product state and Warehouse total available, and disable local offers when Catalog is missing/inactive/archived/deleted/non-sellable or Warehouse available is zero.

Execution Plan -> Keep Catalog, Warehouse, Orders, Payments, frontend, secrets, external marketplaces, and deployment untouched. Add a product-service method and runtime-safe CLI entrypoint that can be run manually or by a future CronJob. Record bounded reconciliation evidence in `flipflop_offer_reconciliation_attempts`.

Coding Prompt -> Disable only. Do not auto-refresh stock-positive products and do not reactivate local products until `[MISSING: safe FlipFlop catalog-event refresh policy]` is resolved.

Code -> Changed files:
- `services/product-service/src/products/products.service.ts`
- `services/product-service/src/reconcile-offers.ts`
- `services/product-service/package.json`
- `package.json`
- `.env.example`
- `scripts/verify-flipflop-reconciliation.js`
- `docs/orchestrator/W5A_FLIPFLOP_RECONCILIATION_SAFETY_NET.md`

Validation -> Expected commands:
- `node scripts/verify-flipflop-reconciliation.js`
- `node scripts/verify-flipflop-offer-gate.js`
- `node scripts/verify-flipflop-proactive-consumers.js`
- `npm --prefix services/product-service run build`
- `git diff --check`

## Runtime Entry Point

Manual runtime command after the product-service image includes this source:

```bash
npm --prefix services/product-service run reconcile:offers -- --requested-by manual --request-id <stable-id>
```

Dry run:

```bash
npm --prefix services/product-service run reconcile:offers -- --dry-run --requested-by manual --request-id <stable-id>
```

Source/dev command from repo checkout:

```bash
npm run reconcile:flipflop-offers -- --dry-run --requested-by manual --request-id <stable-id>
```

## Runtime Blockers

- `[MISSING: safe FlipFlop catalog-event refresh policy]` Reconciliation intentionally never refreshes, republishes, restocks, or reactivates sellable products.
- `[MISSING: FlipFlop Kubernetes CronJob scheduling policy]` No CronJob manifest was added because this repo has deployment/config manifests but no clear CronJob pattern in scope for this no-deploy worker.

## Non-Goals

- No production database mutation during validation.
- No deployment.
- No secrets mutation.
- No external marketplace calls.
- No Catalog, Warehouse, Orders, Payments, or frontend changes.
