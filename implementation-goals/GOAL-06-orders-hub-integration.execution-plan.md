# GOAL 06 Execution Plan: Orders Hub Integration

## Intent Bundle

```json
{
  "goal": {
    "title": "Orders Hub Integration",
    "intent": "Make FlipFlop the owner-approved first application feeding central Orders from the FlipFlop server-side order-service",
    "success_criteria": [
      "FlipFlop order-service sends the Orders create v1 contract fields",
      "central Orders idempotency conflicts are surfaced explicitly",
      "sensitive payment/provider/customer fields are excluded from the forwarded payload",
      "existing checkout, payment, stock, cancellation, and refund boundaries are not weakened"
    ],
    "constraints": [
      "do not change product prices, discounts, order totals, cancellation, refund, or payment-state rules",
      "do not claim PayU, PayPal, GP WebPay, or Stripe webhook verification is complete",
      "do not move payment provider identity or reconciliation into FlipFlop or Orders",
      "do not print or commit secrets or raw production data"
    ],
    "non_goals": [
      "payment provider credential setup",
      "provider webhook verification",
      "runtime deployment unless separately approved",
      "frontend checkout redesign",
      "central Orders schema changes"
    ]
  },
  "why_this_task_exists": "The owner explicitly approved FlipFlop as the specific application to integrate with central Orders, and specified that the work belongs on the FlipFlop server-service side.",
  "upstream_traceability": [
    "GOALS.md",
    "PLAN.md",
    "SYSTEM.md",
    "SPEC.md Module 4 orders-microservice Integration",
    "docs/INTENT_MEMORY.md",
    "docs/process/PROJECT_INVARIANTS.md",
    "implementation-goals/GOAL-06-orders-hub-integration.md"
  ],
  "approved_execution_plan_ref": "implementation-goals/GOAL-06-orders-hub-integration.execution-plan.md",
  "context_package_ref": "implementation-goals/GOAL-06-orders-hub-integration.context-package.md",
  "coding_prompt_ref": "implementation-goals/GOAL-06-orders-hub-integration.coding-prompt.md",
  "validation_report_ref": "implementation-goals/GOAL-06-orders-hub-integration.validation-report.md"
}
```

## Files to Inspect

- `services/order-service/src/orders/orders.service.ts`
- `shared/clients/order-client.service.ts`
- `services/order-service/src/orders/dto/create-order.dto.ts`
- `services/order-service/src/orders/orders.controller.ts`
- `shared/payments/payment.service.ts`
- `docs/IMPLEMENTATION_STATE.md`

## Files to Modify

- `services/order-service/src/orders/orders.service.ts`
- `shared/clients/order-client.service.ts`
- `scripts/verify-orders-hub-integration.js`
- `package.json`
- `docs/IMPLEMENTATION_STATE.md`
- `implementation-goals/GOAL-06-orders-hub-integration.validation-report.md`

## Files That Must Not Be Modified

- Payment provider credential files or secrets.
- Kubernetes Secret or ExternalSecret values.
- Product pricing and catalog mutation paths.
- Warehouse stock mutation ownership.
- Orders microservice schema or runtime source for this FlipFlop-side goal.

## Implementation Steps

1. Preserve the local order creation and payment initiation flow.
2. Convert central Orders forwarding into an explicit bounded contract builder with stable idempotency fields.
3. Make idempotency conflicts visible and deterministic without logging sensitive payloads.
4. Add a verification script that reads source and asserts required contract fields, conflict handling, and forbidden sensitive fields.
5. Wire the verifier into the service/package test path where appropriate.
6. Update IPS state and validation report with evidence.

## Test Plan

- Run FlipFlop IPS pre-coding gates before code edits.
- Run the targeted Orders Hub integration verifier.
- Run the narrowest build/test command available for shared client and order-service.
- Run `git diff --check`.
- Run sensitive-marker scans over changed docs/source.

## Validation Plan

- Contract validation: `contractVersion`, `channel`, `channelAccountId`, and `externalOrderId` must be present before POSTing to central Orders.
- Replay/determinism validation: HTTP 409 from central Orders must map to explicit `ORDER_IDEMPOTENCY_CONFLICT`.
- Sensitive-data validation: forwarded payload must exclude raw provider responses, card data, tokens, secrets, and raw customer notes.
- Boundary validation: no code changes to payment provider capture, provider webhooks, refunds, cancellation approval, product pricing, or warehouse truth.

## Rollback Plan

- Revert GOAL-06 code and verifier changes in FlipFlop.
- Leave central Orders deployed state unchanged.
- If runtime deployment later fails, roll back the FlipFlop order-service deployment to the previous image.

## Current Checkpoint

GOAL-06 started on 2026-06-13 after owner approval naming FlipFlop as the specific application.
