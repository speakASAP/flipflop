# GOAL 01 Context Package: Production Readiness

## Important Files

- `docs/INTENT_MEMORY.md`
- `docs/PRODUCTION_READINESS_GOAL.md`
- `k8s/ingress.yaml`
- `k8s/deployment.yaml`
- `k8s/service.yaml`
- `scripts/deploy.sh`
- `services/api-gateway/`
- `services/product-service/`
- `services/cart-service/`
- `services/order-service/`
- `frontend/`

## Known Findings From Existing Docs

- Public root previously returned `404 Cannot GET /`.
- Ingress previously sent `/` to the API gateway instead of a Next.js storefront.
- Some deployed routes pointed at stale Docker-era DNS names.
- Current Kubernetes shared services include `catalog-microservice`, `warehouse-microservice`, `orders-microservice`, `auth-microservice`, and `notifications-microservice`.
- Catalog schema and seed data state must be rechecked before implementation.

## Risks

- Existing dirty files may contain in-progress checkout work.
- Provider credentials may block payment-provider end-to-end checks.
- Product data may be absent even if routing is correct.
- Deployment changes can affect production traffic.

## Required Evidence

- production root response;
- API route response;
- product API response;
- auth test result;
- cart/checkout smoke result;
- Kubernetes rollout status if deployed.
