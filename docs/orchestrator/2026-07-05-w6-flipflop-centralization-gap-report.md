# W6 FlipFlop Centralization Gap Report

status: runtime-complete-central-orders-authority-proven
created_at: 2026-07-05
updated_at: 2026-07-06
workstream: W6 FlipFlop centralization gap
repository: /home/ssf/Documents/Github/flipflop
master_plan: /home/ssf/Documents/Github/orders-microservice/docs/orchestrator/2026-07-05-error-free-orders-lifecycle-master-plan.md

## Intent Preservation Chain

Vision -> Every sellable order is error-free and every customer/admin cabinet reflects the canonical Orders lifecycle.

Goal Impact -> Prevent FlipFlop local order-service status from silently drifting from central Orders lifecycle in customer/admin order views and admin lifecycle actions.

System -> Orders owns central order lifecycle and lifecycle reads. Auth owns identity/RBAC and action-admin token issuance. Warehouse owns stock/reservation/fulfillment/delivery status. FlipFlop owns storefront UI, local checkout adapter, and bounded local order metadata.

Feature -> FlipFlop customer/admin orders UI reads central lifecycle through the shared Orders client, and central-owned admin status actions route to the Orders-owned admin action contract instead of local lifecycle writes.

Task -> Check whether FlipFlop local order-service can drift from central Orders lifecycle; prove customer/admin orders UI reads central lifecycle or record exact remaining local-authority gaps.

Execution Plan -> Read repo handoff and master plan, inspect shared Orders client, local order-service read/action mapping, frontend customer/admin order list/detail pages, dashboard recent-order widgets, admin status update route, Orders/Auth runtime action-admin boundary, Vault/ExternalSecret projection, and guarded redacted live smoke.

Coding Prompt -> Remote-only workflow on `ssh alfares` and `/home/ssf/Documents/Github/flipflop`; allowed files are shared order client, frontend order/admin pages, verifiers/docs/reports; no unrelated checkout/payment/provider mutations, no deploy without gate, no raw customer/payment/token output.

Code -> FlipFlop `main` includes central lifecycle read-model hardening, dashboard lifecycle verifier hardening, and central-owned admin status route-to-Orders source wiring. Auth `main` includes `2047a91 feat: seed orders action admin role` and `ddbde1c docs: record W6B action-admin runtime projection`, enabling and evidencing `internal:orders-microservice:action-admin` issuance.

Validation -> Source verifiers passed. Vault was patched with a newly issued action-admin JWT without printing the token. ExternalSecret synced, `flipflop-order-service` restarted, the projected token validated with `hasActionAdmin=true`, and guarded live create/read/cancel smoke passed with create 201, read 200, cleanup 200.

## Commands And Results

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && git status --short --branch && git log -3 --oneline'
```

Result before this report update:

```text
## main...origin/main
 M reports/validation/orders-auth-subject-smoke/report-latest.json
