# Documentation Completeness Standard

Every implementation goal must leave enough documentation for the next agent to continue without guessing.

This local standard is the FlipFlop companion to the canonical IPS contract in:

```text
23_documentation_contracts/DOCUMENTATION_COMPLETENESS_STANDARD.md
```

The required IPS chain is:

```text
Constitution -> Vision -> Business Case -> System -> Subsystem -> Roadmap -> Milestone -> Feature -> Task -> Goal Impact -> Execution Plan -> Context Package -> Coding Prompt -> Code -> Validation Report -> State Update
```

## Required Per Goal

- Goal file with outcome, dependencies, allowed changes, forbidden changes, acceptance criteria, and validation commands.
- Execution plan before code edits.
- Context package for worker tasks when work is delegated or spans multiple modules.
- Coding prompt when a worker or later session should implement a scoped task.
- Validation report before marking done.
- Intent Compliance Report before marking done.
- Invariant, sensitive-data, contract, replay/determinism, rollback, and gate sections before code edits.

## Required State Updates

Update `docs/IMPLEMENTATION_STATE.md` after each implementation session with:

- active goal;
- status;
- checkpoint reached;
- validation run or skipped with reason;
- blockers;
- next step.

## Completeness Checks

A goal is incomplete if:

- acceptance criteria are not traceable to validation evidence;
- original intent or constraints are missing;
- a blocker is hidden as a task status;
- a code change lacks a validation note;
- an owner decision is referenced but not recorded.

## Required Gate Commands

Before coding:

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
```

Before deployment or release closure:

```bash
python3 scripts/deployment_readiness_gate.py --root .
```
