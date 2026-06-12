# GOAL 05 Context Package: Operational Closure

## Read First

- `implementation-goals/GOAL-05-operational-closure.md`
- `implementation-goals/GOAL-05-operational-closure.execution-plan.md`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/process/OPERATIONAL_GATES.md`
- `docs/process/PROJECT_INVARIANTS.md`
- prior validation reports for GOAL-01 through GOAL-04

## Current Production State

- FlipFlop storefront is live at `https://flipflop.alfares.cz/`.
- GOAL-01 is done.
- GOAL-02 is blocked with owner-approved bypass for remaining provider
  credentials/webhooks.
- GOAL-03 is done.
- GOAL-04 is done; priority AI SEO drafts exist but are draft-only pending
  human review.

## Must Preserve

- Do not mark PayU, PayPal, GP WebPay, or Stripe webhook completion verified
  unless the owner provides/configures the missing provider pieces.
- Do not publish AI drafts automatically.
- Do not mutate orders, payment states, refunds, cancellations, prices, or
  stock during closure checks.
- Do not print secrets.

## Evidence Needed

- Final smoke command output summary.
- Monitoring/logging coverage notes for homepage, product API, checkout
  failures, empty catalog, and stock reservation failures.
- Updated runbook/handoff file paths.
- Final active/closed goal status.
