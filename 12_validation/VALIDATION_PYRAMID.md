# FlipFlop Validation Pyramid

```yaml
id: FF-VALIDATION-PYRAMID
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../17_governance/PROJECT_INVARIANTS.md
downstream:
  - ../12_validation/VAL-TASK-001-flipflop-ips-baseline.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Levels

1. Documentation audit for required IPS artifacts.
2. Pre-coding gate for traceability, execution plans, invariants, and sensitive data.
3. Goal-specific product checks for storefront, API, auth, cart, stock, checkout, payment, SEO, and deployment.
4. Deployment-readiness gate before production rollout or release closure.

## Validation

Every future goal must state which levels apply and where evidence is recorded.

