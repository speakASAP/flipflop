# Package Smoke Report

Status: Passed with expected fail-closed outcomes

Date: 2026-07-06

## Scope

Smoke validation was run from `outputs/process-registry-package/` to prove the package works after being copied into its portable layout.

## Results

| Command area | Expected | Actual | Result |
|---|---:|---:|---|
| Draft definition structure | pass | pass | pass |
| Draft definition runtime-readiness | fail | fail | pass |
| Valid blocked event envelope | pass | pass | pass |
| Invalid blocked event missing reason | fail | fail | pass |
| Valid registry fixture | pass | pass | pass |
| Duplicate-active registry fixture | fail | fail | pass |
| Zero-active registry fixture | fail | fail | pass |
| Runtime-reader-write registry fixture | fail | fail | pass |
| Package `registry.collection.json` runtime lookup | fail | fail | pass |
| `MANIFEST.json` syntax | pass | pass | pass |
| Package `registry.collection.json` syntax | pass | pass | pass |

## Current Package Runtime Verdict

The package is structurally usable but not runtime-ready. `registry.collection.json` intentionally contains only a `draft` process definition, so active runtime lookup for `flipflop.successful_customer_journey.v1` fails with `active.zero`.

That is the expected fail-closed behavior until process ownership, IPS trace, event payload contracts, approval evidence, and activation metadata are resolved.

## Remaining Blockers

- [MISSING: repository path or service boundary for process-registry source of truth]
- [MISSING: approved FlipFlop process-owner role and approval authority]
- [MISSING: approved FlipFlop role-to-identity mapping]
- [MISSING: current FlipFlop checkout/service architecture and runtime language boundaries]
- [MISSING: production persistence, queue, and scheduler contracts for FlipFlop]
- [MISSING: event payload contracts for customer journey steps]
- [MISSING: runtime projection storage decision]
- [UNKNOWN: whether first release needs durable long-running orchestration or only governed process-state lookup]
