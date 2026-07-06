# FlipFlop Process Registry Package

This package contains the first registry-first process-management artifacts for `flipflop.successful_customer_journey.v1`.

The current package is not runtime-ready. It is a governed starting point that validates structure, fixtures, access-control rules, and fail-closed behavior.

## Contents

- `registry.collection.json`: package-local registry collection
- `definitions/`: process definitions
- `schemas/`: JSON Schemas
- `validators/`: no-dependency Node validators
- `fixtures/`: positive and negative validation fixtures
- `docs/`: ADR, storage/access model, validation contract
- `reports/`: validation evidence

## Smoke Commands

Run from this directory:

```bash
node validators/validate-process-definition.mjs definitions/flipflop.successful_customer_journey.v1/1.0.0-draft.json --expect pass
node validators/validate-process-definition.mjs definitions/flipflop.successful_customer_journey.v1/1.0.0-draft.json --require-runtime-ready --expect fail
node validators/validate-process-event-envelope.mjs fixtures/valid-blocked-event-envelope.json --expect pass
node validators/validate-process-event-envelope.mjs fixtures/invalid-blocked-event-envelope-missing-reason.json --expect fail
node validators/validate-process-registry-collection.mjs fixtures/registry-valid.collection.json --process-key flipflop.successful_customer_journey.v1 --expect pass
node validators/validate-process-registry-collection.mjs fixtures/registry-duplicate-active.collection.json --process-key flipflop.successful_customer_journey.v1 --expect fail
node validators/validate-process-registry-collection.mjs fixtures/registry-zero-active.collection.json --process-key flipflop.successful_customer_journey.v1 --expect fail
node validators/validate-process-registry-collection.mjs fixtures/registry-runtime-reader-write.collection.json --process-key flipflop.successful_customer_journey.v1 --expect fail
node validators/validate-process-registry-collection.mjs registry.collection.json --process-key flipflop.successful_customer_journey.v1 --expect fail
```

The package registry currently fails runtime active lookup by design because only a draft definition is included.

## Remaining Blockers

- [MISSING: repository path or service boundary for process-registry source of truth]
- [MISSING: approved FlipFlop process-owner role and approval authority]
- [MISSING: event payload contracts for customer journey steps]
- [MISSING: runtime projection storage decision]
