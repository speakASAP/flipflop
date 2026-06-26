# GOAL 09 Context Package: Smarty-Reference Guest Checkout UX

```yaml
id: FF-GOAL-09-CONTEXT-PACKAGE
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
upstream:
  - GOAL-09-smarty-checkout-reference-ux.md
  - GOAL-09-smarty-checkout-reference-ux.execution-plan.md
downstream:
  - GOAL-09-smarty-checkout-reference-ux.coding-prompt.md
  - GOAL-09-smarty-checkout-reference-ux.validation-report.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Read First

```text
00_constitution/CONSTITUTION.md
01_vision/VISION.md
02_business_case/BUSINESS_CASE.md
SPEC.md
docs/INTENT_MEMORY.md
docs/reference/smarty-checkout/README.md
implementation-goals/GOAL-09-smarty-checkout-reference-ux.md
implementation-goals/GOAL-09-smarty-checkout-reference-ux.execution-plan.md
```

## Current Evidence

- `https://flipflop.alfares.cz/cart` returned HTTP 200 on 2026-06-26.
- Direct unauthenticated `curl -I` to the Smarty reference URL returned HTTP 403 via Cloudflare on 2026-06-26.
- The attached browser screenshots are stored in `docs/reference/smarty-checkout/screenshots/`.
- Current remote worktree is dirty on `main` at `0a29903 Fix guest cart add-to-cart flow`.
- Existing dirty files overlap the implementation scope:
  - `services/cart-service/src/cart/cart.service.ts`
  - `services/frontend/app/cart/page.tsx`
  - `services/frontend/app/checkout/page.tsx`
  - `services/frontend/components/AddToCartButton.tsx`
  - `services/frontend/lib/api/client.ts`
  - `services/frontend/lib/guest-cart.ts`
  - `reports/validation/ips-deployment-readiness-gate.json`
  - `reports/validation/ips-pre-coding-gate.json`
  - `docs/reference/`

## Current Flow

- Guest add-to-cart appears partially implemented in dirty frontend files using `localStorage`.
- `/checkout` still redirects unauthenticated users to `/login?redirect=/checkout`.
- Authenticated checkout loads `/api/cart` and `/api/users/addresses`.
- Order creation calls `/api/orders`, then the frontend attempts a separate `/api/payu/create-payment/:orderId` call.
- Backend order creation currently creates payment immediately and returns payment redirect data, so frontend/API response types need reconciliation.

## Backend Constraints

- `services/api-gateway/src/gateway/gateway.controller.ts` guards `/api/orders*`, `/api/cart*`, `/api/payu/*`, and `/api/users/*` with `JwtAuthGuard`.
- `services/order-service/src/orders/orders.controller.ts` uses `GatewayUserGuard`.
- `services/order-service/src/orders/orders.service.ts` creates orders from database cart items by `userId`.
- `prisma/schema.prisma` requires:
  - `User.password`
  - `CartItem.userId`
  - `DeliveryAddress.userId`
  - `Order.userId`
  - `Order.deliveryAddressId`
- No guest order/session or magic-link token schema was found in this repo.

## Required UX Reference

Use `docs/reference/smarty-checkout/README.md` as the element inventory. Every screenshot must map to either:

- implemented behavior,
- dependency-gated behavior with explicit `[MISSING: ...]`,
- or explicitly out-of-scope behavior with rationale.

## Open Facts

- `[UNKNOWN: auth-microservice magic-link or passwordless account API]`
- `[MISSING: legal terms URL]`
- `[MISSING: privacy policy URL]`
- `[MISSING: shipping/delivery method source of truth]`
- `[MISSING: expedition date source of truth]`
- `[MISSING: service/warranty product contract]`
- `[UNKNOWN: exact Smarty font family and license]`

## Safety Rules

- Do not create fake paid state.
- Do not directly update payment status.
- Do not change product prices, discounts, order totals, cancellations, or refunds.
- Do not expose secrets or real customer data.
- Do not force registration.
- Do not add checkout password fields.
- Do not overwrite existing dirty work.

## Recommended First Implementation Slice

1. Resolve the backend guest-order contract.
2. Remove unauthenticated `/checkout` login redirect only after guest cart and backend order path can safely load.
3. Implement guest contact/address form and summary using local cart data.
4. Add public guest order endpoint or account-invitation path.
5. Validate one synthetic unpaid/pending payment initiation path without faking payment success.
