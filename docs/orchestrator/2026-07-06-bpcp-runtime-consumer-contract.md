# BPCP Runtime Consumer Contract For FlipFlop Customer Journey

Date: 2026-07-06
Status: source-ready; runtime activation blocked

## Intent Preservation Chain

- Vision: FlipFlop customer journeys should be governed by an editable business-process control plane without hiding checkout, payment, order, delivery, email, or marketing risk.
- Goal Impact: FlipFlop can read the deployed BPCP process registry and treat `flipflop.successful_customer_journey.v1` as governed metadata before any runtime orchestration or AI optimization is allowed.
- System: `business-process-control-plane` owns process definitions and lifecycle; FlipFlop remains a runtime consumer and event producer.
- Feature: Read-only BPCP runtime consumer contract for the successful customer journey draft.
- Task: Define the first FlipFlop consumer boundary against deployed BPCP while preserving draft/fail-closed behavior.
- Execution Plan: Verify the deployed BPCP process by read-only GET, require draft status, require missing policy/workflow refs to block activation, and forbid checkout/payment/order/provider mutation in this lane.
- Coding Prompt: Add only source/read-only consumer contract validation; do not publish, schedule, activate, or mutate the BPCP process or FlipFlop checkout runtime.
- Code: `docs/orchestrator/2026-07-06-bpcp-runtime-consumer-contract.md`, `scripts/verify-bpcp-runtime-consumer-contract.js`, `package.json`.
- Validation: `npm run verify:bpcp-runtime-consumer-contract`; `RUN_BPCP_RUNTIME_CONSUMER_LIVE=1 npm run verify:bpcp-runtime-consumer-contract`; `git diff --check`.

## Deployed BPCP Runtime Contract

Canonical process key: `flipflop.successful_customer_journey.v1`.

Canonical BPCP endpoint shape:

- `GET /api/processes/flipflop.successful_customer_journey.v1/versions/1`
- `GET /api/events/transport/info`

Required current runtime state:

- `processId` is `flipflop.successful_customer_journey.v1`
- `version` is `1`
- `status` is `draft`
- `policyRefs` is empty until a BPCP policy owner supplies approved refs
- `workflowRefs` is empty until a BPCP workflow owner supplies approved refs
- `killSwitch` is `true`
- runtime transport may be ready, but process activation remains blocked

## Consumer Boundary

FlipFlop may consume the BPCP draft for:

- read-only process discovery
- journey correlation planning
- event producer alignment
- fail-closed runtime readiness checks
- validation reports and dashboards that show the draft/blocker state

FlipFlop must not use this draft for:

- checkout orchestration
- payment/provider decisions
- order status mutation
- stock or warehouse mutation
- delivery/courier mutation
- email or marketing side effects
- AI optimization decisions
- active customer-facing behavior

## Fail-Closed Rules

The FlipFlop consumer must block runtime use when any of these are true:

- BPCP process lookup fails
- process status is not `active`
- process key or version differs from the expected contract
- `policyRefs` is empty
- `workflowRefs` is empty
- process validation is false or missing for active use
- process owner, approver, publisher, or runtime reader identity is `[MISSING: ...]`
- BPCP runtime is unreachable and no explicitly approved cached active definition exists

Current expected result: blocked, because the deployed BPCP process is `draft` and has empty `policyRefs` and `workflowRefs`.

## Explicit Non-Goals

- No process activation.
- No BPCP `POST /publish`, `POST /schedule`, or `POST /validate` from this verifier.
- No checkout submission.
- No order creation.
- No payment initiation.
- No provider call.
- No stock reservation.
- No email send.
- No marketing handoff.
- No database write.
- No secret, token, raw PII, raw order, raw payment, or provider payload output.

## Runtime Evidence

Read-only runtime evidence must be gathered through the deployed BPCP pod in namespace `statex-apps`.

The verifier supports live read-only validation when `RUN_BPCP_RUNTIME_CONSUMER_LIVE=1` is set. It performs only GET requests and must not call BPCP mutation endpoints.

Expected live-read assertions:

- BPCP deployment is reachable through its pod.
- `GET /health` succeeds.
- `GET /api/processes/flipflop.successful_customer_journey.v1/versions/1` returns the draft process.
- `GET /api/events/transport/info` returns a transport info payload.
- The verifier reports `runtimeMutation=false`.

## Remaining Blockers

- `[MISSING: approved FlipFlop process-owner role and approval authority]`
- `[MISSING: concrete P2 runtime integration owner identity]`
- `[MISSING: concrete P3 target validation owner identity]`
- `[MISSING: approved BPCP policyRefs for flipflop.successful_customer_journey.v1]`
- `[MISSING: approved BPCP workflowRefs for flipflop.successful_customer_journey.v1]`
- `[MISSING: FlipFlop runtime_reader service identity and RBAC mapping]`
- `[MISSING: production runtime projection/caching decision for BPCP process reads]`
- `[UNKNOWN: whether the first release needs durable long-running orchestration or only governed process-state lookup]`

## Parallel Execution

| Workstream | Status | Owner role | Scope | Allowed files | Forbidden files | Validation owner | Merge order |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 package stewardship | active elsewhere | P1 process-registry lane | Maintain draft package and owner routing | `process-registry/packages/flipflop-process-registry-v0.1.0/**` | FlipFlop runtime code, deploy scripts | P1 validation owner | before runtime activation |
| P2 consumer contract | ready now | FlipFlop runtime integration owner | Read-only BPCP draft consumer contract and verifier | this doc, `scripts/verify-bpcp-runtime-consumer-contract.js`, `package.json`, state docs | checkout/payment/order mutation, BPCP mutation endpoints | integration owner | after deployed BPCP draft |
| P3 runtime implementation | dependency-gated | `[MISSING: integration owner]` | Implement runtime process-state read/cache only after owner/RBAC/cache decisions | `[MISSING: allowed files]` | process activation, payment/order/provider behavior | `[MISSING: validation owner]` | after P2 |

## Current Verdict

FlipFlop can safely consume the deployed BPCP process as read-only draft metadata. Runtime orchestration and active behavior remain blocked until the missing owners, policy/workflow refs, runtime reader identity, and projection/caching decisions are resolved.
