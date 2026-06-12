# SYS-001: FlipFlop Commerce Platform

```yaml
id: SYS-001
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../SYSTEM.md
  - ../01_vision/VISION.md
downstream:
  - ../05_subsystems/SUB-001-checkout-revenue-governance.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Purpose

Operate FlipFlop as a production e-commerce platform with storefront, catalog, stock, cart, orders, payments, notifications, SEO, and operational evidence.

## Responsibilities

- Serve customer-facing storefront and API paths.
- Preserve payment, pricing, order, stock, and SEO safety rules.
- Coordinate with shared ecosystem services.
- Keep implementation work traceable to goals and validation reports.

## Validation

Validate through goal-specific smoke checks, payment-provider evidence, stock checks, deployment checks, and IPS documentation gates.

