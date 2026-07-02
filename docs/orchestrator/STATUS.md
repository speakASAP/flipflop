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
