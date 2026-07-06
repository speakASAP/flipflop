# W5 Event JSONL Evidence After 92c51f9

Scope: bounded W5 invoice/no-provider evidence pass for event JSONL only.

- ok: true
- approvalId: W5-OWNER-APPROVED-20260706-2130-EUROPE-PRAGUE
- afterCommit: 92c51f9
- runtimeMutation: true
- checkoutSubmitted: true
- orderCreated: true
- paymentMethod: invoice
- paymentStatus: pending
- providerCall: false
- externalProviderCall: false
- realMoneyMovement: false
- paymentCreated: false
- eventTraceSource: synthetic_event_trace_jsonl_observed_after_92c51f9_invoice_order
- eventJsonlObserved: true
- eventJsonlMatchedRows: 10
- eventNames: cart_validated, customer_identity_resolved, order_created, payment_attempt_started, shipping_option_selected
- journeyHash: 441e49b118d43493
- correlationHash: 560b174ac460e238
- orderHashPresent: true
- rawCustomerOutput: false
- rawOrderOutput: false
- rawPaymentOutput: false
- secretOutput: false

Remaining blockers:
- [MISSING: sandbox/test-mode payment success evidence; invoice remains pending/no-provider]
- [MISSING: synthetic email JSONL assertion row for payment-success confirmation path; invoice pending/no-provider does not send payment-success confirmation]

Validation:
- npm run verify:customer-journey-runtime-evidence-contract
- npm run verify:customer-journey-assertion-sources
- npm run verify:customer-journey-sandbox-payment-contract
