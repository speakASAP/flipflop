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

## Exact Success/Cancel URL And Retry-State Ownership

Source owner: FlipFlop order-service builds the customer-visible provider redirect URLs through `getPaymentSuccessUrl(order.id)` and `getPaymentCancelUrl(order.id)` before calling Payments. `PAYMENT_SUCCESS_URL` and `PAYMENT_CANCEL_URL` can override the redirect URLs; without overrides, the URLs are anchored to `PUBLIC_BASE_URL`, `API_GATEWAY_URL`, or fallback base `https://flipflop.alfares.cz`.

Exact URL shape for future paid/provider smoke:

- default success URL without runtime override: `https://flipflop.alfares.cz/payment-result?status=completed&orderId=<local-flipflop-order-id>`.
- default cancel URL without runtime override: `https://flipflop.alfares.cz/payment-result?status=cancelled&orderId=<local-flipflop-order-id>`.
- provider callback URL remains `https://flipflop.alfares.cz/api/webhooks/payment-result` and is provider/payment truth, not customer-visible success proof.
- `[RESOLVED/NARROWED: runtime config readback shows PAYMENT_SUCCESS_URL and PAYMENT_CANCEL_URL resolve to approved FlipFlop payment-result URLs without secret output]`.

Retry-state cleanup ownership:

- FlipFlop frontend owns the `/payment-result` cancelled/failed retry affordance that routes the customer back to `/checkout`.
- For a future smoke, the channel cleanup executor must record whether retry returns to an empty cart, a restored synthetic smoke cart, or a blocked/manual-review state before checkout begins.
- Retry state must be keyed by central Orders UUID plus non-secret approval id or smoke correlation id, and cleanup must remove only synthetic payment-result/cart/session correlation for that smoke.
- A retry-safe or completed customer-visible state is forbidden until provider rollback/callback evidence, Orders cleanup, Warehouse cleanup, and channel cleanup evidence are all present.

Markers:

- `[RESOLVED/NARROWED: FlipFlop owns exact customer-visible payment-result success/cancel URLs for provider redirects; provider callback evidence still owns payment truth]`
- `[RESOLVED/NARROWED: FlipFlop owns retry-state cleanup policy for payment-result cancelled/failed views; retry-safe execution remains blocked until provider, Orders, Warehouse, and channel cleanup evidence exists]`


## 2026-07-03 Owner-Approved Discount Fixture Narrowing

Owner approved the `discount/price fixture` path for the Goal 24 exact linked paid/provider smoke with a checkout-authoritative total `<= 300 CZK`.

Source inspection narrowed the safe fixture path:

- Direct client-provided `discount` is rejected by `rejectUnsafeClientMoneyInputs` with `Client-provided discount is not accepted without a server-validated contract`.
- The supported fixture path is a server-validated `discountCode` handled by `DiscountService.validateCode` and `DiscountService.applyDiscount`.
- The admin generation endpoint is guarded by `JwtAuthGuard`, `RolesGuard`, and roles `global:superadmin` or `app:flipflop-service:admin`.
- Current target component total remains `1998 CZK`.
- Approved deterministic fixture amount is a fixed one-use discount code for `2117.58 CZK`, producing final checkout/payment amount `300 CZK` after checkout tax.
- The fixture must be recorded with Goal 24 correlation, maxUses `1`, and a short expiration window.
- This approval does not authorize Catalog price mutation, marketplace/feed/listing mutation, persistent product price changes, direct DB row edits, or direct client `discount` override.

Runtime authority remains bounded to one exact attempt only after the executor can use the guarded server-validated discount-code path without printing secrets/tokens/raw customer/order/payment/provider data.

Auth/admin actor lane update on 2026-07-04: source inspection found no named durable actor. The only narrowed token-handling path is an Auth-issued user access token for the owner-named actor carrying `global:superadmin` or `app:flipflop-service:admin`, supplied through an owner-approved token file or in-process handoff, read only by the final approved runner, never printed/decoded/persisted, and removed after the run. Service tokens/API keys are not approved user actor substitutes for this guarded admin endpoint. Report: `reports/validation/VAL-GOAL-24-auth-admin-actor-token-handling-2026-07-04.md`.

Markers:

- `[RESOLVED/NARROWED: guarded Goal 24 discount-code generation must use an Auth-issued user access token carrying global:superadmin or app:flipflop-service:admin; service tokens/API keys are not approved user actor substitutes]`
- `[RESOLVED/NARROWED: approved token-handling shape is token file or in-process environment material read only by the final approved runner, never printed, never decoded into reports, never committed, and removed after the run]`
- `[RESOLVED/NARROWED: sanitized auth evidence may record only auth endpoint status class, token-present boolean, role-check boolean, actor label/hash, approval id, and timestamps]`
- `[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]`
- `[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]`


## 2026-07-04 Channel Cleanup Packet Close/Preserve Pass

Decision: `policy-complete-runtime-blocked`.

