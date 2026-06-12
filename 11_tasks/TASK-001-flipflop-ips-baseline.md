# TASK-001: FlipFlop IPS Baseline

```yaml
id: TASK-001
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-001-flipflop-ips-baseline.md
execution_plan:
  - ../21_execution_plans/EP-TASK-001-flipflop-ips-baseline.md
```

## Objective

Add a canonical Intent Preservation System baseline to FlipFlop so future coding work starts from protected owner intent, explicit gates, and validation evidence.

## Upstream Links

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `docs/INTENT_MEMORY.md`
- `10_features/FEAT-001-intent-preserved-revenue-readiness.md`

## Goal Impact

This task prevents future implementation sessions from losing checkout-to-first-revenue intent or hiding payment-provider and webhook risks.

## Project Invariant Impact

Applies all invariants in `17_governance/PROJECT_INVARIANTS.md` and `docs/process/PROJECT_INVARIANTS.md`.

## Sensitive-Data Classification

Classification: none. The task creates documentation and gate scripts only; no secret values or production customer data are required.

## Contract/Schema Impact

No runtime API or schema contract changes are included. Documentation contracts are extended through IPS artifacts.

## Replay/Determinism Impact

No runtime replay behavior is changed. Gate command output should be deterministic for a fixed repository state.

## Scope

- Add canonical IPS source documents, graph, task, goal impact, execution plan, context package, prompt, validation, audit, and governance files.
- Add local IPS gate scripts.
- Update existing FlipFlop process docs to require IPS gates before coding and closure.

## Non-Goals

- No runtime source changes.
- No production deployment.
- No payment provider verification claims.

## Acceptance Criteria

- [x] IPS source documents exist.
- [x] Task, goal impact, execution plan, context package, coding prompt, and validation report are linked.
- [x] Gate scripts exist locally.
- [x] Existing owner-bypassed payment risk remains visible.

## Required Context

- `docs/INTENT_MEMORY.md`
- `docs/IMPLEMENTATION_STATE.md`
- `implementation-goals/README.md`
- `23_documentation_contracts/DOCUMENTATION_COMPLETENESS_STANDARD.md`

## Validation Task

Run strict documentation audit, pre-coding gate, deployment-readiness gate, and next-goal helper where available.

## Required Gates

- Strict documentation audit.
- Pre-coding gate.
- Deployment-readiness gate for closure evidence only; no production deployment.

## Execution Plan Requirement

This task must not be converted into coding work until `21_execution_plans/EP-TASK-001-flipflop-ips-baseline.md` exists and includes a validation plan.
