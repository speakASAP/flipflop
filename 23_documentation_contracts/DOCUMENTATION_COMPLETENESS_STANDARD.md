# FlipFlop IPS Documentation Completeness Standard

```yaml
id: FF-IPS-DOCUMENTATION-COMPLETENESS
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../00_constitution/CONSTITUTION.md
  - ../01_vision/VISION.md
downstream:
  - ../docs/process/DOCUMENTATION_COMPLETENESS_STANDARD.md
  - ../scripts/strict_doc_audit.py
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Purpose

Define the IPS documentation shape that FlipFlop agents must satisfy before coding, integration, deployment, or closure.

## Required Metadata

Major documents should include `id`, `status`, `owner`, `created`, `last_updated`, `completeness_level`, `upstream`, `downstream`, and `related_adrs`.

## Required Chain

```text
Constitution -> Vision -> Business Case -> System -> Subsystem -> Roadmap -> Milestone -> Feature -> Task -> Goal Impact -> Execution Plan -> Context Package -> Coding Prompt -> Code -> Validation Report -> State Update
```

## Required Gates

- Pre-coding gate before code changes.
- Goal-specific product checks before closure.
- Deployment-readiness gate before production rollout or release closure.
- Intent compliance report before marking a goal done.

## Missing Information Policy

Use exact `[MISSING: ...]` and `[UNKNOWN: ...]` markers only when information cannot be derived from approved upstream documents. Execution-critical markers block coding.

## Validation

Run `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`.

