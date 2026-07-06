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
| Synthetic customer/contact | `[RESOLVED/NARROWED: SYNTHETIC_CUSTOMER_EMAIL=synthetic.customer-journey.w5@example.invalid with non-secret synthetic contact/address payload; domain matches SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid and notification source captures matching recipients as sanitized JSONL without sending]` | source packet contact values, verifier proof that guest checkout accepts email/phone/name/address payload, no raw customer data in runtime evidence |
| Delivery test contract | `[RESOLVED/NARROWED: packet-prep delivery test contract is flipflop.delivery.store_pickup.no_external_carrier.v1 using deliveryMethod=store, shippingCost=0, and no external-carrier handoff; runtime still blocked until product/customer/payment/email/event/cleanup facts exist]` | source references for `store` delivery method and server-side cost calculation; any checkout execution still requires full sandbox packet approval |
| Payment sandbox approval flag | `[RESOLVED/NARROWED: source-only no-external-provider contract approved as PAYMENT_SANDBOX_CONTRACT_APPROVED=1 for packet preparation]` | owner approval intake plus verifier-enforced no-provider invoice contract; no runtime checkout execution |
| Test-mode provider | `[RESOLVED/NARROWED: TEST_MODE_PAYMENT_PROVIDER=invoice under contract flipflop.payment.invoice.bank_transfer.no_provider_call.v1; source branch builds local bank-transfer redirect and does not call paymentService.createPayment]`; `[RESOLVED/NARROWED: Goal 24 Fiobanka QR material is policy/checklist evidence only and is not reused]` | verifier proof that `paymentMethod=invoice` avoids external provider calls; payment success evidence remains unavailable until a separate approved assertion exists |
| Checkout mutation mode | `[RESOLVED/NARROWED: CHECKOUT_MUTATION_MODE=test-only for source-only packet preparation; future runner must enforce this before any order mutation]` | verifier checks source contract and invoice no-provider branch; runtime runner remains blocked until product/customer/cleanup/evidence facts exist |
| Email assertion source | `[RESOLVED/NARROWED: approved source contract is SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl with SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid; notification code captures matching synthetic email assertions as sanitized JSONL and returns captured_not_sent]` | synthetic email sink/queue/log readback that does not send to real customers |
| Event trace assertion source | `[RESOLVED/NARROWED: approved source contract is SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl; customer journey publisher records sanitized JSONL trace rows after broker publish, queryable by journey_id/correlation_id]` | query path for `flipflop.customer_journey.events.v1` by `journey_id`/`correlation_id` |
| Cleanup/retention contract | `[RESOLVED/NARROWED: SYNTHETIC_ORDER_CLEANUP_CONTRACT=flipflop.retention.invoice_pending.no_provider.channel_no_cleanup_until_stale_unpaid.v1; retain invoice/pending synthetic order evidence and let existing stale unpaid order lifecycle handle cancellation after STALE_UNPAID_ORDER_HOURS default 24h; runner must not invoke manual cleanup mutation]` | stale unpaid retention contract, idempotency namespace, side-effect acknowledgement limits, and final redacted evidence path |

## Environment Variables Expected by Monitor

The existing monitor already gates full-flow readiness through these variables:

```text
SYNTHETIC_TEST_PRODUCT_ID=ffb4883f-ec48-4745-8147-b836f3fb2b88
SYNTHETIC_CUSTOMER_EMAIL=synthetic.customer-journey.w5@example.invalid
SYNTHETIC_CUSTOMER_PHONE=+420000000000
SYNTHETIC_CUSTOMER_FIRST_NAME=Synthetic
SYNTHETIC_CUSTOMER_LAST_NAME=CustomerJourneyW5
SYNTHETIC_CUSTOMER_BILLING_STREET=Synthetic Street 1
SYNTHETIC_CUSTOMER_BILLING_CITY=Praha
SYNTHETIC_CUSTOMER_BILLING_POSTAL_CODE=11000
SYNTHETIC_CUSTOMER_BILLING_COUNTRY=CZ
SYNTHETIC_CUSTOMER_WANTS_ACCOUNT=false
SYNTHETIC_CUSTOMER_MARKETING_CONSENT=false
SYNTHETIC_DELIVERY_CONTRACT_ID=flipflop.delivery.store_pickup.no_external_carrier.v1
PAYMENT_SANDBOX_CONTRACT_APPROVED=1
TEST_MODE_PAYMENT_PROVIDER=invoice
CHECKOUT_MUTATION_MODE=test-only
SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl
SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid
SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl
SYNTHETIC_ORDER_CLEANUP_CONTRACT=flipflop.retention.invoice_pending.no_provider.channel_no_cleanup_until_stale_unpaid.v1
FINAL_REDACTED_EVIDENCE_PATH=reports/validation/VAL-W5-customer-journey-sandbox-final-redacted-evidence-2026-07-06.md
```

Do not set these in production runtime until their packet values are owner-approved and non-secret handling is documented.

Packet-prepared delivery value: `SYNTHETIC_DELIVERY_CONTRACT_ID=flipflop.delivery.store_pickup.no_external_carrier.v1`. The monitor may still report `[MISSING: approved delivery test contract]` until the full sandbox runner environment is assembled; do not enable the runner while approval-id, execution-window, runner implementation, and final evidence-content facts remain missing.

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
| W5B Payment sandbox | complete: source-resolved no-provider contract, runtime payment success blocked | payments/runtime integrator | define sandbox/test-mode no-provider payment contract | docs/source/report/config-shape inspection without secrets | payment initiation, provider call, webhook replay, token output | `flipflop.payment.invoice.bank_transfer.no_provider_call.v1`; payment success remains `[MISSING]` |
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
- W5B: FlipFlop source has provider/method candidates such as `fiobanka`, `invoice`, `webpay`, `stripe`, `paypal`, and `payu`; only `invoice` is source-defensible for test-only no-external-provider packet preparation because non-invoice methods call Payments/provider creation.
- W5B: Goal 24 Fiobanka QR material can inform hard-stop policy only. It is not current approval for this customer-journey sandbox run.
- W5B: source-only payment contract is now `flipflop.payment.invoice.bank_transfer.no_provider_call.v1` with `PAYMENT_SANDBOX_CONTRACT_APPROVED=1`, `TEST_MODE_PAYMENT_PROVIDER=invoice`, `CHECKOUT_MUTATION_MODE=test-only`, `paymentMethod=invoice`, `provider_call=false`, `external_provider_call=false`, `real_money_movement=false`, and expected `paymentStatus=pending`; this does not provide `payment_succeeded` evidence.
- W5C: customer-journey AMQP publisher/schema exists, and an approved disabled-by-default event trace source contract now exists as `SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl`.
- W5C: notification/email implementation exists, and an approved disabled-by-default synthetic email assertion source contract now exists as `SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl` with `SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid`.

W5C is now source-resolved by disabled-by-default assertion capture contracts. Synthetic customer/contact is source-resolved by a non-secret `example.invalid` identity. Cleanup/retention is source-resolved by stale unpaid invoice retention. The packet remains blocked for runtime execution by the remaining approval-id, execution-window, runner implementation, and final evidence-content facts. The owner approval intake below authorizes packet preparation and source contracts only; it does not authorize full sandbox execution.

## Proposed Owner Approval Statement

This section is intentionally not executable until every `[MISSING: ...]` marker is replaced.

