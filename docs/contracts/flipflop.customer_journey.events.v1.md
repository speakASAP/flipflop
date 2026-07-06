# flipflop.customer_journey.events.v1

## Intent Preservation Chain

- Vision: Make the successful FlipFlop customer funnel observable and testable before AI optimization is introduced.
- Goal Impact: Every successful journey from session start through payment, order creation, confirmation email, and marketing handoff can be correlated, replayed, and validated.
- System: FlipFlop e-commerce runtime publishes customer journey events to `flipflop.customer_journey.events.v1`.
- Feature: Successful customer journey event contract with schema, fixture, verifier, and runtime emission points.
- Task: Define the minimum event set, payload shape, correlation strategy, required fields, gap table, and AI-readiness gate.
- Execution Plan: Add a versioned JSON Schema and fixture; wire order-service emissions for downstream milestones; retain frontend local journey capture until an ingestion API exists; validate with deterministic contract checks and TypeScript builds.
- Coding Prompt: Implement only bounded observability events; do not weaken checkout, auth, payment, or marketing behavior; do not emit raw PII.
- Code: `shared/rabbitmq/customer-journey-events.publisher.ts`, `services/order-service/src/orders/orders.service.ts`, `services/frontend/lib/guest-cart.ts`, `services/frontend/app/products/[id]/page.tsx`, `services/frontend/app/checkout/page.tsx`, this contract package, and `scripts/verify-customer-journey-events-contract.js`.
- Validation: `npm run verify:customer-journey-events-contract`, `npm run verify:synthetic-journey-monitor`, `npm --prefix shared run build`, `npm --prefix services/order-service run build`, `cd services/frontend && ./node_modules/.bin/tsc --noEmit --pretty false`, `git diff --check`.

## Minimum Successful Journey Events

| Order | Event name | Required before AI | Current producer | Purpose |
|---:|---|---|---|---|
| 1 | `session_started` | Yes | frontend local buffer | Start a journey and establish anonymous/session identifiers. |
| 2 | `product_viewed` | Yes | frontend local buffer | Observe product discovery before cart intent. |
| 3 | `cart_item_added` | Yes | frontend local buffer | Observe cart conversion intent with product/cart identifiers. |
| 4 | `checkout_started` | Yes | frontend local buffer | Mark transition from cart to checkout. |
| 5 | `customer_identity_resolved` | Yes | order-service | Bind guest/auth/customer identity for the checkout context. |
| 6 | `shipping_option_selected` | Yes | frontend local buffer and order-service | Record delivery selection used for validation and optimization. |
| 7 | `cart_validated` | Yes | frontend local buffer and order-service | Prove checkout/cart validation passed before payment. |
| 8 | `payment_attempt_started` | Yes | order-service | Mark handoff to payment provider or payment initiation. |
| 9 | `payment_succeeded` | Yes | order-service | Mark successful payment result. |
| 10 | `order_created` | Yes | order-service | Confirm local or central order creation. |
| 11 | `order_confirmation_email_queued` | Yes | order-service | Observe email handoff before send. |
| 12 | `order_confirmation_email_sent` | Yes | order-service | Observe customer confirmation delivery attempt success. |
| 13 | `marketing_handoff_requested` | Yes | order-service | Observe marketing/Leads handoff request when consent exists. |
| 14 | `marketing_handoff_accepted` | Yes | order-service | Observe downstream marketing/Leads acceptance. |

## Payload Schema

Canonical schema: `docs/contracts/flipflop.customer_journey.events.v1.schema.json`.

Required top-level fields: `event_id`, `event_name`, `version`, `occurred_at`, `journey_id`, `correlation_id`, `causation_id`, `idempotency_key`, `source`, `environment`, `identifiers`, and `metadata`.

Optional top-level fields: `processed_at`, `commercial`, and `items`.

Sensitive payload rule: raw email, phone, names, address fields, passwords, tokens, and card data are forbidden. Use opaque IDs or hashes only where identity linkage is needed.

