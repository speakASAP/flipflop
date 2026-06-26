# Coding Prompt: TASK 002 Smarty-Reference Guest Checkout UX

```yaml
id: FF-PROMPT-TASK-002-SMARTY-CHECKOUT-REFERENCE-UX
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
upstream:
  - ../13_context_packages/CP-TASK-002-smarty-checkout-reference-ux.md
downstream:
  - ../12_validation/VAL-TASK-002-smarty-checkout-reference-ux.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

Implement TASK-002 by following GOAL-09. Preserve guest checkout, optional account creation by magic link, and Smarty reference UX. Do not add password fields to checkout. Do not fake payment or stock state. Do not change price/order totals/refunds/cancellations without approval.

Use `implementation-goals/GOAL-09-smarty-checkout-reference-ux.coding-prompt.md` as the expanded prompt.
