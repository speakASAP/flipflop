# EP-TASK-001: FlipFlop IPS Baseline

```yaml
id: EP-TASK-001
status: approved
source_task: ../11_tasks/TASK-001-flipflop-ips-baseline.md
vision: ../01_vision/VISION.md
constitution: ../00_constitution/CONSTITUTION.md
feature: ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
goal_impact: ../22_goal_impact/GOAL-IMPACT-TASK-001-flipflop-ips-baseline.md
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
```

## Metadata

Documentation-only execution plan for `TASK-001`.

## Upstream Traceability

- Constitution: `00_constitution/CONSTITUTION.md`
- Vision: `01_vision/VISION.md`
- Intent memory: `docs/INTENT_MEMORY.md`
- Feature: `10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- Goal impact: `22_goal_impact/GOAL-IMPACT-TASK-001-flipflop-ips-baseline.md`

## Goal Impact

This plan makes future coding dependent on approved intent, explicit boundaries, and validation evidence.

## Project Invariants

Preserve all invariants in `17_governance/PROJECT_INVARIANTS.md`.

## Sensitive-Data Handling

Do not include secrets, provider tokens, raw production data, customer data, or live credentials.

## Contract Validation Plan

No runtime contracts are changed. Documentation contracts are validated by `scripts/strict_doc_audit.py`.

## Replay/Determinism Plan

No runtime replay path is changed. Gate scripts should produce repeatable results for the same repository state.

## Scope

Add IPS documentation and gates for FlipFlop.

## Non-Goals

Runtime implementation, production deployment, and payment-provider verification are excluded.

## Files to Inspect

- `docs/INTENT_MEMORY.md`
- `docs/IMPLEMENTATION_STATE.md`
- `implementation-goals/README.md`
- `23_documentation_contracts/DOCUMENTATION_COMPLETENESS_STANDARD.md`

## Files to Create

Canonical IPS directories, graph, reports, and local gate scripts.

## Files to Modify

- `AGENTS.md`
- `docs/IMPLEMENTATION_ORCHESTRATOR.md`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/process/DOCUMENTATION_COMPLETENESS_STANDARD.md`
- `docs/process/OPERATIONAL_GATES.md`
- `implementation-goals/README.md`

## Files That Must Not Be Modified

Runtime source files, secrets, environment files, and deployment manifests.

## Implementation Steps

1. Add canonical IPS artifacts.
2. Add local gate scripts.
3. Update existing process docs.
4. Run validation gates.
5. Record evidence in implementation state.

## Test Plan

```bash
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root .
./scripts/next_goal.sh
```

## Validation Plan

Pass the strict documentation audit and pre-coding gate. Deployment-readiness gate is closure evidence only and must not deploy.

## Gate Commands

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
python3 scripts/deployment_readiness_gate.py --root .
```

## Documentation Updates

Update process docs and implementation state to point future agents at IPS.

## Rollback Plan

Revert this documentation-only baseline and scripts. No runtime rollback is required.

## Agent Handoff Prompt

Implement only the FlipFlop IPS documentation baseline. Do not change runtime code, secrets, or production deployment. Preserve owner-bypassed payment-provider risks.

## Completion Checklist

- [x] Implementation complete
- [x] Tests complete
- [x] Validation evidence collected
- [x] Documentation updated
- [x] Deviations documented
