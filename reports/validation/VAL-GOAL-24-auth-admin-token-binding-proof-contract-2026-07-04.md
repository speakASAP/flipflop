# VAL-GOAL-24 Auth Admin Token Binding Proof Contract - 2026-07-04

```yaml
id: VAL-GOAL-24-AUTH-ADMIN-TOKEN-BINDING-PROOF-CONTRACT-2026-07-04
status: source-contract-ready-runtime-token-source-blocked
repository: /home/ssf/Documents/Github/flipflop
captured_at: 2026-07-04T00:00:00+02:00
mutation: false
live_auth_login: false
token_issuance: false
token_output: false
decoded_jwt_output: false
secret_output: false
raw_user_output: false
provider_call: false
live_checkout_executed: false
orders_mutation: false
warehouse_mutation: false
channel_cleanup_mutation: false
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Goal 24 paid/provider validation can create a guarded FlipFlop admin discount fixture only when Auth-owned user identity and RBAC token binding are proven without exposing token material.
- Goal Impact: narrows the token-to-actor blocker into exact redacted proof fields while preserving the runtime hard stop until an owner supplies the token source and binding evidence.
- System: Auth owns identity, JWT issuance/validation, and RBAC role claims; FlipFlop owns the guarded admin discount-code endpoint and channel cleanup evidence; Catalog/Payments/Orders/Warehouse consume only sanitized proof.
- Feature: source-only token binding proof contract for guarded Goal 24 discount-code generation.
- Task: define the no-print/no-decode/no-persist token source and token-to-actor proof that a future approved runner must satisfy.
- Execution Plan: docs/verifier only; no user creation, role assignment, login, token issuance, token file read, discount code, checkout, provider call, Orders/Warehouse/channel mutation, deploy, migration, DB read/write, or secret output.
- Coding Prompt: do not infer token binding from actor existence, service tokens, Payments refund state, provider state, Orders state, or Warehouse state; keep `[MISSING: ...]` until the exact runtime proof exists.
- Code: this report plus Goal 24 status/state/goal/verifier markers.
- Validation: static verifier and `git diff --check`; no live auth or commerce action.
- State Update: token-binding proof shape is source-defined; runtime remains blocked by approved token source and token-binding proof.

## Source Inputs

- `[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]`.
- `[RESOLVED/NARROWED: guarded Goal 24 discount-code generation must use an Auth-issued user access token carrying global:superadmin or app:flipflop-service:admin; service tokens/API keys are not approved user actor substitutes]`.
- `[RESOLVED/NARROWED: approved token-handling shape is token file or in-process environment material read only by the final approved runner, never printed, never decoded into reports, never committed, and removed after the run]`.

## Source-Proven Token Binding Proof Contract

- `[RESOLVED/NARROWED: Goal 24 token-binding proof may record only token-present, Auth validation status class, actor-hash match, required-role boolean, approval id, runner id, timestamps, and no-output booleans]`.
- `[RESOLVED/NARROWED: Goal 24 approved token source shape is owner-approved on-host token file or in-memory handoff read only by the approved runner, never printed, never decoded into reports, never persisted, never committed, and removed or invalidated after the run]`.
- `[RESOLVED/NARROWED: Goal 24 Auth token binding does not authorize Orders, Warehouse, Payments/provider, or channel side effects and does not prove stock effects]`.

The future runtime packet may satisfy the token-source blocker only with one of these owner-approved non-printing handoffs:

- `tokenSourceType=on-host-token-file`: an execution-host path readable only by the approved runner, never echoed, never copied to repo/docs/chat/logs, and removed or invalidated after the run.
- `tokenSourceType=in-memory-handoff`: token material passed directly to the approved runner process without shell history, terminal echo, file persistence, decoded JWT report, or chat/docs/log copy.

The future runtime packet must provide these non-secret fields before any side effect:

- `approvalId`: owner approval id for this exact Goal 24 runtime window.
- `executionWindow`: exact Europe/Prague start and expiry timestamps.
- `actorHash`: `4215870ba488de17` or a newer owner-approved irreversible hash.
- `requiredRole`: `app:flipflop-service:admin` or `global:superadmin`.
- `tokenSourceType`: `on-host-token-file` or `in-memory-handoff`.
- `tokenSourceReference`: non-secret label or path descriptor that does not reveal token material.
- `runnerId`: approved runner/process owner with authority to stop before each side effect.

Allowed redacted proof fields only:

- `tokenPresent=true` without token value, prefix, suffix, length, header, or token hash.
- `authValidationStatusClass=2xx` or fail-closed non-2xx class, without response body.
- `actorHashMatches=true` for `4215870ba488de17` or the owner-approved replacement hash.
- `requiredAdminRolePresent=true` for `app:flipflop-service:admin` or `global:superadmin`.
- `tokenOutput=false`, `decodedJwtOutput=false`, `rawUserOutput=false`, `secretOutput=false`.
- `tokenSourceDestroyedOrInvalidated=true` when applicable, with no token details.

## Preserved Runtime Blockers

- `[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]`.
- `[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]`.
- `[MISSING: sanitized auth/admin evidence path for guarded discount-code generation]` if the runner cannot record only the allowed redacted proof fields.

## Forbidden Paths

- Do not create users, assign roles, mint Auth JWTs locally, reuse machine/service tokens as a human admin actor, paste bearer tokens into shell history/chat/docs, decode JWTs into reports, print Authorization headers, persist cookies, or record token lengths/hashes.
- Service tokens, API keys, internal service JWTs, `x-internal-token`, provider tokens, and Vault read credentials are not Auth user actor substitutes for the FlipFlop admin route.
- Do not infer Auth token binding from Payments refund state, provider state, Orders cleanup state, Warehouse stock state, or channel cleanup state.
- Do not read raw customer/order/payment/provider payloads, raw DB rows, raw user ids, raw emails, role-assignment rows, Authorization headers, cookies, or full request/response bodies for actor proof.

## Orders/Warehouse Handoff Boundary

Auth token-binding proof is not Warehouse stock evidence and is not Orders cleanup authorization. Orders still requires exact cancellation actor/approvedBy, reason, idempotency keys, selected order hash/state, sideEffectsHandled acknowledgements, and the Orders-to-Warehouse handoff packet before any route invocation. Warehouse stock effects must come from Warehouse-owned target rows/window/quantity evidence, not from Payments refund or Auth token state.

## Decision

Runtime remains blocked. This source contract defines the only acceptable token-binding proof shape; it does not supply, read, validate, print, decode, persist, or approve token material.
