# GOAL 01 Coding Prompt: Production Readiness

You are implementing `GOAL-01-production-readiness` for `flipflop-service`.

## Read First

```text
docs/INTENT_MEMORY.md
docs/IMPLEMENTATION_STATE.md
docs/IMPLEMENTATION_ORCHESTRATOR.md
docs/PRODUCTION_READINESS_GOAL.md
implementation-goals/GOAL-01-production-readiness.md
implementation-goals/GOAL-01-production-readiness.execution-plan.md
implementation-goals/GOAL-01-production-readiness.context-package.md
docs/process/OPERATIONAL_GATES.md
```

## Task

Make the smallest code, config, or manifest change needed to move the deployed topology toward:

- storefront served at `/`;
- API gateway served at `/api`;
- product API returning sellable products;
- auth, cart, and checkout initiation smokeable.

## Constraints

- Do not change prices, order totals, discounts, cancellations, refunds, or payment success state without approval.
- Do not overwrite unrelated dirty files.
- Do not fake a successful checkout.
- Preserve shared-service integration boundaries.

## Required Output

- Files changed.
- Validation commands and results.
- Intent Compliance Report.
- Update to `docs/IMPLEMENTATION_STATE.md`.
