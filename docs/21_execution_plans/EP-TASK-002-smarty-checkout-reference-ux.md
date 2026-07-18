# EP-TASK-002: Smarty-Reference Guest Checkout UX

```yaml
id: EP-TASK-002
status: approved
source_task: ../11_tasks/TASK-002-smarty-checkout-reference-ux.md
vision: ../01_vision/VISION.md
constitution: ../00_constitution/CONSTITUTION.md
feature: ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
goal_impact: ../22_goal_impact/GOAL-IMPACT-TASK-002-smarty-checkout-reference-ux.md
owner: project owner
created: 2026-06-26
last_updated: 2026-06-26
completeness_level: planned
```

## Metadata

Execution plan for `TASK-002`, implementing a Smarty.cz-referenced guest checkout UX for FlipFlop.

## Upstream Traceability

- Constitution: `docs/00_constitution/CONSTITUTION.md`
- Vision: `docs/01_vision/VISION.md`
- Business case: `docs/02_business_case/BUSINESS_CASE.md`
- Feature: `docs/10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- Task: `docs/11_tasks/TASK-002-smarty-checkout-reference-ux.md`
- Goal impact: `docs/22_goal_impact/GOAL-IMPACT-TASK-002-smarty-checkout-reference-ux.md`
- Reference: `docs/reference/smarty-checkout/README.md`

## Goal Impact

The plan removes account-registration friction from checkout while preserving safe payment initiation, stock reservation, backend total calculation, and central Orders forwarding.

## Project Invariants

Preserve all invariants in `docs/17_governance/PROJECT_INVARIANTS.md`. This plan especially protects payment/provider truthfulness, no unapproved money-state mutation, shared ecosystem service usage, and sensitive-data redaction.

## Sensitive-Data Handling

Guest checkout handles customer email, phone, name, address, and order notes. Validation must use synthetic data. Do not store or print real customer data, provider credentials, tokens, or payment details in docs, logs, reports, or commits.

## Contract Validation Plan

Before implementation, choose and document the guest order backend contract:

1. create/reuse a customer user record and send account activation by magic link;
2. add guest order/address/customer fields;
3. add server-side guest checkout session conversion.

Validate API request/response shapes for frontend, api-gateway, order-service, user/auth integration, payment initiation, and central Orders forwarding.

## Replay/Determinism Plan

Order totals must be calculated server-side from cart price snapshots and selected shipping/payment data. Payment initiation must be idempotent for one order. Magic-link invitation must not create duplicate active accounts for one email.

## Scope

- Guest checkout path from cart to payment initiation.
- Optional login prefill.
- Optional account creation by magic link.
- Smarty-reference cart, delivery/payment, details, and completion UX.
- Backend order contract needed for guest purchase.
- Validation and visual QA.

## Non-Goals

- No fake provider webhook success.
- No provider credential setup.
- No rental checkout.
- No operator-tip accounting.
- No price, discount, refund, cancellation, or order-total mutation beyond existing backend-calculated checkout behavior.

## Files to Inspect

- `docs/reference/smarty-checkout/README.md`
- `services/frontend/app/cart/page.tsx`
- `services/frontend/app/checkout/page.tsx`
- `services/frontend/lib/guest-cart.ts`
- `services/frontend/lib/api/orders.ts`
- `services/frontend/lib/api/addresses.ts`
- `services/api-gateway/src/gateway/gateway.controller.ts`
- `services/order-service/src/orders/orders.controller.ts`
- `services/order-service/src/orders/orders.service.ts`
- `services/order-service/src/orders/dto/create-order.dto.ts`
- `services/user-service/src/users/users.service.ts`
- `shared/auth/auth.service.ts`
- `prisma/schema.prisma`

## Files to Create

- Frontend checkout components as needed under `services/frontend/components/` using an existing or newly created checkout subdirectory.
- Guest order DTO or session DTO if selected by the backend contract.
- Migration file only if selected contract requires schema changes.
- Guest checkout smoke script if existing `scripts/smoke-checkout.js` cannot cover it safely.

## Files to Modify

- `services/frontend/app/cart/page.tsx`
- `services/frontend/app/checkout/page.tsx`
- `services/frontend/lib/api/orders.ts`
- `services/frontend/lib/api/addresses.ts`
- `services/frontend/lib/guest-cart.ts`
- `services/api-gateway/src/gateway/gateway.controller.ts`
- `services/order-service/src/orders/orders.controller.ts`
- `services/order-service/src/orders/orders.service.ts`
- `services/order-service/src/orders/dto/create-order.dto.ts`
- `prisma/schema.prisma` only if schema path is selected.
- goal validation/state docs.

## Files That Must Not Be Modified

- Provider payment services outside the chosen guest checkout contract.
- Price suggestion and pricing approval code.
- Refund/cancellation logic.
- Production secret files and `.env` files.
- Existing dirty source files must not be overwritten or reverted without ownership classification.

## Implementation Steps

1. Classify existing dirty guest-cart and checkout source changes.
2. Inspect auth-microservice magic-link/passwordless account capability.
3. Locate legal terms/privacy links and shipping source of truth.
4. Choose backend guest-order contract.
5. Implement guest delivery/payment/details frontend steps.
6. Implement backend guest order/account invitation path.
7. Reconcile frontend order API response types with backend payment initiation response.
8. Add completion/payment instruction behavior.
9. Add or update smoke and visual validation.
10. Update validation report and implementation state.

## Test Plan

```bash
git diff --check
cd services/frontend && npm run build
cd services/api-gateway && npm run build
cd services/order-service && npm run build
node scripts/smoke-checkout.js
```

Add a guest checkout smoke path that uses synthetic data and does not fake paid state.

## Validation Plan

Pass strict documentation audit and pre-coding gate before code edits. After implementation, validate guest checkout, authenticated checkout regression, payment initiation, stock reservation failure behavior, and desktop/mobile visual layout.

## Gate Commands

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
git diff --check
```

## Documentation Updates

Update `docs/reference/smarty-checkout/README.md`, GOAL-09 validation report, and `docs/IMPLEMENTATION_STATE.md` with selected backend contract, implementation evidence, blockers, and next step.

## Rollback Plan

Keep authenticated checkout behavior recoverable. If guest order creation or payment initiation fails, release any stock reservation, do not create fake payment state, and leave cart/customer data available for retry.

## Agent Handoff Prompt

Implement GOAL-09 guest checkout from the Smarty reference. First classify dirty checkout changes and choose a backend guest-order contract. Do not require login, do not add checkout password fields, and do not fake payment, stock, or account activation state.

## Completion Checklist

- [ ] Backend guest-order contract selected.
- [ ] Guest checkout implemented.
- [ ] Optional login and magic-link account creation implemented.
- [ ] Smarty screenshot matrix covered or dependency-gated.
- [ ] Builds and smoke validation complete.
- [ ] Visual QA complete.
- [ ] Validation report and state updated.
