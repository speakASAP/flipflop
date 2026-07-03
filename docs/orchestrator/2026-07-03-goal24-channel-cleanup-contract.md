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

## 2026-07-03 Owner-Approved Discount Fixture Narrowing

Owner approved the `discount/price fixture` path for the Goal 24 exact linked paid/provider smoke with a checkout-authoritative total `<= 300 CZK`.

Source inspection narrowed the safe fixture path:

- Direct client-provided `discount` is rejected by `rejectUnsafeClientMoneyInputs` with `Client-provided discount is not accepted without a server-validated contract`.
- The supported fixture path is a server-validated `discountCode` handled by `DiscountService.validateCode` and `DiscountService.applyDiscount`.
- The admin generation endpoint is guarded by `JwtAuthGuard`, `RolesGuard`, and roles `global:superadmin` or `app:flipflop-service:admin`.
- Current target component total remains `1998 CZK`.
- Approved deterministic fixture amount is a fixed one-use discount code for `1698 CZK`, producing final checkout/payment amount `300 CZK`.
- The fixture must be recorded with Goal 24 correlation, maxUses `1`, and a short expiration window.
- This approval does not authorize Catalog price mutation, marketplace/feed/listing mutation, persistent product price changes, direct DB row edits, or direct client `discount` override.

Runtime authority remains bounded to one exact attempt only after the executor can use the guarded server-validated discount-code path without printing secrets/tokens/raw customer/order/payment/provider data.


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

Owner-confirmed execution update on 2026-07-03: the owner confirmed that automated Fiobanka refund is unavailable, the refund was sent manually through the separate refund service, and the manual refund is completed. FlipFlop records this as verified manual refund execution input for the channel acknowledgement path, without capturing raw bank/customer/payment data.

Required evidence for a strict-audit full paid/refund Goal 24 closeout:

- `[MISSING: sanitized exact-order linkage between the manual refund confirmation and the Goal 24 completed Fiobanka smoke order]`;
- `[MISSING: FlipFlop runtime readback showing the exact smoke order acknowledged as status=refunded and paymentStatus=refunded after manual refund]`, with notes referencing the non-secret refund approval id or sanitized refund reference;
- `[MISSING: owner-approved post-paid Orders/Warehouse correction packet for the exact completed payment state]`;
- no raw bank data, customer PII, raw order/payment ids, token values, provider payloads, screenshots, or raw DB rows.

Marker: `[RESOLVED/NARROWED: owner-approved manual Fiobanka refund acknowledgement workflow exists in FlipFlop admin order UI; runtime proof remains required for the exact paid smoke]`.
Marker: `[RESOLVED/NARROWED: owner-confirmed manual Fiobanka refund was executed through the external refund service; FlipFlop acknowledgement path remains available for exact order marking]`.

Sanitized exact-linkage readback on 2026-07-03: completed Fiobanka rows checked `2`; selected retained evidence row has provider suffix `9053`, payment hash `9fa68d05c012c879`, amount `1.00 CZK`, status `completed`, `completedAtPresent=true`, `refundedAtPresent=false`, transaction `payment/success/1.00`, and processed webhook suffix `9053:completed`. Payments metadata has no `flipflopOrderId` and no `centralOrderId`; FlipFlop local order lookup by payment/order reference returned `foundCount=0`. [RESOLVED/NARROWED: sanitized runtime readback found completed Fiobanka provider-payment evidence but no FlipFlop exact-order linkage for the retained Goal 24 payment].

Owner closeout decision after readback: `[RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact FlipFlop order linkage]`. `[RESOLVED/NARROWED: runtime readback found no linked FlipFlop order state, so no FlipFlop refunded acknowledgement mutation is required for this evidence-only closeout]`. `[RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]`. Exact FlipFlop order linkage and exact `refunded/refunded` local acknowledgement are waived for this retained evidence closeout only because the completed Fiobanka evidence payment is not linked to FlipFlop order state. Future paid/provider smokes still require exact payment/order/channel linkage before execution.

## 2026-07-03 Amount Gate Preflight

Owner replied `да, готов`, which is recorded as readiness to proceed with a new exact linked paid flow under the existing packet constraints. Before creating any checkout/order/payment, a read-only amount preflight checked the current active FlipFlop products mapped to the approved Catalog component products.

Sanitized preflight evidence:

- target component count: `2`.
- matched active FlipFlop product count: `2`.
- component prices: `999 CZK` and `999 CZK`.
- total: `1998 CZK`.
- approved Fiobanka amount ceiling: `300 CZK`.
- result: `[HARD-STOP: current target component total is 1998 CZK, exceeding approved Fiobanka paid/provider smoke maximum 300 CZK]`.

Decision update: owner approved the discount/price fixture path. Runtime must use only a server-validated fixed discount-code fixture that brings the checkout-authoritative total to `<= 300 CZK`; direct client `discount`, Catalog price mutation, marketplace/feed/listing mutation, persistent product price changes, direct DB row edits, and manual workaround remain forbidden.