```text
I approve exactly one FlipFlop customer journey sandbox run for process flipflop.successful_customer_journey.v1 using approval id [MISSING: approval id], execution window [MISSING: start/end Europe/Prague], synthetic product/SKU ffb4883f-ec48-4745-8147-b836f3fb2b88 / ALLEGRO-OFFER-18106037370, synthetic customer/contact synthetic.customer-journey.w5@example.invalid with synthetic non-secret billing/contact payload, delivery contract flipflop.delivery.store_pickup.no_external_carrier.v1, sandbox/test-mode payment provider invoice under flipflop.payment.invoice.bank_transfer.no_provider_call.v1, checkout mutation mode test-only, email assertion source synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl, event trace source synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl, cleanup/retention contract flipflop.retention.invoice_pending.no_provider.channel_no_cleanup_until_stale_unpaid.v1, and redacted evidence path reports/validation/VAL-W5-customer-journey-sandbox-final-redacted-evidence-2026-07-06.md.

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
- `[RESOLVED/NARROWED: SYNTHETIC_CUSTOMER_EMAIL=synthetic.customer-journey.w5@example.invalid; SYNTHETIC_CUSTOMER_PHONE=+420000000000; firstName=Synthetic; lastName=CustomerJourneyW5; billing street/city/postal/country=Synthetic Street 1/Praha/11000/CZ; wantsAccount=false; marketingConsent=false]`
- `[RESOLVED/NARROWED: delivery test contract candidate flipflop.delivery.store_pickup.no_external_carrier.v1 selected for packet preparation only; no runtime checkout allowed until the remaining missing facts are resolved]`
- `[RESOLVED/NARROWED: TEST_MODE_PAYMENT_PROVIDER=invoice under flipflop.payment.invoice.bank_transfer.no_provider_call.v1 for packet preparation only; no external provider call or real money movement is approved]`
- `[RESOLVED/NARROWED: CHECKOUT_MUTATION_MODE=test-only source contract selected; future runner must enforce it before any checkout/order mutation]`
- `[RESOLVED/NARROWED: SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl with SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid]`
- `[RESOLVED/NARROWED: SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl]`
- `[RESOLVED/NARROWED: SYNTHETIC_ORDER_CLEANUP_CONTRACT=flipflop.retention.invoice_pending.no_provider.channel_no_cleanup_until_stale_unpaid.v1; cleanup_mode=retain_then_platform_stale_unpaid_cancel; manual_cleanup_mutation=false; orders_route_invocation=false; db_write_by_runner=false]`
- `[RESOLVED/NARROWED: FINAL_REDACTED_EVIDENCE_PATH=reports/validation/VAL-W5-customer-journey-sandbox-final-redacted-evidence-2026-07-06.md; evidence content remains missing until an approved runtime run exists]`





## 2026-07-06 Additional Approval Signal

Owner reply: I approve

Decision: [RESOLVED/NARROWED: owner provided an additional approval signal for W5 continuation, but the message does not supply the exact runtime approval id, execution window, sandbox runner implementation, CRM no-op/retention acknowledgement, invoice payment-success decision, or final redacted evidence content.]

Scope of this approval:

- It authorizes continued source documentation, verifier alignment, and read-only validation.
- It does not authorize checkout submission, guest customer mutation, order creation, payment creation, provider calls, webhook replay, email sending, event publishing, Warehouse mutation, Orders mutation, deploy, DB writes, secret output, token output, raw customer/contact/address output, raw order/payment ids, or raw provider payload output.
- Runtime remains blocked until the missing fields below are supplied as explicit non-secret values and validated.

Still missing for runtime execution:

- [MISSING: approval id]
- [MISSING: execution window]
- [MISSING: sandbox runner implementation]
- [MISSING: crm no-op/retention acknowledgement]
- [MISSING: sandbox/test-mode payment success evidence for invoice pending/no-provider]
- [RESOLVED/NARROWED: final redacted evidence content exists for partial invoice/no-provider runtime; successful paid journey evidence remains missing]



## 2026-07-06 Deployed Assertion Source Wiring

Decision: `[RESOLVED/NARROWED: source deployment config now wires W5 synthetic email and event assertion sources through k8s/configmap.yaml; deployed runtime readback remains required before another W5 runtime attempt]`.

Config values:

```text
PAYMENT_SANDBOX_CONTRACT_APPROVED=1
TEST_MODE_PAYMENT_PROVIDER=invoice
CHECKOUT_MUTATION_MODE=test-only
SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl
SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid
SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl
```

Boundary: this is source/config wiring only. No deployment, rollout restart, checkout, order, payment, provider call, email send, event publish, CRM/Leads readback, DB write, or secret output occurred in this update.

Runtime blocker status: the previous runtime evidence remains blocked by missing deployed assertion readback. The next runtime attempt must first deploy the ConfigMap and prove sanitized runtime readback that these environment variables are present without printing secrets or raw customer/order/payment data.

Validation command:

```bash
npm run verify:customer-journey-assertion-sources
```

## 2026-07-06 W5 Runtime Evidence Partial Success

Evidence paths:

```text
reports/validation/customer-journey-sandbox-runtime/w5-owner-approved-invoice-runtime-20260706-2130.json
reports/validation/VAL-W5-customer-journey-sandbox-final-redacted-evidence-2026-07-06.md
```

Decision: `[RESOLVED/NARROWED: redacted W5 runtime evidence exists for a partial invoice/no-provider order-created path; it is not successful paid customer journey evidence]`.

Sanitized evidence summary:

```text
ok=true
checkoutSubmitted=true
orderCreated=true
paymentMethod=invoice
paymentCreated=false
providerCall=false
externalProviderCall=false
realMoneyMovement=false
paymentSuccessEvidence=false
centralReadStatus=available
centralLifecycleStage=ordered_unpaid
emailAssertionSource=unavailable_deployed_env_missing
eventTraceSource=unavailable_deployed_env_missing
rawCustomerOutput=false
rawOrderOutput=false
rawPaymentOutput=false
secretOutput=false
```

Remaining blockers:

- `[MISSING: CRM no-op/retention acknowledgement]`
- `[MISSING: sandbox/test-mode payment success evidence; invoice remains pending/no-provider]`
- `[RESOLVED/NARROWED: source-controlled deployed synthetic email JSONL assertion env prepared; live ConfigMap apply/restart/readback complete; assertion file generation still requires a future approved runtime event]`
- `[RESOLVED/NARROWED: source-controlled deployed synthetic event JSONL assertion env prepared; live ConfigMap apply/restart/readback complete; assertion file generation still requires a future approved runtime event]`

Boundary: this packet update records the approved runtime attempt. It created one pre-prod invoice/no-provider guest order and central ordered_unpaid record, but did not create provider payment, call a provider, move real money, replay webhooks, send email, run manual cleanup, deploy, print secrets, or print raw customer/order/payment data.

Validation command:

```bash
npm run verify:customer-journey-runtime-evidence-contract
```

## Workstream 5B Sandbox Payment Contract

User instruction `do it yourself` is consumed as approval for Codex to resolve the non-secret source-level payment contract. It is not consumed as approval for live checkout, payment creation, provider calls, webhook replay, Orders mutation, Warehouse mutation, email sending, deploy, DB writes, secret output, raw customer/contact/address output, raw order/payment ids, or raw provider payload output.

Contract values:

```text
contract_id: flipflop.payment.invoice.bank_transfer.no_provider_call.v1
PAYMENT_SANDBOX_CONTRACT_APPROVED=1
TEST_MODE_PAYMENT_PROVIDER=invoice
CHECKOUT_MUTATION_MODE=test-only
paymentMethod=invoice
paymentStatus=pending
provider_call=false
external_provider_call=false
real_money_movement=false
payment_success_evidence=false
```

Source proof: `services/order-service/src/orders/orders.service.ts` accepts `invoice` in `normalizeGuestPaymentMethod`. In the guest order path, `paymentMethod === 'invoice'` builds a local bank-transfer redirect through `buildBankTransferRedirect(order, total)` and does not call `this.paymentService.createPayment(...)`; non-invoice methods remain the provider branch.

Boundary: this contract is suitable only for no-external-provider sandbox planning and verifier gating. It does not prove a successful paid journey, does not mark payment as succeeded, and does not permit a full sandbox runner until product, customer, cleanup/retention, and final evidence-path facts are resolved.

Validation command:

```bash
npm run verify:customer-journey-sandbox-payment-contract
```

## Workstream 5C Approved Assertion Source Contracts

User approval captured in orchestration thread `019f387b-12f0-7de1-9cc4-f1b1683094d1` permits source-only resolution of the email/event assertion source contracts. It does not authorize checkout, payment, provider, Orders, Warehouse, delivery, deploy, DB write, or full sandbox execution.

Email assertion source:

```text
PAYMENT_SANDBOX_CONTRACT_APPROVED=1
TEST_MODE_PAYMENT_PROVIDER=invoice
CHECKOUT_MUTATION_MODE=test-only
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


