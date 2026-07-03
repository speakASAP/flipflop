# GOAL-24: Durable Catalog BundleId Checkout Migration Readiness

```yaml
id: GOAL-24-DURABLE-BUNDLEID-CHECKOUT-MIGRATION-READINESS
status: source-policy-validated-runtime-blocked
owner: flipflop-durable-bundleid-checkout-readiness-worker
created: 2026-07-03
catalog_contract: catalog.bundle.v1
runtime_progression: source-rollout-enabled-paid-provider-blocked
live_checkout: owner-approved-smoke-only
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: FlipFlop can sell Catalog-backed bundles only when durable bundle identity, checkout totals, stock effects, and payment/provider truth stay owned by the correct ecosystem services.
- Goal Impact: `[RESOLVED/NARROWED: explicit ecosystem checkout migration accepts durable Catalog bundleId only as bounded bundleEvidence metadata; FlipFlop runtime checkout submission remains blocked]`. The previous ambiguous migration blocker is narrowed to an evidence-only ecosystem contract plus a FlipFlop runtime rollout blocker.
- System: Catalog owns durable `bundleId` and bundle composition; FlipFlop owns storefront display and checkout submission shape; Orders owns order identity and bounded `bundleEvidence`; Warehouse owns component-line reservations and stock lifecycle; Payments owns payment execution and provider/refund/cancel boundaries.
- Feature: durable Catalog bundleId checkout migration readiness.
- Task: reconcile the accepted cross-service contract shape and prove FlipFlop still fails closed before runtime checkout submission.
- Execution Plan: docs/verifier/source-policy only; do not run live checkout, provider redirects, webhooks, refunds/cancellations, fulfillment, stock mutations, deploys, migrations, secrets, or production DB mutations.
- Coding Prompt: accept durable `bundleId` only as bounded audit evidence in the ecosystem contract; do not enable cart, checkout, order-service, paid/provider, or Warehouse runtime progression from `bundleId`.
- Code: this document, `scripts/verify-catalog-bundleid-checkout-migration.js`, package script `verify:catalog-bundleid-checkout-migration`, Goal 24 state docs, and paid/provider gate verifier/docs alignment.
- Validation: `npm run verify:catalog-bundleid-checkout-migration`, `npm run verify:paid-provider-bundle-checkout-gate`, `npm run verify:catalog-bundle-adoption`, `node --check scripts/verify-catalog-bundleid-checkout-migration.js`, and `git diff --check`.
- State Update: durable `bundleId` migration is source-policy narrowed; FlipFlop runtime checkout submission and paid/provider progression remain blocked.

## Ecosystem Contract Evidence

- Catalog owns durable `bundleId`, component metadata, lifecycle, and `catalog.bundle.v1` validation. Catalog is not a SKU, stock, checkout, order, or payment authority.
- Orders accepts optional bounded `bundleEvidence[]` for `catalog.bundle.v1` only as additive audit metadata. `bundleEvidence[].bundleId` is the durable Catalog bundle aggregate UUID, `productIds` must match normal submitted item product IDs, and Orders rejects raw Catalog candidates, monetary claims, customer/address/payment/provider data, tokens, secrets, and unknown bundle evidence fields.
- Warehouse accepts only normal component product reservation lines. It must not reserve `bundleId`, create synthetic bundle stock, infer bundle eligibility, calculate bundle pricing, or approve end-to-end paid/provider progression.
- Payments accepts bounded `catalog.bundle.v1` metadata only as audit evidence. Amount and currency remain caller-owned final totals, and provider create/refund/cancel behavior remains side-effectful and approval-gated.
- Catalog runtime evidence has already proven non-mutating Rung 1 validation and pending-order Rung 2 reservation/release for Catalog-owned validation bundles, but not paid/provider checkout, webhook success, fulfillment decrement, refund, or customer-facing FlipFlop runtime submission.

## Accepted Migration Shape

The explicit ecosystem checkout migration may accept durable Catalog `bundleId` only in this bounded form after a separate FlipFlop rollout lane is approved:

```json
{
  "bundleEvidence": [
    {
      "contractVersion": "catalog.bundle.v1",
      "bundleId": "durable-catalog-bundle-uuid",
      "productIds": ["component-catalog-product-id-1", "component-catalog-product-id-2"],
      "discountPolicyRef": "optional-bounded-policy-ref",
      "freeShippingPolicyRef": "optional-bounded-policy-ref",
      "serverTotalSource": "checkout_authoritative"
    }
  ]
}
```

This evidence must travel beside normal component item lines. It must not replace line items, authorize pricing, change stock identity, create a synthetic SKU, imply provider payment success, or bypass Orders/Warehouse/Payments validation.

## FlipFlop Fail-Closed Boundary

Current FlipFlop source remains intentionally blocked:

- product-detail Catalog `bundleId` is display evidence only;
- guest cart stores local product-detail bundle intent plus legacy `catalogCandidateId` provenance only;
- checkout submits local product IDs and `catalogCandidateId`, not durable `bundleId` or `bundleEvidence`;
- FlipFlop order-service does not synthesize central Orders `bundleEvidence` from browser input;
- paid/provider checkout smoke remains blocked until owner/provider rollback evidence exists.

Current explicit blockers retained:

- `[RESOLVED/NARROWED: FlipFlop source rollout maps durable catalog.bundle.v1 bundleId into central Orders bundleEvidence without changing totals, stock identity, or provider state]`
- `[MISSING: owner-approved paid/provider checkout smoke with stock and refund/cancel rollback plan]`
- `[MISSING: owner-approved paid/provider test window, non-secret approval id, target active catalog.bundle.v1 bundle id, provider method, and sanitized evidence policy]`
- `[MISSING: provider webhook/callback evidence that marks the paid order complete without manual payment-state bypass]`
- `[MISSING: Warehouse stock decrement/reservation-release evidence for every bundle component line]`
- `[MISSING: owner-approved refund/cancel rollback plan proving provider refund or cancellation plus Orders/Warehouse cleanup]`

## Parallel Execution

| Workstream | Status | Owner role | Scope | Allowed files | Forbidden files | Dependencies | Blockers | Validation evidence | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A Ecosystem contract reconciliation | complete in this lane | FlipFlop checkout readiness worker | Record accepted evidence-only durable `bundleId` migration shape | Goal 24 docs/verifier/package wiring | Catalog/Orders/Warehouse/Payments source, runtime state, migrations, deploys | Catalog/Orders/Warehouse/Payments accepted contracts/status | none for docs-only reconciliation | source verifier and diff check | `bundleId` is evidence only, never checkout authority. |
| B FlipFlop source rollout | dependency-gated | FlipFlop checkout implementation owner | Map display-only Catalog bundle aggregate into central Orders `bundleEvidence` safely | `[MISSING: approved FlipFlop source rollout file list]` | live checkout, provider calls, Warehouse stock mutation, pricing authority changes | Workstream A and owner-approved rollout plan | `[RESOLVED/NARROWED: FlipFlop source rollout maps durable catalog.bundle.v1 bundleId into central Orders bundleEvidence without changing totals, stock identity, or provider state]` | `[MISSING: source verifier/build evidence]` | Must preserve normal component item lines and server-owned totals. |
| C Paid/provider runtime smoke | dependency-gated | Runtime validation owner | Owner-approved one-run paid/provider bundle checkout with rollback | `[MISSING: approved smoke packet]` | unapproved provider/order/stock/refund/cancel mutations | A+B plus provider/rollback approvals | paid/provider blockers listed above | `[MISSING: sanitized live runtime evidence]` | Separate approved lane only. |
| D Integration validation | final integration | Commerce integration validator | Merge and validate source-policy/docs lanes | integration status docs | racing worker-owned files/contracts | A complete, B/C only after approval | `[UNKNOWN: future rollout timing]` | current verifier evidence | Merge order: A, then B, then C. |

Shared contracts: Catalog `catalog.bundle.v1`, Orders `bundleEvidence[]`, Warehouse component-line reservation contract, Payments bounded bundle metadata allowlist, and GOAL-13 local bundle intent.

Integration owner: Commerce integration validator.

Validation owner: FlipFlop checkout readiness worker for this source-policy lane.

Merge order: docs/verifier/package wiring, validation, commit/push. Runtime checkout source rollout and paid/provider smoke remain separate dependency-gated lanes.
