# W5 Customer Journey Sandbox Runtime Evidence - 2026-07-06 21:30 Europe/Prague

- approvalId: W5-OWNER-APPROVED-20260706-2130-EUROPE-PRAGUE
- approvedAt: 2026-07-06T21:30:00+02:00
- environment: pre-prod
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
- redirectUrlClass: bank_transfer_local_result
- orderIdHash: 256cafc2dc8249fc
- orderNumberHash: 5ef0b505763741b5
- centralOrderHash: 735f66beb7c166bf
- centralReadStatus: available
- centralLifecycleStage: ordered_unpaid
- centralStatus: ordered_unpaid
- centralPaymentStatus: pending
- emailAssertionSource: unavailable_deployed_env_missing
- eventTraceSource: unavailable_deployed_env_missing
- cleanupContract: flipflop.retention.invoice_pending.no_provider.channel_no_cleanup_until_stale_unpaid.v1
- manualCleanupMutation: false
- ordersRouteInvocation: false
- dbWriteByRunner: false
- rawCustomerOutput: false
- rawOrderOutput: false
- rawPaymentOutput: false
- secretOutput: false

## Remaining Blockers

- [MISSING: CRM no-op/retention acknowledgement]
- [MISSING: sandbox/test-mode payment success evidence; invoice remains pending/no-provider]
- [MISSING: synthetic email JSONL assertion because deployed env lacks SYNTHETIC_EMAIL_ASSERTION_SOURCE]
- [MISSING: synthetic event JSONL assertion because deployed env lacks SYNTHETIC_EVENT_TRACE_SOURCE]

## Journey Verdict

- successfulCustomerJourney: false
- journeyVerdict: blocked_invoice_pending_missing_crm_email_event_assertions
- interpretation: the runner produced a sanitized pending invoice order and central Orders readback, but this is not successful-customer-journey evidence because payment success, CRM no-op/retention acknowledgement, synthetic email assertion, and synthetic event assertion remain missing.