1a80dcf docs: record w6b runtime deploy blocker
a71be9d docs: record W6B deploy runtime blocker
d05833e docs: record W6 central orders runtime blocker
```

```bash
ssh alfares 'cd /home/ssf/Documents/Github/auth-microservice && npm run verify:orders-action-admin-rbac-seed && git diff --check'
```

Result:

```json
{
  "ok": true,
  "verifier": "orders-action-admin-rbac-seed.v1",
  "role": "internal:orders-microservice:action-admin",
  "runtimeMutation": false,
  "sensitiveOutput": "redacted-source-only"
}
```

```bash
ssh alfares 'AUTH_POD=$(kubectl -n statex-apps get pod -l app=auth-microservice -o jsonpath="{.items[0].metadata.name}") && kubectl -n statex-apps exec "$AUTH_POD" -- env NODE_PATH=/app/node_modules node /tmp/provision-internal-service-token.js --email=orders-status-cleanup@internal.invalid --service-name=orders-status-cleanup --role=internal:orders-microservice:action-admin --dry-run --create-if-missing'
```

Result: dry-run found the application, action-admin role, and existing service principal; `mutatesDatabase=false`, `emitsToken=false`, `status=ready-for-owner-approval`.

```bash
ssh alfares 'AUTH_POD=$(kubectl -n statex-apps get pod -l app=auth-microservice -o jsonpath="{.items[0].metadata.name}") && kubectl -n statex-apps exec "$AUTH_POD" -- sh -lc "rm -f /tmp/orders-status-action-admin.jwt && NODE_PATH=/app/node_modules node /tmp/provision-internal-service-token.js --email=orders-status-cleanup@internal.invalid --service-name=orders-status-cleanup --role=internal:orders-microservice:action-admin --create-if-missing --apply --confirm-db-mutation=INTERNAL_SERVICE_PRINCIPAL --confirm-token-issuance=INTERNAL_SERVICE_JWT --token-output=/tmp/orders-status-action-admin.jwt && stat -c \"token_file_mode=%a token_file_bytes=%s\" /tmp/orders-status-action-admin.jwt"'
```

Result: apply returned `status=ok`, `roleAssigned=true`, `tokenPrinted=false`, `tokenFileMode=0600`.

```bash
ssh alfares 'VAULT_ADDR=http://192.168.88.53:8200 vault kv patch -mount=secret prod/flipflop-service @/tmp/orders-status-action-admin-vault.json && kubectl -n statex-apps annotate externalsecret flipflop-service-secret force-sync=$(date +%s) --overwrite && kubectl -n statex-apps wait externalsecret/flipflop-service-secret --for=condition=Ready=True --timeout=60s && kubectl -n statex-apps rollout restart deployment/flipflop-order-service && kubectl -n statex-apps rollout status deployment/flipflop-order-service --timeout=120s'
```

Result: Vault patch returned `vault_patch_status=ok`; ExternalSecret became Ready; `flipflop-order-service` rollout completed.

```bash
ssh alfares 'POD=$(kubectl -n statex-apps get pod -l app=flipflop-order-service -o jsonpath="{.items[0].metadata.name}") && kubectl -n statex-apps exec "$POD" -- node -e "<redacted token validation helper>"'
```

Result:

```json
{
  "httpStatus": 201,
  "valid": true,
  "roleCount": 1,
  "hasActionAdmin": true,
  "hasOrdersAdmin": false,
  "tokenPrinted": false
}
```

```bash
ssh alfares 'ORDERS_POD=$(kubectl -n statex-apps get pod -l app=orders-microservice -o jsonpath="{.items[0].metadata.name}") && kubectl -n statex-apps exec "$ORDERS_POD" -- sh -lc "chmod 600 /tmp/orders-status-action-admin.jwt && NODE_PATH=/app/node_modules node /tmp/cleanup_orders_auth_subject_smoke.js"'
```

Result:

```json
{
  "ok": true,
  "targetCount": 1,
  "actionHttpStatuses": [201],
  "remainingOpenCount": 0,
  "tokenPrinted": false,
  "rawIdsPrinted": false,
  "route": "/api/admin/operations/actions/order-status"
}
```

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && sed -n "1,220p" reports/validation/orders-auth-subject-smoke/report-latest.json'
```

Result:

