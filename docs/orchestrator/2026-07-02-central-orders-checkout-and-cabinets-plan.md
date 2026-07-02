# FlipFlop Central Orders Checkout and Cabinets Plan

Date: 2026-07-02
Parent plan: `orders-microservice/docs/orchestrator/2026-07-02-order-lifecycle-warehouse-status-rollout-plan.md`

## Objective

FlipFlop must use central Orders as the authoritative order lifecycle and must show canonical lifecycle state in customer and admin cabinets.

## Current Evidence

- Customer order list/detail pages exist.
- Admin order list/detail pages exist.
- Local order service currently reserves Warehouse and forwards to Orders.
- Current evidence shows payments can be created with local order numbers, which prevents the Payments bridge from reporting to central Orders.
- Local payment success currently performs Warehouse stock actions, which risks duplication after central Orders fulfillment is active.

## Workstream

Owner role: FlipFlop checkout and frontend owner
Status: ready now, high priority

Allowed files:

- `services/order-service/**`
- `shared/clients/**`
- `services/frontend/app/orders/**`
- `services/frontend/app/admin/orders/**`
- `services/frontend/lib/api/orders.ts`
- FlipFlop docs, tests, validation reports

Forbidden files:

- unrelated product recommendation, catalog-source, and landing work currently dirty in this repo

## Required Work

1. Create central Orders before creating payment for sellable checkout.
2. Pass central Orders UUID to Payments.
3. Keep local order only as a channel read model/reference when central Orders is accepted.
4. Remove or guard duplicate local Warehouse decrement/unreserve on central-owned payment success.
5. Render central lifecycle stage, item totals, shipping cost, total, currency, and delivery address in customer order pages.
6. Render central lifecycle, payment, delivery, and exception status in admin order pages.
7. Add explicit failure state when central Orders creation fails; do not proceed to payment for sellable order.

## Validation

- unavailable stock blocks checkout before payment
- available checkout creates central Orders id
- payment completed updates central Orders and triggers Warehouse handoff
- customer `/orders` and order detail show central lifecycle
- admin order pages show lifecycle and actionable failures
