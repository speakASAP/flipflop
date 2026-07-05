# W6 FlipFlop Centralization Gap Report

status: source-complete-runtime-action-admin-blocked
created_at: 2026-07-05
updated_at: 2026-07-05
workstream: W6 FlipFlop centralization gap
repository: /home/ssf/Documents/Github/flipflop
master_plan: /home/ssf/Documents/Github/orders-microservice/docs/orchestrator/2026-07-05-error-free-orders-lifecycle-master-plan.md

## Intent Preservation Chain

Vision -> Every sellable order is error-free and every customer/admin cabinet reflects the canonical Orders lifecycle.

Goal Impact -> Prevent FlipFlop local order-service status from silently drifting from central Orders lifecycle in customer/admin order views and admin lifecycle actions.

System -> Orders owns central order lifecycle and lifecycle reads. Warehouse owns stock/reservation/fulfillment/delivery status. FlipFlop owns storefront UI, local checkout adapter, and bounded local order metadata.

Feature -> FlipFlop customer/admin orders UI reads central lifecycle through the shared Orders client, and central-owned admin status actions route to the Orders-owned admin action contract instead of local lifecycle writes.

Task -> Check whether FlipFlop local order-service can drift from central Orders lifecycle; prove customer/admin orders UI reads central lifecycle or record exact remaining local-authority gaps.

Execution Plan -> Read repo handoff and master plan, inspect shared Orders client, local order-service read/action mapping, frontend customer/admin order list/detail pages, dashboard recent-order widgets, admin status update route, and Orders/Auth runtime action-admin boundary; run focused verifiers and guarded redacted live proof only after approval.

Coding Prompt -> Remote-only workflow on `ssh alfares` and `/home/ssf/Documents/Github/flipflop`; allowed files are shared order client, frontend order/admin pages, verifiers/docs/reports; no unrelated checkout/payment/provider mutations, no deploy without gate, no raw customer/payment/token output.

Code -> Current FlipFlop `main` includes central lifecycle read-model hardening, dashboard lifecycle verifier hardening, and central-owned admin status route-to-Orders source wiring. This report records the source proof and the exact remaining runtime action-admin blocker.

Validation -> `verify:orders-lifecycle-ui`, `verify:orders-hub-integration`, `verify:admin-status-central-authority`, and `verify:w6b-admin-status-authority-contract` passed on 2026-07-05. Guarded live create/read reached central Orders, but cleanup/action mutation is blocked by missing Auth runtime role seed for `internal:orders-microservice:action-admin`.

## Commands And Results

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && git log --oneline -5 && git status --short --branch'
```

Result:

```text
620ba17 Polish central admin action UI guard
0e06a50 fix: route central admin status actions to Orders
6869b31 docs: record runtime gate packet handoff
a87212d test: harden dashboard lifecycle verifier
8d22e06 Fix product detail bundle threshold selection
## main...origin/main
?? reports/validation/orders-auth-subject-smoke/report-latest.json
```

The untracked `report-latest.json` is the sanitized guarded live smoke artifact from this pass.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && npm run verify:orders-lifecycle-ui && npm run verify:orders-hub-integration && npm run verify:admin-status-central-authority && npm run verify:w6b-admin-status-authority-contract'
```

Result:

```text
verify:orders-lifecycle-ui PASS
{"ok":true,"verifier":"flipflop-orders-lifecycle-ui.v1","coveredStages":13,"surfaces":["customer-orders","customer-order-detail","admin-orders","admin-order-detail","customer-dashboard-recent-orders","admin-dashboard-recent-orders"],"refresh":"useVisiblePolling(30000)","sensitiveOutput":"redacted-source-only"}

verify:orders-hub-integration PASS
orders hub integration verification ok

verify:admin-status-central-authority PASS
checks: backend routes central-owned status mutation to Orders admin action route; backend keeps central-owned payment mutation fail-closed; backend leaves notes-only update path available; frontend sends changed central status while avoiding notes-only accidental status submit; frontend keeps payment changes local-only for non-central orders.
runtimeMutation=false; sensitiveOutput=redacted-source-only

verify:w6b-admin-status-authority-contract PASS
{"ok":true,"verifier":"w6b-flipflop-admin-status-authority-contract.v1","backendGuard":"central-owned status routes to Orders and payment remains fail-closed","localNotesAllowed":true,"runtimeMutation":false,"sensitiveOutput":"redacted-source-only"}
```

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && sed -n "1,220p" reports/validation/orders-auth-subject-smoke/report-latest.json'
```

Result:

```json
{
  "ok": false,
  "mutation": true,
  "providerCall": false,
  "approvalIdPresent": true,
  "confirmation": "CREATE_READ_OPTIONAL_CANCEL",
  "preflight": {
    "deploymentReady": "1/1",
    "deploymentAvailable": "1/1",
    "podEnv": {
      "ORDERS_SERVICE_URL": true,
      "ORDERS_SERVICE_TOKEN": true,
      "ORDERS_STATUS_SERVICE_TOKEN": true
    },
    "blockers": []
  },
  "result": {
    "createHttpStatus": 201,
    "orderIdPresent": true,
    "readHttpStatus": 200,
    "authSubjectPersisted": true,
    "cleanup": {
      "attempted": true,
      "skippedReason": null,
      "httpStatus": 403
    }
  },
  "blockers": [
    "[MISSING: runtime cleanup cancelled synthetic Orders order]"
  ],
  "cleanupAuthorityConfirmed": true
}
```

No token value, raw order id, customer data, payment/provider data, request body, or response body was printed.

```bash
ssh alfares 'kubectl -n statex-apps get externalsecret flipflop-service-secret -o jsonpath="{range .spec.data[*]}{.secretKey}{\":\"}{.remoteRef.key}{\":\"}{.remoteRef.property}{\"\\n\"}{end}" | rg "ORDERS_STATUS|ORDERS_SERVICE|JWT|TOKEN|SECRET"'
```

Result: `ORDERS_STATUS_SERVICE_TOKEN` is mapped from `secret/prod/flipflop-service:ORDERS_STATUS_SERVICE_TOKEN`; token value was not read or printed.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/orders-microservice && sed -n "1,240p" src/auth/jwt-roles.guard.ts && sed -n "1,120p" src/admin/admin.service.ts && sed -n "200,230p" src/admin/admin.service.ts'
```

