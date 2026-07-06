# ADR-001: FlipFlop Process Runtime Path

Status: proposed

Date: 2026-07-06

## Context

FlipFlop needs a visible process-management layer for `flipflop.successful_customer_journey.v1`, but the first rollout must not introduce a heavyweight workflow engine or mutate checkout, payment, order, provider, or inventory behavior.

## Decision

Start with a lightweight service-local process package and validator that can consume a future BPCP process registry contract without making FlipFlop the global process-definition owner.

Definitions are JSON for the first implementation because the central BPCP contract examples are JSON and the repository already supports dependency-free Node verification scripts. YAML or BPMN projections may be added after the registry contract is stable.

## Consequences

- Draft definitions can preserve `[MISSING: ...]` and `[UNKNOWN: ...]` blockers.
- Validated, scheduled, and active definitions cannot contain unresolved blockers.
- Active definition validation failure must stop orchestration before side effects.
- Camunda 8, Temporal, Flowable, or n8n remain future options, not first-step runtime dependencies.
- Central BPCP schema/API ownership remains outside FlipFlop.

## Validation

Run:

```bash
node process-registry/validate-process-definitions.js
```

Expected for the initial draft: validation passes structurally while preserving blockers because the process is not active.
