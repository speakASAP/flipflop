# Goal 24 Paid Provider Smoke Approval Draft - FlipFlop

```yaml
id: FLIPFLOP-GOAL24-PAID-PROVIDER-SMOKE-APPROVAL-DRAFT
status: draft-no-runtime-authority
owner: flipflop-channel-cleanup-owner
created: 2026-07-03
repository: /home/ssf/Documents/Github/flipflop
approval_source:
  upstream_catalog_approval_id: GOAL24-PAID-PROVIDER-SMOKE-20260703-CODEX-OWNER-APPROVED-001
  payments_packet: /home/ssf/Documents/Github/payments-microservice/docs/orchestrator/2026-07-03-goal24-owner-approved-rollback-packet.md
  channel_cleanup_contract: /home/ssf/Documents/Github/flipflop/docs/orchestrator/2026-07-03-goal24-channel-cleanup-contract.md
runtime_authority: none
```

## Draft Status

This is an owner-review draft only. It does not authorize live checkout, payment creation, provider callback/reconciliation, provider refund/reversal, Orders cancellation, Warehouse reservation/fulfillment/release/cancel/return, marketplace/feed/listing mutation, deploy, migration, database write, secret read, token output, raw customer data output, raw order/payment id output, raw provider payload output, or raw DB-row output.

The draft may become an executable approval packet only after every `[MISSING: ...]` entry below is replaced by owner-approved, non-secret values and the final approval statement is explicitly signed.

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: paid/provider `catalog.bundle.v1` validation can run only when customer-visible channel state, central Orders identity, provider rollback, Orders cleanup, Warehouse cleanup, and evidence redaction are approved before any side effect.
- Goal Impact: gives the owner a concrete fill-in packet for the remaining live-smoke approval gap while preserving the current runtime hard stop.
- System: FlipFlop checkout/channel cleanup, Catalog `catalog.bundle.v1`, Payments Fiobanka provider boundary, Orders cancellation workflow, Warehouse component-line lifecycle, and final integration validation.
- Feature: owner approval draft for one bounded paid/provider smoke and cleanup.
- Task: prefill non-secret known values and list exact owner decisions still required before execution.
- Execution Plan: source/docs/verifier only; no runtime action from this draft.
- Coding Prompt: fail closed; do not treat this draft as approval; preserve `[MISSING: ...]` until the owner supplies explicit values.
- Code: this draft, `docs/orchestrator/2026-07-03-goal24-channel-cleanup-contract.md`, and `scripts/verify-paid-provider-bundle-checkout-gate.js`.
- Validation: static paid/provider bundle checkout gate verifier, syntax check, and `git diff --check`.
- State Update: approval packet is drafted; runtime remains blocked.

## Known Non-Secret Inputs

| Field | Draft value | Status |
| --- | --- | --- |
| Approval id | `GOAL24-PAID-PROVIDER-SMOKE-20260703-CODEX-OWNER-APPROVED-001` | inherited planning input, must be re-confirmed for execution |
| Approval window | `2026-07-03T21:48:12+02:00` through `2026-07-03T23:59:59+02:00`, Europe/Prague | expired unless owner renews |
| Target bundle | `919be990-1c76-4f9c-b100-829281c6a709`, active `catalog.bundle.v1` | inherited planning input |
| Component products | `ce4a51aa-2d12-4ab7-a965-7a36609d01fc` qty `1`; `dbc51dde-fc66-4511-b178-f929183f4647` qty `1` | inherited planning input |
| Warehouse scope | Warehouse `c0de0000-0000-4000-8000-000000000013`, max hold qty `1` per component | source-policy only; live hold window still missing |
| Provider/method | Fiobanka bank-transfer QR, `paymentMethod=fiobanka`, `applicationId=flipflop-service`, maximum `300 CZK` | inherited planning input |
| Central Orders UUID propagation | active FlipFlop source passes central Orders UUID to Payments as `orderId` and `centralOrderId` | source-proven |
| Channel cleanup contract | `FLIPFLOP-GOAL24-CHANNEL-CLEANUP-CONTRACT` | source-prepared |
| Manual Fiobanka refund acknowledgement | FlipFlop admin order UI can mark local order/payment `refunded` with notes after external manual refund evidence | source-prepared acknowledgement only |
| Evidence policy | hashes, statuses, counts, endpoint/status, approved ids, booleans, and timestamps only | must be accepted by final owner |

## Required Owner Decisions Before Execution

