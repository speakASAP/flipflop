# Workstream 3A Journey Correlation Contract Acceptance

Date: 2026-07-06
Status: accepted-for-implementation; runtime payment/order/email/marketing trace remains dependency-gated

## Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

Vision: FlipFlop customer journeys must be observable without weakening checkout, payment, order, email, or marketing safety.

Goal Impact: frontend, cart, checkout, payment metadata, order metadata, email handoff, and marketing handoff workers can implement emitters against one accepted correlation contract instead of inventing local identifiers.

System: FlipFlop e-commerce runtime, order-service, shared RabbitMQ publisher, frontend guest/auth checkout surfaces, payment metadata, email handoff, and marketing/Leads handoff.

Feature: shared journey correlation contract for `flipflop.customer_journey.events.v1`.

Task: accept generation, storage, propagation, idempotency, and fail-closed rules for `journey_id`, `correlation_id`, `causation_id`, and journey idempotency keys before downstream event emitter workers proceed.

Execution Plan: keep the canonical schema and fixture stable; require frontend/backend implementation lanes to consume this contract; keep sandbox checkout/payment/order/email/event trace blocked until owner-approved runtime packet exists.

Coding Prompt: implement only bounded observability and propagation; do not print secrets, raw PII, tokens, provider payloads, card data, or full order/payment identifiers; preserve `[MISSING: ...]` blockers.

Code: `docs/contracts/flipflop.customer_journey.events.v1.md`, `docs/contracts/flipflop.customer_journey.events.v1.schema.json`, `docs/contracts/fixtures/flipflop.customer_journey.events.v1.valid.json`, `shared/rabbitmq/customer-journey-events.publisher.ts`, `services/frontend/lib/guest-cart.ts`, `services/frontend/app/checkout/page.tsx`, `services/frontend/lib/api/orders.ts`, `services/order-service/src/orders/orders.service.ts`, DTOs, and `scripts/verify-customer-journey-events-contract.js`.

Validation: `npm run verify:customer-journey-events-contract`, `npm run verify:synthetic-journey-monitor`, `npm --prefix shared run build`, `npm --prefix services/order-service run build`, `cd services/frontend && ./node_modules/.bin/tsc --noEmit --pretty false`, and `git diff --check`.

## Accepted Contract

Canonical stream: `flipflop.customer_journey.events.v1`.

Canonical schema: `docs/contracts/flipflop.customer_journey.events.v1.schema.json`.

Canonical fixture: `docs/contracts/fixtures/flipflop.customer_journey.events.v1.valid.json`.

Minimum event set before AI journey optimization:

1. `session_started`
2. `product_viewed`
3. `cart_item_added`
4. `checkout_started`
5. `customer_identity_resolved`
6. `shipping_option_selected`
7. `cart_validated`
8. `payment_attempt_started`
9. `payment_succeeded`
10. `order_created`
11. `order_confirmation_email_queued`
12. `order_confirmation_email_sent`
13. `marketing_handoff_requested`
14. `marketing_handoff_accepted`

AI optimization remains blocked until one successful runtime journey proves all 14 events with one stable `journey_id`, one stable `correlation_id`, valid causation linkage where available, unique idempotency keys, and no raw sensitive fields.

## Identifier Rules

`journey_id`:

- Format: `journey_[a-z0-9][a-z0-9_-]{8,127}`.
- Generated at the first observed frontend session.
- Stable across local frontend events, guest/auth checkout payloads, order metadata, payment metadata, email event context, and marketing handoff context.
- Never derived from order id, payment id, lead id, email, phone, or provider identifiers.

`correlation_id`:

- Format: `corr_[a-z0-9][a-z0-9_-]{8,127}`.
- Generated with the first `journey_id`.
- AMQP `correlationId` must equal envelope `correlation_id`.
- Must not fall back to `journey_id`.
- Stable across the full journey unless a new customer journey is explicitly started.

`causation_id`:

- Format: event id of the immediate preceding known event.
- Required in event envelopes by schema, but runtime validation may mark unavailable continuity as `[UNKNOWN: previous causation event_id]` in reports instead of fabricating a link.
- Producers should preserve local causation chains when they have reliable prior event context.

Journey idempotency key:

- Format: deterministic event-specific key accepted by the schema, for example `journey:<journey_id>:<event_name>:<stable-subject>`.
- Must be unique for distinct events in a journey and stable for retries of the same event.
- Must not include raw PII, tokens, card data, provider payloads, or full sensitive identifiers.
- Provider retry and replay behavior must deduplicate by this key before publishing duplicate facts.

## Propagation Rules

Frontend session:

- Create and persist `journey_id`, `correlation_id`, and session id before cart or checkout submission.
- Store only browser-local opaque identifiers.
- Local events may remain browser-local until a durable ingestion API is accepted.

Cart:

- Every cart-local event must include the stable journey and correlation context.
- Cart payloads sent to checkout/order creation must carry `journeyId`, `correlationId`, and `sessionId` when available.

Checkout:

- Checkout submit must fail closed before order/payment side effects if required journey context is missing or invalid.
- Guest and authenticated checkout DTO/API types must accept `journeyId`, `correlationId`, and `sessionId` under strict validation.

Payment metadata:

- Payment initiation must include sanitized `customerJourney` context in metadata before provider handoff.
- Payment metadata must not contain raw customer/contact/payment/provider payloads.
- Provider-specific payment identifiers may be referenced only through approved opaque/hash fields in event identifiers or metadata.

Order:

- Order metadata must persist `customerJourney` context.
- Order-service must validate `journeyId` and `correlationId` before payment/order side effects.
- Existing browser-local visitor id, local order number, central order id, payment id, and lead id are secondary identifiers and do not replace journey/correlation ids.

