# GOAL 02: Checkout Payments

## Outcome

Verify and complete PayU, PayPal, GP WebPay, and Stripe checkout flows after production topology is coherent.

## Dependencies

- `GOAL-01-production-readiness` done.
- Provider credential status known.

## Acceptance Criteria

- Each provider can initiate payment.
- Verified webhook or sandbox callback updates order payment state.
- Stock is deducted on success and released on failure or cancellation.
- Confirmation email is sent on success.
- Blocked providers have explicit credential or provider-environment blocker notes.

## Constraints

- No fake payment success.
- No real order cancellation or refund without owner approval.
- GP WebPay description must identify FlipFlop, not another business.