## Workstream 5 Synthetic Customer Contact Contract

User approval `Да, хорошо, продолжай` is consumed only for source/docs/verifier narrowing of a non-secret synthetic contact. It does not authorize checkout submission, order creation, payment creation, provider calls, webhook replay, email sending, event publishing, Warehouse mutation, Orders mutation, deploy, DB reads/writes, secret output, token output, raw customer/contact/address output in runtime evidence, raw order/payment ids, or raw provider payload output.

Contract values:

```text
SYNTHETIC_CUSTOMER_EMAIL=synthetic.customer-journey.w5@example.invalid
SYNTHETIC_CUSTOMER_PHONE=+420000000000
SYNTHETIC_CUSTOMER_FIRST_NAME=Synthetic
SYNTHETIC_CUSTOMER_LAST_NAME=CustomerJourneyW5
SYNTHETIC_CUSTOMER_BILLING_STREET=Synthetic Street 1
SYNTHETIC_CUSTOMER_BILLING_CITY=Praha
SYNTHETIC_CUSTOMER_BILLING_POSTAL_CODE=11000
SYNTHETIC_CUSTOMER_BILLING_COUNTRY=CZ
SYNTHETIC_CUSTOMER_WANTS_ACCOUNT=false
SYNTHETIC_CUSTOMER_MARKETING_CONSENT=false
raw_customer_contact_evidence=false
email_send=false
```

