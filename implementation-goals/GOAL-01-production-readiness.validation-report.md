# GOAL 01 Validation Report: Production Readiness

## Status

Done on 2026-06-12.

GOAL-01 is closed with the accepted validation evidence below. No production
code change was required in this session.

## Validation Evidence

| Check | Command | Result |
| --- | --- | --- |
| Homepage | `curl -I -H 'Cache-Control: no-cache' https://flipflop.alfares.cz/` | PASS: HTTP 200, served by Next.js. |
| Homepage content | `curl -s -H 'Cache-Control: no-cache' https://flipflop.alfares.cz/` | PASS: storefront HTML rendered with featured products. |
| API base path | `curl -s -i -H 'Cache-Control: no-cache' https://flipflop.alfares.cz/api` | WARN: gateway reachable, but bare `/api` returns expected Nest 404 JSON because no index route exists. |
| Product API | `curl -s -i -H 'Cache-Control: no-cache' https://flipflop.alfares.cz/api/products` | PASS: HTTP 200, six products returned with price, image, category, and warehouse stock. |
| Kubernetes services | `kubectl get svc -n statex-apps \| grep -E "flipflop\|catalog\|warehouse\|orders\|auth\|notifications\|payments"` | PASS: FlipFlop frontend/gateway/product/cart/order/user services and shared auth/catalog/warehouse/orders/payments/notifications services exist. |
| Kubernetes workloads | `kubectl get deploy,pod -n statex-apps \| grep -E "flipflop\|catalog\|warehouse\|orders\|auth\|payments\|notifications"` | PASS: all relevant deployments were `1/1`; all relevant pods were running. |
| Auth/cart/checkout smoke | `node scripts/smoke-checkout.js` on `alfares` in `/home/ssf/Documents/Github/flipflop-service` | PASS: login succeeded, six products found, one cart item added, order `ORD-1781249507919-759` created with `paymentStatus: pending`, and payment redirect URL was present. |

Smoke output summary:

```json
{
  "ok": true,
  "userId": "e2a6fdd4-659a-4aee-916d-038ae745790b",
  "productCount": 6,
  "cartItemId": "dfea99b9-e3a8-421d-b5e4-9a3d3416fdca",
  "cartTotal": 249,
  "orderId": "0d358383-4072-4f0b-a7d2-119220d046a7",
  "orderNumber": "ORD-1781249507919-759",
  "paymentStatus": "pending",
  "redirectUrlPresent": true
}
```

Notes:

- The smoke script uses the configured test user and reads the test password
  from the auth service environment; no secret was copied into this report.
- The smoke script mirrors current product API values into FlipFlop's local
  database so cart/order foreign keys exist. It did not invent prices or assert
  payment success.
- `./scripts/deploy.sh` was not run because no code or manifest change was
  needed for this validation checkpoint.

## Intent Compliance Report

Original intent preserved:

- Storefront availability was verified at `https://flipflop.alfares.cz/`.
- API routing was verified through `/api/products`.
- Sellable products were verified with price, image, category, and warehouse
  stock data.
- Authenticated shopping was verified through login, cart add, and checkout
  initiation.

Relevant constraints respected:

- No payment success was faked; the smoke ended at provider redirect creation
  with the order still `paymentStatus: pending`.
- No order cancellation, refund, or paid-state mutation was performed.
- No unrelated dirty files were reverted or overwritten.
- Provider end-to-end payment certification remains outside GOAL-01 and belongs
  to GOAL-02.

Residual risks and follow-up:

- Bare `/api` returns 404. This does not block routed API checks, but adding a
  small `/api` index or health response would make the acceptance criterion
  less ambiguous.
- Checkout payment completion still depends on provider-specific GOAL-02
  validation and available credentials.

## Next Required Action

Proceed to GOAL-02 checkout payment-provider validation:

```text
FLIPFLOP ORCHESTRATOR: continue implementation
```
