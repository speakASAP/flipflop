# VAL-GOAL-24 Auth/Admin Actor And Token Handling - 2026-07-04

```yaml
id: VAL-GOAL-24-AUTH-ADMIN-ACTOR-TOKEN-HANDLING-2026-07-04
status: blocked-owner-input-required
repository: /home/ssf/Documents/Github/flipflop
captured_at: 2026-07-04T00:00:00+02:00
mutation: false
provider_call: false
live_checkout_executed: false
secret_output: false
token_output: false
raw_runtime_payload_output: false
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Goal 24 paid/provider validation can run only with an auditable Auth-owned admin identity and a token-handling path that does not expose credentials, tokens, customer data, order data, payment data, or provider payloads.
- Goal Impact: narrows `[MISSING: named admin/actor or approved token-handling path]` into exact owner input requirements while preserving the paid/provider hard stop.
- System: Auth owns identity, JWT issuance, and RBAC role claims; FlipFlop owns the guarded discount-code endpoint and channel cleanup evidence; Catalog owns the Goal 24 integration packet.
- Feature: source-only auth/admin actor and token-handling lane for guarded Goal 24 discount-code generation.
- Task: inspect Auth, FlipFlop, Catalog docs/source and record whether a durable actor/token path is source-proven.
- Execution Plan: docs/verifier only; no user creation, role assignment, login, token retrieval, discount-code creation, checkout, provider call, Orders mutation, Warehouse mutation, deploy, migration, or secret read.
- Coding Prompt: do not invent actor ownership; keep `[MISSING: ...]` until a named owner supplies non-secret values and an approved non-printing token path.
- Code: this report plus Goal 24 approval draft/status/verifier markers.
- Validation: static verifier and `git diff --check`; no live auth or commerce action.
- State Update: source narrows the approved token-handling shape, but runtime remains blocked by missing named actor and runtime owner.

## Repos Inspected

- `/home/ssf/Documents/Github/auth-microservice`: Auth docs confirm Auth owns JWTs/RBAC roles, tokens must never be logged or persisted in docs, and consumers must not mint Auth user tokens locally.
- `/home/ssf/Documents/Github/flipflop`: `POST /api/admin/marketing/discount-codes` is guarded by `JwtAuthGuard`, `RolesGuard`, and roles `global:superadmin` or `app:flipflop-service:admin`.
- `/home/ssf/Documents/Github/catalog-microservice`: Goal 24 packet requires a named runtime validation owner, hard-stop authority, and sanitized evidence policy before any paid/provider smoke.

## Source-Proven Decisions

- `[RESOLVED/NARROWED: guarded Goal 24 discount-code generation must use an Auth-issued user access token carrying global:superadmin or app:flipflop-service:admin; service tokens/API keys are not approved user actor substitutes]`.
- `[RESOLVED/NARROWED: approved token-handling shape is token file or in-process environment material read only by the final approved runner, never printed, never decoded into reports, never committed, and removed after the run]`.
- `[RESOLVED/NARROWED: sanitized auth evidence may record only auth endpoint status class, token-present boolean, role-check boolean, actor label/hash, approval id, and timestamps]`.

Service tokens/API keys are not approved user actor substitutes.

These decisions do not name the actor and do not authorize runtime execution.

## Required Owner Inputs

Before the final Goal 24 paid/provider smoke can create the guarded one-use discount code, the owner packet must provide all of the following non-secret fields:

- `[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]`.
- `[MISSING: named runtime validation owner with authority to stop before each side effect]`.
- `[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]`.
- `[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]`.
- `[MISSING: non-secret approval id and renewed execution window for the exact side-effectful smoke]`.

## Forbidden Paths

- Do not create users, assign roles, mint Auth JWTs locally, reuse machine/service tokens as a human admin actor, paste bearer tokens into shell history/chat/docs, decode JWTs into reports, print Authorization headers, or persist cookies.
- Do not read raw customer/order/payment/provider payloads or raw DB rows for actor proof.
- Do not generate a discount code, checkout, payment, provider callback, Orders status change, Warehouse reservation/cleanup, channel cleanup, deploy, or migration from this lane.

## Sanitized Evidence Path

Allowed final smoke auth/admin evidence:

- non-secret approval id and execution-window timestamps;
- named actor label or irreversible short hash supplied by owner;
- guarded endpoint route name and HTTP status class;
- `tokenPresent=true` without value;
- `requiredAdminRolePresent=true` without decoded JWT body;
- `discountCodeCreated=true` only after the full paid/provider packet is otherwise complete;
- redacted discount-code hash and `maxUses/remainingUses` counts, never the raw code.

Forbidden evidence:

- bearer tokens, refresh tokens, cookies, decoded JWTs, passwords, Auth DB rows, raw role-assignment rows, Authorization headers, customer identifiers, raw order ids, raw payment ids, provider payloads, bank data, screenshots containing private data, or full request/response bodies.

If proof requires any forbidden evidence, stop before discount-code generation and record `[MISSING: sanitized auth/admin evidence path for guarded discount-code generation]`.

## Decision

Runtime remains blocked. No durable owner identity was source-proven in the inspected repos. The exact next blocker is `[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]` plus `[MISSING: named runtime validation owner with authority to stop before each side effect]` and the approved non-printing token-source path.


## 2026-07-04 Sanitized Auth Admin Actor Readback

[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]

Remaining hard stops: `[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]`; `[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]`; `[MISSING: sanitized auth/admin evidence path for guarded discount-code generation]`. No user creation, role assignment, login, token issuance/output, discount code, checkout, payment, provider call, Orders/Warehouse/channel mutation, deploy, migration, raw email/user id/DB row, or raw customer/order/payment/provider evidence occurred.