## Correlation ID Strategy

- Create `journey_id` and `correlation_id` at the first observed session.
- Persist both through the frontend local event buffer, guest checkout metadata, order metadata, payment metadata, email event context, and marketing handoff context.
- Publish AMQP `correlationId` equal to envelope `correlation_id`.
- Use `causation_id` to point to the preceding event where the producer has reliable local context.
- Use deterministic `idempotency_key` values so replay and provider retry behavior can be deduplicated.
- When a runtime boundary cannot prove continuity, emit the event with the best known `correlation_id` and set the unavailable fact as `[UNKNOWN: previous causation event_id]` in validation reports rather than fabricating a link.

## Required vs Optional Fields

| Field group | Required | Optional |
|---|---|---|
| Envelope | `event_id`, `event_name`, `version`, `occurred_at`, `journey_id`, `correlation_id`, `causation_id`, `idempotency_key` | `processed_at` |
| Source | `source.service`, `source.component`, `source.producer` | `source.route` |
| Environment | `environment.name` | `environment.release`, `environment.commit_sha` |
| Identifiers | `identifiers.storefront_id` plus event-specific identifiers from schema rule `event_required_identifiers` | Other anonymous/customer/cart/order/product/payment/email/marketing identifiers when known |
| Commercial | Required only when present: `currency`, `precision` | subtotal, discount, shipping, tax, total, item count, coupon IDs |
| Items | Required only when present: `product_id` | SKU, variant, quantity, unit price |
| Metadata | `metadata.channel`, `metadata.synthetic` | locale, validation booleans, shipping method, payment method, marketing consent, handoff target |

## Emitted/Missing/Unknown Gap Table

| Journey capability | Current status | Evidence |
|---|---|---|
| Frontend session/product/cart/checkout capture | Emitted locally, not broker-published | `services/frontend/lib/guest-cart.ts`, product page script, checkout page script. |
| Shared broker publisher | Emitted when invoked | `shared/rabbitmq/customer-journey-events.publisher.ts` publishes to `flipflop.customer_journey.events.v1`. |
| Guest order identity/cart/payment/order/email/marketing milestones | Emitted by order-service | `services/order-service/src/orders/orders.service.ts`. |
| Frontend-to-backend event ingestion API | [MISSING: no durable ingestion API inspected or implemented in this lane] | Frontend events remain local until checkout metadata/order-service bridge or future ingestion endpoint is available. |
| Authenticated checkout parity | [UNKNOWN: authenticated journey emission coverage requires separate inspection] | Guest checkout path was wired; authenticated path was not broadened after build-safety review. |
| Live broker consumer/storage | [UNKNOWN: no customer journey event consumer/storage implementation inspected in this lane] | Publisher exists; consumer/read model is outside this contract lane. |
| Email provider message ID | [UNKNOWN: provider-specific message ID availability] | Contract supports `email_message_id`; runtime may emit only known order/email context. |
| Marketing downstream acceptance ID | [UNKNOWN: Leads response identifier availability] | Contract supports `marketing_handoff_id`; runtime uses available Leads response context. |
| AI optimizer | [MISSING: intentionally not introduced before complete event validation] | Minimum event set and replayable validation are prerequisites. |

## Minimum Event Set Before AI Journey Optimization

AI journey optimization is blocked until validation proves all 14 required events are complete and correlated for successful journeys: `session_started`, `product_viewed`, `cart_item_added`, `checkout_started`, `customer_identity_resolved`, `shipping_option_selected`, `cart_validated`, `payment_attempt_started`, `payment_succeeded`, `order_created`, `order_confirmation_email_queued`, `order_confirmation_email_sent`, `marketing_handoff_requested`, and `marketing_handoff_accepted`.

Optimization remains blocked when any required event is missing, any required event-specific identifier is absent, `journey_id`/`correlation_id` are unstable, or sensitive raw fields appear in emitted payloads.
