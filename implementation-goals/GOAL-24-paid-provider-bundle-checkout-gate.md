# GOAL-24: Paid Provider Bundle Checkout Gate

```yaml
id: GOAL-24-PAID-PROVIDER-BUNDLE-CHECKOUT-GATE
status: source-policy-validated-runtime-blocked
owner: flipflop-paid-provider-bundle-checkout-readiness-worker
created: 2026-07-03
catalog_contract: catalog.bundle.v1
runtime_progression: blocked
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
- Code: this document, `scripts/verify-paid-provider-bundle-checkout-gate.js`, package script `verify:paid-provider-bundle-checkout-gate`, `implementation-goals/GOAL-24-catalog-bundle-adoption.md`, and `docs/IMPLEMENTATION_STATE.md`.
- Validation: `npm run verify:paid-provider-bundle-checkout-gate`, `npm run verify:catalog-bundle-adoption`, `node --check scripts/verify-paid-provider-bundle-checkout-gate.js`, and `git diff --check`.
- State Update: runtime paid/provider progression remains blocked.

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

These behaviors are correct for a paid checkout path, but they are not acceptable as an unapproved verifier because they cross order, reservation, provider, and cleanup boundaries.

## Fail-Closed Runtime Contract

A future live paid/provider bundle smoke may proceed only when all of these are true:

- owner-approved paid/provider test window is recorded;
- non-secret approval id is present in the report;
- target active `catalog.bundle.v1` bundle id and expected component product ids are recorded;
- provider method and callback/webhook route are selected;
- evidence policy is sanitized and excludes tokens, provider payloads, customer data, raw order bodies, and secrets;
- stock rollback plan covers every component line;
- refund/cancel rollback plan is owner-approved and names which system performs provider refund or cancellation plus Orders/Warehouse cleanup;
- durable Catalog `bundleId` checkout migration is explicitly accepted, or the smoke is scoped to existing local bundle intent with Catalog candidate provenance only.

Until then, runtime paid/provider progression remains blocked by:

- `[MISSING: owner-approved paid/provider checkout smoke with stock and refund/cancel rollback plan]`
- `[MISSING: owner-approved paid/provider test window, non-secret approval id, target active catalog.bundle.v1 bundle id, provider method, and sanitized evidence policy]`
- `[MISSING: provider webhook/callback evidence that marks the paid order complete without manual payment-state bypass]`
- `[MISSING: Warehouse stock decrement/reservation-release evidence for every bundle component line]`
- `[MISSING: owner-approved refund/cancel rollback plan proving provider refund or cancellation plus Orders/Warehouse cleanup]`
- `[MISSING: explicit ecosystem checkout migration accepting durable Catalog bundleId]`

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
| C Live paid/provider smoke | dependency-gated | Runtime validation owner | Owner-approved one-run runtime smoke | `[MISSING: approved smoke packet]` | unapproved provider/order/stock/refund mutations | A+B plus owner/provider evidence | `[MISSING: live runtime evidence]` | Must be a separate approved lane. |

Shared contracts: Catalog `catalog.bundle.v1`, Orders create-order bundle evidence, Warehouse component reservation sign-off, Payments bundle metadata allowlist, and GOAL-13 local bundle intent.

Integration owner: commerce integration validator after owner approval.

Validation owner: FlipFlop checkout readiness worker for source-policy only; runtime validation owner for any later live smoke.

Merge order: source-policy verifier, docs/state update, validation, commit/push. Live runtime smoke remains a later dependency-gated lane.
