# GOAL 09: Smarty-Reference Guest Checkout UX

```yaml
id: FF-GOAL-09-SMARTY-CHECKOUT-REFERENCE-UX
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
  - ../11_tasks/TASK-002-smarty-checkout-reference-ux.md
  - ../22_goal_impact/GOAL-IMPACT-TASK-002-smarty-checkout-reference-ux.md
downstream:
  - GOAL-09-smarty-checkout-reference-ux.execution-plan.md
  - GOAL-09-smarty-checkout-reference-ux.context-package.md
  - GOAL-09-smarty-checkout-reference-ux.coding-prompt.md
  - GOAL-09-smarty-checkout-reference-ux.validation-report.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Outcome

Implement a Czech e-commerce checkout experience modeled on the documented Smarty.cz reference, with guest checkout as the default path and optional account creation by post-order magic link.

## Dependencies

- Existing dirty guest-cart changes must be reviewed and either accepted as the baseline or replaced intentionally.
- GOAL-02 provider readiness risks remain visible; this goal must not mark PayU/PayPal/GP WebPay/Stripe webhook readiness verified unless provider evidence exists.
- `[UNKNOWN: auth-microservice magic-link or passwordless account API]`.
- `[MISSING: FlipFlop legal terms/privacy URLs for checkout submit copy]`.
- `[MISSING: shipping/delivery method source of truth]`.
- `[MISSING: service/warranty product contract]`.

## Allowed Changes

- Checkout and cart UX under `services/frontend/app/cart/page.tsx` and `services/frontend/app/checkout/page.tsx`.
- Frontend checkout components and client helpers under `services/frontend/components/` and `services/frontend/lib/`.
- Guest order API surface in `services/api-gateway/src/gateway/`.
- Order DTO/controller/service changes under `services/order-service/src/orders/`.
- Narrow Prisma schema and migration changes only if the selected backend contract requires guest order/customer fields.
- User/auth integration only for optional account creation by magic link, without password fields in checkout.
- Documentation and validation artifacts for the Smarty reference and GOAL-09.

## Forbidden Changes

- Do not require registration before checkout.
- Do not add password or password-confirmation fields to checkout.
- Do not fake payment success, webhook success, stock state, order status, or account activation.
- Do not mutate prices, discounts, refunds, cancellations, or customer-facing payment state without explicit approval or verified provider/system evidence.
- Do not hide provider credential/webhook blockers.
- Do not overwrite existing dirty work without first classifying ownership and intent.
- Do not copy proprietary Smarty assets or fonts unless licensing is verified.

## Acceptance Criteria

- Guest customer can go from cart to checkout without being redirected to login.
- Checkout offers optional sign-in for prefill and optional account creation after entering contact/address data.
- Account creation checkbox triggers post-order magic-link invitation, not password entry in checkout.
- Checkout collects contact data, invoice address, optional different delivery address, note, delivery method, expedition timing, payment method, and terms/privacy acceptance.
- Delivery/payment step validates missing selections inline like the Smarty reference.
- Right-side order summary remains visible on desktop and collapses cleanly on mobile.
- Cart, checkout, and completion screens map to all 13 documented Smarty screenshots or explicitly mark dependency-gated gaps.
- Order creation preserves existing payment, stock, totals, central Orders forwarding, and notification safety constraints.
- Validation evidence includes frontend build, affected service builds, `git diff --check`, and a guest checkout smoke path.

## Validation Commands

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
git diff --check
cd services/frontend && npm run build
cd services/api-gateway && npm run build
cd services/order-service && npm run build
node scripts/smoke-checkout.js
```

After owner-approved deployment:

```bash
./scripts/deploy.sh
```

## Current Checkpoint

Planning only. Reference screenshots are present under `docs/reference/smarty-checkout/screenshots/`. No GOAL-09 code implementation has started in this planning pass.
