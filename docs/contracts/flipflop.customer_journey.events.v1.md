# flipflop.customer_journey.events.v1

Status: source contract prepared with bounded runtime emitter hooks; mutating synthetic checkout remains blocked until sandbox/test-mode approval exists.

Intent Preservation Chain:

- Vision: FlipFlop customer journey analytics can be consumed only through a deterministic event contract that excludes raw customer, payment, token, and provider payload data.
- Goal Impact: downstream consumers can validate journey coverage, correlation, idempotency, and phase-specific identifiers before any runtime emitter is allowed to publish.
- System: FlipFlop frontend, product-service, order-service, analytics/event consumers, central Orders, and payment/order identifiers represented only as hashed references where sensitive.
- Feature: machine-checkable customer journey event envelope and fixture validation.
- Task: define canonical envelope, required events, required/optional fields, journey_id/correlation_id/idempotency_key, no raw sensitive fields, phase-specific required identifiers, and runtime emitter redaction checks.
- Execution Plan: docs/contracts schema plus synthetic fixture plus verifier plus order-service event hooks; no checkout smoke, secret, DB, migration, or provider-side mutation without sandbox/test-mode approval.
- Coding Prompt: fail closed; mark unavailable sandbox/provider/customer facts as [MISSING: ...] and publish only hashed runtime identifiers.
- Code: docs/contracts/flipflop.customer_journey.events.v1.schema.json, docs/contracts/fixtures/flipflop.customer_journey.events.v1.valid.json, scripts/verify-customer-journey-events-contract.js, shared/rabbitmq/customer-journey-events.publisher.ts, services/order-service/src/orders/orders.service.ts, and package script verify:customer-journey-events-contract.
- Validation: npm run verify:customer-journey-events-contract.

## Canonical Envelope

Every event MUST validate against docs/contracts/flipflop.customer_journey.events.v1.schema.json and include these envelope fields: contract, schema_version, event_id, event_type, occurred_at, producer, journey_id, correlation_id, idempotency_key, phase, subject, context, and data.

The contract identifier MUST be `flipflop.customer_journey.events.v1`. The schema version MUST be `1`.

## Required Events

A complete journey fixture MUST include these required event types exactly as contract coverage anchors:

- journey.started
- catalog.product_viewed
- cart.item_added
- checkout.started
- payment.intent_created
- order.submitted

Terminal events are optional but, when present, MUST be one of journey.completed or journey.abandoned and must obey the same envelope rules.

## Correlation And Idempotency

- journey_id is the stable journey identifier and MUST use the `jrny_` prefix.
- correlation_id is the cross-service trace identifier and MUST use the `corr_` prefix.
- idempotency_key MUST start with `flipflop.customer_journey.events.v1:` and be unique within a fixture.
- event_id MUST be unique within a fixture and use the `evt_` prefix.

## Sensitive Data Boundary

Raw sensitive values are forbidden anywhere in the event object, including nested objects. The verifier rejects raw field names such as email, phone, name, address, password, token, cookie, authorization, cardNumber, iban, variableSymbol, and providerPayload.

Allowed identity references are bounded hashes such as subject.session_hash, subject.auth_subject_hash, subject.customer_hash, data.payment_id_hash, data.order_id_hash, and data.central_order_id_hash.

## Phase-Specific Identifiers

The schema contains machine-readable x-contract-rules.phase_required_data and x-contract-rules.event_phase mappings. The verifier enforces them source-side.

- catalog requires product_id and catalog_product_id.
- cart requires cart_id, cart_line_id, product_id, catalog_product_id, and quantity.
- checkout requires cart_id and checkout_id.
- payment requires checkout_id, payment_id_hash, payment_method, and total_czk_minor.
- order requires checkout_id, order_id_hash, central_order_id_hash, and total_czk_minor.
- completion requires order_id_hash and central_order_id_hash.
- abandonment requires cart_id.

## Runtime Status

Runtime emitter hooks are present for order-service checkout/payment/email/marketing milestones. The hooks are fire-and-forget, publish hashed identifier references, and must not block checkout/payment flows.

[MISSING: sandbox/test-mode payment contract for mutating end-to-end synthetic checkout]
[MISSING: approved synthetic product/SKU and customer/contact packet]
[MISSING: email queue/delivery consumer assertion endpoint or inbox contract]

No mutating synthetic checkout, provider-side transfer, DB migration, secret change, or cleanup mutation is authorized by this contract alone.