Source proof: `services/frontend/lib/api/orders.ts` defines guest checkout payload fields for email, phone, billing address, delivery address, items, payment method, delivery method, journey id, correlation id, and session id. `services/order-service/src/orders/orders.service.ts` validates email with `normalizeGuestEmail`, creates or updates a checkout customer with synthetic first/last name and phone, requires complete address fields in `createCheckoutAddress`, and keeps `wantsAccount=false` as `accountActivation=not-requested`. `shared/notifications/notification.service.ts` requires `SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid` for synthetic email capture and returns `captured_not_sent` instead of sending to that recipient.

Validation command:

```bash
npm run verify:customer-journey-synthetic-contact-contract
```



## Workstream 5 Cleanup And Evidence Path Contract

User approval `Да, я опрувлю` is consumed only for source/docs/verifier edits that narrow cleanup/retention and final evidence path. It does not authorize checkout submission, order creation, payment creation, provider calls, webhook replay, email sending, event publishing, Warehouse mutation, Orders mutation, deploy, DB reads/writes, secret output, token output, raw customer/contact/address output, raw order/payment ids, or raw provider payload output.

Contract values:

```text
SYNTHETIC_ORDER_CLEANUP_CONTRACT=flipflop.retention.invoice_pending.no_provider.channel_no_cleanup_until_stale_unpaid.v1
cleanup_mode=retain_then_platform_stale_unpaid_cancel
payment_method=invoice
payment_status_expected=pending
provider_call=false
external_provider_call=false
manual_cleanup_mutation=false
orders_route_invocation=false
db_write_by_runner=false
retention_ttl_source=STALE_UNPAID_ORDER_HOURS default 24h
idempotency_key_namespace=w5:customer-journey:<approvalId>:<journeyHash>:<orderHash>
sideEffectsHandled.payment=true_no_provider_call
sideEffectsHandled.warehouse=false_until_owner_packet
sideEffectsHandled.notification=false_until_synthetic_email_jsonl_readback
sideEffectsHandled.crm=false_missing_no_op_or_retention_acknowledgement
sideEffectsHandled.channel=false_until_redacted_channel_evidence
FINAL_REDACTED_EVIDENCE_PATH=reports/validation/VAL-W5-customer-journey-sandbox-final-redacted-evidence-2026-07-06.md
```

