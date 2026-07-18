# GOAL-IMPACT-TASK-002: Smarty-Reference Guest Checkout UX

```yaml
id: GOAL-IMPACT-TASK-002
artifact_type: task
artifact_id: TASK-002
artifact_path: ../11_tasks/TASK-002-smarty-checkout-reference-ux.md
primary_goal: ../GOALS.md
secondary_goals:
  - ../implementation-goals/GOAL-09-smarty-checkout-reference-ux.md
impact_level: high
impact_description: Removes mandatory registration from checkout while preserving checkout-to-first-revenue, payment safety, and account lifecycle intent.
success_metric: Guest customer can create an order and initiate payment without login, while optional account creation uses magic link after order submission.
upstream_links:
  - ../01_vision/VISION.md
  - ../02_business_case/BUSINESS_CASE.md
  - ../docs/reference/smarty-checkout/README.md
downstream_links:
  - ../21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md
validation_method: Build checks, smoke checks, visual QA, and IPS gates.
status: draft
```

## Explanation

Mandatory registration before payment is a conversion blocker for a Czech e-commerce storefront. This task aligns FlipFlop with the documented Smarty.cz purchase pattern: sign-in is optional, guest purchase is allowed, and account creation is a checkbox-driven follow-up rather than a prerequisite.

## Evidence

- Owner request on 2026-06-26.
- `docs/reference/smarty-checkout/README.md`.
- 13 reference screenshots under `docs/reference/smarty-checkout/screenshots/`.
- Current checkout code still redirects guests to `/login?redirect=/checkout`.
- Current backend order/cart/address contracts are account-bound.

## Validation

Run `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`, `python3 scripts/pre_coding_gate.py --root .`, service builds, and guest checkout smoke before claiming implementation completion.
