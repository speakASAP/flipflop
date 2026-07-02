# Execution Plan: GOAL-12 Product Detail Upsell Recommendations

```yaml
id: EP-GOAL-12-PRODUCT-DETAIL-UPSELL-RECOMMENDATIONS
status: active
created: 2026-07-02
owner: original Codex integration thread
```

## Intent Chain

Constitution -> Vision -> Business Case -> System -> Feature -> Task -> Goal Impact -> Execution Plan -> Context Package -> Coding Prompt -> Code -> Validation Report -> State Update.

## Owner Request

Add related products below the product detail card and add a buy-together set like Amazon. Use purchase history when available; otherwise use related fallback products. Related products start deterministic, by category or alternative category, without AI. Show bundle savings in crowns, not as a percentage, and account for the free-shipping threshold above 1000 Kč.

## Goal Impact

Increase average order value from the product detail page while preserving pricing, order total, checkout, stock, payment, and provider safety boundaries.

## Scope

- Add deterministic public recommendation response in product-service.
- Render recommendations and bundle on the product detail SSR route.
- Allow customers to add the bundle products through existing add-to-cart behavior.
- Display savings as a CZK amount and never expose the 5% calculation as UI text.

## Allowed Files

- `services/product-service/src/products/products.controller.ts`
- `services/product-service/src/products/products.service.ts`
- `services/frontend/lib/api/products.ts`
- `services/frontend/app/products/[id]/page.tsx`
- `services/frontend/components/AddBundleToCartButton.tsx`
- `scripts/verify-product-detail-upsell.js`
- `package.json`
- `implementation-goals/GOAL-12-product-detail-upsell-recommendations*`
- `docs/IMPLEMENTATION_STATE.md`

## Forbidden Files

- Payment provider integrations.
- Checkout payment state.
- Refund, cancellation, or order status mutation.
- Destructive database migrations.
- Catalog or Warehouse mutation.
- Auth service changes.

## Contract

`GET /products/:id/recommendations` returns:

```json
{
  "productId": "uuid",
  "relatedProducts": [],
  "bundle": {
    "source": "purchase_history|related_fallback",
    "products": [],
    "subtotal": 0,
    "bundlePrice": 0,
    "merchandiseSavings": 0,
    "shippingSavings": 0,
    "totalSavings": 0,
    "freeShippingThreshold": 1000
  }
}
```

The endpoint is public read-only and returns sellable product-shaped objects only. If purchase history exists, products from confirmed historical orders containing the current product are ranked by co-purchase frequency. If history is absent, same-category products are preferred, then other sellable products.

## Pricing And Discount Safety

The recommendation endpoint may compute display-only bundle savings. It must not alter product prices, cart item prices, order discounts, shipping cost, payment amount, or checkout totals. Applying a real bundle discount in checkout is a follow-up requiring a dedicated server-side discount contract and validation.

## Sensitive Data

The endpoint reads aggregate order item co-occurrence only. It must not expose customer IDs, emails, addresses, notes, payment state, provider tokens, or raw order identifiers.

## Replay And Determinism

The fallback algorithm sorts by category match, stock, updated date, and ID so repeated requests are deterministic for a fixed database state.

## Rollback

Revert the code changes and redeploy. No schema or data cleanup is required.

## Validation Plan

- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `node scripts/verify-product-detail-upsell.js`
- `git diff --check`
- `cd services/product-service && npm run build`
- `cd services/frontend && npm run build`
- `python3 scripts/deployment_readiness_gate.py --root .`
- Post-deploy smoke: product detail HTML contains related and bundle sections for a live product.