Source proof: `services/order-service/src/orders/orders.service.ts` defines `cancelStaleUnpaidOrders`, defaults `STALE_UNPAID_ORDER_HOURS` to 24, selects orders with `paymentStatus: PaymentStatus.pending` and `status: OrderStatus.pending`, skips local warehouse release for central-owned orders, and then marks stale unpaid rows `paymentStatus: PaymentStatus.failed` and `status: OrderStatus.cancelled`. The W5 runner must not call this job directly and must not call any cleanup or Orders status route. It may only record the retention contract and sanitized evidence path.

Validation command:

```bash
npm run verify:customer-journey-cleanup-contract
```

## 2026-07-06 Owner-Approved Runtime Evidence

At 2026-07-06T21:30:00+02:00 the owner approved a pre-prod W5 run. The executed safe path used paymentMethod=invoice only. One guest checkout submission succeeded with orderStatus=pending, paymentStatus=pending, central lifecycle ordered_unpaid, providerCall=false, externalProviderCall=false, realMoneyMovement=false, and paymentCreated=false. Sanitized evidence is recorded at reports/validation/VAL-W5-customer-journey-sandbox-final-redacted-evidence-2026-07-06.md and reports/validation/customer-journey-sandbox-runtime/w5-owner-approved-invoice-runtime-20260706-2130.json.

Sanitized CRM/Leads readback after the runtime attempt: crmLeadsAcknowledgement: accepted; leadsSync=accepted and leadId present in order metadata, with metadata keys/hash only and crmRawOutput: false; no raw lead/order/customer output. Remaining blockers after the runtime attempt: [MISSING: sandbox/test-mode payment success evidence; invoice remains pending/no-provider], [MISSING: synthetic email JSONL assertion because deployed env lacks SYNTHETIC_EMAIL_ASSERTION_SOURCE at execution time], and [MISSING: synthetic event JSONL assertion because deployed env lacks SYNTHETIC_EVENT_TRACE_SOURCE at execution time].


## 2026-07-06 W5 Deployed Assertion Env Source Readiness

source-controlled W5 sandbox/test-only monitor gate env prepared. Source-controlled runtime env has been prepared in `k8s/configmap.yaml` for the W5 monitor gate and disabled-by-default assertion sinks:

```text
PAYMENT_SANDBOX_CONTRACT_APPROVED=1
TEST_MODE_PAYMENT_PROVIDER=invoice
CHECKOUT_MUTATION_MODE=test-only
SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl
SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid
SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl
```

`k8s/deployment.yaml` wires `flipflop-config` through `envFrom` into `flipflop-order-service`, and the order-service image contains the shared notification and customer-journey publisher code that reads these variables.

Boundary: this source update records non-secret W5 monitor gate env and assertion source env. It does not by itself apply the ConfigMap, restart pods, create another order, send email, publish an event, mutate Orders/Warehouse, deploy, write DB rows, print secrets, or print raw customer/order/payment data. ConfigMap apply, order-service restart, and live env readback are complete. Assertion files remain absent for the prior 21:30 runtime because those env vars were not present at execution time; no new order was created by the env readback.

Validation command:

```bash
npm run verify:customer-journey-deployed-assertion-env-source
```

## Current Decision

Status: `owner-approved-packet-prep-product-customer-delivery-payment-w5c-cleanup-source-narrowed-runtime-side-effects-blocked`.

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

Validation decision: packet preparation is source-valid; runtime execution remains blocked by missing approval id, execution window, runner implementation, CRM no-op/retention acknowledgement, invoice payment-success decision, and final redacted evidence content. Sandbox/test-mode provider, checkout mutation mode, cleanup/retention contract, and final redacted evidence path are source-narrowed only.



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
