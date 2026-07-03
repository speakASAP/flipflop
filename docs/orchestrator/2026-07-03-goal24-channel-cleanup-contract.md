# Goal 24 Channel Cleanup Contract - FlipFlop

```yaml
id: FLIPFLOP-GOAL24-CHANNEL-CLEANUP-CONTRACT
status: prepared-source-only-runtime-blocked
owner: flipflop-channel-cleanup-owner
created: 2026-07-03
repository: /home/ssf/Documents/Github/flipflop
scope: FlipFlop/channel-owned cart, session, and customer-visible projection cleanup contract for future catalog.bundle.v1 paid/provider smoke
upstream_context:
  payments_packet: /home/ssf/Documents/Github/payments-microservice/docs/orchestrator/2026-07-03-goal24-owner-approved-rollback-packet.md
  orders_packet: /home/ssf/Documents/Github/orders-microservice/docs/orchestrator/2026-07-03-goal24-orders-cancel-cleanup-rollback-readiness.md
  warehouse_packet: /home/ssf/Documents/Github/warehouse-microservice/docs/contracts/goal24-warehouse-cleanup-approval-packet.md
forbidden_runtime_effects:
  - live checkout/payment creation/provider call
  - provider refund/cancel/reversal
  - Orders lifecycle mutation
  - Warehouse stock/reservation mutation
  - marketplace/feed/listing mutation
  - deployment/migration/database writes
  - secrets/tokens/raw customer/order/provider evidence
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: paid/provider `catalog.bundle.v1` validation can run only when customer-visible channel state, central Orders identity, provider rollback, Orders cleanup, Warehouse cleanup, and evidence redaction are owned and auditable before any side effect.
- Goal Impact: converts the FlipFlop/channel side of `[MISSING: channel/FlipFlop checkout cleanup owner for customer-visible session/cart/local projection state]` into a source-only contract while preserving the live paid/provider hard stop.
- System: FlipFlop owns storefront checkout initiation, browser/session cart state, local payment-result messaging, and customer-visible order projection. Payments owns provider creation, callback/reconciliation, refund/reversal, and payment status evidence. Orders owns canonical lifecycle/cancellation approval. Warehouse owns component-line stock operations. Catalog owns `catalog.bundle.v1` identity.
- Feature: channel-owned cart/session/projection cleanup contract for a future bounded paid/provider smoke.
- Task: consume Payments, Orders, and Warehouse Goal 24 cleanup context; state the exact FlipFlop-owned cleanup duties, hard stops, idempotency expectations, and redacted evidence policy without executing runtime effects.
- Execution Plan: documentation/verifier/state only; no live checkout, provider call, refund/cancel, Orders mutation, Warehouse mutation, marketplace mutation, deploy, migration, secret read, database write, or raw evidence capture.
- Coding Prompt: fail closed; preserve `[MISSING: ...]` blockers; do not infer provider rollback, Orders cancellation, or Warehouse stock effects from FlipFlop local checkout state.
- Code: this document plus `scripts/verify-paid-provider-bundle-checkout-gate.js`, `implementation-goals/GOAL-24-paid-provider-bundle-checkout-gate.md`, `docs/orchestrator/STATUS.md`, and `docs/IMPLEMENTATION_STATE.md`.
- Validation: `npm run verify:paid-provider-bundle-checkout-gate`, `node --check scripts/verify-paid-provider-bundle-checkout-gate.js`, and `git diff --check`.
- State Update: channel cleanup ownership is source-prepared; runtime paid/provider smoke remains blocked.

## Source Context Consumed

- Payments packet `PAYMENTS-GOAL24-OWNER-APPROVED-ROLLBACK-PACKET` states that FlipFlop/channel must approve customer-visible cart/session/projection cleanup before checkout execution, while provider rollback and runtime validation owner facts remain missing.
- Orders packet `ORDERS-GOAL24-PAID-PROVIDER-CANCEL-CLEANUP-READINESS` states that Orders cleanup requires provider proof first, owner-approved cancellation actor/reason, idempotency key, and side-effect acknowledgements including channel.
- Warehouse packet `WH-G24-WAREHOUSE-CLEANUP-APPROVAL-PACKET` states that stock cleanup is component-line scoped and remains blocked on owner-approved hold/release window, max quantity, and deterministic component reservation state.
- FlipFlop source verifier already proves active authenticated checkout, guest checkout, and legacy create-payment paths pass central Orders UUIDs to Payments before provider creation.

## FlipFlop-Owned Cleanup Contract

For a future owner-approved paid/provider smoke, FlipFlop/channel owns only customer-visible and channel-local state:

1. Pre-smoke initiation packet: record approval id, target active `catalog.bundle.v1` bundle id, selected local product/component mapping, provider method, max amount, evidence policy, and central Orders UUID propagation expectation before checkout starts.
2. Cart cleanup: after abort, provider cancel, provider refund/reversal, or final rollback proof, clear only the synthetic smoke cart/session entries created by the smoke. Do not mutate Catalog bundles, marketplace listings, product prices, discounts, or stock identity.
3. Session cleanup: remove or expire the synthetic checkout/session/payment-result correlation state created by the smoke while preserving unrelated customer sessions.
4. Local projection cleanup: update customer-visible payment-result/order projection only from bounded central Orders/Payments status evidence. FlipFlop must not manually mark paid, refunded, failed, cancelled, or restored states without upstream owner evidence.
5. Customer messaging hard stop: if provider rollback, Orders cancellation, Warehouse cleanup, or deterministic reservation state is missing, show/record a blocked/manual-review state instead of a success or retry-safe state.
6. Channel side-effect acknowledgement: when Orders cancellation cleanup is owner-approved, FlipFlop may acknowledge `sideEffectsHandled.channel=true` only after cart/session/local projection cleanup evidence exists in redacted form.
7. Idempotency: cleanup must be keyed by the central Orders UUID plus non-secret approval id or smoke correlation id. Re-running cleanup must not duplicate customer-visible messages, delete unrelated carts/sessions, or reissue provider/Orders/Warehouse actions.
8. Evidence redaction: allowed evidence is booleans, counts, hashes, HTTP status classes, route names, contract ids, approval id, and timestamps. Forbidden evidence includes tokens, secrets, raw provider payloads, card/bank data, raw customer identifiers, raw order ids, raw payment ids, raw DB rows, cookies, or full request/response bodies.

## Hard Stops

- `[MISSING: owner-approved paid/provider checkout smoke packet naming FlipFlop channel cleanup executor and runtime validation owner]`
- `[MISSING: provider rollback proof from Payments before customer-visible success or completed cleanup]`
- `[MISSING: Orders cancellation actor, reason, idempotency key, and side-effect acknowledgements before channel side-effect acknowledgement]`
- `[MISSING: deterministic Warehouse component reservation state and approved cleanup operation before customer-visible stock/restored messaging]`
- `[MISSING: sanitized evidence path for required channel cleanup proof]`
- Stop if cleanup would require live marketplace/feed/listing mutation, provider call, refund/cancel, Orders mutation, Warehouse mutation, deploy, migration, DB write, secret read, or raw customer/order/provider evidence.

## Parallel Execution

| Workstream | Status | Owner role | Objective | Allowed files/repos | Forbidden actions | Dependencies | Validation evidence | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Channel cleanup contract | complete-source-only | FlipFlop channel cleanup owner | Define cart/session/local projection cleanup ownership and hard stops | FlipFlop docs/verifier/state | live checkout, provider calls, Orders/Warehouse/marketplace mutation | Payments/Orders/Warehouse packets | static verifier and diff-check | Ready for integration owner review; grants no runtime permission. |
| Channel cleanup implementation | dependency-gated | FlipFlop checkout owner | Add or run cleanup only if approved smoke packet requires runtime executor code | focused FlipFlop source/tests after approval | unapproved side effects or broad UX rewrites | owner-approved packet and runtime validation owner | `[MISSING: runtime validation evidence]` | Not started in this lane. |
| Payments rollback proof | dependency-gated | Payments provider owner | Prove provider refund/reversal or unpaid cancel/void | Payments docs/source/evidence | invented provider rollback | provider owner approval | `[MISSING]` | Must precede post-paid channel cleanup success. |
| Orders/Warehouse cleanup | dependency-gated | Orders/Warehouse owners | Execute approved cancellation and component-line cleanup | service-owned contracts | direct DB/stock edits | provider proof and owner approvals | `[MISSING]` | FlipFlop consumes only bounded results. |
| Final paid/provider smoke | final integration | `[MISSING: runtime validation owner]` | One bounded smoke with redacted rollback evidence | approved final runner/report | any unapproved side effect | all packets complete | `[MISSING]` | Stop at first hard stop. |

Shared contracts: Catalog `catalog.bundle.v1`, central Orders UUID, Payments create/status/refund boundary, Orders cancellation workflow, Warehouse component-line lifecycle, FlipFlop customer-visible checkout state.

Integration owner: Catalog commerce integration owner until a dedicated paid/provider smoke owner is assigned.

Validation owner: FlipFlop checkout readiness worker for source-policy validation; `[MISSING: runtime validation owner]` for future live smoke.

Merge order: Payments rollback packet -> Orders cleanup readiness -> Warehouse cleanup approval packet -> FlipFlop channel cleanup contract -> final integration owner review -> owner-approved runtime smoke only after all hard stops clear.

## State Update

Decision: `block` for runtime paid/provider progression.

[RESOLVED/NARROWED: FlipFlop channel cleanup contract prepared for cart/session/local projection cleanup, idempotency, customer-visible hard stops, and redacted evidence policy; runtime remains blocked]

FlipFlop/channel cleanup ownership is now source-prepared for cart/session/local projection cleanup, central Orders UUID propagation confirmation, idempotent cleanup keys, customer-visible hard stops, and redacted evidence policy. This contract does not authorize live checkout, provider calls, refund/cancel, Orders mutation, Warehouse mutation, marketplace mutation, deploy, migration, DB writes, secret reads, or raw evidence capture.

## Manual Refund Acknowledgement Workflow

Owner clarification on 2026-07-03: completed Fiobanka refunds are normally executed manually in the owner-operated refund service, then marked in backend/customer-visible order surfaces. FlipFlop already supports this local acknowledgement path through the admin order detail page `/admin/orders/:id`: the admin status form can set order status `refunded`, payment status `refunded`, and notes after the external refund is completed.

This resolves/narrows the channel-local acknowledgement workflow only. It does not execute the bank refund, does not prove provider reversal, and does not authorize Orders/Warehouse post-paid correction by itself.

Required evidence for a future full paid/refund Goal 24 smoke:

- redacted external refund-service evidence for the exact completed Fiobanka transfer, using only amount/currency, timestamp, operator approval id, and hash/reference suffixes;
- FlipFlop admin/user-page acknowledgement that the local order is marked `status=refunded` and `paymentStatus=refunded`, with notes referencing the non-secret refund approval id;
- Orders owner-approved post-paid cancellation/correction packet and Warehouse component-line `cancel` or `return` result for the observed state;
- no raw bank data, customer PII, raw order/payment ids, token values, provider payloads, or raw DB rows.

Marker: `[RESOLVED/NARROWED: owner-approved manual Fiobanka refund acknowledgement workflow exists in FlipFlop admin order UI; runtime proof remains required for the exact paid smoke]`.
