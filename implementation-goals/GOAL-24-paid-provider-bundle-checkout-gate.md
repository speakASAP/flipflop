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


## 2026-07-04 Autonomous Runtime Ownership Packet

[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]

Runtime side effects remain blocked by named Auth admin actor/token source, human Payments/provider rollback authority, exact payment/order/provider ids or hashes, Orders side-effect acknowledgements, Warehouse target rows/window/max quantity, and final redacted evidence path. This update is docs/verifier governance only and performed no live checkout, payment, provider call, refund/cancel, Orders/Warehouse/channel mutation, deploy, migration, secret/token output, or raw evidence capture.


Goal 24 autonomous runtime ownership packet retained hard stops:
- `[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]`
- `[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]`


## 2026-07-04 Sanitized Auth Admin Actor Readback

[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]

Remaining hard stops: `[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]`; `[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]`; `[MISSING: sanitized auth/admin evidence path for guarded discount-code generation]`. No user creation, role assignment, login, token issuance/output, discount code, checkout, payment, provider call, Orders/Warehouse/channel mutation, deploy, migration, raw email/user id/DB row, or raw customer/order/payment/provider evidence occurred.