[RESOLVED/NARROWED: channel cleanup packet is policy-complete for FlipFlop-owned URL, retry, cart/session/local projection duties; runtime remains blocked until named executor, rollback owner, and sanitized evidence path are supplied]

The channel side is closed only as a source/policy packet. FlipFlop owns the customer-visible checkout initiation packet, exact provider redirect URL shapes, `/payment-result` cancelled/failed retry policy, synthetic cart cleanup, synthetic session/payment-result correlation cleanup, local order projection messaging, and channel side-effect acknowledgement criteria.

The future runtime smoke still cannot start because the packet has no owner-approved named channel/customer checkout executor, no named runtime validation owner, no named executor/rollback owner for the future Fiobanka paid/provider smoke, no sanitized evidence path, and resolved runtime config readback for `PAYMENT_SUCCESS_URL` and `PAYMENT_CANCEL_URL` overrides.

Runtime blockers preserved:

- [MISSING: owner-approved channel/customer checkout owner for initiating and cleaning up paid catalog.bundle.v1 runtime smoke]
- [MISSING: named executor/rollback owner for future Fiobanka paid/provider smoke]
- [RESOLVED/NARROWED: runtime config readback shows PAYMENT_SUCCESS_URL and PAYMENT_CANCEL_URL resolve to approved FlipFlop payment-result URLs without secret output]

Report: `reports/validation/VAL-GOAL-24-channel-cleanup-packet-2026-07-04.md`.



## 2026-07-04 Channel Cleanup Owner Supersession

Decision: `source-governance-superseded-runtime-blocked`.

[RESOLVED/NARROWED: Codex Goal 24 integration thread supersedes earlier FlipFlop channel executor/runtime owner blockers; channel cleanup runtime remains blocked until bank/refund authority, exact provider proof, Orders side-effect acknowledgements, Warehouse target facts, Auth token source, and final redacted evidence path exist]

The earlier packet line `[RESOLVED/NARROWED: channel cleanup packet is policy-complete for FlipFlop-owned URL, retry, cart/session/local projection duties; runtime remains blocked until named executor, rollback owner, and sanitized evidence path are supplied]` is retained as historical evidence from before the autonomous runtime-owner packet. Current FlipFlop source governance consumes `[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]`. This resolves/narrows only the named runtime validation owner and FlipFlop channel cleanup executor blockers; it does not approve live checkout, discount-code creation, order submission, provider calls, refund/cancel/reversal, Orders mutation, Warehouse mutation, channel cleanup mutation, deploy, migration, secret/token output, or raw evidence capture.

Current runtime hard stops now preserved for channel cleanup and customer-visible success/retry state:

- `[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]`
- `[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]`
- `[MISSING: concrete side-effectful rollback run id and cleanup idempotency keys]`
- `[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]`
- `[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]; [MISSING: renewed owner-approved execution window and Warehouse hold/release duration]; [MISSING: live current target row readback at execution time]; [MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]`
- `[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]`
- `[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]`
- `[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]`

FlipFlop/channel cleanup is policy-complete for source/docs/verifier purposes. FlipFlop owns customer-visible success/cancel URL shape, `/payment-result` retry policy, synthetic cart/session/payment-result correlation cleanup, local projection messaging, and channel acknowledgement criteria. Runtime side effects remain blocked. The Codex Goal 24 integration thread is only the source-controlled coordination and stop-authority owner; it does not supply Auth token material, bank/refund authority, provider proof, exact Orders/Warehouse cleanup facts, or final redacted evidence.

FlipFlop may acknowledge `sideEffectsHandled.channel=true` only after the exact smoke has redacted channel cleanup evidence and after Payments, Orders, and Warehouse owners supply exact proof. FlipFlop must not infer Warehouse stock effects from Payments refund state, must not infer Orders cancellation from `/payment-result`, and must keep customer-visible state blocked/manual-review until the exact upstream facts exist.

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


## Hard Stops

- `[MISSING: named executor/rollback owner for future Fiobanka paid/provider smoke]`
- `[MISSING: owner-approved channel/customer checkout owner for initiating and cleaning up paid catalog.bundle.v1 runtime smoke]`
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

Tax-aware fixture recalculation on 2026-07-04 found checkout subtotal `1998 CZK`, tax `419.58 CZK`, orderTotalBeforeDiscount `2417.58 CZK`, afterDiscount1698 `719.58 CZK`, and discountNeededFor300: `2117.58 CZK`. The executable fixed discount-code fixture is therefore `2117.58 CZK`.

Decision update: owner approved the discount/price fixture path. Runtime must use only a server-validated fixed discount-code fixture that brings the checkout-authoritative total to `<= 300 CZK`; direct client `discount`, Catalog price mutation, marketplace/feed/listing mutation, persistent product price changes, direct DB row edits, and manual workaround remain forbidden.

[RESOLVED/NARROWED: owner delegated autonomous Goal 24 continuation to Codex, but integration validation keeps new Fiobanka paid/provider side effects hard-stopped until bank/refund authority, exact Orders/Warehouse packet, and redacted provider proof exist]


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
