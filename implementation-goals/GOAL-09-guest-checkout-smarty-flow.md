# GOAL-09 - Guest Checkout And Czech Checkout Flow

## Status

active

## Intent Chain

Constitution -> Vision -> Business Case -> System -> Feature -> Task -> Goal Impact -> Execution Plan -> Coding Prompt -> Code -> Validation

## Raw Owner Request

Allow customers to buy without mandatory registration. Model the checkout user flow after the provided Smarty.cz screenshots: accessory upsell, cart summary, delivery/payment, optional delivery day, optional registration checkbox, low-friction contact/address form, and a completion payment-instruction panel with QR code.

## Goal Impact

This goal strengthens checkout-to-first-revenue by removing forced login/registration friction while preserving payment, order total, stock, and provider safety invariants.

## Scope

- Document Smarty checkout reference flow and store screenshots under `docs/reference/smarty-checkout/`.
- Replace forced `/checkout` login redirect with a guest-first checkout flow.
- Add a public guest order endpoint that recalculates product prices server-side.
- Keep optional registration separate from purchase completion.
- Add Czech-style delivery/payment summary and proforma payment result with QR code.

## Non-Goals

- No provider webhook verification closure.
- No fake paid order state.
- No price, discount, refund, cancellation, or paid-state mutation outside existing verified flows.
- No copying Smarty.cz brand assets, source code, logo, mascot, or product photos.
- No schema migration unless explicitly approved.

## Acceptance Criteria

- Anonymous users can open `/checkout` from `/cart` without being redirected to login.
- Checkout exposes delivery, expedition, payment, alternate delivery day, operator tip, contact/address, and optional account creation states.
- Guest checkout creates an order with `paymentStatus=pending` and either redirects to provider payment or shows bank-transfer instructions.
- Product prices and totals are calculated on the server from current product data.
- Registration is optional and visually controlled by a checkbox.
- Bank-transfer completion page includes account number, variable symbol, amount, copy controls, and QR payment image.
- Validation covers frontend build and relevant backend builds or records blockers.

## Parallel Execution

| Workstream | Status | Owner | Files | Notes |
| --- | --- | --- | --- | --- |
| Reference documentation | done | UX/reference subagent + orchestrator | `docs/reference/smarty-checkout/**` | Screenshots copied; UX inventory documented. |
| Current checkout discovery | done | explorer subagent | read-only | Identified forced login, stale payment call, address route mismatch, dirty-file risks. |
| Backend guest checkout contract | integration-owned | orchestrator | order-service, api-gateway | Must not alter prices or paid state. |
| Frontend checkout experience | integration-owned | orchestrator | checkout page, orders API, payment result page | Depends on backend contract. |
| Validation | final integration | orchestrator | reports only | Run after source changes. |

## Validation Plan

1. `python3 scripts/pre_coding_gate.py --root .`
2. `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
3. `cd services/order-service && npm run build`
4. `cd services/api-gateway && npm run build`
5. `cd services/frontend && npm run build`
6. `git diff --check`

## Rollback

Revert the files listed in this goal and remove `docs/reference/smarty-checkout/` only with owner approval. Do not reset unrelated dirty work.
