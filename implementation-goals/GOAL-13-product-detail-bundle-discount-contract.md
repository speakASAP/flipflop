# GOAL-13: Product Detail Bundle Discount Contract

```yaml
id: GOAL-13-PRODUCT-DETAIL-BUNDLE-DISCOUNT-CONTRACT
status: planned
owner: checkout pricing integration worker
created: 2026-07-02
repository: /home/ssf/Documents/Github/flipflop
upstream:
  - implementation-goals/GOAL-12-product-detail-upsell-recommendations.md
  - implementation-goals/GOAL-13-ecosystem-related-products-order-affinity-plan.md
chain: Constitution -> Vision -> Business Case -> System -> Feature -> Task -> Goal Impact -> Execution Plan -> Context Package -> Coding Prompt -> Code -> Validation Report -> State Update
```

## Constitution

FlipFlop must become production-ready and revenue-capable at `https://flipflop.alfares.cz/` while preserving checkout-to-first-revenue safety.

## Vision

Customers who choose a product-detail buy-together set should receive the advertised savings only when the server can prove that the cart contents match an eligible set and the payable total sent to Payments matches the persisted order total.

## Business Case

GOAL-12 made bundle savings visible in Czech crowns and allowed customers to add bundle items. GOAL-13 closes the commercial contract gap by making checkout totals server-owned instead of trusting browser discount or shipping copy.

## System Boundary

- Product-service continues to expose public read-only recommendations and display bundle metadata.
- Frontend may carry only a bundle intent: source product and product ids. It must not carry authoritative discount amounts.
- Order-service owns the payable total, bundle eligibility validation, discount arithmetic, delivery/free-shipping policy, order persistence, central Orders forwarding, and payment amount.
- Warehouse remains stock authority through existing reserve/decrement paths.
- Payments receives the exact order-service total; it does not recompute bundle pricing.

## Feature

Apply a server-validated product-detail bundle discount during checkout when the submitted items match an eligible buy-together set.

## Acceptance Criteria

- Browser-provided `discount` values are rejected for guest and authenticated checkout unless backed by a validated discount code or server-validated bundle intent.
- Browser-provided authenticated `shippingCost` is not trusted as a payable total input.
- Guest and authenticated order creation can accept a bundle intent containing only product identifiers, never copied savings.
- Order-service recomputes bundle eligibility from server data before applying any bundle discount.
- Bundle discount is limited to one unit of each eligible bundle product so larger quantities cannot multiply an upsell discount unexpectedly.
- Bundle discount cannot apply if the requested products are not in the order, do not include the source product, or are outside the server recomputed eligible recommendation set.
- Merchandise savings and free-shipping savings are computed server-side and stored in order metadata.
- Payment amount, local order total, and central Orders total use the same discounted total.
- Catalog/Warehouse sellability and reservation checks remain in the existing order path.
- Checkout UI shows CZK savings and does not mention `5%`.
- Repeatable source verifier covers the contract and remains non-mutating.
- No real paid order/payment is created during validation without explicit approval.

## Non-Goals

- No new database table or destructive migration.
- No manual production data mutation.
- No provider webhook simulation that marks an order paid.
- No refund, cancellation, order-status, Catalog, Warehouse, Auth, or provider credential changes.
- No durable ecosystem Catalog bundle aggregate; that remains `[MISSING: Catalog bundle ownership decision]` from the ecosystem plan.

## Dependencies

- GOAL-12 product-detail bundle UI and public recommendations endpoint.
- Existing order-service local Product, Order, OrderItem, CartItem, ProductCategory, payment, central Orders, and Warehouse integrations.
- Existing guest checkout server-side delivery method allowlist.

## Risks

- Current product-service fallback can include cross-category sellable products when same-category products are insufficient. GOAL-13 treats the server recomputed fallback list as eligible only when it is deterministic and capped; arbitrary product ids outside that recomputed list are rejected.
- Existing legal delivery pages have different free-delivery copy than the GOAL-12 threshold assumption. GOAL-13 uses order-service checkout policy as source of truth and records the applied shipping savings in metadata.
- The remote worktree already contains unrelated dirty central Orders/payment changes. GOAL-13 code must preserve those changes and avoid reverting them.
- `[UNKNOWN: whether local product prices are gross CZK prices or net prices requiring VAT]`; GOAL-13 preserves the current order-service tax behavior instead of changing VAT policy.

## Parallel Execution

| Workstream | Status | Owner role | Scope | Allowed files | Forbidden files | Dependencies | Blockers | Validation evidence | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A Cart/checkout pricing contract | complete-read-only | pricing contract explorer | Locate cart, shipping, discount, and quote authority | read-only | edits/deploy/data mutation | none | none | Explorer findings in implementation thread | Order-service must own totals. |
| B Order/payment total validation | complete-read-only | payment contract explorer | Locate order persistence, central Orders, and payment amount flow | read-only | edits/deploy/data mutation | none | none | Explorer findings plus non-mutating verifier runs | Payment amount must equal order total. |
| C Frontend bundle token/checkout UX | complete-read-only | storefront explorer | Locate bundle add-to-cart and checkout payload shape | read-only | edits/deploy/data mutation | none | none | Explorer findings | Frontend carries identifiers only. |
| D Verifier/docs/IPS | complete-read-only | verifier explorer | Define artifacts and validation shape | read-only | edits/deploy/data mutation | none | none | Explorer findings | Use GOAL-12 artifact pattern. |
| E Integration implementation | ready now | original thread | Implement smallest end-to-end server-validated bundle intent | `services/order-service/src/orders/orders.service.ts`, order DTOs, frontend checkout/bundle/cart helpers, product recommendations typing, verifier/docs | payment provider internals, Warehouse/Catalog/Auth mutation, DB migrations | A-D complete, plan saved, IPS gates pass | dirty overlapping order-service file must be preserved | source verifier, builds, IPS gates | Original thread owns merge and validation. |
| F Deployment/smoke | final integration | original thread | Deploy after validation and run non-mutating public smoke | deploy script, read-only curl/kubectl evidence | real paid order/payment mutation | E validation passed | deployment risk if current dirty work belongs to another lane | rollout and public read-only smoke | Stop if build/deploy blocker appears. |

## Merge Order

1. Save GOAL-13 goal, execution plan, context package, coding prompt, state, and README entries.
2. Run IPS pre-coding gates.
3. Add order-service bundle intent validation and total calculation hardening.
4. Add frontend bundle-intent carry-through and checkout savings display.
5. Add a non-mutating source verifier and package script.
6. Run focused verifier, order-service build, frontend build, IPS/deployment readiness gates, and `git diff --check`.
7. Deploy only after gates pass.
8. Run non-mutating public smoke and update validation report/state.

## Validation Report

Completed in `implementation-goals/GOAL-13-product-detail-bundle-discount-contract.validation-report.md`.