Result: Orders admin action contract requires `ADMIN_ACTION_ROLES = [global:superadmin, internal:orders-microservice:action-admin]`. The guard validates bearer tokens through Auth and preserves Auth-owned roles. Static internal service headers for `flipflop-service` map only to `internal:flipflop-service:service`, not Orders action-admin.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/auth-microservice && rm -rf /tmp/auth-internal-token-helper-build && npx tsc --outDir /tmp/auth-internal-token-helper-build --noEmit false --skipLibCheck --experimentalDecorators --emitDecoratorMetadata --module commonjs --target es2020 --moduleResolution node --esModuleInterop scripts/provision-internal-service-token.ts && AUTH_POD=$(kubectl -n statex-apps get pod -l app=auth-microservice -o jsonpath="{.items[0].metadata.name}") && kubectl -n statex-apps cp /tmp/auth-internal-token-helper-build/provision-internal-service-token.js "$AUTH_POD:/tmp/provision-internal-service-token.js" && kubectl -n statex-apps exec "$AUTH_POD" -- env NODE_PATH=/app/node_modules node /tmp/provision-internal-service-token.js --email=orders-status-cleanup@internal.invalid --service-name=orders-status-cleanup --role=internal:orders-microservice:action-admin --dry-run --create-if-missing'
```

Result:

```json
{
  "contract": "auth-internal-service-token-provisioning.v1",
  "status": "failed",
  "error": "Role not found for internal:orders-microservice:action-admin. Run seed first."
}
```

The helper dry-run did not mutate Auth DB and did not emit a token.

## Source Evidence

- `shared/clients/order-client.service.ts` reads central lifecycle through Orders and now has `applyAdminOrderStatusAction()` using `POST /api/admin/operations/actions/order-status` with `ORDERS_STATUS_SERVICE_TOKEN`.
- `services/order-service/src/orders/orders.service.ts` maps customer list, customer detail, admin list, admin detail, and dashboard reads through `mapOrderWithCentralLifecycle()` before returning to frontend callers.
- `services/order-service/src/orders/orders.service.ts` routes changed central-owned admin `status` to Orders admin action using the central order id. It keeps central-owned `paymentStatus` fail-closed with `[MISSING: payment/refund/provider correction workflow]` and leaves notes-only local updates available.
- `services/frontend/lib/api/orders.ts` and the customer/admin order pages render central lifecycle only when `centralOrder.readStatus === 'available'`; otherwise they expose stale/missing central lifecycle notices.
- Dashboard recent-order widgets are now covered by `verify:orders-lifecycle-ui`.

## Verdict

FlipFlop customer/admin order UI is source-proven to read central Orders lifecycle for order list/detail pages and dashboard recent-order widgets.

The previous local-authority admin status drift gap is source-closed: central-owned status actions no longer directly write local lifecycle truth and instead route to the Orders-owned admin action endpoint.

Runtime proof is incomplete because Auth runtime does not currently contain the `internal:orders-microservice:action-admin` role required by the Orders action contract. The approved guarded live proof created and read one synthetic central Orders order, but cleanup/status action returned HTTP 403 and the Auth helper dry-run could not issue a compliant action-admin token because the role seed is missing.

## Remaining Gaps And Blockers

1. `[MISSING: Auth runtime role seed for internal:orders-microservice:action-admin]` Auth helper dry-run failed with `Role not found for internal:orders-microservice:action-admin. Run seed first.`

2. `[MISSING: approved action-admin token projection after role seed]` `ORDERS_STATUS_SERVICE_TOKEN` exists in FlipFlop runtime, but the current projected token does not satisfy the current Orders action-admin contract.

3. `[MISSING: runtime cleanup cancelled synthetic Orders order]` One guarded synthetic central Orders order was created/read during proof and cleanup returned HTTP 403. No direct DB cleanup was performed because that would bypass the Orders lifecycle authority contract.

4. `[MISSING: live customer/admin browser session smoke]` Source verifiers passed; no raw customer/admin browser session smoke was run in this W6 pass.

5. `[MISSING: deploy gate for any future Auth role seed/source change]` No deploy was run in this pass.

## Parallel Execution Handoff

| Workstream | Status | Owner role | Objective | Allowed files | Forbidden files | Dependencies/blockers | Validation evidence | Handoff notes |
|---|---|---|---|---|---|---|---|---|
| W6 FlipFlop source authority | complete | FlipFlop commerce owner | Prove UI central lifecycle reads and route central-owned status to Orders | shared Orders client, order-service admin status path, frontend order/admin pages, verifiers/docs/reports | checkout/payment/provider mutations | none | four FlipFlop verifiers pass | Source complete on `main` |
| Auth action-admin seed | dependency-gated | Auth RBAC owner | Seed `internal:orders-microservice:action-admin` in Auth runtime/source so Auth can issue a compliant action token | Auth role seed/migration/docs/verifier owned by Auth | FlipFlop local lifecycle fallback, direct Orders DB mutation | `[MISSING: Auth runtime role seed for internal:orders-microservice:action-admin]` | Auth helper dry-run should pass before apply | Required before runtime proof |
| Runtime action token rotation | blocked | Auth/FlipFlop runtime owner | Emit action-admin JWT without printing it, patch `secret/prod/flipflop-service#ORDERS_STATUS_SERVICE_TOKEN`, refresh ExternalSecret, restart only `flipflop-order-service` | runtime secret path and FlipFlop deployment restart only after role seed | raw token output, broad secret dumps | Auth action-admin seed | Auth `/auth/validate` redacted role booleans; FlipFlop pod env presence | Use existing helper and 0600 temp token file pattern |
| Synthetic order cleanup proof | blocked | Orders validation owner | Cancel the synthetic central order through `POST /api/admin/operations/actions/order-status` | redacted smoke/report only | direct DB updates, local FlipFlop status writes, payment/provider calls | compliant action-admin token | cleanup HTTP 2xx, no raw ids | Current attempt returned 403 |
| W7 final integration | final integration | Orchestrator | Merge W6 evidence and blockers into lifecycle master status | docs/reports | code/schema changes | W6 report complete | completion audit/runtime-gate verifiers | Keep runtime status blocked until Auth role seed/token rotation succeeds |

Shared contracts: Orders admin lifecycle action contract, Auth-owned RBAC roles, `ORDERS_STATUS_SERVICE_TOKEN`, central Orders lifecycle read model, `centralOrder.readStatus`, admin payment correction fail-closed policy.

Integration owner: original orders-lifecycle orchestrator.

Validation owner: W6 FlipFlop owner for source verifiers; Auth RBAC owner for role seed; Orders validation owner for runtime cleanup proof.

Merge order: Auth role seed -> action-admin token rotation -> synthetic order cleanup proof -> W7 final integration update.

## Deployment

Not run. This pass did not deploy code or source changes. Runtime mutation was limited to the approved guarded synthetic create/read attempt; no provider/payment call was made and no raw sensitive output was printed.
