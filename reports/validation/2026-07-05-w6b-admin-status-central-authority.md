# W6-B FlipFlop Admin Status Authority Contract

Date: 2026-07-05
Status: implemented-source-validated
Repository: flipflop

## Vision

Unified Order Lifecycle Platform: Orders microservice is the reliable lifecycle backbone for marketplace purchases.

## Goal Impact

Central Orders-owned FlipFlop orders can no longer drift because of local admin status or payment status writes. Buyer/admin surfaces continue reading central lifecycle data, and local admin can still add notes without mutating lifecycle authority.

## System

- FlipFlop order-service backend: `services/order-service/src/orders/orders.service.ts`
- FlipFlop admin frontend: `services/frontend/app/admin/orders/[id]/page.tsx`
- Source verifier: `scripts/verify-admin-status-central-authority.js`

## Feature

When FlipFlop local order metadata shows central Orders ownership (`centralOrdersForwarding.status` accepted/conflict with central order id), `updateAdminOrderStatus` rejects local `status` and `paymentStatus` mutation attempts with a fail-closed `BadRequestException`.

Notes-only updates remain allowed because they do not alter lifecycle authority.

## Task

Close W6-B from the unified lifecycle audit: remove the last known local admin mutation path that could override central Orders lifecycle state for central-owned FlipFlop orders.

## Execution Plan

1. Reuse the existing backend `isCentralOrdersOwnedOrder` ownership predicate.
2. Reject local lifecycle mutation when the admin payload includes `status` or `paymentStatus` for a central-owned order.
3. Keep notes-only update behavior intact.
4. Disable status/payment controls in the admin detail UI when central lifecycle is available.
5. Omit status/payment fields from the frontend update payload when locked.
6. Add source verifier coverage.

## Coding Prompt

Implement a fail-closed FlipFlop admin status authority contract for central Orders-owned orders without inventing a new central Orders mutation workflow.

## Code

- Backend guard added in `updateAdminOrderStatus`.
- Admin detail UI now shows a central ownership notice, disables status/payment selectors, and submits notes-only payloads when locked.
- NPM script added: `npm run verify:admin-status-central-authority`.

## Validation

- `npm run verify:admin-status-central-authority` - PASS. Source verifier confirmed backend central ownership guard, notes-only path, frontend disabled controls, and status/payment payload suppression.
- `npm run verify:orders-lifecycle-ui` - PASS. Covered 13 lifecycle stages across customer/admin order pages and dashboard recent-order widgets with 30s visible polling.
- `npm run verify:orders-hub-integration` - PASS. Existing Orders hub integration source check remains valid.
- `npm --prefix services/frontend run lint -- app/admin/orders/[id]/page.tsx lib/api/orders.ts` - PASS. Only baseline-browser-mapping staleness notice from tooling.
- `npm --prefix services/order-service run build` - PASS. TypeScript compilation and alias rewrite completed.
- `git diff --check` - PASS.

## Remaining Blockers

- `[MISSING: central Orders admin lifecycle mutation/correction contract]` No approved command contract exists for FlipFlop admin to request central Orders lifecycle corrections. This implementation therefore fails closed instead of inventing mutation routing.
- `[MISSING: live admin session]` UI behavior is source-verified but not browser-smoked with an authenticated admin session.
