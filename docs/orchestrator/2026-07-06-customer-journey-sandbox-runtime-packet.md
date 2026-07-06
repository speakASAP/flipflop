# Customer Journey Sandbox Runtime Packet - FlipFlop

```yaml
id: FLIPFLOP-CUSTOMER-JOURNEY-SANDBOX-RUNTIME-PACKET-2026-07-06
status: draft-runtime-side-effects-blocked
repository: /home/ssf/Documents/Github/flipflop
created_at: 2026-07-06
owner_role: integration-owner
runtime_scope: flipflop.successful_customer_journey.v1
mutation: false
live_checkout_executed: false
order_created: false
payment_created: false
provider_call: false
orders_mutation: false
warehouse_mutation: false
email_sent: false
event_published_by_packet: false
secret_output: false
raw_customer_or_payment_evidence: false
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: FlipFlop should have a visible, versioned, testable customer journey process that can be monitored without unsafe production side effects.
- Goal Impact: the customer journey can be proven from landing through product discovery and checkout readiness now, and later through sandbox payment/order/email/event trace when explicit runtime facts exist.
- System: FlipFlop frontend/order-service, central Orders, Payments, Warehouse, notifications/email, customer journey event contract, and synthetic journey monitor.
- Feature: `flipflop.successful_customer_journey.v1` sandbox runtime packet.
- Task: define the exact missing facts required before a full sandbox checkout/payment/order/email/event trace runner may execute.
- Execution Plan: source-governance packet only; keep current read-only monitor green; preserve hard stops for sandbox/full-flow mutation until all facts are supplied.
- Coding Prompt: do not run checkout, order, payment, provider, warehouse, email, or event-publish side effects from this packet; only prepare the approval/runtime facts and validation gates.
- Code: this packet, `scripts/synthetic-customer-journey-monitor.js`, `docs/orchestrator/2026-07-06-synthetic-customer-journey-monitor.md`, `docs/contracts/flipflop.customer_journey.events.v1.md`, and process registry artifacts.
- Validation: `npm run verify:customer-journey-events-contract`, `npm run verify:synthetic-journey-monitor`, documentation gates, and future owner-approved sandbox runner evidence.
- State Update: Workstreams 2, 3, 3A, and 4 are complete for source/read-only phase; Workstream 5 remains blocked until this packet is completed and approved.

## Current Source State

Remote repository state at packet preparation:

```text
repository: /home/ssf/Documents/Github/flipflop
branch: main
head: 57fcec1 Merge workstream 3C backend journey emission
worktree: dirty from this packet
```

Relevant completed commits:

```text
d89bdaf Accept journey correlation contract
eab90f7 Record FlipFlop deployment validation reports
4dfdca2 Record post-deploy synthetic journey evidence
5f8c629 Enforce FlipFlop journey correlation contract
38f435e Align customer journey contract with runtime envelope
40eabe9 Add customer journey event contract
7de4b58 Add synthetic customer journey monitor
```

## Completed Read-Only Gates

### Customer Journey Event Contract

Command:

```bash
npm run verify:customer-journey-events-contract --silent
```

Observed result:

```text
ok: true
eventsValidated: 14
journeyIdStable: true
correlationIdStable: true
causationChainValid: true
idempotencyKeysUnique: true
sensitiveOutput: redacted-source-only
runtimeMutation: false
```

### Synthetic Journey Monitor

Command:

```bash
npm run verify:synthetic-journey-monitor --silent
```

Observed result:

```text
ok: true
status: read_only_passed_full_flow_blocked_missing_contract
nonMutating: true
mutation: false
liveCheckoutExecuted: false
providerCall: false
ordersMutation: false
warehouseMutation: false
channelCleanupMutation: false
secretOutput: false
rawCustomerOrPaymentEvidence: false
classification: P1_PAYMENT_CONTRACT_BLOCKED
```

Read-only route evidence:

```text
landing: 200
products page: 200
cart page: 200
checkout page: 200
product API list: 200
product detail page: 200
product detail API: 200
empty guest order preflight: 400
```

## Required Runtime Facts

The full sandbox runner remains blocked until every item below is resolved.

| Required fact | Current status | Required evidence |
| --- | --- | --- |
| Synthetic product/SKU | `[RESOLVED/NARROWED: owner-approved W5 sandbox product target is productId ffb4883f-ec48-4745-8147-b836f3fb2b88, sku ALLEGRO-OFFER-18106037370, catalogProductId ce4a51aa-2d12-4ab7-a965-7a36609d01fc, current public API price 999 CZK and stock 119; this reuses an existing live sellable product as a bounded sandbox target and does not create/modify product rows]` | public API list/detail readback, source packet approval, no raw DB row output |
| Synthetic customer/contact | `[MISSING: synthetic customer/contact]` | approved synthetic identity or token-bound test actor; no raw email/customer data in logs |
| Delivery test contract | `[RESOLVED/NARROWED: packet-prep delivery test contract is flipflop.delivery.store_pickup.no_external_carrier.v1 using deliveryMethod=store, shippingCost=0, and no external-carrier handoff; runtime still blocked until product/customer/payment/email/event/cleanup facts exist]` | source references for `store` delivery method and server-side cost calculation; any checkout execution still requires full sandbox packet approval |
| Payment sandbox approval flag | `[MISSING: sandbox/test-mode payment approval flag]` | explicit owner-approved `PAYMENT_SANDBOX_CONTRACT_APPROVED=1` or equivalent non-secret packet |
| Test-mode provider | `[MISSING: documented sandbox/test-mode payment provider]`; `[RESOLVED/NARROWED: Goal 24 Fiobanka QR material is policy/checklist evidence only and is not a reusable sandbox/test-mode approval packet]` | provider/method/environment and proof that no real money movement occurs |
| Checkout mutation mode | `[MISSING: sandbox or test-only checkout mutation mode]` | `CHECKOUT_MUTATION_MODE=sandbox|test-only` and service-side enforcement proof |
| Email assertion source | `[RESOLVED/NARROWED: approved source contract is SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl with SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid; notification code captures matching synthetic email assertions as sanitized JSONL and returns captured_not_sent]` | synthetic email sink/queue/log readback that does not send to real customers |
| Event trace assertion source | `[RESOLVED/NARROWED: approved source contract is SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl; customer journey publisher records sanitized JSONL trace rows after broker publish, queryable by journey_id/correlation_id]` | query path for `flipflop.customer_journey.events.v1` by `journey_id`/`correlation_id` |
| Cleanup/retention contract | `[MISSING: order/payment cleanup or retention contract]` | decision to clean up, cancel, retain, or mark synthetic order/payment, with idempotency and side-effect acknowledgements |

## Environment Variables Expected by Monitor

The existing monitor already gates full-flow readiness through these variables:

```text
SYNTHETIC_TEST_PRODUCT_ID=ffb4883f-ec48-4745-8147-b836f3fb2b88
SYNTHETIC_CUSTOMER_EMAIL
SYNTHETIC_DELIVERY_CONTRACT_ID=flipflop.delivery.store_pickup.no_external_carrier.v1
PAYMENT_SANDBOX_CONTRACT_APPROVED
TEST_MODE_PAYMENT_PROVIDER
CHECKOUT_MUTATION_MODE
SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl
SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid
SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl
SYNTHETIC_ORDER_CLEANUP_CONTRACT
```

Do not set these in production runtime until their packet values are owner-approved and non-secret handling is documented.

Packet-prepared delivery value: `SYNTHETIC_DELIVERY_CONTRACT_ID=flipflop.delivery.store_pickup.no_external_carrier.v1`. The monitor may still report `[MISSING: approved delivery test contract]` until the full sandbox runner environment is assembled; do not enable the runner while product/customer/payment/email/event/cleanup facts remain missing.

## Explicit Non-Reuse Boundaries

Previous Goal 24 paid/provider packets are useful policy references, but they do not authorize this customer-journey sandbox runner.

Specifically:

- Goal 24 Fiobanka QR approval was bounded to a different target, amount, bundle, rollback packet, and execution window.
- Expired or retained Goal 24 evidence cannot be reused as current authorization for a new checkout/payment attempt.
- Prior manual refund or no-cleanup closeout evidence does not prove a safe reusable sandbox provider.
- `scripts/smoke-checkout.js` remains known-mutating and must not be scheduled as the customer journey monitor.
- Owner autonomy for coordination is not provider/payment/bank authority.

## Abort Conditions

Stop before checkout/payment/order side effects if any condition is true:

- any required fact remains `[MISSING: ...]` or `[UNKNOWN: ...]`;
- selected product, delivery, provider, or amount differs from the approved packet;
- provider is not explicitly sandbox/test-only;
- checkout would create a real production payment, real shipment obligation, or real customer message;
- Orders cleanup actor/idempotency/side-effect acknowledgements are missing;
- Warehouse reservation/cleanup policy is missing or ambiguous;
- email assertion requires sending to a real customer address;
- event trace cannot be queried without raw tokens, raw DB rows, or raw payload output;
- validation would print secrets, bearer tokens, raw PII, raw payment ids, provider payloads, or raw order ids.

## Parallel Workstreams

| Workstream | Status | Owner role | Objective | Allowed work | Forbidden work | Output |
| --- | --- | --- | --- | --- | --- | --- |
| W5A Synthetic product/delivery | complete: blocked missing approved contracts | product/catalog/delivery investigator | find approved synthetic product/SKU and delivery contract | docs/source/report/public API read-only inspection | cart/order/payment mutation, DB writes, raw customer/order data | `[MISSING: approved synthetic product/SKU]`; `[MISSING: approved delivery test contract]` |
| W5B Payment sandbox | complete: blocked missing approved contract | payments/runtime investigator | find sandbox/test-mode payment provider contract | docs/source/report/config-shape inspection without secrets | payment initiation, provider call, webhook replay, token output | `[MISSING: safe sandbox/test-mode payment provider contract]` |
| W5C Email/event trace | complete: source-resolved, runtime disabled by default | observability/notification integrator | provide synthetic email sink and event trace source contracts | source/docs/verifier updates | sending emails, publishing events outside approved sandbox, raw payload/token output | `SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl`; `SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl` |
| W5D Packet integration | current thread | integration owner | merge facts and keep hard stops visible | this packet and status docs | runtime side effects | final owner-ready packet |

Spawned discovery threads:

```text
W5A: 019f387a-cd34-7f90-96ff-ff7392b5dc57
W5B: 019f387a-edc0-7281-9de3-90ee06002321
W5C: 019f387b-12f0-7de1-9cc4-f1b1683094d1
```

## Discovery Summary

The read-only discovery lanes were completed to avoid guessing runtime facts.

Integrated findings:

- W5A: `CODEX-STOCK-TRACE-011` is a historical GOAL-09 dedicated test SKU precedent, but not an approved reusable synthetic product/SKU for this customer-journey sandbox packet.
- W5A: checkout source and prior evidence show delivery method candidates, but no approved delivery test contract for this full sandbox run.
- W5A current public product lookup: `CODEX-STOCK-TRACE-011` was not returned by `GET /api/products?limit=200`; the first sellable public product remains a real catalog candidate and must not be reclassified as synthetic without explicit product/catalog approval.
- W5A delivery narrowing: owner-approved packet preparation may use `flipflop.delivery.store_pickup.no_external_carrier.v1` as the delivery test contract candidate because checkout source exposes `deliveryMethod=store` and order-service calculates `shippingCost=0`, avoiding external carrier/shipment obligations during future sandbox planning.
- W5B: FlipFlop source has provider/method candidates such as `fiobanka`, `invoice`, `webpay`, `stripe`, `paypal`, and `payu`; none is currently documented as a reusable sandbox/test-mode provider for this packet.
- W5B: Goal 24 Fiobanka QR material can inform hard-stop policy only. It is not current approval for this customer-journey sandbox run.
- W5C: customer-journey AMQP publisher/schema exists, and an approved disabled-by-default event trace source contract now exists as `SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl`.
- W5C: notification/email implementation exists, and an approved disabled-by-default synthetic email assertion source contract now exists as `SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl` with `SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid`.

W5C is now source-resolved by disabled-by-default assertion capture contracts. The packet remains blocked for runtime execution by the remaining product/customer/payment/checkout/cleanup/final-evidence facts. The owner approval intake below authorizes packet preparation and W5C source contracts only; it does not authorize full sandbox execution.

## Proposed Owner Approval Statement

This section is intentionally not executable until every `[MISSING: ...]` marker is replaced.

```text
I approve exactly one FlipFlop customer journey sandbox run for process flipflop.successful_customer_journey.v1 using approval id [MISSING: approval id], execution window [MISSING: start/end Europe/Prague], synthetic product/SKU ffb4883f-ec48-4745-8147-b836f3fb2b88 / ALLEGRO-OFFER-18106037370, synthetic customer/contact [MISSING], delivery contract flipflop.delivery.store_pickup.no_external_carrier.v1, sandbox/test-mode payment provider [MISSING], checkout mutation mode [MISSING], email assertion source synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl, event trace source synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl, cleanup/retention contract [MISSING], and redacted evidence path [MISSING].

