# GOAL-08 Execution Plan - Leads Lifecycle Replay Consumer

## Upstream Traceability

Owner selected FlipFlop as the first trusted internal consumer for Leads Goal 24 lifecycle replay.

## Goal Impact

Adds only the minimal FlipFlop server-side client/config surface needed to call Leads guarded replay once runtime token/trust provisioning is handled.

## Invariants

Preserves FlipFlop checkout-to-first-revenue intent. Does not mutate prices, discounts, order totals, payment status, stock, catalog ownership, auth ownership, or customer-facing checkout state.

## Sensitive Data

Classification: synthetic/minimized. No token values, contact values, raw lead rows, confirmation tokens, private URLs, or payment data are stored in docs/tests.

## Contract Impact

Adds a server-side client for `GET /api/leads/internal/:id/lifecycle-replay` with `consumer=flipflop-service`, max limit 30, `x-service-name`, and env-provided internal token header. No public FlipFlop API contract changes.

## Replay/Determinism

Client clamps request limit to 30 and does not trigger any mutation in Leads or FlipFlop.

## Validation Plan

Run the static verifier and shared TypeScript no-emit compile.
