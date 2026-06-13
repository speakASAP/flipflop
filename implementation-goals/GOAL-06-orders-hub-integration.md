# GOAL 06: Orders Hub Integration

## Outcome

Make FlipFlop the owner-approved first application feeding central Orders from the FlipFlop server-side order-service.

## Dependencies

- Orders `orders.create.v1` contract is deployed and live.
- Orders H6 payment status schema is materialized.
- Orders H7/H8 runtime release is deployed and healthy.
- FlipFlop checkout and payment initiation remain functional.

## Acceptance Criteria

- FlipFlop order-service sends `contractVersion=orders.create.v1`, `channel=flipflop`, stable `channelAccountId`, and stable `externalOrderId` for every central Orders create request.
- Safe retry behavior is deterministic: exact replay is accepted by central Orders, while `ORDER_IDEMPOTENCY_CONFLICT` is surfaced without creating duplicate FlipFlop orders or hiding the conflict.
- FlipFlop does not send raw provider payloads, provider transaction identifiers beyond bounded local payment reference, secrets, card data, tokens, or customer free text to Orders.
- Payment capture, provider webhooks, refunds, cancellations, warehouse stock truth, catalog truth, and customer-facing payment state remain owned by their existing services and gates.
- A targeted verification script proves the FlipFlop-to-Orders payload contract and sensitive-data exclusions.
