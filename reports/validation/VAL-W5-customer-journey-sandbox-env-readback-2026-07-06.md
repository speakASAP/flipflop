# W5 Customer Journey Sandbox Env Readback Evidence - 2026-07-06 22:00 Europe/Prague

- approvalId: W5-OWNER-APPROVED-20260706-2130-EUROPE-PRAGUE
- environment: pre-prod
- runtimeEnvReadback: passed
- PAYMENT_SANDBOX_CONTRACT_APPROVED: expected
- TEST_MODE_PAYMENT_PROVIDER: expected
- CHECKOUT_MUTATION_MODE: expected
- SYNTHETIC_EMAIL_ASSERTION_SOURCE: expected_class
- SYNTHETIC_EMAIL_ASSERTION_DOMAIN: expected
- SYNTHETIC_EVENT_TRACE_SOURCE: expected_class
- orderServiceRollout: generation_observed_ready
- checkoutSubmitted: true
- orderCreated: true
- paymentMethod: invoice
- paymentStatus: pending
- orderStatus: pending
- providerCall: false
- externalProviderCall: false
- realMoneyMovement: false
- paymentCreated: false
- paymentSuccessEvidence: false
- centralOrdersForwardingStatus: accepted
- crmLeadsAcknowledgement: accepted
- crmLeadIdPresent: true
- crmReadbackSource: sanitized_orders_metadata_keys_only
- crmRawOutput: false
- emailAssertionSource: runtime_env_present_no_jsonl_row_observed_for_invoice_pending
- eventTraceSource: runtime_env_present_no_jsonl_file_observed_after_invoice_order
- rawCustomerOutput: false
- rawOrderOutput: false
- rawPaymentOutput: false
- secretOutput: false

## Remaining Blockers

- [MISSING: sandbox/test-mode payment success evidence; invoice remains pending/no-provider]
- [MISSING: synthetic email JSONL assertion row for invoice pending/no-payment-success path]
- [MISSING: synthetic event JSONL assertion row; deployed env present but no JSONL file observed after 22:00 invoice run]

## Verdict

- successfulCustomerJourney: false
- journeyVerdict: blocked_invoice_pending_missing_payment_success_email_event_jsonl_readback
- interpretation: the pre-prod runtime now has the required non-secret W5 monitor env and can create an invoice/no-provider order with CRM and central forwarding accepted, but invoice remains pending and no synthetic email/event JSONL assertion row was observed.
