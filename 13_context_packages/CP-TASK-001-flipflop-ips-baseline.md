# CP-TASK-001: FlipFlop IPS Baseline

```yaml
id: CP-TASK-001
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../21_execution_plans/EP-TASK-001-flipflop-ips-baseline.md
downstream:
  - ../14_prompts/PROMPT-TASK-001-flipflop-ips-baseline.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Target task

`11_tasks/TASK-001-flipflop-ips-baseline.md` adds the FlipFlop IPS documentation and gate baseline.

## Upstream traceability

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `docs/INTENT_MEMORY.md`
- `21_execution_plans/EP-TASK-001-flipflop-ips-baseline.md`

## Included documents

- `AGENTS.md`
- `README.md`
- `BUSINESS.md`
- `SYSTEM.md`
- `SPEC.md`
- `GOALS.md`
- `PLAN.md`
- `docs/IMPLEMENTATION_STATE.md`
- `implementation-goals/README.md`

## Excluded documents

- Runtime source files.
- Secret and environment files.
- Production deployment manifests.

## Constraints

Do not change runtime behavior, deploy production, or mark payment-provider/webhook gaps as verified.

## Agent prompt

Implement the documentation-only IPS baseline for FlipFlop and run strict documentation audit plus pre-coding gate.

## Validation instructions

Run the IPS gate commands and record evidence in `docs/IMPLEMENTATION_STATE.md`.

