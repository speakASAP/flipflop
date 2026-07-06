# P1 Target Process Registry Boundary

Date: 2026-07-06  
Package: `flipflop-process-registry`  
Process key: `flipflop.successful_customer_journey.v1`  
Status: draft target repository/service boundary, not production runtime authority.

## Boundary Decision

This directory is the P1-created target boundary package for the process registry.

It is intended to be moved into the eventual target repository or service boundary after that boundary is approved. Until then, this package is a local handoff artifact under:

```text
/Users/Sergej.Stasok/Documents/Codex/2026-07-06/flipflop-p1-process-registry/outputs/target-process-registry
```

## What This Package Owns

- Process registry collection shape.
- Draft process definition artifact for `flipflop.successful_customer_journey.v1`.
- Process definition schema.
- Process event envelope schema.
- Process registry collection schema.
- No-dependency validators.
- Positive and negative validation fixtures.
- Local validation reports.
- Draft storage/access model.
- Fail-closed runtime lookup rules.

## What This Package Does Not Own

- FlipFlop application code.
- Live checkout, payment, order, customer, or marketing mutation.
- Production deployment.
- Runtime service identity.
- Business process approval.
- Active publish.
- Production persistence, queue, or scheduler contracts.

## Activation Boundary

The package must remain non-runtime-authoritative until all of these are resolved:

- `[MISSING: target process runtime]`
- `[MISSING: runtime/load API]`
- `[MISSING: process registry owner]`
- `[MISSING: integration owner]`
- `[MISSING: validation owner]`
- `[MISSING: approved FlipFlop process-owner role and approval authority]`
- `[MISSING: repository path or service boundary for process-registry source of truth]`
- `[MISSING: production persistence, queue, and scheduler contracts for FlipFlop]`
- `[MISSING: process registry deployment gate]`
- `[MISSING: production smoke policy]`
- `[MISSING: target validation harness]`

## Handoff Rule

When moved to a target repository, copy this package as a unit and run:

```bash
node validators/validate-process-definition.mjs definitions/flipflop.successful_customer_journey.v1/1.0.0-draft.json --expect pass
node validators/validate-process-definition.mjs definitions/flipflop.successful_customer_journey.v1/1.0.0-draft.json --require-runtime-ready --expect fail
node validators/validate-process-registry-collection.mjs registry.collection.json --process-key flipflop.successful_customer_journey.v1 --expect fail
```

The expected result remains: draft structure passes, runtime readiness fails, collection active lookup fails closed.
