# FlipFlop Vision

```yaml
id: FF-VISION
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../00_constitution/CONSTITUTION.md
  - ../docs/INTENT_MEMORY.md
downstream:
  - ../02_business_case/BUSINESS_CASE.md
  - ../GOALS.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Vision

FlipFlop is a Czech e-commerce platform that serves a real storefront, shows sellable products from catalog and warehouse data, supports authenticated shopping, and reaches first revenue through safe checkout flows.

## Preserved Intent

- Serve the storefront at `https://flipflop.alfares.cz/`.
- Preserve checkout-to-first-revenue as the near-term business outcome.
- Use shared ecosystem services for auth, catalog, warehouse, orders, payments, notifications, logging, and AI.
- Keep all payment provider gaps explicit until PayU, PayPal, GP WebPay, and Stripe verification is complete or owner-bypassed.
- Publish AI-generated product content only through an approval-first review flow.

## Compatibility Rule

New work must strengthen this vision or record an explicit owner-approved amendment.

