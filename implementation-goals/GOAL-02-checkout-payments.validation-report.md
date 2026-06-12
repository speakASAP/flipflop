# GOAL 02 Validation Report: Checkout Payments

## Status

Blocked with owner-approved bypass on 2026-06-12.

GOAL-02 provider completion is intentionally deferred by owner decision. The
platform can proceed to later implementation goals while PayU, PayPal, GP
WebPay, and Stripe webhook/provider completion are configured manually after the
rest of the project is implemented.

Initial provider readiness discovery is complete. Full end-to-end provider
validation is currently blocked for PayU, PayPal, and GP WebPay by missing
production provider credentials/configuration. Stripe is partially configured:
initiation now works, but verified webhook completion still needs
webhook-secret/provider-callback evidence.

## Commands

```bash
ssh alfares 'curl -s -i --max-time 10 https://payments.alfares.cz/health | sed -n "1,20p"'
ssh alfares 'kubectl get deploy,pod -n statex-apps | grep -E "payments-microservice|flipflop-order-service|flipflop-service"'
ssh alfares 'kubectl exec -n statex-apps deploy/payments-microservice -- sh -lc '\''for k in PAYU_CLIENT_ID PAYU_CLIENT_SECRET PAYU_MERCHANT_POS_ID PAYPAL_CLIENT_ID PAYPAL_CLIENT_SECRET STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET GPWEBPAY_MERCHANT_ID GPWEBPAY_PRIVATE_KEY_PATH GPWEBPAY_PUBLIC_KEY_PATH PAYMENT_API_KEY WEBPAY_APPLICATION_ID WEBPAY_DESCRIPTION; do eval v=\${$k:-}; if [ -n "$v" ]; then echo "$k=present"; else echo "$k=missing"; fi; done'\'''
ssh alfares 'kubectl exec -n statex-apps deploy/flipflop-order-service -- sh -lc '\''for k in PAYMENT_SERVICE_URL PAYMENT_API_KEY PAYMENT_WEBHOOK_API_KEY API_GATEWAY_URL; do eval v=\${$k:-}; if [ -n "$v" ]; then echo "$k=present"; else echo "$k=missing"; fi; done'\'''
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service/shared && cp -r ../prisma ./prisma || true && npx prisma generate --schema=./prisma/schema.prisma && npm run build'
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service/services/order-service && npm run build'
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service/services/api-gateway && npm run build'
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service && ./scripts/deploy.sh'
ssh alfares 'for d in flipflop-service flipflop-frontend flipflop-product-service flipflop-cart-service flipflop-order-service flipflop-user-service; do kubectl rollout status deployment/$d -n statex-apps --timeout=20s; done'
curl -I -H 'Cache-Control: no-cache' https://flipflop.alfares.cz/
curl -s -i -H 'Cache-Control: no-cache' 'https://flipflop.alfares.cz/api/products?limit=1'
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service && node /tmp/flipflop-goal02-stripe-probe.js'
ssh alfares 'cd /home/ssf/Documents/Github/flipflop-service && node scripts/smoke-checkout.js'
```

## Results

- Payments health: PASS, HTTP 200, `{"success":true,"status":"ok",...}`.
- Workloads: PASS, `payments-microservice`, `flipflop-order-service`, and
  `flipflop-service` deployments/pods are running.
- FlipFlop order service payment wiring: PASS, `PAYMENT_SERVICE_URL`,
  `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_API_KEY`, and `API_GATEWAY_URL` present.
- Payments service API key: PASS, `PAYMENT_API_KEY` present.

Provider readiness:

