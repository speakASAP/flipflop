# GOAL 02 Coding Prompt: Checkout Payments

You are implementing `GOAL-02-checkout-payments` for `flipflop-service`.

## Read First

```text
docs/INTENT_MEMORY.md
docs/IMPLEMENTATION_STATE.md
docs/IMPLEMENTATION_ORCHESTRATOR.md
docs/process/PROJECT_INVARIANTS.md
docs/process/OPERATIONAL_GATES.md
implementation-goals/GOAL-02-checkout-payments.md
implementation-goals/GOAL-02-checkout-payments.execution-plan.md
implementation-goals/GOAL-02-checkout-payments.context-package.md
implementation-goals/GOAL-02-checkout-payments.validation-report.md
```

## Task

Verify and complete provider-specific checkout payment flows after GOAL-01
production topology validation:

- PayU;
- PayPal;
- GP WebPay;
- Stripe.

Start with provider credential and endpoint readiness. Only patch code when the
failure is an integration bug rather than a missing provider secret or sandbox
configuration.

## Constraints

- Do not fake payment success.
- Do not mark a provider complete using only a simulated webhook.
- Do not directly mutate payment status in the database.
- Do not change prices, discounts, order totals, refunds, or cancellations.
- Do not print secret values.
- GP WebPay DESCRIPTION must identify FlipFlop, not another business.
- Preserve unrelated dirty work in the remote repository.

## Required Output

- Files changed.
- Provider-by-provider validation evidence.
- Explicit credential/provider blockers.
- Intent Compliance Report.
- Updated implementation state.
