# Orchestrator Status

## 2026-07-02 - F1 Central Orders Checkout And Cabinets

Status: implemented in current source, validated on remote `alfares`, not deployed, not pushed by this worker.

Plan: `docs/orchestrator/2026-07-02-central-orders-checkout-and-cabinets-plan.md`

Evidence:

- Central Orders is accepted before sellable payment creation.
- Payments receives the central Orders UUID as order id plus local FlipFlop identifiers in metadata.
- Central-owned payment success skips duplicate local Warehouse decrement/unreserve.
- Customer `/orders`, order detail, admin order list, and admin order detail render central lifecycle, payment/delivery/exception status, item totals, shipping, total, currency, delivery address, and explicit stale/error states.
- `shared/clients/order-client.service.ts` contains `[MISSING: Orders lifecycle read endpoint]` placeholder behavior for compatibility until central lifecycle reads are available.

Validation:

- `cd shared && npm run build` passed.
- `cd services/order-service && npm run build` passed.
- `cd services/frontend && npm run build` passed.
- `npm run verify:orders-hub-integration` passed.
- `python3 scripts/pre_coding_gate.py --root .` passed.
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed 100/100.
- `npm run verify:guest-checkout-ui` failed because live `https://flipflop.alfares.cz/cart` returned HTTP 503.

Blockers:

- `[MISSING: Orders lifecycle read endpoint]` until central Orders ships or confirms a lifecycle read endpoint.
- Live `/cart` HTTP 503 blocks end-to-end production smoke without deployment.
- Concurrent unrelated staged checkout/bundle and validation-report changes must be preserved and coordinated before commit/push.

Next action: integrate the central Orders lifecycle read endpoint and rerun live checkout/cabinet smoke once `/cart` is healthy.

## 2026-07-02 - F1 Admin Dashboard Order Visibility Addendum

Status: implemented on branch `codex/orders-lifecycle-cabinet-flipflop`, validated, not deployed.

Evidence:

- Admin dashboard recent orders now call `ordersApi.getAdminOrders({ page: 1, limit: 5 })` instead of customer-scoped `ordersApi.getOrders()`.
- Customer cabinet list/detail routes remain user-scoped through `OrdersService.getUserOrders(userId)` and `OrdersService.getOrder(userId, id)`.
- Existing admin order list/detail pages continue to render central lifecycle, payment, delivery, exception status, totals, currency, address, and stale/error notices.
- `scripts/verify-orders-hub-integration.js` now fails if the admin dashboard regresses to the customer order list helper.

Validation:

- `python3 scripts/pre_coding_gate.py --root .` passed.
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed 100/100.
- `npm run verify:orders-hub-integration` passed.
- `cd services/frontend && npm run build` passed.
- `git diff --check` passed.

Blockers:

- `[MISSING: Orders lifecycle read endpoint]` until central Orders ships or confirms a stable lifecycle read endpoint.
- Live `/cart` HTTP 503 remains a blocker for live checkout/cabinet smoke from prior F1 evidence; no deploy or live mutation was run here.

Next action: integrate the central Orders lifecycle read endpoint and rerun live checkout/cabinet smoke once `/cart` is healthy.


## 2026-07-03 - Catalog Bundle Candidates In Product Recommendations

Status: implemented, pushed, deployed to `flipflop-product-service`, and validated with runtime smoke.

Intent Preservation Chain:

- Vision: FlipFlop buy-together presentation should use ecosystem purchase-derived product relationships when Catalog has them, while keeping checkout and discount authority outside Catalog.
- Goal Impact: Product detail recommendations now prefer Catalog bundle candidates derived from real order affinity before local fallback bundles.
- System: Catalog exposes read-only `bundle-candidates`; FlipFlop product-service maps Catalog candidates to local sellable products; frontend renders existing buy-together UI; Orders/Payments/Warehouse remain final authorities for order totals, payment, and stock.
- Feature: Catalog bundle-candidate consumption in FlipFlop recommendations.
- Task: Add Catalog client support for `GET /api/products/:catalogProductId/bundle-candidates`, prefer mapped candidate products in `GET /api/products/:id/recommendations`, deploy product-service only, and validate public route behavior.
- Execution Plan: Modify shared Catalog client and product-service recommendation path only; keep frontend contract compatible; no DB migration, no product seed mutation, no checkout/payment/warehouse mutation.
- Coding Prompt: Prefer Catalog bundle candidates when mapped local products exist; otherwise keep deterministic fallback and mark missing data coverage instead of inventing relations.
- Code: `shared/clients/catalog-client.service.ts`, `services/product-service/src/products/products.service.ts`, and `scripts/verify-product-detail-upsell.js` in commits `7dc9a33` and `27b1eb9`.
- Validation: `npm run verify:product-detail-upsell` passed 26 checks; `npm run verify:product-detail-bundle-discount` passed; public recommendations smoke returned `success=true` after deploy.