| Provider | Current status | Evidence | Next step |
| --- | --- | --- | --- |
| Stripe | partial | `STRIPE_SECRET_KEY=present`, `STRIPE_WEBHOOK_SECRET=missing`. After the payment-client fix, Stripe initiation returned a Stripe Checkout URL for order `ORD-1781251272730-035`; payment remains pending. | Configure/verify Stripe webhook secret and provider callback path, then validate order paid state, stock deduction, and notification. |
| PayU | blocked | `PAYU_CLIENT_ID=missing`, `PAYU_CLIENT_SECRET=missing`, `PAYU_MERCHANT_POS_ID=missing`. | Provide/configure PayU credentials, then run initiation and provider callback checks. |
| PayPal | blocked | `PAYPAL_CLIENT_ID=missing`, `PAYPAL_CLIENT_SECRET=missing`. | Provide/configure PayPal credentials, then run initiation and provider callback checks. |
| GP WebPay | blocked | `GPWEBPAY_MERCHANT_ID`, key paths, application id, and description config checked in pod are missing. | Provide/configure GP WebPay merchant/key settings and FlipFlop description, then run WebPay initiation check. |

## Implementation Evidence

Issue found:

- A GOAL-02 Stripe initiation probe created FlipFlop order
  `ORD-1781250178248-227` with `paymentMethod=stripe`, but the returned redirect
  URL was a GP WebPay URL.
- The FlipFlop order row had `paymentMethod=stripe`, proving the method reached
  order persistence.
- The payments database showed new payment rows repeatedly created for stale
  order `ORD-1781247834044-480` with `paymentMethod=webpay`.

Root cause:

- `shared/payments/payment.service.ts` created the opossum circuit breaker with
  the static name `payment-service`.
- `CircuitBreakerService.create()` returns an existing breaker for the same
  name, so later calls reused the first request closure and replayed stale
  payment payloads.

Fix:

- Updated `shared/payments/payment.service.ts` to use request-scoped breaker
  names for payment create/status/refund:
  - `payment-service:create:<orderId>:<paymentMethod>`;
  - `payment-service:status:<paymentId>`;
  - `payment-service:refund:<paymentId>`.

Validation after deploy:

- Docker-equivalent shared build passed after Prisma generation.
- `services/order-service` build passed.
- `services/api-gateway` build passed.
- Deployment built and pushed all images, applied manifests, and was completed
  manually after the deploy script hit a transient Kubernetes restart timing
  error.
- All FlipFlop deployments rolled out successfully.
- Homepage returned HTTP 200.
- `/api/products?limit=1` returned HTTP 200.
- Stripe initiation probe produced:

```json
{
  "ok": true,
  "provider": "stripe",
  "orderId": "46f47758-1894-417c-9969-a8079d211709",
  "orderNumber": "ORD-1781251272730-035",
  "paymentStatus": "pending",
  "redirectUrlPresent": true,
  "redirectUrlPrefix": "https://checkout.stripe.com/c/pay/cs_live_a11PVUXfu87rn1zJfYA6fieuP6SQrmiQZnQmWL"
}
```

- Payments database confirmed the matching row:
  - `orderId=ORD-1781251272730-035`;
  - `paymentMethod=stripe`;
  - `status=processing`;
  - `redirectUrl` starts with `https://checkout.stripe.com/`.
- General checkout smoke passed after deploy with pending order
  `ORD-1781251291563-388` and a payment redirect present.

## Intent Compliance Report

- Original intent preserved: payment-provider readiness is being validated and
  a real provider-routing bug was fixed after GOAL-01 proved production
  storefront and checkout initiation.
- Constraints respected: no fake payment success, no direct paid-state mutation,
  no credential values printed, no price/order-total changes.
- Non-goals respected: no checkout UX redesign, no provider replacement, no
  credential rotation.
- Owner-approved bypass: on 2026-06-12, the owner explicitly deferred the
  remaining provider credential/webhook completion until after the whole
  project is implemented and said they will add it manually once FlipFlop is
  available.
- Remaining blockers: PayU, PayPal, and GP WebPay missing production
  credentials/configuration; Stripe webhook verification missing webhook secret.
- Next step: proceed to GOAL-03 catalog, stock, and storefront quality. Payment
  provider completion remains a manual follow-up and must not be silently marked
  verified.