```json
{
  "ok": true,
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
      "httpStatus": 200
    }
  },
  "blockers": [],
  "cleanupAuthorityConfirmed": true
}
```

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && npm run verify:orders-lifecycle-ui && npm run verify:orders-hub-integration && npm run verify:admin-status-central-authority && git diff --check'
```

Result: all three FlipFlop verifiers passed; `git diff --check` passed.

## Source And Runtime Evidence

- `shared/clients/order-client.service.ts` reads central lifecycle through Orders and uses `applyAdminOrderStatusAction()` for `POST /api/admin/operations/actions/order-status` with `ORDERS_STATUS_SERVICE_TOKEN`.
- `services/order-service/src/orders/orders.service.ts` maps customer list, customer detail, admin list, admin detail, and dashboard reads through `mapOrderWithCentralLifecycle()` before returning to frontend callers.
- `services/order-service/src/orders/orders.service.ts` routes changed central-owned admin `status` to Orders admin action using the central order id. It keeps central-owned `paymentStatus` fail-closed with `[MISSING: payment/refund/provider correction workflow]` and leaves notes-only local updates available.
- `services/frontend/lib/api/orders.ts` and the customer/admin order pages render central lifecycle only when `centralOrder.readStatus === 'available'`; otherwise they expose stale/missing central lifecycle notices.
- Runtime action-admin token projection is Auth-issued, Vault-backed, ExternalSecret-synced, and validated from inside the running FlipFlop order-service pod.
- Guarded live smoke created one synthetic central Orders order, read it back, verified `authSubject` persistence, and cancelled it through Orders status cleanup with HTTP 200. Provider/payment call remained false.

## Verdict

FlipFlop customer/admin order UI is source-proven to read central Orders lifecycle for order list/detail pages and dashboard recent-order widgets.

The previous local-authority admin status drift gap is closed: central-owned status actions no longer directly write local lifecycle truth and instead route to the Orders-owned admin action endpoint with Auth-issued action-admin authority.

The previous runtime blocker is closed: Auth can issue `internal:orders-microservice:action-admin`, Vault contains the rotated `ORDERS_STATUS_SERVICE_TOKEN`, FlipFlop projects it, and guarded create/read/cancel proof passed.

## Remaining Gaps And Blockers

1. `[MISSING: payment/refund/provider correction workflow]` Central-owned `paymentStatus` corrections remain intentionally fail-closed. This is outside W6 lifecycle status authority and must be handled by a payment/refund/provider-owned workflow.

2. `[MISSING: live customer/admin browser session smoke]` Source and API/runtime smoke passed. No raw customer/admin browser session smoke was run in this W6 pass.

3. `[RESOLVED: Auth runtime projection evidence committed]` `auth-microservice` committed `reports/validation/VAL-W6B-orders-action-admin-runtime-projection-2026-07-06.md` as `ddbde1c docs: record W6B action-admin runtime projection`.

## Parallel Execution Handoff

| Workstream | Status | Owner role | Objective | Allowed files | Forbidden files | Dependencies/blockers | Validation evidence | Handoff notes |
|---|---|---|---|---|---|---|---|---|
| W6 FlipFlop source authority | complete | FlipFlop commerce owner | Prove UI central lifecycle reads and route central-owned status to Orders | shared Orders client, order-service admin status path, frontend order/admin pages, verifiers/docs/reports | checkout/payment/provider mutations | none | three FlipFlop verifiers pass | Source complete on `main` |
| Auth action-admin seed | complete | Auth RBAC owner | Seed `internal:orders-microservice:action-admin` so Auth can issue a compliant action token | Auth role seed/verifier | direct Orders DB mutation | none | `verify:orders-action-admin-rbac-seed` pass; Auth commits `2047a91`, `ddbde1c` | Complete |
| Runtime action token rotation | complete | Auth/FlipFlop runtime owner | Emit action-admin JWT without printing it, patch Vault, refresh ExternalSecret, restart only `flipflop-order-service` | Vault secret path and FlipFlop deployment restart | raw token output, broad secret dumps | none | Auth validation booleans from pod | Complete |
| Synthetic order cleanup proof | complete | Orders validation owner | Cancel synthetic central order through Orders status action path | redacted smoke/report only | direct DB updates, local FlipFlop status writes, payment/provider calls | none | cleanup HTTP 201 for prior row; fresh smoke cleanup HTTP 200 | Complete |
| W7 final integration | ready | Orchestrator | Merge W6 runtime-complete evidence into lifecycle master status | docs/reports | code/schema changes | W6 report complete | completion audit/runtime-gate verifiers | Run after this commit |

Shared contracts: Orders admin lifecycle action contract, Auth-owned RBAC roles, Vault-backed `ORDERS_STATUS_SERVICE_TOKEN`, central Orders lifecycle read model, `centralOrder.readStatus`, admin payment correction fail-closed policy.

Integration owner: original orders-lifecycle orchestrator.

Validation owner: W6 FlipFlop owner for source verifiers; Auth RBAC owner for role seed; Orders validation owner for runtime cleanup proof.

Merge order: Auth role seed -> action-admin token rotation -> synthetic order cleanup proof -> W7 final integration update. First three are complete.

## Deployment

No application image deploy was run. Runtime operations performed: Auth DB role assignment via approved helper, Auth-issued JWT generation to 0600 temp file, Vault key patch, ExternalSecret refresh, and `flipflop-order-service` restart. No token value, raw order id, customer data, payment/provider data, request body, or response body was printed.
