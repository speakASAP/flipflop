# System: flipflop-service

## Architecture

NestJS + PostgreSQL + Redis + Next.js frontend. Deployed on Kubernetes (`statex-apps` namespace).

- Backend services: api-gateway, product-service, order-service, cart-service, user-service, warehouse-service
- Frontend: Next.js SSR + Tailwind
- AI: product descriptions, SEO via ai-microservice

## External Integrations

| Service | URL | Usage |
|---------|-----|-------|
| auth-microservice | https://auth.alfares.cz | User auth / JWT |
| notifications-microservice | https://notifications.alfares.cz | Order emails |
| logging-microservice | https://logging.alfares.cz | Centralized logs |
| payments-microservice | https://payments.alfares.cz | PayU, PayPal, Stripe, GP WebPay |
| catalog-microservice | https://catalog.alfares.cz | Product data |
| warehouse-microservice | https://warehouse.alfares.cz | Stock |
| orders-microservice | https://orders.alfares.cz | Order processing; ecosystem owner for product pricing |
| ai-microservice | https://ai.alfares.cz | AI tasks (cheap tier) |

## Current State

FlipFlop development is now coordinated through the intent preservation and goal workflow in:

- `docs/INTENT_MEMORY.md`
- `docs/IMPLEMENTATION_ORCHESTRATOR.md`
- `docs/IMPLEMENTATION_STATE.md`
- `implementation-goals/README.md`

The current active implementation stream is production readiness and checkout revenue enablement. The orchestrator must preserve the original human intent from raw request through goal, plan, task, execution, validation, and report.

## Ops

```bash
kubectl get pods -n statex-apps -l app=flipflop
./scripts/orch-status.sh
./scripts/orch-trigger-cycle.sh flipflop-v1
```

## Purpose
A Czech e-commerce platform with AI-driven product management, pricing, and marketing, delivered through NestJS services and a Next.js storefront.

## Responsibilities
Provide the behavior and runtime described by the tracked project documentation.

## Non-Responsibilities
Do not add integrations, persistence, or product scope not declared by repository sources.

## Inputs
Inputs are the browser, runtime, and configuration inputs described in existing project sources.

## Outputs
Outputs are the user-visible or operational results described in existing project sources.

## Dependencies
Kubernetes runtime at flipflop.alfares.cz with declared auth, PostgreSQL, Redis, catalog, warehouse, orders, payments, notifications, logging, and AI integrations.

## Upstream Traceability
The approved business baseline and vision define this system’s intent.

## Downstream Artifacts
The integration contract and bootstrap chain record planning evidence.

## Validation Criteria
Run the IPS planning validator and applicable existing project checks.

## Open Questions
No new open question is asserted by this documentation-only adoption.
Status: reviewed
completeness_level: complete
