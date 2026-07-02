# Coding Prompt: GOAL-13 Product Detail Bundle Discount Contract

## Role

You are implementing a scoped FlipFlop checkout pricing goal on the remote repo `/home/ssf/Documents/Github/flipflop`.

## Task

Implement the smallest safe end-to-end bundle-discount contract for product-detail buy-together sets.

## Context

Read first:

```text
docs/INTENT_MEMORY.md
docs/IMPLEMENTATION_STATE.md
docs/IMPLEMENTATION_ORCHESTRATOR.md
docs/process/OPERATIONAL_GATES.md
implementation-goals/GOAL-12-product-detail-upsell-recommendations.md
implementation-goals/GOAL-13-product-detail-bundle-discount-contract.md
implementation-goals/GOAL-13-product-detail-bundle-discount-contract.execution-plan.md
```

## Constraints

- Work on the remote repo only.
- Preserve unrelated dirty work.
- Do not trust browser-provided savings, discount, or shipping totals.
- Do not run paid payment/order mutation smokes without approval.
- Do not weaken payment webhook trust or stock authority.
- Do not mention `5%` in customer-facing UI.

## Acceptance Criteria

- Frontend stores and submits only a bundle intent with product ids.
- Order-service validates source product and bundle products against server recomputed eligible recommendations.
- Raw non-zero `discount` is rejected unless backed by discount code or bundle intent.
- Bundle discount and discount code do not stack.
- Applied bundle discount affects local order total, central Orders payload total, and payment amount consistently.
- Checkout summary shows server-aligned CZK bundle savings.
- New source verifier and builds pass.

## Validation

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
node scripts/verify-product-detail-bundle-discount.js
npm run verify:product-detail-upsell
npm run verify:flipflop-offer-gate
npm run verify:orders-hub-integration
git diff --check
cd services/order-service && npm run build
cd services/frontend && npm run build
python3 scripts/deployment_readiness_gate.py --root .
```
