# GOAL 09 Coding Prompt: Smarty-Reference Guest Checkout UX

```yaml
id: FF-GOAL-09-CODING-PROMPT
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
upstream:
  - GOAL-09-smarty-checkout-reference-ux.context-package.md
  - GOAL-09-smarty-checkout-reference-ux.execution-plan.md
downstream:
  - GOAL-09-smarty-checkout-reference-ux.validation-report.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

You are implementing GOAL-09 for `flipflop-service`.

## Objective

Build a Smarty.cz-inspired Czech checkout flow that lets customers buy without registration and optionally create an account by magic link after order submission.

## Mandatory Reference

Read:

```text
docs/reference/smarty-checkout/README.md
docs/reference/smarty-checkout/screenshots/
implementation-goals/GOAL-09-smarty-checkout-reference-ux.md
implementation-goals/GOAL-09-smarty-checkout-reference-ux.execution-plan.md
implementation-goals/GOAL-09-smarty-checkout-reference-ux.context-package.md
```

## Required Behavior

- Guest cart can proceed to checkout without login.
- Existing customers can sign in optionally for prefill.
- Checkout asks for email, phone, first name, last name, invoice address, country, optional different delivery address, optional note, delivery method, expedition timing, payment method, and terms/privacy acceptance.
- Account creation is a checkbox after customer details are entered.
- Checkout must not ask for password or password confirmation.
- If account creation is checked, send or queue a magic-link activation email after order submission.
- Completion page shows payment/provider outcome or payment instructions plus order details and support contacts.

## Architecture Requirement

Before coding, decide and document one backend contract:

1. create/reuse a customer user record and address during guest checkout, with account invitation if requested;
2. add guest order/address/customer fields to order schema;
3. add server-side guest checkout session conversion.

Do not start code changes with unresolved execution-critical `[UNKNOWN: ...]` or `[MISSING: ...]` markers.

## Forbidden

- Mandatory registration before purchase.
- Checkout password fields.
- Fake payment success.
- Fake stock state.
- Fake account activation.
- Price, discount, order total, cancellation, refund, or payment-state mutation without approval/evidence.
- Hiding provider credential/webhook blockers.
- Reverting or overwriting unrelated dirty files.

## Validation

Run at minimum:

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
git diff --check
cd services/frontend && npm run build
cd services/api-gateway && npm run build
cd services/order-service && npm run build
node scripts/smoke-checkout.js
```

Add visual browser QA for:

- desktop cart;
- desktop delivery/payment;
- desktop delivery details;
- desktop completion/payment result;
- mobile checkout summary and form.

## Required Final Report

Report:

- chosen backend contract;
- files changed;
- screenshot elements implemented or dependency-gated;
- validation commands and results;
- remaining blockers;
- Intent Compliance Report;
- next step.
