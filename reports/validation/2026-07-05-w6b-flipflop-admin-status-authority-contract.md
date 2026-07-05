# W6-B FlipFlop Admin Status Authority Contract

status: fail-closed-guard-implemented-orders-command-contract-blocked
created_at: 2026-07-05
repository: /home/ssf/Documents/Github/flipflop
mutation: false
runtime_route_invocation: false
deploy: false
sensitive_output: redacted-source-only

## Intent Preservation Chain

Vision -> Every sellable order is error-free and every customer/admin cabinet reflects canonical Orders lifecycle without channel-local lifecycle drift.

Goal Impact -> FlipFlop admins can no longer change local `status` or `paymentStatus` for central-owned orders while the FlipFlop route-to-Orders admin action implementation remains dependency-gated.

System -> Orders owns order lifecycle/status, payment-status side effects, cancellation approval, lifecycle events, and Warehouse handoff. Warehouse owns stock/reservation/fulfillment state. FlipFlop owns storefront UI, local checkout adapter metadata, local notes, and bounded channel evidence.

Feature -> Admin order detail status editor fails closed for central-owned orders instead of mutating FlipFlop local lifecycle state.

Task -> Inspect Orders lifecycle/status/payment/Warehouse APIs and FlipFlop admin status update path, then define and enforce the safe central-authority contract without bypassing the Orders admin lifecycle action contract.

Execution Plan -> Use source-only inspection, preserve route-to-Orders implementation and live-session gates, add only a FlipFlop-side fail-closed guard for local lifecycle fields, keep notes local, and add a source verifier.

Coding Prompt -> Remote-only Alfares workflow; allowed files are docs/reports/verifier scripts plus a small fail-closed FlipFlop guard; no production order/payment/warehouse mutation, deploy, raw customer/payment/token output, or invented lifecycle mutation semantics.

Code -> `services/order-service/src/orders/orders.service.ts`, `services/frontend/lib/api/orders.ts`, `services/frontend/app/admin/orders/[id]/page.tsx`, `scripts/verify-w6b-admin-status-authority-contract.js`, `package.json`, and this report.

Validation -> `npm run verify:w6b-admin-status-authority-contract`; `git diff --check`.

## Source Findings

- Orders exposes central lifecycle reads through `GET /orders/:id/lifecycle`, channel/admin lifecycle lists, payment status updates through `PUT /orders/:id/payment-status`, Warehouse fulfillment updates through `PUT /orders/:id/warehouse-fulfillment-status`, and status updates through `PUT /orders/:id/status`.
- Orders status transitions are not a generic channel-admin writer. Cancellation requires `approval.approved=true`, `approval.approvalType=human`, a safe `reasonCode`, actor/approvedBy, and side-effect acknowledgements for `payment`, `warehouse`, `notification`, `crm`, and `channel`.
- Orders payment status changes own paid/failed/cancelled handoffs to Warehouse release/fulfill behavior. Warehouse remains stock authority under `docs/orchestrator/WAREHOUSE_HANDOFF_CONTRACT.md`.
- FlipFlop admin `PUT /admin/orders/:id/status` previously wrote local `Order.status`, `paymentStatus`, `notes`, and `fulfilledAt` through Prisma even when `metadata.centralOrdersForwarding.status` was `accepted` or `conflict` with a central Orders UUID.
- Orders now defines a source-validated admin lifecycle action contract in `orders-microservice` commit `333b131`: `POST /api/admin/operations/actions/order-status`, action roles `global:superadmin` or `internal:orders-microservice:action-admin`, status-transition validation, and cancellation side-effect acknowledgements. FlipFlop has not implemented route-to-Orders action submission.

## Safe Contract Now Enforced

For central-owned FlipFlop orders, defined as local orders whose `metadata.centralOrdersForwarding.status` is `accepted` or `conflict` and whose `centralOrderId` is present:

- FlipFlop must not locally mutate `status` or `paymentStatus` through admin order status update.
- FlipFlop may still save local admin `notes`, because notes are channel-local metadata and do not assert lifecycle, payment, Warehouse, provider, CRM, or notification truth.
- The admin UI disables status/payment controls when central lifecycle is available and submits notes only.
- Any future status/payment correction must use the Orders-owned admin lifecycle action contract (`POST /api/admin/operations/actions/order-status`) with an action-admin actor, not map FlipFlop form values directly onto local Prisma fields.

## Remaining Gates After Orders W7C

- `[RESOLVED/NARROWED: Orders admin lifecycle action contract source-validated in orders-microservice 333b131]`
- `[MISSING: Auth actor/role mapping from FlipFlop admin session to Orders status/correction command actor]`
- `[MISSING: Orders idempotency key and replay policy for FlipFlop admin lifecycle correction attempts]`
- `[MISSING: Orders side-effect acknowledgement packet shape for admin cancellation/correction initiated from FlipFlop]`
- `[MISSING: Orders response/readback contract for FlipFlop admin UI after a central correction command]`
- `[MISSING: approved live customer/admin bearer/session packet for deployed FlipFlop smoke]`

- `[MISSING: FlipFlop route-to-Orders admin action implementation]`
- `[MISSING: approved live action-admin session packet]`
- `[MISSING: payment/refund/provider correction workflow]`

## Parallel Execution

| Workstream | Status | Owner role | Objective | Dependencies/blockers | Validation evidence | Handoff notes |
|---|---|---|---|---|---|
| W6-B1 FlipFlop fail-closed guard | complete | FlipFlop order-service owner | Block local `status`/`paymentStatus` writes for central-owned orders; keep notes local | none | `verify:w6b-admin-status-authority-contract` | Safe source guard; deploy remains separate |
| W6-B2 Orders command contract | blocked | Orders lifecycle owner | Define admin correction/cancellation command for channel admins | `[RESOLVED/NARROWED: Orders admin lifecycle action contract source-validated in orders-microservice 333b131]` | new Orders contract verifier | Must preserve cancellation approval and side-effect gates |
| W6-B3 FlipFlop route-to-Orders implementation | ready-design-gated-by-session | Orders/FlipFlop integration owner | Replace disabled controls with central Orders action flow only after approved UX/session packet | `[MISSING: approved live action-admin session packet]` | focused service tests + UI verifier | Do not invent status mappings or local Prisma lifecycle writes |
| W6-C Live deployed smoke | blocked | Validation owner | Prove deployed admin/customer pages and fail-closed behavior with safe session | `[MISSING: approved live customer/admin bearer/session packet]` | sanitized smoke report | No deploy/run in this lane |

Shared contracts: Orders lifecycle read model, Orders status transition approval gate, Orders payment status boundary, Warehouse handoff contract, FlipFlop `centralOrdersForwarding` metadata.

Integration owner: Orders/FlipFlop integration owner.

Validation owner: W6-B integration owner for source verifier; W6-C validation owner for live smoke.

Merge order: W6-B1 guard first, W6-B2 Orders command contract second (complete in Orders `333b131`), W6-B3 route-to-Orders implementation third, W6-C live smoke after approved session/deploy gates.

## Deployment

Not run. This lane made source/report/verifier changes only and did not invoke production Orders, payment, Warehouse, provider, DB, or deployed routes.
