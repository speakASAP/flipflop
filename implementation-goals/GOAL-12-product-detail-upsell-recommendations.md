# GOAL-12: Product Detail Upsell Recommendations

```yaml
id: GOAL-12-PRODUCT-DETAIL-UPSELL-RECOMMENDATIONS
status: implemented-validated-deployed
owner: storefront upsell integration worker
created: 2026-07-02
repository: /home/ssf/Documents/Github/flipflop
```

## Constitution

FlipFlop must become production-ready and revenue-capable at `https://flipflop.alfares.cz/` while preserving checkout-to-first-revenue safety.

## Vision

Customers viewing a product detail page should see relevant additional products and a clear buy-together set below the product card so the storefront can raise average order value without using AI or unsafe price mutation.

## Business Case

Amazon-style recommendations help customers discover complementary products and build a larger basket. The first implementation must be deterministic, explainable, and compatible with current Catalog/Warehouse sellability gates.

## System Boundary

- Product-service owns deterministic recommendation selection.
- Order-service local order history may be read only for frequently-bought-together signals.
- Frontend product detail page owns presentation and add-to-cart actions.
- Cart and checkout continue to own actual customer cart and order totals.
- Warehouse remains stock authority through existing public product offer gates.

## Feature

Add two product-detail upsell sections:

- Related products: deterministic products from the same category first, then other sellable products as fallback.
- Buy-together set: current product plus historically bought-together products when order history exists; otherwise current product plus a fallback related product.

## Acceptance Criteria

- Product detail page renders related products below the main product/card area.
- Product detail page renders one buy-together set below the main product/card area.
- Related products do not include the current product.
- Bundle candidate products come from existing sellable product APIs and retain current product prices.
- Bundle savings are shown in Czech crowns, not as a percentage.
- Bundle savings includes a deterministic 5% merchandise savings preview plus current free-shipping threshold benefit when the bundle reaches or crosses the free-shipping threshold.
- The UI does not say `5%`.
- If there is no purchase history for the product, the bundle still exists by using a deterministic related fallback.
- No AI is used.
- No hidden order total, checkout discount, payment, refund, cancellation, stock, or customer data mutation is introduced.

## Non-Goals

- No AI recommendation model.
- No destructive database migration.
- No mutation of historical orders.
- No change to actual checkout totals until a dedicated bundle-discount contract is implemented and validated.
- No Catalog, Warehouse, payment-provider, auth, or order-status mutation.

## Dependencies

- Existing public product list/detail APIs.
- Existing local `orders` / `order_items` history, if present.
- Existing product detail SSR route.

## Risks

- Actual bundle discount cannot be truthfully applied to orders without changing cart/order pricing contracts.
- Existing repository has unrelated dirty changes, including product detail and frontend components.
- Current legal delivery document has different free-delivery thresholds than the owner request; this goal follows the owner request for the upsell preview threshold and leaves legal copy unchanged.

## Parallel Execution

| Workstream | Status | Owner role | Scope | Allowed files | Forbidden files | Expected output | Validation | Dependencies | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A Backend recommendation contract | ready now | product-service integrator | Add deterministic `GET /products/:id/recommendations` response | `services/product-service/src/products/products.controller.ts`, `services/product-service/src/products/products.service.ts` | checkout, payment, order mutation, schema migrations | Related products and bundle metadata from history/fallback | product-service build, source verifier | none | Orchestrator integrates frontend against response shape |
| B Frontend product detail UI | ready after contract | storefront integrator | Render related products and bundle below product detail | `services/frontend/app/products/[id]/page.tsx`, `services/frontend/lib/api/products.ts`, new client component if needed | Header/search/cart checkout totals | Amazon-style related row and bundle CTA | frontend build, live product page smoke | Workstream A response shape | Use existing AddToCart/guest cart behavior |
| C Validation/doc state | final integration | original thread | Plan, state, verifier, validation report | `implementation-goals/GOAL-12-*`, `docs/IMPLEMENTATION_STATE.md`, `scripts/verify-product-detail-upsell.js`, `package.json` | unrelated docs | Evidence-backed completion report | gates, verifier, builds, production smoke if deployed | A+B complete | Merge order: docs plan, backend, frontend, verifier, validation, deploy |

## Merge Order

1. Save GOAL-12 plan/context/prompt.
2. Add backend deterministic recommendation contract.
3. Add frontend API typing and product-detail rendering.
4. Add narrow source verifier.
5. Run pre-coding and documentation gates, builds, verifier, deployment readiness.
6. Deploy only after source validation passes.
7. Smoke `https://flipflop.alfares.cz/products/<id>`.


## Validation Report

Detailed validation and deployment evidence is saved in `implementation-goals/GOAL-12-product-detail-upsell-recommendations.validation-report.md`.

## Implementation Result

Implemented a public read-only recommendation endpoint, product-detail related-product UI, buy-together bundle UI, and bundle add-to-cart action. The recommendation logic uses confirmed order co-purchase history when available, otherwise deterministic same-category and cross-category sellable-product fallback. No AI, schema migration, checkout total mutation, order mutation, payment mutation, or customer-data exposure was added.
