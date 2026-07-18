# FlipFlop Constitution

```yaml
id: FF-CONSTITUTION
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream: []
downstream:
  - ../01_vision/VISION.md
  - ../17_governance/PROJECT_INVARIANTS.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Immutable Rules

1. FlipFlop exists to become production-ready and revenue-capable at `https://flipflop.alfares.cz/`.
2. The checkout-to-first-revenue intent must be preserved through goals, plans, code, validation, and reports.
3. Price, discount, order total, cancellation, refund, and customer-facing payment state changes require explicit human approval or verified provider/system evidence.
4. Production payment-provider gaps and webhook gaps must remain visible until the owner completes or approves verification.
5. Agents must not create fake checkout success, fake stock state, fake AI content approval, or fake provider verification.
6. Secrets, credentials, raw production data, and provider tokens must not appear in prompts, docs, logs, reports, or commits.

## Change Control

This document is protected intent. AI agents may reference it but must not weaken it. Human-approved amendments must be recorded in `docs/01_vision/VISION_EVOLUTION.md`.