Email:

- Email queued/sent events must use the order's persisted `customerJourney` context.
- Email message ids are optional when unavailable and must be opaque; raw email addresses are forbidden.

Marketing:

- Marketing handoff requested/accepted events must use the order's persisted `customerJourney` context.
- Leads/marketing response identifiers are optional when unavailable and must be opaque; raw customer/contact fields are forbidden.

## Fail-Closed Rules

Before checkout submit, payment initiation, order creation, email handoff, or marketing handoff:

- Missing `journey_id`: fail closed.
- Invalid `journey_id` format: fail closed.
- Missing `correlation_id`: fail closed.
- Invalid `correlation_id` format: fail closed.
- `correlation_id` equal to or derived from `journey_id`: fail closed.
- Missing required journey idempotency material for a published event: do not publish; classify validation as blocked.
- Attempt to include raw PII, tokens, card data, provider payloads, or secrets: fail closed and redact evidence.

Runtime validation must distinguish source-contract success from sandbox runtime blockers. Do not run payment/order/provider mutation without an approved sandbox/test packet.

## Current Acceptance Evidence

Accepted source evidence:

- Contract doc defines the 14-event minimum set, required fields, correlation strategy, gap table, and AI gate.
- Schema and fixture validate a stable journey id, stable correlation id, causation chain, unique idempotency keys, and sensitive-field denylist.
- Shared publisher sets AMQP `correlationId` from envelope `correlation_id`.
- Frontend creates stable `journey_`, `corr_`, and session ids and sends them through guest checkout.
- Order-service validates `journey_`, `corr_`, and session ids, stores `customerJourney`, propagates payment metadata, and emits order/payment/email/marketing milestones when invoked.
- Synthetic monitor currently proves the read-only public journey and blocks the payment/order/email/event trace without runtime packet facts.

Runtime blockers:

- `[MISSING: durable frontend ingestion API for broker-published browser events]`
- `[MISSING: approved synthetic product/SKU]`
- `[MISSING: synthetic customer/contact or token-bound synthetic identity]`
- `[MISSING: approved delivery test contract]`
- `[MISSING: sandbox/test-mode payment provider contract]`
- `[MISSING: synthetic email assertion source]`
- `[MISSING: event trace assertion source]`
- `[MISSING: order/payment cleanup or retention contract]`
- `[UNKNOWN: live broker consumer/storage implementation for customer journey events]`
- `[UNKNOWN: authenticated checkout runtime parity evidence]`

## Implementation Lane Split

Ready now: frontend journey propagation lane.

- Owner role: frontend emitter worker.
- Scope: frontend-only journey id creation, local event payload shape, checkout payload propagation, UX fail-closed messaging, optional stable monitor selectors.
- Allowed files: `services/frontend/lib/guest-cart.ts`, `services/frontend/app/checkout/page.tsx`, `services/frontend/lib/api/orders.ts`, frontend tests/verifiers/docs scoped to this lane.
- Forbidden files: shared schema, order-service payment/order behavior, provider integration, deploy scripts.
- Validation owner: integration thread.
- Validation evidence: frontend typecheck and `npm run verify:customer-journey-events-contract`.

Ready now: backend journey propagation/emission lane.

- Owner role: order-service emitter worker.
- Scope: order-service validation, metadata propagation, event publishing calls, idempotency key construction, causation best-effort preservation.
- Allowed files: `services/order-service/src/orders/orders.service.ts`, order DTOs, order-service tests/verifiers/docs scoped to this lane.
- Forbidden files: frontend UI, shared schema without integration owner approval, provider mutation behavior, deploy scripts.
- Validation owner: integration thread.
- Validation evidence: order-service build, shared build, and `npm run verify:customer-journey-events-contract`.

Dependency-gated: browser event ingestion API lane.

- Owner role: ingestion contract worker.
- Scope: design and implement durable frontend event ingestion only after acceptance of API route, auth/rate-limit/redaction, and storage/publishing ownership.
- Blocker: `[MISSING: ingestion API ownership and abuse/rate-limit/redaction contract]`.
- Merge order: after current contract acceptance and after integration owner approves API ownership.

Dependency-gated: sandbox runtime trace lane.

- Owner role: payment/orders runtime validation worker.
- Scope: approved sandbox checkout/payment/order/email/event trace using a synthetic identity and cleanup/retention contract.
- Blockers: payment provider sandbox contract, synthetic identity, delivery contract, email assertion source, event trace source, cleanup/retention contract.
- Forbidden: production checkout/order/provider mutation.

Final integration: contract owner.

- Owner role: integration owner.
- Scope: resolve shared schema changes, run complete validation matrix, collect sanitized evidence, decide deploy/rollback gate.
- Shared files: contract schema, fixture, shared publisher, root package scripts, validation reports.
- Merge order: contract acceptance -> frontend/backend lanes -> ingestion API if approved -> sandbox runtime trace -> scheduler/alerting.

## Handoff Notes

- Treat this document and `docs/contracts/flipflop.customer_journey.events.v1.md` as the accepted shared contract for implementation workers.
- Do not modify shared schema or the 14-event minimum set from a worker lane without routing through the integration owner.
- Preserve fail-closed checkout behavior when required journey context is missing or invalid.
- Keep validation artifacts sanitized: hash product/customer/order/payment/provider identifiers and never print secrets or raw PII.
- If a runtime rollout returns transient `503`/`502`, inspect rollout status, endpoints, and pod events before restarting; do not classify source contract validation as failed solely from a rollout readiness window.
