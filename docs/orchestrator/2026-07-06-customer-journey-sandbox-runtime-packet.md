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
| Synthetic product/SKU | `[MISSING: approved synthetic product/SKU]`; `[RESOLVED/NARROWED: historical GOAL-09 precedent used dedicated SKU CODEX-STOCK-TRACE-011, but current public product API lookup did not find that SKU; first-sellable public product is not reclassified as synthetic]` | product id/SKU or approved deterministic selector, with stock/price/delivery suitability and no raw DB row output |
| Synthetic customer/contact | `[MISSING: synthetic customer/contact]` | approved synthetic identity or token-bound test actor; no raw email/customer data in logs |
| Delivery test contract | `[RESOLVED/NARROWED: packet-prep delivery test contract is flipflop.delivery.store_pickup.no_external_carrier.v1 using deliveryMethod=store, shippingCost=0, and no external-carrier handoff; runtime still blocked until product/customer/payment/email/event/cleanup facts exist]` | source references for `store` delivery method and server-side cost calculation; any checkout execution still requires full sandbox packet approval |
| Payment sandbox approval flag | `[MISSING: sandbox/test-mode payment approval flag]` | explicit owner-approved `PAYMENT_SANDBOX_CONTRACT_APPROVED=1` or equivalent non-secret packet |
| Test-mode provider | `[MISSING: documented sandbox/test-mode payment provider]`; `[RESOLVED/NARROWED: Goal 24 Fiobanka QR material is policy/checklist evidence only and is not a reusable sandbox/test-mode approval packet]` | provider/method/environment and proof that no real money movement occurs |
| Checkout mutation mode | `[MISSING: sandbox or test-only checkout mutation mode]` | `CHECKOUT_MUTATION_MODE=sandbox|test-only` and service-side enforcement proof |
| Email assertion source | `[MISSING: email queue/inbox assertion source]`; `[RESOLVED/NARROWED: notification code exists, but no approved synthetic email sink/readback source was found]` | synthetic email sink/queue/log readback that does not send to real customers |
| Event trace assertion source | `[MISSING: event trace assertion source]`; `[RESOLVED/NARROWED: source-level AMQP publisher/schema exists for flipflop.customer_journey.events.v1, but no approved consumer/storage/query readback source was found]` | query path for `flipflop.customer_journey.events.v1` by `journey_id`/`correlation_id` |
| Cleanup/retention contract | `[MISSING: order/payment cleanup or retention contract]` | decision to clean up, cancel, retain, or mark synthetic order/payment, with idempotency and side-effect acknowledgements |

## Environment Variables Expected by Monitor

The existing monitor already gates full-flow readiness through these variables:

```text
SYNTHETIC_TEST_PRODUCT_ID
SYNTHETIC_CUSTOMER_EMAIL
SYNTHETIC_DELIVERY_CONTRACT_ID
PAYMENT_SANDBOX_CONTRACT_APPROVED
TEST_MODE_PAYMENT_PROVIDER
CHECKOUT_MUTATION_MODE
SYNTHETIC_EMAIL_ASSERTION_SOURCE
SYNTHETIC_EVENT_TRACE_SOURCE
SYNTHETIC_ORDER_CLEANUP_CONTRACT
```

Do not set these in production runtime until their packet values are owner-approved and non-secret handling is documented.

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
| W5C Email/event trace | complete: blocked missing approved sources | observability/notification investigator | find synthetic email sink and event trace source | docs/source/report inspection | sending emails, publishing events, raw payload/token output | `[MISSING: synthetic email assertion source]`; `[MISSING: event trace assertion source]` |
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
- W5C: customer-journey AMQP publisher/schema exists, but no approved event trace readback/query source exists.
- W5C: notification/email implementation exists, but no approved synthetic email sink/readback source exists.

These final W5A/W5B/W5C findings kept the packet blocked for runtime execution. The owner approval intake below authorizes packet preparation only; it does not resolve the missing runtime facts.

## Proposed Owner Approval Statement

This section is intentionally not executable until every `[MISSING: ...]` marker is replaced.

```text
I approve exactly one FlipFlop customer journey sandbox run for process flipflop.successful_customer_journey.v1 using approval id [MISSING: approval id], execution window [MISSING: start/end Europe/Prague], synthetic product/SKU [MISSING], synthetic customer/contact [MISSING], delivery contract [MISSING], sandbox/test-mode payment provider [MISSING], checkout mutation mode [MISSING], email assertion source [MISSING], event trace source [MISSING], cleanup/retention contract [MISSING], and redacted evidence path [MISSING].

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

- `[MISSING: approved synthetic product/SKU]`
- `[MISSING: synthetic customer/contact]`
- `[RESOLVED/NARROWED: delivery test contract candidate flipflop.delivery.store_pickup.no_external_carrier.v1 selected for packet preparation only; no runtime checkout allowed until the remaining missing facts are resolved]`
- `[MISSING: documented sandbox/test-mode payment provider with environment proof]`
- `[MISSING: CHECKOUT_MUTATION_MODE=sandbox|test-only service-side enforcement proof]`
- `[MISSING: synthetic email assertion source]`
- `[MISSING: event trace assertion source]`
- `[MISSING: order/payment cleanup or retention contract]`
- `[MISSING: final redacted evidence path]`

## Current Decision

Status: `owner-approved-packet-prep-delivery-contract-narrowed-runtime-side-effects-blocked`.

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
