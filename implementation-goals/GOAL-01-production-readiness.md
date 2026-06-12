# GOAL 01: Production Readiness

## User Command

```text
FLIPFLOP ORCHESTRATOR: implement goal number 1
```

## Outcome

Make the deployed FlipFlop topology coherent enough for real storefront and checkout validation:

- frontend served at `/`;
- API gateway served at `/api`;
- service discovery points to current Kubernetes service names;
- product API returns sellable products;
- auth, cart, order, stock, payment initiation, and notification paths are smoke-testable.

## Source Intent

This goal preserves the original checkout-to-first-revenue intent from `GOALS.md` and the production readiness findings from `docs/PRODUCTION_READINESS_GOAL.md`.

## Dependencies

None.

## Allowed Changes

- Deployment manifests and deploy scripts.
- API gateway routing configuration.
- Frontend deployment and ingress configuration.
- Service discovery configuration.
- Product/catalog/warehouse adapter code needed for smokeable storefront flow.
- Smoke tests and operational docs.

## Forbidden Changes

- Do not change product prices without human validation.
- Do not cancel, refund, or mutate real orders without approval.
- Do not fake payment success.
- Do not remove existing payment provider paths.
- Do not delete or revert unrelated dirty work.

## Acceptance Criteria

- Public root does not return `404 Cannot GET /`.
- `/api` routes to the API gateway.
- Product API returns products with price, image, and stock state.
- Test user authentication works.
- Cart add and checkout initiation can be tested.
- Deployment smoke script covers homepage, product API, login, cart, checkout, and stock checks where credentials/data allow.
- Validation report records exact commands and results.

## Validation Commands

```bash
npm run build
npm test
./scripts/deploy.sh
curl -I -H 'Cache-Control: no-cache' https://flipflop.alfares.cz/
```

Use narrower service-level validation first when touching only one service.

## Final Report

Include:

- topology fixes made;
- validation evidence;
- remaining blockers;
- Intent Compliance Report;
- next recommended goal or command.
