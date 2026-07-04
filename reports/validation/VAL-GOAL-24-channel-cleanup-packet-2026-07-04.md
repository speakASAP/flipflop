# Goal 24 Channel Cleanup Packet Validation - 2026-07-04

```yaml
id: VAL-GOAL-24-CHANNEL-CLEANUP-PACKET-2026-07-04
status: policy-complete-runtime-blocked
repository: /home/ssf/Documents/Github/flipflop
scope: FlipFlop channel/customer checkout ownership for future paid catalog.bundle.v1 smoke
mutation: false
live_checkout_executed: false
provider_call: false
orders_mutation: false
warehouse_mutation: false
deployment: false
secret_output: false
raw_customer_or_payment_evidence: false
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: a future Fiobanka paid/provider `catalog.bundle.v1` smoke can proceed only when customer-visible channel state and rollback ownership are named before side effects.
- Goal Impact: the FlipFlop-owned channel duties are now precise at policy level, but the runtime blocker remains preserved until the owner names an executor, rollback owner, and sanitized evidence path.
- System: FlipFlop owns storefront checkout initiation, customer-visible success/cancel redirect URLs, payment-result retry state, synthetic cart/session cleanup, and local order projection messaging; Payments, Orders, and Warehouse own provider, lifecycle, and stock cleanup truth.
- Feature: channel cleanup packet close/preserve pass.
- Task: record the exact channel/customer checkout duties and prove the packet does not authorize runtime checkout/payment creation.
- Execution Plan: docs/verifier/report only; no live checkout, provider call, Orders mutation, Warehouse mutation, DB write, deploy, secret read, or raw evidence capture.
- Coding Prompt: fail closed; preserve `[MISSING: ...]` markers for unnamed channel owner/executor, rollback owner, runtime validation owner, and sanitized evidence path.
- Code: `docs/orchestrator/2026-07-03-goal24-channel-cleanup-contract.md`, `docs/orchestrator/2026-07-03-goal24-paid-provider-smoke-approval-draft.md`, `implementation-goals/GOAL-24-paid-provider-bundle-checkout-gate.md`, `docs/orchestrator/STATUS.md`, `docs/IMPLEMENTATION_STATE.md`, and `scripts/verify-paid-provider-bundle-checkout-gate.js`.
- Validation: `npm run verify:paid-provider-bundle-checkout-gate`, `node --check scripts/verify-paid-provider-bundle-checkout-gate.js`, and `git diff --check`.
- State Update: [RESOLVED/NARROWED: channel cleanup packet is policy-complete for FlipFlop-owned URL, retry, cart/session/local projection duties; runtime remains blocked until named executor, rollback owner, and sanitized evidence path are supplied]

## Packet Decision

[RESOLVED/NARROWED: channel cleanup packet is policy-complete for FlipFlop-owned URL, retry, cart/session/local projection duties; runtime remains blocked until named executor, rollback owner, and sanitized evidence path are supplied]

Closed at policy level:

- FlipFlop owns the future smoke initiation packet for channel/customer checkout state, including selected `catalog.bundle.v1` bundle, component mapping, provider method, amount ceiling, approval id, central Orders UUID expectation, and redacted evidence policy.
- FlipFlop owns customer-visible success and cancel redirect URL shape: `https://flipflop.alfares.cz/payment-result?status=completed&orderId=<local-flipflop-order-id>` and `https://flipflop.alfares.cz/payment-result?status=cancelled&orderId=<local-flipflop-order-id>`.
- FlipFlop owns `/payment-result` retry-state policy for cancelled/failed views and must route only to `/checkout` or a blocked/manual-review state according to upstream proof.
- FlipFlop owns cleanup of synthetic cart entries, synthetic session/payment-result correlation, and local customer-visible projection only after bounded upstream evidence exists.
- FlipFlop may acknowledge `sideEffectsHandled.channel=true` only after redacted cleanup evidence exists and provider, Orders, and Warehouse proofs are already present.

Preserved runtime blockers:

- [MISSING: owner-approved channel/customer checkout owner for initiating and cleaning up paid catalog.bundle.v1 runtime smoke]
- [MISSING: named executor/rollback owner for future Fiobanka paid/provider smoke]
- [RESOLVED/NARROWED: runtime config readback shows PAYMENT_SUCCESS_URL and PAYMENT_CANCEL_URL resolve to approved FlipFlop payment-result URLs without secret output]
- `[RESOLVED/NARROWED: Codex Goal 24 integration thread is the source-controlled validation/stop authority for future source-controlled smoke coordination; live execution still requires a named live-run executor]`
- `[MISSING: provider rollback proof from Payments before customer-visible success or completed cleanup]`
- `[MISSING: Orders cancellation actor, reason, idempotency key, and side-effect acknowledgements before channel side-effect acknowledgement]`
- `[MISSING: deterministic Warehouse component reservation state and approved cleanup operation before customer-visible stock/restored messaging]`
- `[MISSING: sanitized evidence path for required channel cleanup proof]`

## Runtime Boundary

No live checkout, discount creation, order submission, provider payment creation, provider callback, Warehouse reservation, Orders mutation, channel cleanup mutation, refund/cancel, deploy, migration, DB write, secret output, token output, raw customer id, raw order id, raw payment id, raw provider payload, raw cookie, or raw DB row was produced by this packet pass.

## Parallel Execution

| Workstream | Status | Owner role | Scope | Dependencies | Blockers | Validation owner | Merge order |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Channel policy packet | complete-source-only | FlipFlop channel cleanup packet worker | Record URL/retry/cart/session/local projection duties and hard stops | current FlipFlop docs/source | none for policy docs | FlipFlop checkout readiness worker | current commit |
| Runtime channel executor | dependency-gated | `[MISSING: named executor/rollback owner for future Fiobanka paid/provider smoke]` | Run cleanup and channel acknowledgement after proofs | signed smoke packet plus Payments/Orders/Warehouse proofs | owner/executor/evidence path missing | source-controlled validation/stop authority plus named live-run executor | after final approval packet |
| Provider/Orders/Warehouse rollback | dependency-gated | service owners | Provider rollback, Orders cleanup, Warehouse component cleanup | final smoke packet | provider/Orders/Warehouse proof missing | integration validator | before channel acknowledgement |
| Final live smoke | final integration | Codex Goal 24 integration thread owns source-controlled validation/stop authority; live-run executor remains `[MISSING]` | one bounded Fiobanka run | every hard stop cleared | any remaining `[MISSING]` | integration validator plus named live-run executor | last |
