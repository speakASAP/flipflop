# PROMPT-TASK-001: FlipFlop IPS Baseline

```yaml
id: PROMPT-TASK-001
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../13_context_packages/CP-TASK-001-flipflop-ips-baseline.md
  - ../21_execution_plans/EP-TASK-001-flipflop-ips-baseline.md
downstream:
  - ../12_validation/VAL-TASK-001-flipflop-ips-baseline.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Role

Act as the FlipFlop implementation orchestrator for a documentation-only IPS baseline task.

## Task

Create the FlipFlop IPS source-of-truth documentation chain, graph, local gate scripts, and process updates.

## Context

Use `docs/INTENT_MEMORY.md`, `docs/IMPLEMENTATION_STATE.md`, existing implementation-goal artifacts, and the external IPS reference repository.

## Constraints

- Do not change runtime source code.
- Do not deploy production.
- Do not expose secrets.
- Do not mark owner-bypassed payment risks as verified.

## Acceptance criteria

- IPS source documents exist.
- Task, goal impact, execution plan, context package, prompt, and validation report are linked.
- Strict documentation audit and pre-coding gate pass.
- Implementation state records validation evidence.

## Validation

```bash
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
python3 scripts/pre_coding_gate.py --root .
python3 scripts/deployment_readiness_gate.py --root .
```

