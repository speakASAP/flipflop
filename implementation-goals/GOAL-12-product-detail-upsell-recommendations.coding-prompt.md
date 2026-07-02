# Coding Prompt: GOAL-12 Product Detail Upsell Recommendations

Implement deterministic product-detail upsell recommendations for FlipFlop.

## Objective

Add an Amazon-style related-products row and a buy-together set below the product detail card.

## Required Behavior

- Add a public read-only `GET /products/:id/recommendations` endpoint.
- Prefer products historically bought with the current product from confirmed local orders when available.
- If no history exists, use same-category products first, then other sellable products.
- Always return a bundle when at least one related product exists.
- Show savings as Czech crowns, never as a percentage.
- Include the owner-requested free-shipping threshold of 1000 Kč in the displayed savings preview.
- Do not use AI.

## Hard Boundaries

- Do not mutate checkout totals, payment amount, order discount, refunds, cancellations, product prices, stock, Catalog, Warehouse, or auth.
- Do not expose customer IDs, emails, addresses, payment state, notes, or order identifiers in public responses.
- Do not overwrite unrelated dirty changes.

## Implementation Notes

- Keep the first increment deterministic and explainable.
- Prefer existing product mapping and public sellability behavior.
- Add a narrow verifier script that checks source-level contract and safety boundaries.
- Keep UI text Czech.

## Validation Commands

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
node scripts/verify-product-detail-upsell.js
git diff --check
cd services/product-service && npm run build
cd services/frontend && npm run build
python3 scripts/deployment_readiness_gate.py --root .
```
