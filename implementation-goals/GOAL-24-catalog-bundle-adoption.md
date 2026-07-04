# GOAL-24: Catalog Bundle Adoption Display Contract

```yaml
id: GOAL-24-CATALOG-BUNDLE-ADOPTION
status: source-implemented-validated-no-deploy
owner: flipflop-storefront-adoption-worker
created: 2026-07-03
source_contracts:
  - /home/ssf/Documents/Github/catalog-microservice/docs/contracts/catalog-bundle-aggregate-v1.md
  - /home/ssf/Documents/Github/catalog-microservice/docs/contracts/catalog-bundle-commerce-contract.md
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: FlipFlop remains a revenue-capable storefront that can discover shared Catalog bundles without taking Catalog, Orders, Warehouse, Payments, or marketplace ownership.
- Goal Impact: `[RESOLVED: FlipFlop adoption contract for catalog.bundle.v1 read/display before ecosystem checkout]` by adding a display-only consumer contract and verifier.
- System: Catalog owns durable `bundleId` and component metadata; FlipFlop owns product-detail/storefront display and local cart intent; Orders owns order identity; Warehouse owns component-line reservations; Payments owns provider/payment execution.
- Feature: display-only `catalog.bundle.v1` adoption on product recommendations.
- Task: read active FlipFlop-visible Catalog bundle aggregates, map their components to current sellable FlipFlop offers, display bounded bundle evidence, and keep checkout disabled for durable `bundleId`.
- Execution Plan: source/docs/verifier only; no deploy, migration, live checkout, order creation, stock reservation/decrement, provider call, marketplace publication, secrets, or Kubernetes edit.
- Coding Prompt: prefer active Catalog aggregate display; fail closed to explicit blockers when aggregate runtime or component sellability is missing; do not pass durable `bundleId` into cart/checkout until a separate ecosystem checkout migration is accepted.
- Code: `shared/clients/catalog-client.service.ts`, `services/product-service/src/products/products.service.ts`, `services/frontend/lib/api/products.ts`, `services/frontend/app/products/[id]/page.tsx`, `scripts/verify-catalog-bundle-adoption.js`, `package.json`.
- Validation: `npm run verify:catalog-bundle-adoption`, existing bundle verifiers/builds, `git diff --check` and `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`.
- State Update: this document and `docs/IMPLEMENTATION_STATE.md` record source-verified no-deploy completion.

## Accepted FlipFlop Boundary

FlipFlop may call `GET /api/bundles?status=active&channel=flipflop&productId=<catalogProductId>` through the shared Catalog client and use active `catalog.bundle.v1` aggregates as product-detail display evidence. The aggregate is accepted only when:

- `contractVersion` is `catalog.bundle.v1`;
- `status` is `active`;
- `presentation.pricePolicy` is `checkout_authoritative`;
- every component maps to an active, current, sellable FlipFlop offer;
- Catalog validation is not blocked.

The durable Catalog `bundleId` is display evidence only in this lane. FlipFlop local bundle intent remains separate and may carry only local product ids plus the existing Catalog candidate provenance. Cart, checkout, and order-service do not consume durable `bundleId` until a later explicit checkout migration is accepted.

## Fail-Closed Behavior

If Catalog aggregate runtime is unavailable, no active aggregate is visible, Catalog validation is blocked, or any component is not a current FlipFlop sellable offer, FlipFlop records a blocked adoption status and uses the existing local/candidate recommendation fallback. It must not fabricate a `bundleId`, price policy, discount policy, or checkout readiness.

Current explicit blockers retained:

- `[MISSING: owner-approved Catalog bundle aggregate runtime read for FlipFlop]`
- `[MISSING: active catalog.bundle.v1 aggregate visible to flipflop for this product]`
- `[MISSING: owner-approved Rung 1 non-mutating real checkout smoke credentials and target products]`
- `[RESOLVED/NARROWED: explicit ecosystem checkout migration accepts durable Catalog bundleId only as bounded bundleEvidence metadata; FlipFlop runtime checkout submission remains blocked]`
- `[RESOLVED/NARROWED: FlipFlop source rollout maps durable catalog.bundle.v1 bundleId into central Orders bundleEvidence without changing totals, stock identity, or provider state]`
- `[MISSING: owner-approved paid/provider checkout smoke with stock and refund/cancel rollback plan]`

## Parallel Execution

| Workstream | Status | Owner role | Scope | Allowed files | Forbidden files | Dependencies | Validation evidence | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A Catalog aggregate read/display | complete | FlipFlop storefront adoption worker | Catalog client and product-service recommendation mapping | `shared/clients/catalog-client.service.ts`, `services/product-service/src/products/products.service.ts` | Catalog/Orders/Warehouse/Payments repos, migrations, deploy scripts | Catalog `catalog.bundle.v1` contracts | `npm run verify:catalog-bundle-adoption`, build | Aggregate display precedes candidate fallback only when active and sellable. |
| B Product-detail display-only UX | complete | FlipFlop frontend worker | Product API type and product-detail display evidence | `services/frontend/lib/api/products.ts`, `services/frontend/app/products/[id]/page.tsx` | cart/checkout submission, order/payment/stock code | Workstream A shape | frontend build | Displays `bundleId` as evidence; no checkout enablement. |
| C Validation/state | complete | Integration validator | verifier, package script, state docs | `scripts/verify-catalog-bundle-adoption.js`, `package.json`, this doc, `docs/IMPLEMENTATION_STATE.md` | live smoke, secrets, Kubernetes | A+B | verifier, existing verifiers, build, diff check | Merge after A/B. |

Shared contracts: Catalog bundle aggregate/commerce contracts, GOAL-13 local bundle intent, Orders bundle evidence contract, Warehouse component reservation sign-off, Payments bundle metadata allowlist.

Integration owner: FlipFlop storefront adoption worker for this lane; final ecosystem bundle checkout remains with commerce integration owner.

Validation owner: FlipFlop integration validator.

Merge order: Catalog client, product-service mapping, frontend display, verifier/docs, validation, commit/push.


## 2026-07-03 Paid Provider Checkout Smoke Gate

Intent Preservation Chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update.

- Vision: FlipFlop can sell bundles only when payment, stock, order, and rollback truth remain provider-backed and auditable.
- Goal Impact: the remaining runtime blocker is narrowed to owner-approved paid/provider evidence instead of an ambiguous checkout-smoke task.
- System: FlipFlop checkout/order-service remains the channel boundary; Catalog owns `catalog.bundle.v1`; Orders, Warehouse, and Payments retain checkout, reservation, and provider truth.
- Feature: paid/provider bundle checkout readiness gate.
- Task: classify the existing checkout smoke harness and keep paid/provider progression blocked until rollback facts are approved.
- Execution Plan: docs/verifier/source-policy only; no live checkout, redirect, webhook, refund, cancellation, fulfillment, stock decrement, deploy, migration, secrets, or marketplace state change.
- Coding Prompt: fail closed when approval, provider webhook evidence, stock rollback, or refund/cancel rollback evidence is missing.
- Code: `scripts/verify-paid-provider-bundle-checkout-gate.js`, package script `verify:paid-provider-bundle-checkout-gate`, and Goal 24 state docs.
- Validation: source verifier, catalog-bundle verifier, syntax check, and `git diff --check`.
- State Update: paid/provider runtime progression remains blocked.

The current `smoke:checkout` harness is intentionally not accepted as the paid/provider bundle smoke. It creates local/cart/order/payment state and obtains a payment redirect, while the order-service reserves Warehouse lines before provider payment creation. That is useful for production-readiness smoke only after owner approval, but it is not side-effect-safe evidence for Catalog `catalog.bundle.v1` paid/provider readiness.

Required before any live paid/provider bundle smoke:

- `[RESOLVED/NARROWED: owner-approved bounded paid/provider smoke intake GOAL24-PAID-PROVIDER-SMOKE-20260704-CODEX-OWNER-APPROVED-003 covers Fiobanka QR, flipflop-service, catalog.bundle.v1 919be990-1c76-4f9c-b100-829281c6a709, component qty 1 each, max 300 CZK, one attempt, window 2026-07-04T09:00:08+02:00 through 2026-07-04T23:59:59+02:00 Europe/Prague, and sanitized evidence path reports/validation/VAL-GOAL-24-live-paid-provider-runtime-evidence-2026-07-04.md; runtime remains blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and final redacted evidence exist]`
- `[MISSING: provider completion evidence from accepted Fiobanka callback or authenticated transaction-polling reconciliation that marks the selected paid order complete without manual payment-state bypass]`
- `[MISSING: Warehouse stock decrement/reservation-release evidence for every bundle component line]`
- `[MISSING: owner-approved refund/cancel rollback plan proving provider refund or cancellation plus Orders/Warehouse cleanup]`
