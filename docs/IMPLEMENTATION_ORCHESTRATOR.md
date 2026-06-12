# Implementation Orchestrator

## Purpose

The FlipFlop orchestrator manages implementation by goals. It preserves the original human intent, selects the next valid goal, prepares execution context, verifies completion, and reports the next step to the owner.

## Required Reading

Before implementation work, read:

```text
00_constitution/CONSTITUTION.md
01_vision/VISION.md
02_business_case/BUSINESS_CASE.md
README.md
BUSINESS.md
SYSTEM.md
SPEC.md
GOALS.md
PLAN.md
17_governance/PROJECT_INVARIANTS.md
23_documentation_contracts/DOCUMENTATION_COMPLETENESS_STANDARD.md
docs/INTENT_MEMORY.md
docs/IMPLEMENTATION_STATE.md
docs/process/PROJECT_INVARIANTS.md
docs/process/DOCUMENTATION_COMPLETENESS_STANDARD.md
docs/process/OPERATIONAL_GATES.md
docs/process/AGENT_GAP_FILLING_RULES.md
implementation-goals/README.md
```

For a selected goal, also read:

```text
implementation-goals/GOAL-XX-*.md
implementation-goals/GOAL-XX-*.execution-plan.md
implementation-goals/GOAL-XX-*.context-package.md
implementation-goals/GOAL-XX-*.coding-prompt.md
```

If docs-rag-microservice is available, query it before broad repository scanning.

## Selection Algorithm

1. Read `docs/IMPLEMENTATION_STATE.md`.
2. If a goal is active, continue from its checkpoint.
3. If the active goal is blocked, report the blocker and required owner or system action.
4. If no goal is active, pick the first `ready` goal in `implementation-goals/README.md` whose dependencies are done.
5. Do not start a later goal while an earlier required dependency is incomplete.
6. Do not start code edits unless the selected goal has an execution plan and intent bundle.
7. Do not start code edits unless the IPS pre-coding gate and strict documentation audit pass or a blocker is recorded.

## Execution Loop

1. Confirm the goal's intent, constraints, non-goals, and acceptance criteria.
2. Check repository status and identify unrelated dirty files.
3. Update or create the execution plan.
4. Run `python3 scripts/pre_coding_gate.py --root .` and `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` before code edits.
5. Apply the narrowest possible code or documentation changes.
6. Run the narrowest relevant validation gate.
7. Run `python3 scripts/deployment_readiness_gate.py --root .` before deployment or release closure.
8. Update goal artifacts and `docs/IMPLEMENTATION_STATE.md`.
9. Write an Intent Compliance Report before marking the goal complete.
10. Report the next step to the owner.

## IPS Intent Contract

Future implementation must preserve:

```text
Raw owner request -> constitution -> vision -> business case -> system -> subsystem -> roadmap -> milestone -> feature -> task -> goal impact -> execution plan -> context package -> coding prompt -> code -> validation report -> state update
```

Execution-critical `[MISSING: ...]` and `[UNKNOWN: ...]` markers block coding and release closure.

## Intent Compliance Report

Each completed goal must answer:

- What original intent did this goal preserve?
- Which constraints were relevant?
- Which non-goals were respected?
- What changed?
- What validation ran?
- What remains blocked or deferred?
- What is the next recommended goal or command?

## Parallel Work

Parallel workers may be used only when:

- file ownership is disjoint;
- each worker receives an intent bundle;
- each worker has explicit allowed and forbidden changes;
- the orchestrator owns integration, validation, and state updates.

## Branch And Dirty Tree Rules

- Do not overwrite unrelated user or agent changes.
- If unrelated dirty files exist, leave them untouched and mention them in the state report.
- Goal branches or worktrees are preferred for code changes.
- Documentation-only orchestration setup may be done in place when the owner requested it directly.

## User Checkpoints

Ask the owner only for:

- scope or intent decisions;
- human approval for price, cancellation, refund, or deployment risk;
- missing secrets or provider credentials;
- production deployment approval;
- merge conflict decisions.
