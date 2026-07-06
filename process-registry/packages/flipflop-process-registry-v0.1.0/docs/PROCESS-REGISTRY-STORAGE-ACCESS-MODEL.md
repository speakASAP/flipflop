# Process Registry Storage and Access-Control Model

Status: Draft

Date: 2026-07-06

Related ADR: `ADR-001: FlipFlop Process Runtime Path`

## Decision

Use a Git-first process registry as the source of truth, with an optional runtime read-model projection later.

The registry source of truth is a versioned artifact collection:

```text
process-registry/
  registry.collection.json
  definitions/
    flipflop.successful_customer_journey.v1/
      1.0.0.json
  reports/
    validation/
```

For this local handoff, the collection format is represented by:

- `process-registry-collection.schema.json`
- `fixtures/registry-valid.collection.json`
- `fixtures/registry-duplicate-active.collection.json`
- `fixtures/registry-zero-active.collection.json`
- `fixtures/registry-runtime-reader-write.collection.json`
- `validate-process-registry-collection.mjs`

## Storage Rules

- Process definitions are immutable after `approved`, `active`, `retired`, or `rejected`.
- Updates require a new semantic version.
- Every collection record must point to a definition artifact by `definition_ref`.
- `process_key` and `version` form a unique identity.
- Only one currently effective `active` definition is allowed for a given `process_key`.
- Runtime readers may consume only the active approved projection, not draft/review artifacts.
- The Git collection remains authoritative until [MISSING: production persistence and access-control model] is approved.

## Optional Runtime Projection

Later, a database or object-store projection may be generated from the Git registry.

Projection constraints:

- Projection is read-only for runtime services.
- Projection must be generated only from validated registry artifacts.
- Projection must preserve `process_key`, `version`, `status`, effective window, approval evidence, validation evidence, and source commit/reference.
- Runtime must fail closed when projection is missing, stale, invalid, duplicated, or incompatible.
- Projection cannot become the source of truth unless a new ADR supersedes this model.

## Access Roles

| Role | Purpose | Allowed actions | Forbidden actions |
|---|---|---|---|
| `viewer` | Read process definitions and reports. | Read all non-secret registry artifacts. | Write, approve, activate. |
| `modeler` | Draft or edit process definitions. | Create/edit `draft` and `review` artifacts. | Edit immutable states; approve; activate. |
| `reviewer` | Review process correctness. | Comment/review `review` artifacts. | Activate runtime definitions. |
| `approver` | Approve process definitions for release. | Move `review` to `approved` with approval evidence. | Self-approve when policy forbids it; bypass validation. |
| `publisher` | Promote approved definitions to active. | Move one `approved` version to `active` after validation. | Activate duplicate active versions; edit definitions. |
| `runtime_reader` | Runtime lookup by application services. | Read active projection only. | Read drafts; mutate any registry artifact. |
| `auditor` | Inspect history and evidence. | Read all registry history and reports. | Mutate registry artifacts. |
| `admin` | Maintain repository configuration. | Configure access and emergency locks. | Approve business content without process-owner authority. |

[MISSING: approved FlipFlop role-to-identity mapping]

## Lifecycle Write Permissions

| Current state | Target state | Required role | Required evidence |
|---|---|---|---|
| none | `draft` | `modeler` | author identity |
| `draft` | `review` | `modeler` | draft validation report |
| `review` | `approved` | `approver` | approval evidence and passing validation |
| `approved` | `active` | `publisher` | active uniqueness validation and runtime-readiness report |
| `active` | `retired` | `publisher` | replacement or retirement rationale |
| any mutable state | `rejected` | `reviewer` or `approver` | rejection rationale |

Immutable states:

- `approved`
- `active`
- `retired`
- `rejected`

Corrections to immutable states require a new semantic version.

## Active-Version Uniqueness

The registry collection validator must reject:

- more than one currently effective `active` record for the same `process_key`
- zero currently effective `active` records for a requested runtime `process_key`
- duplicate `process_key@version` records
- records missing `definition_ref`
- records whose `definition_ref` points to a missing local artifact
- roles that allow runtime readers to write
- lifecycle transitions that grant activation to roles other than `publisher`

## Runtime Resolver Boundary

Runtime services may ask:

- "what active version exists for `process_key`?"
- "is transition X allowed for process version Y?"
- "what event envelope should be emitted for accepted/rejected/blocked?"

Runtime services may not:

- write process definitions
- activate process definitions
- read draft/review definitions as fallback
- bypass validation when active lookup fails

## Blockers

- [MISSING: approved FlipFlop role-to-identity mapping]
- [MISSING: production persistence, queue, and scheduler contracts for FlipFlop]
- [MISSING: repository path or service boundary for process-registry source of truth]
- [MISSING: runtime projection storage decision]
- [UNKNOWN: whether the first release needs durable long-running orchestration or only governed process-state lookup]
