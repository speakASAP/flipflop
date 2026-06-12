# GOAL 02 Context Package: Checkout Payments

## Important Files

- `docs/INTENT_MEMORY.md`
- `docs/process/OPERATIONAL_GATES.md`
- `implementation-goals/GOAL-02-checkout-payments.md`
- `implementation-goals/GOAL-02-checkout-payments.execution-plan.md`
- `services/order-service/src/orders/orders.service.ts`
- `shared/payments/payment.service.ts`
- `scripts/smoke-payu.sh`
- `scripts/smoke-paypal.sh`
- `scripts/smoke-webpay.sh`
- `scripts/smoke-stripe.sh`

## Current Production Evidence

- GOAL-01 is done. Storefront, product API, auth, cart add, and checkout
  initiation are validated.
- `https://payments.alfares.cz/health` returns HTTP 200 and `status: ok`.
- `payments-microservice`, `flipflop-order-service`, and `flipflop-service`
  deployments are running in Kubernetes.
- FlipFlop order service has payment service URL and API/webhook keys present.
- Payments service has `PAYMENT_API_KEY` present.

## Provider Status From Running Payments Pod

| Provider | Status | Evidence |
| --- | --- | --- |
| Stripe | partial | `STRIPE_SECRET_KEY` present, `STRIPE_WEBHOOK_SECRET` missing. |
| PayU | blocked | `PAYU_CLIENT_ID`, `PAYU_CLIENT_SECRET`, and `PAYU_MERCHANT_POS_ID` missing. |
| PayPal | blocked | `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` missing. |
| GP WebPay | blocked | merchant/key/application/description config checked in pod is missing. |

## Safety Rules

- Do not treat simulated webhook scripts as provider success.
- Do not directly edit order payment state.
- Do not mutate prices, discounts, totals, refunds, or cancellations.
- Do not print credential values in reports or logs.
- Do not remove or bypass existing payment provider paths.

## Required Evidence Per Provider

- Payment initiation request and response.
- Redirect URL, checkout session, client secret, or explicit error.
- Provider sandbox/webhook evidence for callback confirmation, if available.
- Resulting order payment state.
- Stock update/release evidence.
- Notification evidence.
- Explicit blocker when credentials or provider environment are missing.
