# GOAL 06 Context Package: Orders Hub Integration

## Required Context

- Owner approval: FlipFlop is the specific application to feed central Orders, and work belongs on the FlipFlop server-service side.
- Orders contract: central Orders accepts `orders.create.v1` and owns canonical order lifecycle events.
- FlipFlop local boundary: checkout creates a local pending order, initiates payment through payments-microservice, reserves stock through warehouse-service, then forwards bounded order data to central Orders.
- Existing local risk: payment provider credential/webhook completion remains owner-bypassed manual follow-up and must stay visible.

## Key Invariants

- Do not modify product prices, discounts, totals, cancellations, refunds, or payment state without human approval or verified provider/system evidence.
- Do not mark provider webhook readiness complete.
- Do not send secrets, card data, raw provider payloads, or customer free text to central Orders.
- Orders receives sales-channel order data; Payments remains payment identity/reconciliation owner; Warehouse remains stock truth; Catalog remains product truth.

## Expected Code Shape

- `shared/clients/order-client.service.ts` remains the central Orders HTTP client.
- `services/order-service/src/orders/orders.service.ts` remains the local order creation owner and calls the central Orders client after local order/payment setup.
- Verification should be scriptable and deterministic without live customer data.
