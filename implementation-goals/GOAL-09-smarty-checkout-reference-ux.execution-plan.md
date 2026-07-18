# GOAL 09 Execution Plan: Smarty-Reference Guest Checkout UX

```yaml
id: FF-GOAL-09-EXECUTION-PLAN
status: draft
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
upstream:
  - GOAL-09-smarty-checkout-reference-ux.md
  - ../21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md
downstream:
  - GOAL-09-smarty-checkout-reference-ux.context-package.md
  - GOAL-09-smarty-checkout-reference-ux.coding-prompt.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Intent Bundle

```json
{
  "goal": {
    "title": "Smarty-reference guest checkout UX",
    "intent": "Let FlipFlop customers buy without mandatory registration while offering optional account creation by post-order magic link.",
    "success_criteria": [
      "Guest checkout reaches order/payment initiation without login redirect",
      "Login remains optional and prefill-oriented",
      "Account creation is a checkbox with magic-link follow-up, not checkout password entry",
      "Delivery, payment, expedition, address, note, terms, and completion UI are implemented from the Smarty reference",
      "Payment, stock, order total, and provider-blocker safety rules remain intact"
    ],
    "constraints": [
      "no fake payment/provider/webhook success",
      "no price, discount, refund, cancellation, or payment-state mutation without approval/evidence",
      "do not overwrite existing dirty guest-cart work",
      "do not copy unlicensed Smarty assets",
      "preserve Czech consumer-law behavior"
    ],
    "non_goals": [
      "new payment-provider verification",
      "new rental business model",
      "operator tip accounting",
      "publishing AI-generated content",
      "deploying without owner approval"
    ]
  },
  "why_this_task_exists": "The current FlipFlop checkout forces unauthenticated customers into login/registration before purchase, which blocks normal Czech e-commerce guest purchase behavior and reduces checkout-to-first-revenue conversion.",
  "upstream_traceability": [
    "docs/00_constitution/CONSTITUTION.md",
    "docs/01_vision/VISION.md",
    "docs/02_business_case/BUSINESS_CASE.md",
    "SPEC.md Module 2 and Module 3",
    "docs/reference/smarty-checkout/README.md",
    "docs/11_tasks/TASK-002-smarty-checkout-reference-ux.md",
    "docs/22_goal_impact/GOAL-IMPACT-TASK-002-smarty-checkout-reference-ux.md"
  ],
  "approved_execution_plan_ref": "implementation-goals/GOAL-09-smarty-checkout-reference-ux.execution-plan.md",
  "context_package_ref": "implementation-goals/GOAL-09-smarty-checkout-reference-ux.context-package.md",
  "coding_prompt_ref": "implementation-goals/GOAL-09-smarty-checkout-reference-ux.coding-prompt.md",
  "relevant_decisions": [
    "Guest checkout is required; mandatory account registration is not acceptable.",
    "Optional account creation happens after customer data entry and uses a magic link, not a password form in checkout.",
    "Smarty.cz is the UX reference for the cart-to-payment flow and should be documented with screenshots."
  ],
  "acceptance_criteria": [
    "No unauthenticated checkout redirect to /login",
    "Guest data can create an order/payment flow safely",
    "Existing-account login prompt remains optional",
    "Account checkbox creates or requests a pending account invitation by email",
    "Every screenshot reference has a mapped implementation outcome or explicit dependency-gated gap"
  ],
  "validation_criteria": [
    "IPS gates pass or blockers are recorded",
    "frontend build passes",
    "affected Nest service builds pass",
    "guest checkout smoke covers cart to payment initiation",
    "authenticated checkout regression smoke still passes",
    "visual QA covers desktop and mobile checkout summary/layout"
  ],
  "project_memory": {
    "current_state": "Dirty source changes already add localStorage guest cart support, but checkout still redirects guests to login and backend order creation remains account-bound.",
    "important_files": [
      "services/frontend/app/cart/page.tsx",
      "services/frontend/app/checkout/page.tsx",
      "services/frontend/lib/guest-cart.ts",
      "services/frontend/lib/api/orders.ts",
      "services/api-gateway/src/gateway/gateway.controller.ts",
      "services/order-service/src/orders/orders.controller.ts",
      "services/order-service/src/orders/orders.service.ts",
      "services/order-service/src/orders/dto/create-order.dto.ts",
      "prisma/schema.prisma",
      "docs/reference/smarty-checkout/README.md"
    ],
    "known_risks": [
      "Current Prisma schema requires userId and deliveryAddressId on orders",
      "API gateway guards order/payment routes with JWT",
      "Auth magic-link contract is unknown in this repo",
      "Payment-provider credential/webhook gaps remain outside this goal",
      "Existing dirty work overlaps implementation files"
    ]
  }
}
```

## Architecture Decision To Make First

Guest checkout is not only a frontend route change. Pick one backend contract before coding:

1. Preferred low-schema path: create or reuse a FlipFlop customer/user record from guest checkout data, create delivery address, place order as that user, and optionally send account activation magic link. This requires an auth/passwordless account contract or a local pending-account invitation contract.
2. Guest order schema path: allow `Order` and `DeliveryAddress` to carry guest customer fields without `userId`. This requires Prisma schema migration and careful admin/order history updates.
3. Guest checkout session path: persist server-side checkout session/cart, convert it to user/order at payment initiation. This is more correct for Redis-session design but larger.

Initial recommendation: implement option 1 if `auth-microservice` can create passwordless or invited accounts; otherwise implement option 2 with explicit guest customer fields and a later conversion path.

## Sequential Steps

1. Freeze and classify dirty work.
   - Record current dirty files.
   - Decide whether the existing guest-cart changes are the accepted baseline.
   - Do not overwrite them.
2. Verify external contracts.
   - Inspect `auth-microservice` for magic-link/passwordless invitation API.
   - Locate legal terms/privacy URLs.
   - Locate delivery/shipping method source of truth.
   - Locate support contact values and chat status.
3. Finalize backend guest-order contract.
   - Choose option 1, 2, or 3 above.
   - Document schema/API impact.
   - Add migration only if needed.
4. Implement checkout frontend shell.
   - Three-step progress indicator.
   - Cart summary and sticky right summary.
   - Delivery/payment selection with validation.
   - Expedition date/different-day option.
   - Contact/address form with optional login prompt.
   - Account creation checkbox with magic-link copy and no password fields.
5. Implement API/backend contract.
   - Public guest order endpoint or authenticated/guest split.
   - Server-side validation for contact/address/delivery/payment.
   - Preserve price snapshots and backend total calculation.
   - Preserve stock reservation and payment initiation flow.
   - Preserve central Orders forwarding metadata.
6. Implement completion page behavior.
   - Payment instruction/redirect result.
   - Order detail panel.
   - Support/contact panel.
   - Account magic-link confirmation copy if selected.
7. Add validation and smoke.
   - Update or add guest checkout smoke without mutating payment state falsely.
   - Keep authenticated checkout smoke.
   - Add visual QA screenshots for desktop/mobile.
8. Update docs and state.
   - Complete validation report.
   - Add Intent Compliance Report.
   - Update `docs/IMPLEMENTATION_STATE.md`.

## Parallel Execution Plan

| Workstream | Status | Owner role | Scope | Allowed files | Forbidden files | Dependencies | Expected output | Validation | Handoff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Reference/doc baseline | ready now | Documentation owner | Keep Smarty reference and screenshot mapping current | `docs/reference/smarty-checkout/**`, `implementation-goals/GOAL-09*`, IPS TASK/EP/CP/PROMPT/VAL docs | source code | none | tracked docs with element matrix | strict doc audit, diff check | integration owner consumes plan |
| B. Backend contract discovery | ready now | Backend architect | Inspect auth magic-link, shipping, terms, support contracts | docs-only notes initially | production secrets, schema changes | none | decision note: option 1/2/3 | read-only evidence | blocks backend implementation |
| C. Frontend checkout UX | dependency-gated | Frontend worker | Build Smarty-like cart/checkout/completion UX | frontend app/components/lib files | backend services, schema | contract decision and dirty guest-cart baseline | UI implementation | frontend build, visual QA | integrate after backend API shape fixed |
| D. Backend guest order API | dependency-gated | Backend worker | Implement guest order endpoint and account invitation contract | api-gateway, order-service, DTOs, schema if approved | frontend UX files except API types | contract decision | server-side order flow | service builds, smoke | integration owner wires frontend |
| E. Validation and smoke | final integration | Validation owner | Guest and authenticated checkout validation | scripts, validation reports | business logic except small test hooks | C and D complete | validation evidence | smoke/builds/browser screenshots | integration owner closes goal |

Shared contracts:

- `CreateOrderData` / `CreateOrderDto`.
- guest cart item payload shape.
- payment initiation response shape.
- magic-link account invitation response shape.
- order summary total calculation.

Integration owner:

- Original orchestrator thread.

Validation owner:

- Final integration worker after frontend/backend merge.

Merge order:

1. Docs/reference baseline.
2. Backend contract discovery decision.
3. Backend API/schema changes.
4. Frontend UX and API client changes.
5. Smoke/validation.
6. State update and deploy approval request.

## Rollback Plan

- Keep authenticated checkout route behavior intact until guest route is validated.
- Add feature flag or isolated code path for guest checkout if schema/API risk is high.
- If guest order creation fails, do not create payment sessions.
- If payment initiation fails, release reserved stock and show retry path.
- If account magic-link creation fails, preserve order/payment flow and show account-creation follow-up error without cancelling the order.

## Sensitive Data Policy

- Do not record real customer emails, phones, addresses, payment details, provider tokens, or raw production order data in docs/logs.
- Use synthetic `example.invalid` addresses for validation.
- Redact order IDs if they point to real customer data.

## Current Checkpoint

Planning artifacts created. Coding is blocked until the backend guest-order contract and magic-link capability are confirmed.