Deployment evidence:

- Built and pushed `localhost:5000/flipflop-product-service:27b1eb9` from remote repo `/home/ssf/Documents/Github/flipflop`.
- Updated only Kubernetes deployment `flipflop-product-service` in namespace `statex-apps` to immutable image `localhost:5000/flipflop-product-service:27b1eb9`.
- Rollout completed successfully; new pod `flipflop-product-service-6fb9464c87-zkvkl` became `1/1 Running` with zero restarts.
- Startup logs showed Nest boot, Prisma connected, and `/products/:id/recommendations` route mapped.

Runtime smoke evidence:

- Public `GET https://flipflop.alfares.cz/api/products?limit=30` returned active products with Catalog product IDs.
- Public `GET https://flipflop.alfares.cz/api/products/ffb4883f-ec48-4745-8147-b836f3fb2b88/recommendations` returned `success=true`, `bundleSource=related_fallback`, `bundleProductCount=3`, `bundlePrice=2847`, `totalSavings=239`.
- Catalog protected spot-check for sampled active FlipFlop Catalog IDs returned HTTP 200 with `count=0`, so fallback behavior is expected for current storefront data.

Remaining blockers:

- `[MISSING: active FlipFlop products mapped to Catalog products that currently have order_affinity bundle candidates]`.
- `[MISSING: sufficient order_affinity backfill volume for live storefront products]`.
- `[MISSING: approved bundle checkout contract owned by FlipFlop/Orders/Payments]` for future server-authoritative bundle pricing beyond current display/intent flow.


## 2026-07-03 - Live Catalog Order-Affinity Recommendation Smoke

Status: live recommendations now use Catalog-owned `order_affinity` for an active FlipFlop mapped product pair.

Intent Preservation Chain:

- Vision: Buy-together presentation should prefer ecosystem purchase-affinity data when Catalog has it for active sellable products.
- Goal Impact: Product detail recommendations now have a live positive smoke for Catalog relation consumption instead of only fallback behavior.
- System: Catalog owns relation and price facts; FlipFlop product-service maps Catalog IDs to active local products and returns the existing public recommendations contract; Orders/Payments/Warehouse remain unchanged.
- Feature: Live Catalog order-affinity smoke for buy-together recommendations.
- Task: Validate the controlled Catalog relation backfill through public FlipFlop recommendations for both products in the pair.
- Execution Plan: No FlipFlop code or database mutation; call public recommendations routes and run existing static verifiers.
- Coding Prompt: Assert current public source values exactly: `bundle.source=catalog_order_affinity` and `policy.source=catalog_order_affinity_then_purchase_history_then_category_fallback`.
- Code: no source changes in this lane; documentation evidence in this status entry.
- Validation: public recommendations smoke passed for both products; `npm run verify:product-detail-upsell` and `npm run verify:product-detail-bundle-discount` passed.

Runtime smoke evidence:

- `GET https://flipflop.alfares.cz/api/products/ffb4883f-ec48-4745-8147-b836f3fb2b88/recommendations` returned `success=true`, `catalogProductId=ce4a51aa-2d12-4ab7-a965-7a36609d01fc`, `bundle.source=catalog_order_affinity`, `policy.source=catalog_order_affinity_then_purchase_history_then_category_fallback`, `bundleProductCount=2`, `bundlePrice=1898`, `totalSavings=189`.
- The bundle products were the active local mapped pair `ffb4883f-ec48-4745-8147-b836f3fb2b88` / `ce4a51aa-2d12-4ab7-a965-7a36609d01fc` and `038aff5a-6591-409f-8bcb-fade3e8c5c7c` / `dbc51dde-fc66-4511-b178-f929183f4647`.
- Reciprocal smoke for `038aff5a-6591-409f-8bcb-fade3e8c5c7c` returned `success=true`, `bundle.source=catalog_order_affinity`, `policy.source=catalog_order_affinity_then_purchase_history_then_category_fallback`, and the same two mapped local products.

