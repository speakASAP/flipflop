# Process Registry Validation Contract

Status: Draft

Date: 2026-07-06

Related ADR: `ADR-001: FlipFlop Process Runtime Path`

## Purpose

This contract defines the first validation rules for FlipFlop process-registry definitions. It exists to keep business process definitions separate from application code while preventing unapproved or incomplete process artifacts from becoming runtime authority.

## Artifacts

- Process definition schema: `process-definition.schema.json`
- Runtime event envelope schema: `process-event-envelope.schema.json`
- First draft definition: `flipflop.successful_customer_journey.v1.draft.json`

## Lifecycle Rules

Allowed lifecycle states:

- `draft`
- `review`
- `approved`
- `active`
- `retired`
- `rejected`

State rules:

- `draft` may contain `[MISSING: ...]` and `[UNKNOWN: ...]` markers.
- `review` may contain `[UNKNOWN: ...]` markers only when the review explicitly accepts the uncertainty as non-runtime-blocking.
- `approved` must contain no unresolved `[MISSING: ...]` markers.
- `active` must contain no unresolved `[MISSING: ...]` or `[UNKNOWN: ...]` markers.
- `active` must have `owner`, `approver`, `approval_evidence`, `approval_timestamp`, `effective_from`, and at least one passing validation evidence record.
- `retired` must keep immutable history and may not be edited in place.
- `rejected` must keep rejection evidence and may not be activated.
- `approved`, `active`, `retired`, and `rejected` definitions are immutable; any correction requires a new semantic version.

## Schema Validation

Every process definition must pass `process-definition.schema.json`.

Schema validation checks:

- required top-level fields exist
- `process_key` follows reverse-domain-style lowercase dot notation
- `version` follows semantic versioning
- lifecycle state is valid
- IPS trace contains all required chain keys
- steps, events, transitions, runtime invariants, and validation evidence are structurally present
- transition references have valid identifier shape

Schema validation does not prove graph reachability, approval authority, or runtime safety by itself.

## Cross-Field Validation

A validator must reject a definition when:

- any transition references a missing `from_step`, `to_step`, or `event`
- no start step exists
- no end step exists
- any non-end step has no outgoing transition
- any non-start step is unreachable from a start step
- any `approved` or `active` transition guard has `type=missing`
- any transition `guard_ref` does not match a declared guard
- any embedded transition guard does not equal the declared guard referenced by `guard_ref`
- any active definition contains `[MISSING: ...]` or `[UNKNOWN: ...]` anywhere
- any active definition lacks owner, approver, approval evidence, approval timestamp, effective date, or passing validation evidence
- any step emits an event not declared in `events`
- any event source or payload contract is unresolved
- any IPS trace entry has `status=missing` for an active definition

## Runtime Resolver Rules

The runtime resolver must fail closed.

It must return `blocked` or throw a typed runtime error when:

- no active definition exists for the requested process key
- more than one active definition exists for the same process key
- the active definition fails schema validation
- the active definition fails cross-field validation
- current time is before `effective_from`
- current time is after `effective_to` when `effective_to` is set
- process version requested by caller differs from active version and no compatibility rule exists
- transition requested by caller is not listed in `allowed_transitions`
- transition guard cannot be evaluated
- transition guard evaluates false

It must not silently fall back to draft, review, approved, retired, or rejected definitions.

## Event Envelope Rules

Every accepted, rejected, or blocked runtime transition attempt must emit or persist an event compatible with `process-event-envelope.schema.json`.

Required event fields:

- `event_id`
- `occurred_at`
- `process_key`
- `process_version`
- `transition.from_step`
- `transition.to_step`
- `transition.event`
- `source_entity`
- `actor`
- `validation_result`
- `payload`

Rejected or blocked transition attempts must preserve `validation_result.reason` with a machine-actionable rule reference.

## Scheduled Validation

A scheduled validation job should run at least daily for all approved and active process definitions.

Minimum report fields:

- process key
- version
- status
- schema validation result
- cross-field validation result
- unresolved marker count
- IPS trace result
- active-version uniqueness result
- effective-window result
- runtime resolver dry-run result
- timestamp

The report must fail when any active definition is invalid.

## Approval Gate

Before a process definition can move to `approved`, the reviewer must verify:

- process owner is not missing
- approver is not missing and is distinct from the author when required by policy
- approval timestamp is present
- IPS trace is linked through Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation, or unresolved items are explicitly blocked
- all transition guards are understandable by a non-code process owner
- all guards are declarative references and contain no arbitrary executable code
- all event payload contracts are linked
- rollback target is defined when a prior stable version exists

[MISSING: approved FlipFlop process-owner role and approval authority]

## Non-Goals

- This contract does not deploy Camunda, Temporal, Flowable, or n8n.
- This contract does not authorize live payment, refund, inventory, delivery, payroll, or supplier mutations.
- This contract does not define a general-purpose workflow engine.
- This contract does not let process definitions execute arbitrary code.
- This contract does not replace service-level idempotency, authorization, payment safety, or data consistency rules.

## Parallel Handoff

Ready now:

| Workstream | Owner role | Scope | Output |
|---|---|---|---|
| Validator implementation | Backend/platform agent | Implement JSON Schema validation plus cross-field graph checks. | Validator module and tests. |
| IPS trace completion | Governance agent | Replace `[MISSING: ...]` trace refs with approved FlipFlop IPS artifacts. | Trace packet and blocker list. |
| Journey review | Product/process owner | Review the draft journey states, events, and guards. | Approved journey changes or explicit blockers. |

Dependency-gated:

| Workstream | Blocker | Output |
|---|---|---|
| Runtime resolver | Persistence contract and validator implementation. | Fail-closed resolver API. |
| Scheduled validation | Storage location and CI/scheduler choice. | Daily validation report. |
| Camunda pilot packet | Registry Phase 1 evidence and licensing/runtime decision. | Pilot plan only, no deployment. |

## Validation Evidence

This draft contract is validated by inspection against ADR-001 and by the no-dependency validators in:

- `validate-process-definition.mjs`
- `validate-process-event-envelope.mjs`

Current blockers:

- [MISSING: approved FlipFlop process-owner role and approval authority]
- [MISSING: current FlipFlop checkout/service architecture and runtime language boundaries]
- [MISSING: production persistence, queue, and scheduler contracts for FlipFlop]
- [MISSING: event payload contracts for customer journey steps]
