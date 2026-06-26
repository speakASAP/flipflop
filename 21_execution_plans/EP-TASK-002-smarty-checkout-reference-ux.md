# Execution Plan: TASK 002 Smarty-Reference Guest Checkout UX

```yaml
id: FF-EP-TASK-002-SMARTY-CHECKOUT-REFERENCE-UX
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
upstream:
  - ../11_tasks/TASK-002-smarty-checkout-reference-ux.md
  - ../22_goal_impact/GOAL-IMPACT-TASK-002-smarty-checkout-reference-ux.md
downstream:
  - ../13_context_packages/CP-TASK-002-smarty-checkout-reference-ux.md
  - ../14_prompts/PROMPT-TASK-002-smarty-checkout-reference-ux.md
  - ../12_validation/VAL-TASK-002-smarty-checkout-reference-ux.md
  - ../implementation-goals/GOAL-09-smarty-checkout-reference-ux.execution-plan.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Plan

1. Preserve the Smarty reference in `docs/reference/smarty-checkout/`.
2. Classify existing dirty guest-cart changes.
3. Confirm account magic-link capability.
4. Choose guest order backend contract.
5. Implement frontend checkout steps.
6. Implement backend guest order/account invitation path.
7. Validate guest and authenticated checkout.
8. Update state and validation report.

## Gate Requirements

- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `git diff --check`

## Parallel Execution

Work may split into documentation, backend contract discovery, frontend UX, backend API, and validation streams only after file ownership is explicit. Frontend and backend implementation must not both edit API DTO/type contracts at the same time without integration-owner sequencing.
