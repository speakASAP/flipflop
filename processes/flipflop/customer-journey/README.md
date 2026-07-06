# flipflop.successful_customer_journey.v1

Status: draft

This package registers the first customer journey draft for the FlipFlop process registry lane.

Boundary: this is a service-local draft package and validator. FlipFlop is not the global BPCP process-definition owner; central ownership remains with the BPCP integration owner and `statex-ecosystem/docs/business-process-control-plane/`.

## Intent Preservation Chain

Vision: FlipFlop operates with visible, versioned, testable business processes that can evolve outside application code.

Goal Impact: prove a customer can move from landing/product discovery to successful payment, order creation, confirmation notification, and marketing handoff.

System: process registry plus event contract plus synthetic monitor plus existing FlipFlop services.

Feature: `flipflop.successful_customer_journey.v1`.

Task: register the draft process definition and validator contract.

Execution Plan: `flipflop-integrated-rollout-plan-v1`.

Coding Prompt: Workstream 2 process registry schema lane.

Code: `process-registry/process-definition.schema.json`, `process-registry/validate-process-definitions.js`, and `successful-customer-journey.v1.process.json`.

Validation: `node process-registry/validate-process-definitions.js`.

## Lifecycle

Definitions may use only these statuses:

- `draft`
- `validated`
- `scheduled`
- `active`
- `paused`
- `retired`

`draft` may preserve explicit missing or unknown blocker markers. `validated`, `scheduled`, and `active` definitions fail validation if any blocker marker remains, if approval evidence is missing, if activation/rollback evidence is absent, or if validation evidence is absent.

Only one definition per `process_key` may be `active`.

## Active Definition Safety

The active resolver implementation must treat validator failure as a hard stop before checkout, payment, order, provider, inventory, notification, or marketing side effects.

This package does not deploy a resolver and does not change runtime customer behavior.