I understand this authorizes only the named sandbox/test-mode attempt. The executor must stop at the first hard stop and must not print secrets, tokens, raw customer/contact/address data, raw provider payloads, raw DB rows, raw order ids, raw payment ids, or full event payloads containing sensitive data.
```


## 2026-07-06 Owner Approval Intake

Owner reply: `Yes, I approve it. Go ahead.`

Decision: `[RESOLVED/NARROWED: owner approved Codex to prepare and maintain the Workstream 5 customer-journey sandbox runtime packet and to continue source/read-only integration work]`.

Scope of this approval:

- It authorizes packet preparation, source documentation, verifier alignment, and read-only validation.
- It does not authorize checkout submission, order creation, payment creation, provider calls, webhook replay, email sending, Warehouse mutation, Orders mutation, deploy, DB writes, secret output, token output, raw customer/contact/address output, raw order/payment ids, or raw provider payload output.
- It does not supply the missing runtime values below. The full sandbox runner remains blocked until every required fact is replaced with explicit non-secret values and validated.

Still missing for execution:

- `[RESOLVED/NARROWED: owner-approved W5 sandbox product target ffb4883f-ec48-4745-8147-b836f3fb2b88 / ALLEGRO-OFFER-18106037370 selected from current public API; no product row created or modified]`
- `[MISSING: synthetic customer/contact]`
- `[RESOLVED/NARROWED: delivery test contract candidate flipflop.delivery.store_pickup.no_external_carrier.v1 selected for packet preparation only; no runtime checkout allowed until the remaining missing facts are resolved]`
- `[MISSING: documented sandbox/test-mode payment provider with environment proof]`
- `[MISSING: CHECKOUT_MUTATION_MODE=sandbox|test-only service-side enforcement proof]`
- `[RESOLVED/NARROWED: SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl with SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid]`
- `[RESOLVED/NARROWED: SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl]`
- `[MISSING: order/payment cleanup or retention contract]`
- `[MISSING: final redacted evidence path]`



## Workstream 5C Approved Assertion Source Contracts

User approval captured in orchestration thread `019f387b-12f0-7de1-9cc4-f1b1683094d1` permits source-only resolution of the email/event assertion source contracts. It does not authorize checkout, payment, provider, Orders, Warehouse, delivery, deploy, DB write, or full sandbox execution.

Email assertion source:

```text
SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl
SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid
```

Behavior: when enabled and the recipient domain matches `SYNTHETIC_EMAIL_ASSERTION_DOMAIN`, `NotificationService` writes a sanitized JSONL assertion row and returns `captured_not_sent`; it does not call the notifications service for that synthetic recipient. The row contains hashes and metadata keys only, with `raw_recipient_output=false`, `raw_message_output=false`, and `secret_output=false`.

Event trace assertion source:

```text
SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl
```

Behavior: when enabled, `CustomerJourneyEventsPublisher` appends a sanitized JSONL trace row after publishing to `flipflop.customer_journey.events.v1`. The row keeps `journey_id`, `correlation_id`, event name, routing key, hashed identifiers, metadata keys, and explicit `raw_payload_output=false`, `raw_customer_or_payment_evidence=false`, and `secret_output=false`.

Validation command:

```bash
npm run verify:customer-journey-assertion-sources
```

## Current Decision

Status: `owner-approved-packet-prep-delivery-and-w5c-source-narrowed-runtime-side-effects-blocked`.

The packet is ready for fact discovery and owner review, not for execution. The current safe state remains:

```text
read_only_monitor: passing
event_contract: passing
full_sandbox_runner: blocked_missing_contract
runtime_side_effects: forbidden
```

Next safe action: integration owner must supply the missing runtime facts, then run verifier/read-only gates before any sandbox runner is enabled.


## 2026-07-06 W5A Product And Delivery Narrowing

Read-only product lookup:

```text
GET https://flipflop.alfares.cz/api/products?limit=200 -> HTTP 200
CODEX-STOCK-TRACE-011 found: false
first sellable public product: present, but not synthetic-approved
```

Decision: `[MISSING: approved synthetic product/SKU]` remains open. The historical GOAL-09 SKU is valid precedent only; it is not currently discoverable through the public product API and must not be assumed reusable for `flipflop.successful_customer_journey.v1`.

Delivery contract selected for packet preparation:

```text
contract_id: flipflop.delivery.store_pickup.no_external_carrier.v1
deliveryMethod: store
shippingCost: 0
externalCarrier: false
shipmentObligation: false
source: services/frontend/app/checkout/page.tsx DELIVERY_OPTIONS and services/order-service/src/orders/orders.service.ts calculateGuestDeliveryCost
```

Decision: `[RESOLVED/NARROWED: delivery test contract candidate selected for packet preparation]`. This narrows only the delivery fact. It does not authorize checkout/order/payment/email/event execution and does not replace the remaining missing product, customer, payment, email, event, cleanup, or evidence-path facts.


## 2026-07-06 Validation Refresh

Commands run after packet narrowing:

```bash
git diff --check
npm run verify:customer-journey-events-contract --silent
npm run verify:synthetic-journey-monitor --silent
node --check scripts/synthetic-customer-journey-monitor.js
npm run verify:paid-provider-bundle-checkout-gate --silent
npm run verify:orders-lifecycle-ui --silent
```

Observed result:

```text
git diff --check: pass
customer journey event contract: ok=true, eventsValidated=14, runtimeMutation=false
synthetic journey monitor: ok=true, status=read_only_passed_full_flow_blocked_missing_contract, mutation=false, liveCheckoutExecuted=false, providerCall=false, ordersMutation=false, warehouseMutation=false, rawCustomerOrPaymentEvidence=false
synthetic monitor syntax: pass
paid-provider bundle checkout gate: ok=true, mutation=false, providerCall=false, liveCheckoutExecuted=false, runtime paid/provider still blocked
orders lifecycle UI verifier: ok=true, coveredStages=13, sensitiveOutput=redacted-source-only
```

Validation decision: packet preparation is source-valid; runtime execution remains blocked by missing synthetic product/SKU, synthetic customer/contact, sandbox/test-mode provider, checkout mutation mode enforcement proof, email assertion source, event trace assertion source, cleanup/retention contract, and final redacted evidence path.




## 2026-07-06 W5A Owner-Approved Product Target

Owner reply: `да, разрешаю`.

Decision: `[RESOLVED/NARROWED: owner approved the current first-sellable public product as the W5 sandbox product target for packet preparation]`.

Approved product target:

```text
SYNTHETIC_TEST_PRODUCT_ID=ffb4883f-ec48-4745-8147-b836f3fb2b88
productSku=ALLEGRO-OFFER-18106037370
catalogProductId=ce4a51aa-2d12-4ab7-a965-7a36609d01fc
priceClass=positive
currentReadOnlyPrice=999 CZK
currentReadOnlyStock=119
source=GET https://flipflop.alfares.cz/api/products?limit=20 and /api/products/:id?includeWarehouse=true
```

Scope: this approval selects a product target only. It does not create or mutate a product row, does not reserve stock, does not create a cart/order/payment, and does not waive the remaining customer/contact, sandbox payment, checkout mutation mode, cleanup/retention, and final evidence blockers.

Risk boundary: this is an existing live sellable product, not a dedicated synthetic inventory row. The sandbox runner must use `deliveryMethod=store`, a sandbox/test-only payment mode, and an approved cleanup/retention contract before any checkout mutation is allowed.



## 2026-07-06 W5A Product Target Validation

Configured read-only monitor command:

```bash
SYNTHETIC_TEST_PRODUCT_ID=ffb4883f-ec48-4745-8147-b836f3fb2b88 \
SYNTHETIC_DELIVERY_CONTRACT_ID=flipflop.delivery.store_pickup.no_external_carrier.v1 \
FLIPFLOP_SYNTHETIC_EVIDENCE_DIR=/tmp/flipflop-w5-product-target-monitor \
npm run verify:synthetic-journey-monitor --silent
```

Observed result:

```text
ok=true
status=read_only_passed_full_flow_blocked_missing_contract
syntheticProductSource=configured
selectedProduct.idHash=6d12775ab8f5bcaa
selectedProduct.skuHash=1c80588fa6523352
mutation=false
liveCheckoutExecuted=false
providerCall=false
ordersMutation=false
warehouseMutation=false
secretOutput=false
rawCustomerOrPaymentEvidence=false
missing=[synthetic customer/contact, sandbox/test-mode payment approval flag, documented sandbox/test-mode payment provider, sandbox or test-only checkout mutation mode, email queue/inbox assertion source, event trace assertion source, order/payment cleanup or retention contract]
```

Validation decision: product and delivery are accepted by the read-only monitor when explicitly configured. Runtime execution remains blocked until the remaining missing facts are resolved and the full sandbox runner is separately enabled.
