# GOAL 02 Execution Plan: Checkout Payments

## Intent Bundle

```json
{
  "goal": {
    "title": "Checkout Payments",
    "intent": "Verify and complete FlipFlop payment-provider checkout flows without faking paid state",
    "success_criteria": [
      "PayU payment initiation and callback path verified or explicitly blocked by credentials",
      "PayPal payment initiation and callback path verified or explicitly blocked by credentials",
      "GP WebPay payment initiation uses FlipFlop identity and callback path verified or explicitly blocked by credentials",
      "Stripe payment initiation and verified webhook path confirmed",
      "order paid state, stock update, and confirmation notification evidence recorded per provider where credentials allow"
    ],
    "constraints": [
      "no fake payment success",
      "no real order cancellation or refund without owner approval",
      "no price, discount, or order total changes without human validation",
      "GP WebPay DESCRIPTION must identify FlipFlop, not another business",
      "do not overwrite unrelated dirty files"
    ],
    "non_goals": [
      "checkout UX redesign",
      "new payment provider onboarding",
      "manual paid-state database edits",
      "credential creation or secret rotation without owner approval"
    ]
  },
  "why_this_task_exists": "GOAL-01 proved the production storefront, product API, auth, cart, and checkout initiation paths. The next blocker to checkout-to-first-revenue is provider-specific payment initiation, verified callback/webhook handling, stock finalization, and notifications.",
  "upstream_traceability": [
    "GOALS.md",
    "PLAN.md",
    "SPEC.md Module 3",
    "docs/INTENT_MEMORY.md",
    "implementation-goals/GOAL-01-production-readiness.validation-report.md"
  ],
  "approved_execution_plan_ref": "implementation-goals/GOAL-02-checkout-payments.execution-plan.md",
  "context_package_ref": "implementation-goals/GOAL-02-checkout-payments.context-package.md",
  "coding_prompt_ref": "implementation-goals/GOAL-02-checkout-payments.coding-prompt.md",
  "relevant_decisions": [
    "GOAL-01 closed with routed API validation accepted even though bare /api returns 404",
    "Webhook simulation scripts must not be used as proof of real provider success unless clearly labeled as simulation"
  ],
  "acceptance_criteria": [
    "Each provider can initiate payment or has an explicit credential/provider blocker",
    "Verified webhook or sandbox callback updates order payment state",
    "Stock is deducted on success and released on failure or cancellation",
    "Confirmation email is sent on success",
    "Blocked providers have explicit credential or provider-environment blocker notes"
  ],
  "validation_criteria": [
    "payments-microservice health check",
    "running-pod provider credential presence check without exposing values",
    "provider-specific initiation checks using test orders",
    "provider webhook checks only through verified provider sandbox/webhook evidence or explicitly labeled simulation",
    "order, stock, and notification evidence recorded per provider"
  ],
  "project_memory": {
    "current_state": "GOAL-01 production topology validated. Payment service is healthy. Running payments pod currently lacks PayU, PayPal, and GP WebPay credentials; Stripe has a secret key but no webhook secret.",
    "important_files": [
      "services/order-service/src/orders/orders.service.ts",
      "shared/payments/payment.service.ts",
      "scripts/smoke-payu.sh",
      "scripts/smoke-paypal.sh",
      "scripts/smoke-webpay.sh",
      "scripts/smoke-stripe.sh",
      "docs/process/OPERATIONAL_GATES.md"
    ],
    "known_risks": [
      "Existing smoke scripts include simulated webhook callbacks that can mark orders paid",
      "Missing provider credentials can block end-to-end validation",
      "Production order/payment state must not be mutated to fake success"
    ]
  }
}
```

## Steps

1. Preserve GOAL-01 closure evidence and mark GOAL-02 active.
2. Check payments-microservice health and running provider credential presence
   without printing secret values.
3. Classify each provider as ready, partially ready, or blocked.
4. For providers with credentials, create isolated test orders and validate
   payment initiation.
5. Validate callbacks/webhooks only with provider sandbox/webhook evidence, or
   clearly label simulation as non-acceptance evidence.
6. Verify order paid state, stock deduction/release, and notification evidence
   only after real/sandbox provider confirmation.
7. Patch the smallest scoped integration gaps found.
8. Update the validation report and implementation state.

## Current Checkpoint

GOAL-02 started on 2026-06-12.

Initial production discovery:

- `https://payments.alfares.cz/health` returns HTTP 200 with `status: ok`.
- `payments-microservice` Kubernetes deployment and pod are running.
- `flipflop-order-service` has `PAYMENT_SERVICE_URL`, `PAYMENT_API_KEY`,
  `PAYMENT_WEBHOOK_API_KEY`, and `API_GATEWAY_URL` present.
- Running `payments-microservice` pod has `PAYMENT_API_KEY` present.
- Running `payments-microservice` pod has `STRIPE_SECRET_KEY` present.
- Running `payments-microservice` pod is missing `STRIPE_WEBHOOK_SECRET`.
- Running `payments-microservice` pod is missing PayU credential keys checked:
  `PAYU_CLIENT_ID`, `PAYU_CLIENT_SECRET`, `PAYU_MERCHANT_POS_ID`.
- Running `payments-microservice` pod is missing PayPal credential keys checked:
  `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`.
- Running `payments-microservice` pod is missing GP WebPay credential/config keys
  checked: `GPWEBPAY_MERCHANT_ID`, `GPWEBPAY_PRIVATE_KEY_PATH`,
  `GPWEBPAY_PUBLIC_KEY_PATH`, `WEBPAY_APPLICATION_ID`, `WEBPAY_DESCRIPTION`.

Next implementation step:

1. Mark PayU, PayPal, and GP WebPay blocked by missing production credentials.
2. Investigate Stripe next because it is the only provider with a production
   secret key present; determine whether initiation works and whether missing
   webhook secret blocks verified callback acceptance.