- `[MISSING: renewed owner-approved execution window for Europe/Prague after 2026-07-03T23:59:59+02:00]`
- `[MISSING: named runtime validation owner for the exact side-effectful smoke]`
- `[MISSING: named FlipFlop channel cleanup executor]`
- `[MISSING: owner confirmation that Fiobanka QR <= 300 CZK is still the selected provider/method/environment]`
- `[MISSING: owner confirmation that target bundle 919be990-1c76-4f9c-b100-829281c6a709 and component products remain valid for live smoke]`
- `[MISSING: owner-approved Warehouse stock hold/release window and max quantity for the exact run]`
- `[MISSING: deterministic Warehouse component reservation lookup and cleanup operation for every component line]`
- `[MISSING: Fiobanka provider-side completed-transfer refund/reversal/correction proof path with redacted evidence]`
- `[MISSING: owner decision whether native/official Fiobanka callback signature proof is required or a one-run fixture/reconciliation proof is accepted]`
- `[MISSING: Orders cancellation actor/approvedBy, reasonCode, cleanup idempotency key, and payment/warehouse/notification/crm/channel side-effect acknowledgements]`
- `[MISSING: notification/CRM/customer-message handling decision for the synthetic smoke cleanup]`
- `[MISSING: final owner acceptance of redacted evidence policy and forbidden evidence list]`
- `[MISSING: abort criteria and stop owner if any provider, Orders, Warehouse, or channel proof fails]`

## Proposed Final Approval Statement

The owner must replace this section with an explicit signed statement before any runtime execution:

```text
I approve exactly one Goal 24 paid/provider smoke for FlipFlop using approval id [MISSING: approval id], window [MISSING: start/end with timezone], provider [MISSING: provider/method/environment], maximum amount [MISSING: amount/currency], target bundle [MISSING: catalog.bundle.v1 id], component products [MISSING: product ids and qty], Warehouse scope [MISSING: warehouse id/hold window/max qty], runtime validation owner [MISSING: owner], channel cleanup executor [MISSING: executor], Orders cleanup actor/reason/idempotency [MISSING: values], provider rollback evidence path [MISSING: path], and evidence policy [MISSING: accepted policy].

I understand this authorizes only the named bounded attempt. The executor must stop at the first hard stop and must not print secrets, tokens, raw provider payloads, raw DB rows, raw customer data, raw order ids, or raw payment ids.
```

## Runtime Hard Stops

- The approval window is expired or missing.
- Any required owner decision remains `[MISSING: ...]`.
- The selected provider/method/environment differs from Fiobanka QR `<= 300 CZK` without a new owner-approved packet.
- The target bundle, component products, quantities, or Warehouse id differ from this draft.
- Payments receives a non-central or legacy local order id.
- Provider success or rollback proof requires raw provider payloads, raw payment ids, bank data, token values, customer data, or raw DB rows.
- Orders cancellation actor/reason/idempotency/side-effect acknowledgements are missing.
- Warehouse component reservation state cannot be resolved exactly once per component line.
- Channel cleanup evidence cannot be captured without raw customer/order/payment/session data.
- Any repository owner reports dirty or unmerged source that affects this smoke contract.

## Parallel Execution

| Workstream | Status | Owner role | Objective | Allowed files/repos | Forbidden actions | Dependencies | Validation evidence | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Approval packet finalization | ready for owner review | Commerce integration owner | Replace `[MISSING]` fields with explicit signed values or reject execution | this draft and owner handoff only | runtime side effects | owner decisions above | final packet review | Draft grants no runtime permission. |
| FlipFlop channel cleanup | dependency-gated | FlipFlop channel cleanup executor | Clean cart/session/local projection and acknowledge channel side effect | approved runner/report only | provider/Orders/Warehouse mutations | final packet, upstream proofs | redacted cleanup report | Must be idempotent by central Orders UUID plus approval/smoke correlation. |
| Payments rollback proof | dependency-gated | Payments provider owner | Prove refund/reversal/correction or approved unpaid cancel path | Payments-owned packet/evidence | unapproved provider money movement | final packet | redacted provider evidence | Must precede post-paid Orders/Warehouse/channel success. |
| Orders/Warehouse cleanup | dependency-gated | Orders/Warehouse owners | Execute cancellation and component-line cleanup with approvals | service-owned endpoints/reports | direct DB/stock edits | provider proof and final packet | redacted cleanup proof | FlipFlop consumes bounded results only. |
| Final live smoke | final integration | `[MISSING: named runtime validation owner]` | One bounded attempt and rollback report | approved final report/script only | any unapproved side effect | all prior workstreams complete | `[MISSING: final runtime evidence]` | Stop at first hard stop. |

Merge order: final approval packet -> preflight verifier -> runtime smoke if all hard stops clear -> Payments rollback proof -> Orders/Warehouse cleanup proof -> FlipFlop channel cleanup proof -> final redacted integration report.

## State Update

Decision: `draft only`.

`FLIPFLOP-GOAL24-PAID-PROVIDER-SMOKE-APPROVAL-DRAFT` is prepared for owner review. Runtime remains blocked until every missing field is supplied and explicitly signed by the owner.
