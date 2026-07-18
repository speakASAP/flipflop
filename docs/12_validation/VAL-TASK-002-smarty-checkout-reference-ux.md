# VAL-TASK-002: Smarty-Reference Guest Checkout UX

```yaml
id: VAL-TASK-002
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
upstream:
  - ../11_tasks/TASK-002-smarty-checkout-reference-ux.md
downstream:
  - ../docs/IMPLEMENTATION_STATE.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Summary

Validation report placeholder for the Smarty-reference guest checkout task.

## Upstream goal

`TASK-002` preserves checkout-to-first-revenue intent by removing mandatory registration before purchase while keeping optional account creation and payment safety intact.

## Criteria checked

- Guest checkout can proceed without login.
- Optional login prefill remains available.
- Optional account creation uses magic link, not checkout password fields.
- Smarty reference screenshot matrix is implemented or dependency-gated.
- Payment, stock, order total, and provider-blocker safety rules are preserved.
- Authenticated checkout regression passes.

## Issues found

Current planning issues:

- The auth-microservice magic-link or passwordless account API has not been verified yet.
- The checkout legal terms and privacy policy URLs have not been located yet.
- The shipping and delivery method source of truth has not been selected yet.
- Existing dirty checkout and cart source changes need ownership classification before implementation continues.

## Recommendation

Do not start coding until the backend guest-order contract is selected and IPS gates pass. After implementation, run builds, smoke checks, and visual QA before marking the task complete.

## Traceability confirmation

Validation maps to `docs/11_tasks/TASK-002-smarty-checkout-reference-ux.md`, `docs/21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md`, `docs/22_goal_impact/GOAL-IMPACT-TASK-002-smarty-checkout-reference-ux.md`, and `implementation-goals/GOAL-09-smarty-checkout-reference-ux.validation-report.md`.
