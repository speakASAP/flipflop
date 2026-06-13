# GOAL 06 Coding Prompt: Orders Hub Integration

Implement the owner-approved FlipFlop server-side integration with central Orders.

Work only in the FlipFlop remote repo. Preserve local checkout behavior. Strengthen the central Orders forwarding path so it explicitly sends `orders.create.v1`, stable `channel=flipflop`, stable `channelAccountId`, stable `externalOrderId`, bounded customer identity, item totals, and order totals. Surface central Orders HTTP 409 as `ORDER_IDEMPOTENCY_CONFLICT` without hiding it or logging sensitive payloads.

Do not change payment provider credential handling, provider webhook status, order cancellation approval, refund behavior, product pricing, warehouse stock authority, or frontend checkout UI. Add deterministic verification for the central Orders payload contract and sensitive-data exclusions. Update the GOAL-06 validation report and `docs/IMPLEMENTATION_STATE.md`.
