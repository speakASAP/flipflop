# W6 FlipFlop Centralization Gap Report

status: source-verified-with-local-authority-gaps
created_at: 2026-07-05
workstream: W6 FlipFlop centralization gap
repository: /home/ssf/Documents/Github/flipflop
master_plan: /home/ssf/Documents/Github/orders-microservice/docs/orchestrator/2026-07-05-error-free-orders-lifecycle-master-plan.md

## Intent Preservation Chain

Vision -> Every sellable order is error-free and every customer/admin cabinet reflects the canonical Orders lifecycle.

Goal Impact -> Prevent FlipFlop local order-service status from silently drifting from central Orders lifecycle in customer/admin order views.

System -> Orders owns central order lifecycle and lifecycle reads. Warehouse owns stock/reservation/fulfillment/delivery status. FlipFlop owns storefront UI, local checkout adapter, and bounded local order metadata.

Feature -> FlipFlop customer/admin orders UI reads central lifecycle through the shared Orders client and marks stale/missing central lifecycle explicitly.

Task -> Check whether FlipFlop local order-service can drift from central Orders lifecycle; prove customer/admin orders UI reads central lifecycle or record exact remaining local-authority gaps.

Execution Plan -> Read repo handoff and master plan, inspect shared Orders client, local order-service read mapping, frontend customer/admin order list/detail pages, dashboard recent-order widgets, and admin status update route; run focused verifiers.

Coding Prompt -> Remote-only workflow on `ssh alfares` and `/home/ssf/Documents/Github/flipflop`; allowed files are shared order client, frontend order/admin pages, verifiers/docs/reports; no unrelated checkout/payment/provider mutations, no deploy without gate, no raw customer/payment/token output.

Code -> No production code changed in this pass. This report records source evidence and remaining blockers.

Validation -> `verify:orders-lifecycle-ui` and `verify:orders-hub-integration` passed on 2026-07-05; live customer/admin smoke remains auth/session-gated.

## Commands And Results

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && pwd && git status --short --branch && git branch --show-current && git log -1 --oneline'
```

Result: `/home/ssf/Documents/Github/flipflop`, branch `main`, latest commit `f8e3d06 docs: plan error-free orders lifecycle`. Initial preflight showed `## main...origin/main [ahead 1]`; later status after origin state refreshed showed `## main...origin/main` before this report was written.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && sed -n "1,240p" docs/orchestrator/2026-07-05-error-free-orders-lifecycle-handoff.md'
```

Result: handoff status `active`; core invariant says Orders owns order lifecycle and FlipFlop may only implement assigned adapter/UI/proof slice.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/orders-microservice && sed -n "1,260p" docs/orchestrator/2026-07-05-error-free-orders-lifecycle-master-plan.md'
```

Result: W6 is `ready now`, owner role `FlipFlop commerce owner`, scope `Check local order-service vs central Orders drift and close only read-model/status UI gaps`, expected validation `verify:orders-lifecycle-ui`, `verify:orders-hub-integration`, and live smoke if auth is available.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && npm run verify:orders-lifecycle-ui'
```

Result:

```json
{"ok":true,"verifier":"flipflop-orders-lifecycle-ui.v1","coveredStages":13,"surfaces":["customer-orders","customer-order-detail","admin-orders","admin-order-detail"],"refresh":"useVisiblePolling(30000)","sensitiveOutput":"redacted-source-only"}
```

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && npm run verify:orders-hub-integration'
```

Result:

```text
orders hub integration verification ok
```

## Source Evidence

- `shared/clients/order-client.service.ts` has `getOrderLifecycle()` reading central Orders by `/api/orders/:id/lifecycle`, falling back to `/api/orders/:id`, then external id lookup, and finally a stale `[MISSING: Orders lifecycle read endpoint]` placeholder when no central read is available.
- `shared/clients/order-client.service.ts` normalizes lifecycle, payment, delivery, fulfillment, exception, totals, items, and delivery address fields from central Orders responses with `source: orders-microservice` and `readStatus: available`.
- `services/order-service/src/orders/orders.service.ts` maps every customer/admin order read through `mapOrderWithCentralLifecycle()`: customer list, customer detail, admin list, and admin detail all attach `centralOrder` before returning to the frontend.
- `services/frontend/lib/api/orders.ts` renders central lifecycle only when `order.centralOrder?.readStatus === 'available'`; otherwise it falls back to local values and exposes stale/missing notice text in the verified order pages.
- Verified order UI surfaces use `getOrderDisplayData()`, shared lifecycle labels/colors, visible 30s polling, and manual refresh: customer `/orders`, customer `/orders/:id`, admin `/admin/orders`, admin `/admin/orders/:id`.

