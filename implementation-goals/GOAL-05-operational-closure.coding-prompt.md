# GOAL 05 Coding Prompt: Operational Closure

You are implementing `GOAL-05-operational-closure` for `flipflop-service`.

## Objective

Produce the final operational handoff: smoke-test evidence, monitoring coverage,
runbook, state update, residual risks, and maintenance recommendations.

## Required Context

Read:

```text
implementation-goals/GOAL-05-operational-closure.md
implementation-goals/GOAL-05-operational-closure.execution-plan.md
implementation-goals/GOAL-05-operational-closure.context-package.md
docs/IMPLEMENTATION_STATE.md
docs/process/OPERATIONAL_GATES.md
docs/process/PROJECT_INVARIANTS.md
```

## Implementation Rules

- Use live checks, but avoid destructive order/payment/refund/cancellation
  mutation.
- Preserve the owner-approved GOAL-02 bypass as residual risk.
- Do not expose secret values.
- Do not auto-publish AI SEO drafts.
- Prefer documentation/runbook updates over new code unless a closure gate
  cannot be met without a small code/config patch.

## Validation

- Final homepage/product API/auth/cart/checkout initiation checks.
- Final stock rejection check.
- Final SEO draft non-publication check.
- Monitoring/logging coverage review.
- Runbook/state files updated.
