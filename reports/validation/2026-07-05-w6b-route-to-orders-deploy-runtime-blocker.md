# W6-B Route-to-Orders Deploy Runtime Blocker Handoff

Date: 2026-07-05 Europe/Prague
Agent role: W6-B Admin status authority contract agent
Repositories: `/home/ssf/Documents/Github/flipflop`, `/home/ssf/Documents/Github/orders-microservice`
Runtime boundary: no secrets/tokens/raw customer/payment/provider payloads printed; no direct DB cleanup; no payment/provider/checkout mutation.

## Intent Preservation Chain

Vision -> Error-free Orders lifecycle with one central lifecycle authority.

Goal Impact -> FlipFlop central-owned admin status changes are deployed to route through Orders-owned lifecycle authority instead of local Prisma lifecycle writes.

System -> FlipFlop consumes Orders admin lifecycle action contract; Auth owns the action-admin actor/role token; Orders owns transition validation/audit.

Feature -> Central-owned FlipFlop admin status update path uses `POST /api/admin/operations/actions/order-status` through `ORDERS_STATUS_SERVICE_TOKEN`.

Task -> Deploy the source-complete route-to-Orders wiring and run safe redacted runtime proof; do not invent or bypass the action-admin contract.

Execution Plan -> Run FlipFlop deploy, verify active pod image digest, run public probes, run non-mutating Orders auth-subject smoke preflight, rerun focused verifiers, and record runtime blockers if the action-admin token/role is not compliant.

Coding Prompt -> No additional runtime code changes in this pass; only deploy the already committed source and write validation handoff evidence.

Code -> Deployed FlipFlop `main` commit `620ba17` plus targeted runtime image pin for `flipflop-order-service` to pushed digest `sha256:861047a762142a434025365972539a0cc4b22bde23f351f662f9196b157254ea` after the tag-based deploy script left the old order pod active.

Validation -> See command evidence below.

## Verdict

Status: `deployed-source-runtime-gated`.

The FlipFlop source wiring is deployed for `flipflop-order-service` and `flipflop-frontend`; public probes pass, and non-mutating runtime preflight proves the deployed order-service sees `ORDERS_SERVICE_URL`, `ORDERS_SERVICE_TOKEN`, and `ORDERS_STATUS_SERVICE_TOKEN`.

Full live admin lifecycle action proof remains blocked. Existing evidence shows the current projected status token is not accepted as Orders action-admin for cleanup/action mutation: the prior guarded create/read smoke reached central Orders but cleanup returned HTTP `403`, and the W6 centralization report records Auth helper dry-run failure: `Role not found for internal:orders-microservice:action-admin. Run seed first.`

## Dirty Worktree State

Before this report:

```text
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && git status --short --branch'
## main...origin/main
?? reports/validation/2026-07-05-w6b-route-to-orders-deploy-runtime-blocker.md
```

Expected after commit/push of this report: clean `main...origin/main`.

## Deploy Evidence

Command:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && ./scripts/deploy.sh'
```

Result summary:

- Preflight passed.
- Images were built and pushed.
- `flipflop-order-service` image pushed with digest `sha256:861047a762142a434025365972539a0cc4b22bde23f351f662f9196b157254ea`.
- Kubernetes manifests applied and rollouts started.
- Deploy script exited non-zero because rollout wait timed out while image pulls/old replica termination were still in progress.

Follow-up public probe during transition:

```bash
ssh alfares 'curl -fsS --max-time 10 https://flipflop.alfares.cz/ >/dev/null && echo public_home_ok; curl -fsS --max-time 10 "https://flipflop.alfares.cz/api/products?limit=1" >/dev/null && echo public_products_ok'
```

Result:

```text
public_home_ok
public_products_ok
```

## Runtime Image Correction Evidence

Initial digest-level check showed `flipflop-order-service` was still serving the previous digest while the new pod was pending/terminating:

```text
flipflop-order-service-6864454747-nh9j4 status=Running imageID=localhost:5000/flipflop-order-service@sha256:5aa80e87f02be06e01cce58f4868ebb8a0c7913941645ab2c3e08be35676db46
```

Targeted runtime correction:

```bash
ssh alfares 'kubectl set image deployment/flipflop-order-service order-service=localhost:5000/flipflop-order-service@sha256:861047a762142a434025365972539a0cc4b22bde23f351f662f9196b157254ea -n statex-apps && kubectl rollout status deployment/flipflop-order-service -n statex-apps --timeout=240s'
```

Result:

```text
deployment.apps/flipflop-order-service image updated
deployment "flipflop-order-service" successfully rolled out
```

Final settled pod check:

```text
flipflop-order-service-788bc76cb5-ngxwj phase=Running deletion= ready=true imageID=localhost:5000/flipflop-order-service@sha256:861047a762142a434025365972539a0cc4b22bde23f351f662f9196b157254ea
```

## Safe Runtime Preflight

Command:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && WRITE_AUTH_SUBJECT_SMOKE_REPORT=0 node scripts/smoke-orders-auth-subject.js'
```

Result summary:

```json
{
  "ok": false,
  "mutation": false,
  "providerCall": false,
  "preflight": {
    "deploymentReady": "1/1",
    "deploymentAvailable": "1/1",
    "image": "localhost:5000/flipflop-order-service@sha256:861047a762142a434025365972539a0cc4b22bde23f351f662f9196b157254ea",
    "podEnv": {
      "ORDERS_SERVICE_URL": true,
      "ORDERS_SERVICE_TOKEN": true,
      "ORDERS_STATUS_SERVICE_TOKEN": true
    },
    "blockers": []
  },
  "blockers": [
    "[MISSING: RUN_LIVE_AUTH_SUBJECT_ORDERS_SMOKE=1]",
    "[MISSING: AUTH_SUBJECT_SMOKE_APPROVAL_ID]",
    "[MISSING: AUTH_SUBJECT_SMOKE_CONFIRM=CREATE_READ_OPTIONAL_CANCEL]"
  ]
}
```

Interpretation: deployed runtime has the required env projections. The smoke correctly refused mutation without the per-run live flags/fixture inputs.

## Existing Runtime Blocker Evidence

Command:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && node -e "const fs=require(\"fs\"); for (const f of [\"reports/validation/orders-auth-subject-smoke/report-goal10-create-read-cancel-20260703.json\",\"reports/validation/orders-auth-subject-smoke/report-latest.json\"]) { const r=JSON.parse(fs.readFileSync(f,\"utf8\")); console.log(f, JSON.stringify({ok:r.ok, mutation:r.mutation, providerCall:r.providerCall, preflight:r.preflight, result:r.result, blockers:r.blockers}, null, 2)); }"'
```

Result summary:

- Historical approved smoke `report-goal10-create-read-cancel-20260703.json`: create `201`, read `200`, `authSubjectPersisted=true`, cleanup `200`.
- Latest stored live attempt `report-latest.json`: create `201`, read `200`, `authSubjectPersisted=true`, cleanup attempted but returned `403`, blocker `[MISSING: runtime cleanup cancelled synthetic Orders order]`.

Additional source evidence already recorded in `docs/orchestrator/2026-07-05-w6-flipflop-centralization-gap-report.md`:

- Orders action contract requires `global:superadmin` or `internal:orders-microservice:action-admin`.
- Auth helper dry-run for `internal:orders-microservice:action-admin` failed with `Role not found for internal:orders-microservice:action-admin. Run seed first.`

## Focused Verifier Evidence

Command:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && npm run verify:admin-status-central-authority && npm run verify:w6b-admin-status-authority-contract && git diff --check'
```

Result:

```text
verify:admin-status-central-authority ok=true
verify:w6b-admin-status-authority-contract ok=true
git diff --check passed
```

Verifier details:

- Backend routes central-owned status mutation to Orders admin action route.
- Backend keeps central-owned payment mutation fail-closed.
- Backend leaves notes-only update path available.
- Frontend sends changed central status while avoiding notes-only accidental status submit.
- Frontend keeps payment changes local-only for non-central orders.

## Blockers

1. `[MISSING: Auth runtime role seed for internal:orders-microservice:action-admin]` Auth currently cannot issue a compliant Orders action-admin token for the contract role.
2. `[MISSING: approved action-admin token projection after role seed]` `ORDERS_STATUS_SERVICE_TOKEN` is projected into FlipFlop runtime, but current cleanup/action evidence returned `403`.
3. `[MISSING: runtime cleanup cancelled synthetic Orders order]` Latest stored live create/read attempt left cleanup blocked by `403`; do not direct-DB cleanup because Orders lifecycle authority must own mutation.
4. `[MISSING: full FlipFlop admin route runtime smoke with compliant admin bearer/session and synthetic central order target]` Full admin route proof should wait until action-admin role/token is compliant and the smoke has a disposable synthetic target plus redacted evidence rules.

## Parallel-Ready Next Lanes

| Lane | Status | Owner | Objective | Allowed scope | Forbidden scope | Dependency | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Auth action-admin role seed | ready-now for Auth owner | Auth RBAC owner | Add/seed `internal:orders-microservice:action-admin` so Auth can validate an Orders action-admin actor | Auth role seed/source/docs/verifier | printing tokens, broad secret dumps, direct Orders mutation | none | Auth helper dry-run succeeds for action-admin role without printing token |
| Token rotation/projection | dependency-gated | Auth/FlipFlop runtime owner | Issue compliant action-admin token and update `secret/prod/flipflop-service#ORDERS_STATUS_SERVICE_TOKEN` | runtime secret write, ExternalSecret refresh, `flipflop-order-service` restart | raw token output, unrelated secret changes | Auth role seed | redacted Auth validate role booleans + FlipFlop pod env presence |
| Synthetic cleanup/action proof | blocked | Orders validation owner | Cancel latest synthetic central order or a new disposable synthetic order through Orders admin action route | redacted smoke/report only | DB cleanup, local FlipFlop lifecycle writes, payment/provider calls | compliant token projection | cleanup/action HTTP 2xx, transition/audit readback redacted |
| FlipFlop admin route smoke | blocked final integration | FlipFlop integration owner | Prove `/api/admin/orders/:id/status` routes central-owned status through Orders action contract | one synthetic order/admin session, redacted result report | real customer orders, payment/provider changes, invented admin bearer | compliant action token + synthetic target | HTTP/API result + Orders readback status; no raw IDs/tokens |

## Handoff Notes

- Do not patch FlipFlop to fake central sync or re-enable local central-owned lifecycle writes.
- Do not call Orders status/action mutation again with the current token; existing evidence shows `403` for cleanup/action.
- Keep `flipflop-order-service` pinned to the deployed digest until the deploy script/tag flow is improved or another approved deploy updates it.
- Commit/push this handoff after `git diff --check` passes.
