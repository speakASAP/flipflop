# FlipFlop Runtime Gate Packet Handoff

status: source-handoff-action-admin-packet-gated
created_at: 2026-07-05
repository: /home/ssf/Documents/Github/flipflop
orders_packet_contract: /home/ssf/Documents/Github/orders-microservice/docs/orchestrator/2026-07-05-runtime-gate-packet-contracts.md
orders_packet_contract_commit: 1d0ff06
workstream: W6B FlipFlop route-to-Orders admin action proof

## Intent Preservation Chain

Vision -> Every sellable order is error-free and every buyer/admin surface reflects canonical Orders lifecycle.

Goal Impact -> FlipFlop central-owned order lifecycle corrections must route to Orders only with an approved action-admin packet and must never fall back to local lifecycle/payment writes.

System -> Orders owns lifecycle actions. FlipFlop owns admin UI, local notes, and channel metadata. Auth owns session/role evidence. Payments owns payment/refund corrections.

Feature -> FlipFlop route-to-Orders admin action packet boundary.

Task -> Consume the Orders runtime packet contract and keep route-to-Orders action wiring/runtime smoke gated until action-admin/session/idempotency/approval/readback facts exist.

Execution Plan -> Treat Orders commit 1d0ff06 as the source of truth for runtime gate packet shape; keep this repo source-only until the required non-secret packet exists; preserve missing facts as [MISSING: ...] or [UNKNOWN: ...].

Coding Prompt -> Remote-only Alfares workflow. Do not deploy, mutate orders, mutate Warehouse stock/fulfillment, call providers, print tokens, print raw customer/order/payment/provider/tracking data, print raw DB rows, or capture screenshots from this handoff.

Code -> Documentation handoff only. Runtime implementation/smoke remains gated.

Validation -> git diff --check; npm run verify:admin-status-central-authority; npm run verify:w6b-admin-status-authority-contract; npm run verify:orders-lifecycle-ui; Orders npm run verify:runtime-gate-packets at commit 1d0ff06.

## Required Packet

Packet section: W6B FlipFlop Route-To-Orders Admin Action Packet in Orders runtime gate packet contract.

Required non-secret fields before runtime proof:

- [MISSING: approved live action-admin session packet]
- Approved Auth-backed actor/session carrying global:superadmin or internal:orders-microservice:action-admin for Orders.
- Auth actor/role mapping from FlipFlop admin session to Orders action actor.
- Exact central Orders target id hash and local FlipFlop order correlation hash.
- Requested lifecycle status and whether it is a forward status or cancellation.
- Orders idempotency key and replay policy for channel action attempts.
- For cancellation: approval.approved=true, approval.approvalType=human, safe reasonCode, and sideEffectsHandled.payment|warehouse|notification|crm|channel=true acknowledgements.
- Response/readback contract for FlipFlop admin UI after central correction command.

## Abort Conditions

- Actor lacks action-admin authority.
- Payment/refund/provider correction is attempted through status action.
- Cancellation side-effect acknowledgements are incomplete.
- FlipFlop would fall back to local Prisma lifecycle/payment writes.

## Current Decision

This repo is aligned to the central Orders runtime packet contract, but this handoff does not authorize live mutation, provider calls, deploys, DB writes, bearer/session capture, token output, raw payload output, or screenshots. Runtime proof remains blocked until the required packet is supplied and validated.
