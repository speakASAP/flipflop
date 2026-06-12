# GOAL 02: Checkout Payments

## Outcome

Verify and complete PayU, PayPal, GP WebPay, and Stripe checkout flows after production topology is coherent.

## Dependencies

- `GOAL-01-production-readiness` done.
- Provider credential status known.

## Allowed Changes

- Provider-specific payment initiation wiring in FlipFlop order/payment adapter
  code.
- Payment callback/webhook handling needed to consume verified provider results.
- Smoke scripts and validation docs that distinguish real provider evidence
  from simulation.
- Deployment/config documentation for required provider secrets.
- Narrow fixes in payments-microservice provider code when the defect is
  provider-specific and required for FlipFlop checkout.

## Forbidden Changes

- Do not fake payment success.
- Do not mark a provider complete using only a simulated webhook.
- Do not directly update production order payment state in the database.
- Do not mutate prices, discounts, order totals, refunds, or cancellations.
- Do not print or commit credential values.
- Do not remove existing PayU, PayPal, GP WebPay, or Stripe paths.

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
