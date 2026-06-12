# Documentation Completeness Standard

Every implementation goal must leave enough documentation for the next agent to continue without guessing.

## Required Per Goal

- Goal file with outcome, dependencies, allowed changes, forbidden changes, acceptance criteria, and validation commands.
- Execution plan before code edits.
- Context package for worker tasks when work is delegated or spans multiple modules.
- Coding prompt when a worker or later session should implement a scoped task.
- Validation report before marking done.
- Intent Compliance Report before marking done.

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