Validation commands:

- `npm run verify:product-detail-upsell` passed 26 checks.
- `npm run verify:product-detail-bundle-discount` passed.

Remaining blockers:

- `[MISSING: automated order-affinity backfill/replay over historical Orders events]`.
- `[MISSING: broad order_affinity coverage for more live storefront products]`.
- `[MISSING: approved bundle checkout contract owned by FlipFlop/Orders/Payments]` for future server-authoritative bundle pricing beyond current display/intent flow.

## 2026-07-03 - Holiday Discount Quote Canary V2

Status: implemented, pushed, deployed, and validated with non-mutating public quote smoke.

Intent Preservation Chain:

- Vision: Holiday Discount business-process changes should be testable end to end without creating orders, payments, reservations, or customer records.
- Goal Impact: FlipFlop can now verify BPCP/Catalog discount eligibility through a public quote endpoint before enabling paid checkout behavior.
- System: BPCP publishes active process version 2, Catalog projects discount eligibility facts, and FlipFlop order-service calculates a quote without side effects.
- Feature: Non-mutating Holiday Discount guest quote path.
- Task: Add `POST /orders/guest/quote` in order-service, proxy it as `POST /api/orders/guest/quote`, make the Holiday process version configurable, deploy, and validate canary/non-canary behavior.
- Execution Plan: Reuse the existing guest checkout item/total/discount calculation path, skip user/address/order/payment/stock writes, return `sideEffects: []`, and keep the code fail-closed when Catalog facts are missing or ineligible.
- Coding Prompt: Do not create production orders or payments during validation; preserve unresolved runtime contracts as `[MISSING: ...]`.
- Code: commit `4543385 feat: add non-mutating holiday discount quote`.
- Validation: static verifier, order-service build, gateway build, public quote smoke, deploy rollout status, and database side-effect check passed.

Deployment evidence:

- `./scripts/deploy.sh 4543385` built and pushed all FlipFlop images. The script timed out while waiting for rollout completion, but follow-up Kubernetes checks showed all six FlipFlop deployments at ready/updated/available `1/1` with observed generation current.
- Runtime pod evidence: `flipflop-order-service-95c7f6d7-2bbb5` mapped `/orders/guest/quote`, had `FLIPFLOP_HOLIDAY_DISCOUNT_PROCESS_VERSION=2`, and returned `/health` 200.
- Branch cleanup evidence: local branches are `main`; remote branches are `origin/main`.

Runtime smoke evidence:

- Canary product quote: `POST https://flipflop.alfares.cz/api/orders/guest/quote` for local product `ffb4883f-ec48-4745-8147-b836f3fb2b88` / Catalog product `ce4a51aa-2d12-4ab7-a965-7a36609d01fc` returned HTTP 200, `schemaVersion=flipflop.checkout-quote.v1`, `sideEffects=[]`, `holidayDiscount.processVersion=2`, `holidayDiscount.applied=true`, `discount=99.9`, and line blockers `[]`.
- Non-canary product quote: `POST https://flipflop.alfares.cz/api/orders/guest/quote` for local product `038aff5a-6591-409f-8bcb-fade3e8c5c7c` / Catalog product `dbc51dde-fc66-4511-b178-f929183f4647` returned HTTP 200, `sideEffects=[]`, `holidayDiscount.processVersion=2`, `holidayDiscount.applied=false`, `discount=0`, and reason `PRODUCT_NOT_IN_HOLIDAY_ELIGIBILITY_SET`.
- Database side-effect check for the quote smoke emails returned `users=0` and `orders=0`.

Validation commands:

- `node scripts/verify-holiday-discount-quote.js` passed.
- `cd services/order-service && npm run build` passed.
- `cd services/api-gateway && npm run build` passed.
- `git diff --check` passed before commit.
- `kubectl get deploy -n statex-apps` confirmed all FlipFlop deployments ready after deploy.
- Public quote smoke confirmed canary `applied=true` and non-canary `applied=false` without database writes.

Remaining blockers:

- `[MISSING: final paid checkout rollout decision for applying Holiday Discount to order creation]`.
- `[MISSING: final orders.applied-discounts.v1 snapshot field contract in orders.create.v1]`.
- `[MISSING: notification template provider contract for Holiday Discount post-purchase messages]`.
