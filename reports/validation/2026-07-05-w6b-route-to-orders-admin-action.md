# W6-B Route To Orders Admin Action Validation

status: source-wired-runtime-gated
created_at: 2026-07-05
owner: W6-B FlipFlop admin action wiring

## Intent Preservation Chain

Vision -> Orders remains the canonical lifecycle authority for central marketplace orders.

Goal Impact -> FlipFlop admin status changes for central-owned orders no longer write local lifecycle truth and can use the Orders-owned action route when approved action-admin authority exists.

System -> Orders owns lifecycle status, transition validation, cancellation approval, lifecycle events, and Warehouse cancellation handoff. FlipFlop owns local admin UI, channel-local notes, and fail-closed routing to Orders. Payments/provider corrections remain outside this status action.

Feature -> FlipFlop route-to-Orders admin status action wiring.

Task -> Source-wire central-owned status changes to `POST /api/admin/operations/actions/order-status`, keep central payment mutation blocked, and keep notes local.

Execution Plan -> Extend the shared Orders client with a dedicated admin action method using `ORDERS_STATUS_SERVICE_TOKEN`, route central-owned backend status updates to the central Orders id, update the admin detail form to submit changed central status only, and refresh source verifiers.

Coding Prompt -> No deploy, no live order mutation, no DB migration, no payment/provider/checkout mutation, no secrets/tokens/raw customer output.

Code -> `shared/clients/order-client.service.ts`, `services/order-service/src/orders/orders.service.ts`, `services/order-service/src/orders/dto/update-admin-order-status.dto.ts`, `services/frontend/lib/api/orders.ts`, `services/frontend/app/admin/orders/[id]/page.tsx`, `scripts/verify-admin-status-central-authority.js`, `scripts/verify-w6b-admin-status-authority-contract.js`.

Validation -> `npm run verify:admin-status-central-authority`; `npm run verify:w6b-admin-status-authority-contract`; `npm run verify:orders-hub-integration`; `npm run verify:orders-lifecycle-ui`; `npm --prefix services/order-service run build`; `npm --prefix services/frontend run lint -- app/admin/orders/[id]/page.tsx lib/api/orders.ts`; `git diff --check`.

## Source Verdict

- Central-owned FlipFlop status changes route to Orders `POST /api/admin/operations/actions/order-status`.
- The route uses a dedicated `ORDERS_STATUS_SERVICE_TOKEN` bearer token and fails closed with `[MISSING: approved live action-admin session packet]` when it is absent.
- Central-owned payment changes remain blocked with `[MISSING: payment/refund/provider correction workflow]`.
- Notes remain local and do not require a central Orders lifecycle action.
- The admin page initializes status from central display data, sends status only when changed, hides the refund-like local status option for central-owned orders, and avoids accidental status action on notes-only saves.

## Runtime Blockers

- `[MISSING: approved live action-admin session packet / ORDERS_STATUS_SERVICE_TOKEN projection for runtime action proof]`
- `[MISSING: approved live lifecycle mutation smoke target and redacted readback packet]`
- `[MISSING: payment/refund/provider correction workflow]`

## Deployment

Not run. No deploy gate was requested or reached.


## Validation Results

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && npm run verify:admin-status-central-authority'
```

Result: pass. Verifier reported central-owned status mutation routes to Orders, central payment mutation remains fail-closed, notes stay local, the frontend sends changed central status only, `runtimeMutation=false`, and `sensitiveOutput=redacted-source-only`.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && npm run verify:w6b-admin-status-authority-contract'
```

Result: pass. Verifier reported `backendGuard=central-owned status routes to Orders and payment remains fail-closed`, `localNotesAllowed=true`, `runtimeMutation=false`.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && npm run verify:orders-hub-integration'
```

Result: pass, `orders hub integration verification ok`.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && npm run verify:orders-lifecycle-ui'
```

Result: pass. Verifier covered 13 lifecycle stages across customer/admin order pages and dashboard recent-order widgets with redacted source-only output.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && npm --prefix services/order-service run build'
```

Result: pass, `tsc && tsc-alias`.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && npm --prefix services/frontend run lint -- app/admin/orders/[id]/page.tsx lib/api/orders.ts'
```

Result: pass with existing baseline-browser-mapping staleness notice only.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && git diff --check'
```

Result: pass.
