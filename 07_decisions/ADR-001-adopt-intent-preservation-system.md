# ADR-001: Adopt Intent Preservation System

```yaml
id: ADR-001
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../00_constitution/CONSTITUTION.md
  - ../01_vision/VISION.md
downstream:
  - ../23_documentation_contracts/DOCUMENTATION_COMPLETENESS_STANDARD.md
related_adrs: []
```

## Context

FlipFlop implementation is goal-driven and includes payment, stock, order, deployment, and AI-content risks where hidden intent drift can create false readiness.

## Decision

FlipFlop adopts the Intent Preservation System as the required documentation and gate model for future implementation work.

## Consequences

- Coding requires upstream traceability and an execution plan.
- Validation evidence must map back to owner intent and invariants.
- Owner-bypassed risks remain explicit and cannot be marked verified automatically.

## Validation

Run `python3 scripts/pre_coding_gate.py --root .` before coding and `python3 scripts/deployment_readiness_gate.py --root .` before deployment or closure decisions.

