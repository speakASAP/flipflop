# Execution Plan: GOAL-13 Product Detail Bundle Discount Contract

```yaml
id: EP-GOAL-13-PRODUCT-DETAIL-BUNDLE-DISCOUNT-CONTRACT
status: active
created: 2026-07-02
owner: original Codex integration thread
```

## Intent Chain

Constitution -> Vision -> Business Case -> System -> Feature -> Task -> Goal Impact -> Execution Plan -> Context Package -> Coding Prompt -> Code -> Validation Report -> State Update.

## Owner Request

Implement a real, server-side bundle-discount contract so the CZK savings displayed for a product-detail buy-together set can be safely applied to cart/order/payment totals.

## Goal Impact

Increase average order value while preserving price, stock, order, payment, and provider safety. The payable total must be computed by the server and must match order persistence, central Orders forwarding, and payment initiation exactly.

## Scope

- Add a bundle intent payload for product-detail buy-together checkout.
- Validate bundle eligibility in order-service from server-side product/order/category state.
- Reject raw browser money inputs for discounts and unsafe shipping values.
- Apply one deterministic bundle discount to guest and authenticated order creation.
- Carry bundle intent through the frontend without trusting browser savings.
- Add a source verifier and update goal/state docs.

## Allowed Files

- `services/order-service/src/orders/orders.service.ts`
- `services/order-service/src/orders/dto/create-order.dto.ts`
- `services/order-service/src/orders/dto/create-guest-order.dto.ts`
- `services/frontend/lib/api/orders.ts`
- `services/frontend/lib/guest-cart.ts`
- `services/frontend/components/AddBundleToCartButton.tsx`
- `services/frontend/app/products/[id]/page.tsx`
- `services/frontend/app/checkout/page.tsx`
- `scripts/verify-product-detail-bundle-discount.js`
- `package.json`
- `implementation-goals/GOAL-13-product-detail-bundle-discount-contract*`
- `implementation-goals/README.md`
- `docs/IMPLEMENTATION_STATE.md`

## Forbidden Files

- Payment provider internals.
- Warehouse mutation contracts outside existing reservation/decrement calls.
- Catalog mutation or durable bundle aggregate schema.
- Auth service changes.
- Database migrations.
- Refund, cancellation, or paid-state mutation logic beyond preserving existing webhook behavior.
- Unrelated dirty files unless required to fix validation in an already-overlapping file.

## Contract

Frontend may submit:

```json
{
  "bundleIntent": {
    "source": "product_detail_buy_together",
    "sourceProductId": "local-product-uuid",
    "productIds": ["local-product-uuid", "related-product-uuid"]
  }
}
```

Order-service must ignore browser bundle savings and recompute:

```json
{
  "bundleDiscount": {
    "source": "product_detail_buy_together",
    "sourceProductId": "local-product-uuid",
    "productIds": [],
    "eligible": true,
    "merchandiseSubtotal": 0,
    "merchandiseSavings": 0,
    "shippingSavings": 0,
    "totalSavings": 0,
    "currency": "CZK",
    "freeShippingThreshold": 1000,
    "shippingPolicy": "selected_delivery_cost_discounted_when_bundle_subtotal_reaches_threshold"
  }
}
```

Eligibility rules:

- Source product must be in the order.
- Every bundle product id must be in the order.
- Bundle must contain at least two and at most three product ids.
- Discount applies to one unit of each bundle product.
- Target products must appear in the server recomputed eligible list using confirmed co-purchase history, same-category fallback, then deterministic sellable fallback capped to the recommendation window.
- Product rows must be active and still pass the existing order/stock path.
- Discount code and bundle discount must not stack in the first version.

## Pricing And Discount Safety

- `discount` from the browser is rejected when non-zero.
- Guest `shippingCost` from the browser is rejected when present; order-service calculates delivery from `deliveryMethod`.
- Authenticated `shippingCost` from the browser is rejected when non-zero; authenticated legacy checkout defaults to server cost `0` unless a server delivery method contract is added later.
- Bundle merchandise savings are rounded CZK and computed by order-service.
- Free-shipping savings use the selected server-side shipping cost, not the product-detail display assumption.
- Payment amount uses the final persisted `order.total`.

## Sensitive Data

No customer, address, payment, provider, credential, tracking, or raw order identifiers are added to public recommendation responses or frontend bundle storage. Order metadata stores only bounded bundle product ids and computed totals.

## Replay And Determinism

For a fixed database state, eligibility is deterministic by co-purchase count, same-category membership, stock quantity, update time, and id. Browser-provided product order does not change the computed discount.

## Rollback

Revert GOAL-13 files and redeploy. No schema or production data cleanup is required because the change stores additive order metadata only on newly created orders.

## Validation Plan

- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `node scripts/verify-product-detail-bundle-discount.js`
- `npm run verify:product-detail-upsell`
- `npm run verify:flipflop-offer-gate`
- `npm run verify:orders-hub-integration`
- `git diff --check`
- `cd services/order-service && npm run build`
- `cd services/frontend && npm run build`
- `python3 scripts/deployment_readiness_gate.py --root .`
- Post-deploy smoke without creating paid orders: public product detail and recommendations routes return HTTP 200 and deployed assets contain GOAL-13 bundle-intent contract strings.
