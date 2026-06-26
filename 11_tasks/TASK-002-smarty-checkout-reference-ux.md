# TASK 002: Smarty-Reference Guest Checkout UX

```yaml
id: FF-TASK-002-SMARTY-CHECKOUT-REFERENCE-UX
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
upstream:
  - ../00_constitution/CONSTITUTION.md
  - ../01_vision/VISION.md
  - ../02_business_case/BUSINESS_CASE.md
  - ../04_systems/SYS-001-commerce-platform.md
  - ../05_subsystems/SUB-001-checkout-revenue-governance.md
  - ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
downstream:
  - ../22_goal_impact/GOAL-IMPACT-TASK-002-smarty-checkout-reference-ux.md
  - ../21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Task

Replace mandatory registration/login before purchase with guest checkout and optional post-order account creation, using the documented Smarty.cz flow as the UX reference.

## Goal Impact

This task improves checkout conversion and preserves the checkout-to-first-revenue intent by removing unnecessary account friction while retaining authenticated account benefits.

## Scope

- Cart-to-checkout UX.
- Delivery/payment/expedition steps.
- Contact/address form.
- Optional login prefill.
- Optional account creation by magic link.
- Completion/payment instruction page.
- Backend/API contract required to support guest orders safely.

## Non-Goals

- Fake payment completion.
- Provider credential verification.
- Price/discount/order-total changes.
- Rental checkout.
- Operator-tip accounting.

## Acceptance Criteria

- Guest customer can buy without registering first.
- Optional account checkbox does not expose password fields.
- Magic-link account activation is triggered after order submission when selected.
- All 13 Smarty reference screenshots are mapped to implementation outcomes.
- Payment, stock, and order safety invariants remain intact.
