# Process Registry Validation Report

Status: Completed for local artifacts

Date: 2026-07-06

## Scope

This report covers the no-dependency validator lane for the FlipFlop process-registry artifacts. It does not deploy, install, or operate Camunda, Temporal, Flowable, n8n, or any application runtime.

## Validators

- `validate-process-definition.mjs`
- `validate-process-event-envelope.mjs`
- `validate-process-registry-collection.mjs`

## Commands Run

```bash
/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node outputs/validate-process-definition.mjs outputs/fixtures/valid-active.process.json --expect pass --report outputs/fixtures/valid-active.report.json
/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node outputs/validate-process-definition.mjs outputs/fixtures/invalid-active-missing-marker.process.json --expect fail --report outputs/fixtures/invalid-active-missing-marker.report.json
/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node outputs/validate-process-definition.mjs outputs/fixtures/invalid-transition-ref.process.json --expect fail --report outputs/fixtures/invalid-transition-ref.report.json
/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node outputs/validate-process-definition.mjs outputs/flipflop.successful_customer_journey.v1.draft.json --expect pass --report outputs/flipflop.successful_customer_journey.v1.draft-structure-report.json
/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node outputs/validate-process-definition.mjs outputs/flipflop.successful_customer_journey.v1.draft.json --require-runtime-ready --expect fail --report outputs/flipflop.successful_customer_journey.v1.runtime-readiness-report.json
/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node outputs/validate-process-event-envelope.mjs outputs/fixtures/valid-blocked-event-envelope.json --expect pass --report outputs/fixtures/valid-blocked-event-envelope.report.json
/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node outputs/validate-process-event-envelope.mjs outputs/fixtures/invalid-blocked-event-envelope-missing-reason.json --expect fail --report outputs/fixtures/invalid-blocked-event-envelope-missing-reason.report.json
/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node outputs/validate-process-registry-collection.mjs outputs/fixtures/registry-valid.collection.json --process-key flipflop.successful_customer_journey.v1 --expect pass --report outputs/fixtures/registry-valid.report.json
/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node outputs/validate-process-registry-collection.mjs outputs/fixtures/registry-duplicate-active.collection.json --process-key flipflop.successful_customer_journey.v1 --expect fail --report outputs/fixtures/registry-duplicate-active.report.json
/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node outputs/validate-process-registry-collection.mjs outputs/fixtures/registry-zero-active.collection.json --process-key flipflop.successful_customer_journey.v1 --expect fail --report outputs/fixtures/registry-zero-active.report.json
/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node outputs/validate-process-registry-collection.mjs outputs/fixtures/registry-runtime-reader-write.collection.json --process-key flipflop.successful_customer_journey.v1 --expect fail --report outputs/fixtures/registry-runtime-reader-write.report.json
python3 -m json.tool outputs/process-definition.schema.json
python3 -m json.tool outputs/process-event-envelope.schema.json
python3 -m json.tool outputs/process-registry-collection.schema.json
python3 -m json.tool outputs/flipflop.successful_customer_journey.v1.draft.json
```

## Results

| Artifact | Expected | Actual | Result |
|---|---:|---:|---|
| `fixtures/valid-active.process.json` | pass | pass | pass |
| `fixtures/invalid-active-missing-marker.process.json` | fail | fail | pass |
| `fixtures/invalid-transition-ref.process.json` | fail | fail | pass |
| `flipflop.successful_customer_journey.v1.draft.json` structure validation | pass | pass | pass |
| `flipflop.successful_customer_journey.v1.draft.json` runtime-ready validation | fail | fail | pass |
| `fixtures/valid-blocked-event-envelope.json` | pass | pass | pass |
| `fixtures/invalid-blocked-event-envelope-missing-reason.json` | fail | fail | pass |
| `fixtures/registry-valid.collection.json` | pass | pass | pass |
| `fixtures/registry-duplicate-active.collection.json` | fail | fail | pass |
| `fixtures/registry-zero-active.collection.json` | fail | fail | pass |
| `fixtures/registry-runtime-reader-write.collection.json` | fail | fail | pass |
| JSON syntax for schemas and draft definition | pass | pass | pass |

## Coverage

The process-definition validator covers:

- required top-level fields
- lifecycle status enum
- process key shape
- semantic version shape
- IPS trace key presence
- actor, evidence, step, event, guard, and transition shape
- duplicate step/event/guard identifiers
- transition references to existing steps, events, and guards
- embedded transition guard equality with declared `guards[]`
- start/end step presence
- non-end outgoing transition checks
- non-start incoming and reachability checks
- emitted-event declaration checks
- status-scoped marker rules
- active-definition owner, approver, approval evidence, approval timestamp, effective window, validation evidence, and linked IPS trace checks
- runtime-ready mode requiring `status=active`

The event-envelope validator covers:

- required envelope fields
- process identity and version shape
- transition identity shape
- source entity and actor shape
- validation decisions: `accepted`, `rejected`, `blocked`
- required `rule_refs`
- required machine-actionable `reason` for `rejected` and `blocked`

The registry-collection validator covers:

- Git-first source-of-truth declaration
- runtime projection declaration
- semantic-version immutability declaration
- registry roles and lifecycle permissions
- runtime-reader read-only enforcement
- publisher-only activation enforcement
- definition identity uniqueness by `process_key@version`
- local `definition_ref` and `validation_report_ref` existence
- immutable audit metadata presence
- active activation metadata
- current effective-window checks
- one currently effective active version per `process_key`
- zero-active runtime-blocking condition for requested `--process-key`

## Current Runtime Verdict

`flipflop.successful_customer_journey.v1.draft.json` is structurally valid as a draft, but it is not runtime-ready. Runtime readiness fails because the artifact is still `status=draft` and contains unresolved `[MISSING: ...]` blockers.

## Remaining Blockers

- [MISSING: approved FlipFlop process-owner role and approval authority]
- [MISSING: current FlipFlop checkout/service architecture and runtime language boundaries]
- [MISSING: production persistence, queue, and scheduler contracts for FlipFlop]
- [MISSING: event payload contracts for customer journey steps]
- [MISSING: storage location and access-control model for process-registry definitions]
- [UNKNOWN: whether first release needs durable long-running orchestration or only governed process-state lookup]

## Next Validation Lane

Move the local registry collection model into the eventual target repository once [MISSING: repository path or service boundary for process-registry source of truth] is resolved.
