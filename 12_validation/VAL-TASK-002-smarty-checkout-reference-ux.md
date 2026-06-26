# Validation: TASK 002 Smarty-Reference Guest Checkout UX

```yaml
id: FF-VAL-TASK-002-SMARTY-CHECKOUT-REFERENCE-UX
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
upstream:
  - ../14_prompts/PROMPT-TASK-002-smarty-checkout-reference-ux.md
downstream:
  - ../implementation-goals/GOAL-09-smarty-checkout-reference-ux.validation-report.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Required Evidence

- IPS gates passed or blockers recorded.
- Build passed for frontend, api-gateway, and order-service.
- Guest checkout smoke reaches payment initiation without mandatory login.
- Authenticated checkout still works.
- Visual QA screenshots prove desktop/mobile cart, delivery/payment, delivery details, and completion pages.
- Magic-link account creation path is validated or explicitly blocked by `[UNKNOWN: auth-microservice magic-link API]`.

## Forbidden Evidence

- Simulated provider webhook as proof of provider success.
- Manual database payment-state update as proof of checkout success.
- Real customer personal data in logs or reports.
