# GOAL 06 Validation Report: Orders Hub Integration

## Status

Implemented, validated, deployed, and post-deploy checked on 2026-06-13.
Deployment completed for all FlipFlop workloads. A full checkout smoke did not
reach order creation because `POST /cart/items` returned 404 through the
gateway, so live central Orders forwarding still needs a follow-up synthetic
order exercise after that cart/gateway blocker is resolved.

## Commands

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
npm run verify:orders-hub-integration
cd services/order-service && npm run build
git diff --check
rg -n "(Bearer [A-Za-z0-9_./+=:-]{12,}|client_secret|private_key|apiKey|cardNumber|cardToken|providerPayload|providerResponse)" shared/clients/order-client.service.ts services/order-service/src/orders/orders.service.ts scripts/verify-orders-hub-integration.js implementation-goals/GOAL-06-orders-hub-integration* docs/IMPLEMENTATION_STATE.md
./scripts/deploy.sh
npm run verify:orders-hub-integration
curl -fsSI https://flipflop.alfares.cz/
curl -fsS 'https://flipflop.alfares.cz/api/products?limit=1'
node scripts/smoke-checkout.js
```

## Results

- IPS pre-coding gate: PASS; report written to `reports/validation/ips-pre-coding-gate.json`.
- Strict documentation audit: PASS; score 100/100.
- Orders Hub integration verifier: PASS; contract version, `ORDERS_SERVICE_URL`, stable idempotency fields, nested totals/payment/shipping payload, bounded address forwarding, no central customer-note forwarding, and idempotency-conflict surfacing all passed.
- Kubernetes config alias: PASS; `k8s/configmap.yaml` now exposes `ORDERS_SERVICE_URL=http://orders-microservice:3203` and the client remains compatible with the existing `ORDERS_MICROSERVICE_URL`.
- Order-service build: PASS.
- Whitespace diff check: PASS after removing Markdown trailing spaces.
- Sensitive/provider-term scan: reviewed. Matches were only the verifier's forbidden-term list, not forwarded payload fields or secret values.
- Deployment: PASS after delayed rollout completion. `./scripts/deploy.sh`
  built and pushed all FlipFlop images, applied manifests, configured the
  ConfigMap and ExternalSecret, and triggered restarts for
  `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`,
  `flipflop-cart-service`, `flipflop-order-service`, and
  `flipflop-user-service`. The script's rollout wait initially timed out
  while pods were still pulling from the local registry, but the current
  replacement pods later reached 1/1 ready for all six deployments.
- Deployed image evidence: order-service image digest
  `sha256:73eea3fc4e5bd2e8365d65f7706aee1342a0fca4c581672ca7e25987ae0c8275`.
- Post-deploy verifier: PASS; `npm run verify:orders-hub-integration` passed
  against the deployed source state.
- Public runtime checks: PASS; homepage returned HTTP 200 and the public
  product API returned product data.
- Runtime wiring: PASS; deployed order-service has
  `ORDERS_SERVICE_URL=http://orders-microservice:3203`,
  `ORDERS_MICROSERVICE_URL=http://orders-microservice:3203`, and local
  `ORDER_SERVICE_URL=http://flipflop-order-service:3003`.
- Workload health: PARTIAL; all service health endpoints returned HTTP 200,
  but bodies reported `degraded` due a logging dependency error.
  `logging-microservice` itself returned healthy.
- Checkout smoke: BLOCKED before central Orders forwarding. The smoke script
  failed on `POST /cart/items` with a gateway 404, before local order creation
  and before any central Orders create request could be exercised.

## Intent Compliance Report

- Original intent preserved: FlipFlop remains the owner-approved storefront application feeding central Orders from the server-side order-service.
- Shared-service boundary preserved: Orders receives bounded sales-channel order snapshots; Payments remains payment identity/reconciliation owner; Warehouse remains stock truth; Catalog remains product truth.
- Idempotency contract preserved: FlipFlop sends `orders.create.v1`, `channel=flipflop`, stable `channelAccountId`, and stable `externalOrderId=order.orderNumber`.
- Runtime wiring clarified: the central Orders client no longer uses local `ORDER_SERVICE_URL`; it uses `ORDERS_SERVICE_URL`, then existing `ORDERS_MICROSERVICE_URL`, then `ORDER_HUB_SERVICE_URL`, then the in-cluster central Orders default.
- Payment safety preserved: no provider credential, provider webhook, payment capture, refund, cancellation, price, discount, or order-total behavior was changed.
- Sensitive-data boundary preserved: central forwarding now uses bounded customer/address fields and does not forward raw local delivery-address records, customer notes, raw provider payloads, card data, tokens, or secrets.
- Remaining blockers: live central Orders forwarding has not been proven by
  checkout smoke because cart item creation currently returns gateway 404;
  PayU, PayPal, GP WebPay, and Stripe webhook/provider follow-up risks remain
  as previously recorded.
- Next step: fix or bypass the checkout smoke cart/gateway 404, then run a
  live synthetic order path that confirms central Orders receives the bounded
  FlipFlop order payload.