## Verdict

The four scoped customer/admin order list/detail pages are source-proven to read central lifecycle when `centralOrder.readStatus === 'available'`, and to show explicit stale/missing central lifecycle notices when central Orders metadata or read endpoints are unavailable.

FlipFlop local order-service can still drift from central Orders through remaining local-authority paths listed below. These were not changed because this pass stayed inside W6 proof/report scope and avoided backend authority-semantics changes outside the allowed read-model/doc files.

## Remaining Local-Authority Gaps

1. `[MISSING: central-authority admin status mutation contract]` `services/order-service/src/orders/orders.service.ts` still implements `updateAdminOrderStatus()` by directly writing local `Order.status`, `paymentStatus`, `notes`, and `fulfilledAt` through Prisma. It does not call central Orders lifecycle mutation/correction endpoints. The frontend admin detail page calls this route through `ordersApi.updateAdminOrderStatus()`, so an admin can still create local lifecycle drift for central-owned orders.

2. `[MISSING: dashboard recent-order central lifecycle rendering]` `services/frontend/app/dashboard/page.tsx` and `services/frontend/app/admin/page.tsx` recent-order widgets render `order.status` directly. The dedicated order pages are verified, but these dashboard summary widgets can display the local status instead of central lifecycle data returned on `centralOrder`.

3. `[MISSING: live customer/admin auth session smoke]` No approved live customer/admin bearer/session packet was available in this pass, so source proof was not extended to deployed browser/API smoke for `/orders`, `/orders/:id`, `/admin/orders`, or `/admin/orders/:id`.

4. `[MISSING: deployed W6-specific proof gate]` No deploy was run. This pass only wrote a source handoff report and ran source verifiers.

## Parallel Execution Handoff

| Workstream | Status | Owner role | Objective | Allowed files | Forbidden files | Dependencies/blockers | Validation evidence | Handoff notes |
|---|---|---|---|---|---|---|---|---|
| W6-A Dashboard read-model cleanup | ready now | FlipFlop frontend owner | Make dashboard recent-order widgets use `getOrderDisplayData()` and central lifecycle notice/labels like dedicated order pages | `services/frontend/app/dashboard/page.tsx`, `services/frontend/app/admin/page.tsx`, `scripts/verify-orders-lifecycle-ui.js`, docs | backend order-service, checkout/payment/provider code | none | rerun `npm run verify:orders-lifecycle-ui`; optionally focused frontend lint/build | Independent UI-only cleanup; low conflict with backend authority work |
| W6-B Admin status authority contract | dependency-gated | Orders/FlipFlop integration owner | Decide whether admin status changes are disabled for central-owned orders or routed through central Orders lifecycle command API | central Orders contract/docs first; then FlipFlop admin page/order-service only after contract exists | inventing local-to-central lifecycle mutation semantics | `[MISSING: central Orders admin lifecycle mutation contract]` | new contract verifier plus focused service tests/build | Do not patch local Prisma update into a fake central sync without owner-approved Orders contract |
| W6-C Live customer/admin smoke | blocked | Validation owner | Prove deployed customer/admin order pages with safe live session/token | smoke scripts/reports only | printing tokens, raw customer/order/payment/provider data | `[MISSING: approved live customer/admin bearer/session packet]` | sanitized API/browser smoke report | Use redacted output only; no order mutation unless separately approved |
| W7 Integration | final integration | Orchestrator | Merge W6 evidence into master status | docs/orchestrator reports | code/schema changes | W6-A/W6-B/W6-C decisions | master status update | Keep W6 as source-verified until blockers close |

Shared files/contracts: central Orders lifecycle read model, `centralOrder.readStatus`, `getOrderDisplayData()`, admin status mutation semantics.

Integration owner: original orders-lifecycle orchestrator.

Validation owner: W6 frontend owner for W6-A, Orders/FlipFlop integration owner for W6-B, W7 for cross-repo evidence.

Merge order: W6-A can merge before W6-B; W6-B requires central Orders contract first; W6-C can run after approved session packet; W7 last.

## Deployment

Not run. No deploy gate was requested or reached.
