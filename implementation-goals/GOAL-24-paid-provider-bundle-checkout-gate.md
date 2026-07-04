# GOAL-24: Paid Provider Bundle Checkout Gate

```yaml
id: GOAL-24-PAID-PROVIDER-BUNDLE-CHECKOUT-GATE
status: source-policy-validated-runtime-blocked
owner: flipflop-paid-provider-bundle-checkout-readiness-worker
created: 2026-07-03
catalog_contract: catalog.bundle.v1
runtime_progression: source-rollout-enabled-paid-provider-blocked
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: FlipFlop can sell Catalog-backed bundles only when payment, stock, order, and rollback truth remain auditable and provider-backed.
- Goal Impact: the Catalog Goal 24 blocker `[MISSING: owner-approved paid/provider checkout smoke with stock and refund/cancel rollback plan]` is narrowed to explicit owner/provider/runtime prerequisites.
- System: FlipFlop checkout/order-service owns the channel checkout surface; Catalog owns durable `catalog.bundle.v1`; central Orders owns order identity; Warehouse owns component reservations and stock effects; Payments owns provider execution and webhook truth.
- Feature: paid/provider bundle checkout smoke readiness gate.
- Task: assess the existing checkout smoke harness and add non-mutating source-policy verification.
- Execution Plan: docs/verifier/source-policy only; do not run live checkout or mutate runtime state.
- Coding Prompt: fail closed on missing owner approval, provider webhook evidence, stock rollback, or refund/cancel rollback; do not turn display-only `bundleId` evidence into checkout authority.
- Code: this document, `docs/orchestrator/2026-07-03-goal24-channel-cleanup-contract.md`, `scripts/verify-paid-provider-bundle-checkout-gate.js`, package script `verify:paid-provider-bundle-checkout-gate`, `implementation-goals/GOAL-24-catalog-bundle-adoption.md`, `docs/orchestrator/STATUS.md`, and `docs/IMPLEMENTATION_STATE.md`.
- Validation: `npm run verify:paid-provider-bundle-checkout-gate`, `npm run verify:catalog-bundle-adoption`, `node --check scripts/verify-paid-provider-bundle-checkout-gate.js`, and `git diff --check`.
- State Update: runtime paid/provider progression is source-rollout-enabled but paid/provider smoke remains blocked.

## Assessment

The existing `scripts/smoke-checkout.js` is not side-effect-safe for this Goal 24 lane. It:

- reads authentication environment configuration;
- logs in as a test user;
- writes local database seed rows through `kubectl exec ... psql`;
- clears and repopulates cart state;
- submits `POST /orders`;
- expects an order id and payment redirect URL.

The current order-service paths then:

- create a local pending order;
- reserve Warehouse order lines;
- create central Orders before payment;
- call Payments for non-invoice provider methods;
- record payment initiation metadata.

The active authenticated checkout, guest checkout, and legacy `/payu/create-payment/:orderId` paths all fail closed unless central Orders returns a readable UUID. For provider payment creation they send that central Orders UUID as `orderId` and `centralOrderId` to Payments, while the local FlipFlop order id and order number are retained only in bounded payment metadata for callback correlation.

These behaviors are correct for a paid checkout path, but they are not acceptable as an unapproved verifier because they cross order, reservation, provider, and cleanup boundaries.

Resolved/narrowed channel-owned blockers:

- `[RESOLVED: active FlipFlop checkout paths pass central Orders UUIDs to Payments before provider creation]`
- `[RESOLVED/NARROWED: FlipFlop checkout owner owns initiation packet for any future paid catalog.bundle.v1 runtime smoke; execution remains owner-approval gated]`
- `[RESOLVED/NARROWED: FlipFlop checkout cleanup owner owns customer-visible session/cart/local projection cleanup policy; live cleanup evidence remains approval-gated]`
- `[RESOLVED/NARROWED: FlipFlop channel cleanup contract prepared for cart/session/local projection cleanup, idempotency, customer-visible hard stops, and redacted evidence policy; runtime remains blocked]`
- `[RESOLVED/NARROWED: FlipFlop owns exact customer-visible payment-result success/cancel URLs for provider redirects; provider callback evidence still owns payment truth]`
- `[RESOLVED/NARROWED: FlipFlop owns retry-state cleanup policy for payment-result cancelled/failed views; retry-safe execution remains blocked until provider, Orders, Warehouse, and channel cleanup evidence exists]`
- `[RESOLVED/NARROWED: channel cleanup packet is policy-complete for FlipFlop-owned URL, retry, cart/session/local projection duties; runtime remains blocked until named executor, rollback owner, and sanitized evidence path are supplied]`

## Fail-Closed Runtime Contract

Payments rollback packet consumed: `/home/ssf/Documents/Github/payments-microservice/docs/orchestrator/2026-07-03-goal24-owner-approved-rollback-packet.md`. FlipFlop/channel cleanup contract: `docs/orchestrator/2026-07-03-goal24-channel-cleanup-contract.md` (`FLIPFLOP-GOAL24-CHANNEL-CLEANUP-CONTRACT`). Channel cleanup is limited to cart/session/local projection cleanup, idempotency, customer-visible hard stops, and redacted evidence policy; it does not authorize provider, Orders, Warehouse, marketplace, deploy, migration, DB, or secret side effects.


A future live paid/provider bundle smoke may proceed only when all of these are true:

- owner-approved paid/provider test window is recorded;
- non-secret approval id is present in the report;
- target active `catalog.bundle.v1` bundle id and expected component product ids are recorded;
- provider method and callback/webhook route are selected;
- evidence policy is sanitized and excludes tokens, provider payloads, customer data, raw order bodies, and secrets;
- stock rollback plan covers every component line;
- refund/cancel rollback plan is owner-approved and names which system performs provider refund or cancellation plus Orders/Warehouse cleanup;
- durable Catalog `bundleId` checkout migration is explicitly accepted, or the smoke is scoped to existing local bundle intent with Catalog candidate provenance only;
- FlipFlop checkout owner records customer-visible cleanup expectations for cart, session, order-result redirect state, local order projection, retry/cancel messaging, and exact success/cancel URL ownership before the smoke starts.

FlipFlop/channel ownership for a future approved smoke:

- Initiation owner: FlipFlop checkout owner. Scope is storefront/session/cart preparation, selected bundle intent, central Orders pre-payment acceptance proof, and Payments create request proof. This owner must not approve the provider, refund, Warehouse, or Orders cancellation side effects.
- Customer-visible cleanup owner: FlipFlop checkout owner. Scope is clearing or restoring browser/session cart state, local payment-result messaging, local order projection status, and customer retry/cancel guidance after the cross-service rollback packet completes.
- Runtime execution remains blocked unless the owner-approved smoke packet names the provider, amount ceiling, bundle id, evidence redaction policy, Orders cleanup actor/reason, Warehouse cleanup operation, and Payments refund/cancel evidence source.

Until then, runtime paid/provider progression is source-rollout-enabled but paid/provider smoke remains blocked by:

- `[MISSING: owner-approved paid/provider checkout smoke with stock and refund/cancel rollback plan]`
- `[MISSING: owner-approved paid/provider test window, non-secret approval id, target active catalog.bundle.v1 bundle id, provider method, and sanitized evidence policy]`
- `[MISSING: provider webhook/callback evidence that marks the paid order complete without manual payment-state bypass]`
- `[MISSING: Warehouse stock decrement/reservation-release evidence for every bundle component line]`
- `[MISSING: owner-approved refund/cancel rollback plan proving provider refund or cancellation plus Orders/Warehouse cleanup]`
- `[RESOLVED/NARROWED: explicit ecosystem checkout migration accepts durable Catalog bundleId only as bounded bundleEvidence metadata; FlipFlop runtime checkout submission remains blocked]`
- `[RESOLVED/NARROWED: FlipFlop source rollout maps durable catalog.bundle.v1 bundleId into central Orders bundleEvidence without changing totals, stock identity, or provider state]`
- `[MISSING: owner-approved paid/provider checkout smoke packet naming FlipFlop channel cleanup executor and runtime validation owner]`
- `[MISSING: provider rollback proof from Payments before customer-visible success or completed cleanup]`
- `[MISSING: Orders cancellation actor, reason, idempotency key, and side-effect acknowledgements before channel side-effect acknowledgement]`
- `[MISSING: deterministic Warehouse component reservation state and approved cleanup operation before customer-visible stock/restored messaging]`
- `[MISSING: sanitized evidence path for required channel cleanup proof]`
- `[RESOLVED/NARROWED: runtime config readback shows PAYMENT_SUCCESS_URL and PAYMENT_CANCEL_URL resolve to approved FlipFlop payment-result URLs without secret output]`
- `[MISSING: named executor/rollback owner for future Fiobanka paid/provider smoke]`
- `[MISSING: owner-approved channel/customer checkout owner for initiating and cleaning up paid catalog.bundle.v1 runtime smoke]`

## Forbidden Actions

This lane must not:

- run `scripts/smoke-checkout.js`;
- submit checkout;
- follow payment redirects;
- call provider APIs;
- simulate or forge provider webhooks;
- mark payment as paid manually;
- run refunds or cancellations;
- mutate Orders, Warehouse, Payments, Catalog, marketplace, or production database state;
- deploy, run migrations, read secrets, or print private evidence.

## Parallel Execution

| Workstream | Status | Owner role | Scope | Allowed files | Forbidden files | Dependencies | Validation evidence | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A Source-policy verifier | complete | FlipFlop checkout readiness worker | Non-mutating source assertions and package script | `scripts/verify-paid-provider-bundle-checkout-gate.js`, `package.json` | checkout source behavior changes, provider code, deploy scripts, secrets | Current checkout/payment source | `npm run verify:paid-provider-bundle-checkout-gate` | Verifier proves the blocker is preserved. |
| B Goal 24 state/docs | complete | FlipFlop docs owner | Record assessment and blockers | Goal 24 docs, `docs/IMPLEMENTATION_STATE.md` | Catalog/Orders/Warehouse/Payments repos | Catalog Goal 24 contracts/status | strict doc/source gate if needed, `git diff --check` | Runtime remains blocked. |
| C Channel smoke initiation packet | dependency-gated | FlipFlop checkout owner | Prepare owner-approved paid `catalog.bundle.v1` smoke request and customer-visible cleanup expectations | Goal 24 docs/source-policy/verifier and approved smoke report only | provider calls, refund/cancel execution, Warehouse mutation, Orders lifecycle mutation | A+B plus owner-approved runtime packet | `[MISSING: owner-approved paid/provider checkout smoke packet]` | FlipFlop owns initiation and customer-visible cleanup only, not provider/Warehouse/Orders side effects. |
| D Live paid/provider smoke | dependency-gated | Runtime validation owner | Owner-approved one-run runtime smoke | `[MISSING: approved smoke packet]` | unapproved provider/order/stock/refund mutations | A+B+C plus owner/provider evidence | `[MISSING: live runtime evidence]` | Must be a separate approved lane. |

Shared contracts: Catalog `catalog.bundle.v1`, Orders create-order bundle evidence, Warehouse component reservation sign-off, Payments bundle metadata allowlist, and GOAL-13 local bundle intent.

Integration owner: commerce integration validator after owner approval.

Validation owner: FlipFlop checkout readiness worker for source-policy only; runtime validation owner for any later live smoke.

Merge order: source-policy verifier, docs/state update, validation, commit/push. Any future live runtime smoke merges only after Payments, Orders, Warehouse, and channel cleanup packets are complete.

[RESOLVED/NARROWED: owner delegated autonomous Goal 24 continuation to Codex, but integration validation keeps new Fiobanka paid/provider side effects hard-stopped until bank/refund authority, exact Orders/Warehouse packet, and redacted provider proof exist]



## 2026-07-04 Channel Cleanup Owner Supersession

[RESOLVED/NARROWED: Codex Goal 24 integration thread supersedes earlier FlipFlop channel executor/runtime owner blockers; channel cleanup runtime remains blocked until bank/refund authority, exact provider proof, Orders side-effect acknowledgements, Warehouse target facts, Auth token source, and final redacted evidence path exist]

Current runtime owner/channel executor ownership is source-governance resolved by `[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]`. Historical references that requested a named runtime validation owner or FlipFlop channel cleanup executor remain historical pre-supersession evidence. Runtime still cannot start, and FlipFlop still cannot publish customer-visible success/retry-safe cleanup, until bank/refund authority, exact provider/payment/order facts, Orders side-effect acknowledgements, Warehouse target facts, approved Auth token source, and final redacted evidence path are present.

Report: `reports/validation/VAL-GOAL-24-channel-cleanup-owner-supersession-2026-07-04.md`.

## 2026-07-04 Channel Side-Effect Acknowledgement Packet

Decision: `source-defined-runtime-blocked`.

[RESOLVED/NARROWED: FlipFlop channel side-effect acknowledgement packet shape is source-defined; runtime channel acknowledgement remains blocked until selected order hash, provider proof, Orders approval, Warehouse approval, idempotency key, cleanup evidence, and final redacted evidence path exist]

FlipFlop may set or attest `sideEffectsHandled.channel=true` for a future Orders cancellation packet only after all of these selected-order facts exist for the same sanitized central order hash:

- Payments has supplied provider rollback proof hash or an owner-approved unpaid no-provider-cancel acknowledgement.
- Orders has supplied the target order hash/state, named cancellation actor or `approvedBy`, safe Goal 24 reason code, approved route, and cleanup idempotency key.
- Warehouse has supplied the observed component-line operation matrix, live target row readback, renewed hold/release window, and final mutation approval.
- FlipFlop has redacted evidence that synthetic smoke cart entries, checkout/session/payment-result correlation, and local customer-visible projection state were cleared, restored, or moved to blocked/manual-review state according to the approved packet.
- The channel cleanup idempotency key uses the source-defined namespace `channel:goal24:checkout-cleanup:<approvalId>:<paymentHash>` and is unused before the side effect or replayed only for the same request hash.
- Final evidence contains only hashes, status classes, booleans, counts, route names, timestamps, approval id, and no-output flags.

Runtime blockers preserved:

- [MISSING: owner-approved channel side-effect acknowledgement for the selected central order hash]
- [MISSING: selected central order hash and FlipFlop local order/session correlation for channel cleanup acknowledgement]
- [MISSING: redacted channel cleanup evidence proving synthetic cart/session/payment-result/local projection cleanup for the selected central order hash]
- [MISSING: channel cleanup idempotency key derived from approval id and sanitized payment/order hash]
- `[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]`

FlipFlop must not infer provider rollback from `/payment-result`, must not infer Orders cancellation from local projection state, and must not infer Warehouse stock effects from Payments refund state, Auth token state, or channel cleanup state. Customer-visible success or retry-safe state remains blocked until the exact provider, Orders, Warehouse, and channel evidence packets are all complete.




## 2026-07-04 Warehouse Target Facts Wording Sync

[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]

Runtime Warehouse side effects remain blocked by [MISSING: renewed owner-approved execution window and Warehouse hold/release duration], [MISSING: live current target row readback at execution time], [MISSING: final owner approval before any live Warehouse reservation/cleanup mutation], deterministic Warehouse component reservation state, Orders side-effect acknowledgements, Payments bank/refund authority, Auth token source, and final redacted evidence path. This is source/docs/verifier evidence only and does not authorize live checkout, payment/provider calls, Orders mutation, Warehouse mutation, channel cleanup, deploy, migration, DB write, token/secret output, or raw evidence capture.

## 2026-07-04 Autonomous Runtime Ownership Packet

[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]

Runtime side effects remain blocked by named Auth admin actor/token source, human Payments/provider rollback authority, exact payment/order/provider ids or hashes, Orders side-effect acknowledgements, Warehouse candidate target rows/max quantity are source-documented while live row readback/window/final approval remain missing, and final redacted evidence path. This update is docs/verifier governance only and performed no live checkout, payment, provider call, refund/cancel, Orders/Warehouse/channel mutation, deploy, migration, secret/token output, or raw evidence capture.


Goal 24 autonomous runtime ownership packet retained hard stops:
- `[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]`
- `[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]`


## 2026-07-04 Sanitized Auth Admin Actor Readback

[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]

Remaining hard stops: `[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]`; `[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]`; `[MISSING: sanitized auth/admin evidence path for guarded discount-code generation]`. No user creation, role assignment, login, token issuance/output, discount code, checkout, payment, provider call, Orders/Warehouse/channel mutation, deploy, migration, raw email/user id/DB row, or raw customer/order/payment/provider evidence occurred.

## 2026-07-04 Token Binding Proof Contract

[RESOLVED/NARROWED: Goal 24 token-binding proof may record only token-present, Auth validation status class, actor-hash match, required-role boolean, approval id, runner id, timestamps, and no-output booleans]

[RESOLVED/NARROWED: Goal 24 approved token source shape is owner-approved on-host token file or in-memory handoff read only by the approved runner, never printed, never decoded into reports, never persisted, never committed, and removed or invalidated after the run]

[RESOLVED/NARROWED: Goal 24 Auth token binding does not authorize Orders, Warehouse, Payments/provider, or channel side effects and does not prove stock effects]

Runtime remains blocked by `[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]`, `[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]`, and `[MISSING: sanitized auth/admin evidence path for guarded discount-code generation]`. This update is source-only and performed no live Auth login, token issuance, token file read, decoded JWT, discount-code creation, checkout, payment, provider call, Orders/Warehouse/channel mutation, deploy, migration, secret output, or raw evidence capture.

Allowed source type markers for verifiers: `tokenSourceType=on-host-token-file`; `tokenSourceType=in-memory-handoff`; `actorHashMatches=true`; `requiredAdminRolePresent=true`; `tokenOutput=false`; `decodedJwtOutput=false`; `rawUserOutput=false`; `secretOutput=false`; `tokenSourceDestroyedOrInvalidated=true`.

Auth token-binding proof is not Warehouse stock evidence and is not Orders cleanup authorization.

## 2026-07-04 Current Source-Governance Head Sync Wave C

[RESOLVED/NARROWED: Goal 24 source-governance wave GOAL24-SOURCE-WAVE-2026-07-04C input set records Auth `2faf719 docs: complete goal10 customer data wallet rollout`, Catalog `b20e95b merge goal24 catalog source wave c`, FlipFlop `2310c90 merge goal24 flipflop stale blocker wording sync`, Payments `080f293 merge goal24 payments source wave c`, Orders `d32abd2 merge goal24 orders source wave c`, and Warehouse `ea7b9e9 merge goal24 warehouse cleanup packet readback sync` as Wave C input heads for renewed runtime planning; post-merge source-sync commits are validation evidence only; runtime checkout/channel side effects remain blocked]

Wave C supersedes Wave B for renewed runtime planning only. It does not authorize checkout, payment creation, provider calls, refund/reversal, Orders mutation, Warehouse mutation, channel cleanup, deploy, migration, DB write, secret/token output, raw customer/order/payment/provider evidence, or marketplace state change. Runtime remains blocked by `[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]`, `[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]`, `[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]`, `[MISSING: Orders cancellation actor, reason, idempotency key, and side-effect acknowledgements before channel side-effect acknowledgement]`, `[MISSING: live current target row readback at execution time]`, `[MISSING: renewed owner-approved execution window and Warehouse hold/release duration]`, `[MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]`, and `[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]`.

### Operative Runtime Hard Stops

The broad paid/provider smoke blockers remain umbrella context only. Current runtime planning must fail closed on the exact packets below before any checkout/channel side effect:

- `[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]`
- `[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]`
- `[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]`
- `[MISSING: Orders cancellation actor, reason, idempotency key, and side-effect acknowledgements before channel side-effect acknowledgement]`
- `[MISSING: live current target row readback at execution time]`
- `[MISSING: renewed owner-approved execution window and Warehouse hold/release duration]`
- `[MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]`
- `[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]`
