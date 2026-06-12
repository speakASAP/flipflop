# FlipFlop Business Case

```yaml
id: FF-BUSINESS-CASE
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../01_vision/VISION.md
  - ../BUSINESS.md
downstream:
  - ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Problem

FlipFlop implementation spans storefront, catalog, stock, cart, order, payment, notification, SEO, deployment, and operational evidence. Without strict intent preservation, agents can complete local tasks while losing revenue-readiness, payment safety, or owner-approved risk boundaries.

## Users

- Storefront customers.
- Project owner approving payment, pricing, deployment, and risk decisions.
- Operators maintaining production readiness.
- Agents executing bounded implementation goals.

## Value

The IPS baseline keeps every future task linked to the original checkout-to-first-revenue intent and prevents hidden drift in payment, pricing, stock, SEO, or deployment safety.

## Success Metrics

- Future coding starts only after a traceable execution plan exists.
- Validation reports preserve payment-provider, stock, SEO review, and deployment evidence.
- Owner-bypassed risks remain visible until manually closed.

