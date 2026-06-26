# GOAL IMPACT: TASK 002 Smarty-Reference Guest Checkout UX

```yaml
id: FF-GOAL-IMPACT-TASK-002-SMARTY-CHECKOUT-REFERENCE-UX
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
upstream:
  - ../11_tasks/TASK-002-smarty-checkout-reference-ux.md
  - ../01_vision/VISION.md
  - ../02_business_case/BUSINESS_CASE.md
downstream:
  - ../21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md
  - ../implementation-goals/GOAL-09-smarty-checkout-reference-ux.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Impact Summary

Mandatory registration before payment is a conversion blocker. Guest checkout aligns FlipFlop with common Czech e-commerce expectations and supports the active business goal of checkout-to-first-revenue.

## Positive Impact

- Reduces purchase friction for first-time customers.
- Keeps account creation available without blocking the sale.
- Preserves authenticated account value through optional login and magic-link account activation.
- Improves cart-to-payment UX through a familiar delivery/payment/details stepper and persistent order summary.

## Safety Impact

The change touches order creation, customer identity, delivery address, payment initiation, and stock reservation. Therefore implementation must preserve:

- backend-calculated totals;
- payment provider blocker visibility;
- stock reservation/release behavior;
- central Orders forwarding;
- sensitive-data redaction;
- Czech consumer-law return behavior.

## Blockers

- `[UNKNOWN: auth-microservice magic-link or passwordless account API]`
- `[MISSING: shipping/delivery method source of truth]`
- `[MISSING: legal terms/privacy URLs]`
