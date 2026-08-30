# flipflop-service

Czech e-commerce platform (https://flipflop.alfares.cz) — AI-driven product management, pricing, and marketing.

## Stack

NestJS (backend) · Next.js SSR + Tailwind (frontend) · PostgreSQL · Redis  
Deployed: Kubernetes `statex-apps` namespace  
Secrets: Vault `secret/prod/flipflop` (injected via ESO)

## Services

| Service | Responsibility |
|---------|---------------|
| api-gateway | Entry point, JWT auth, routing |
| product-service | Product catalog |
| order-service | Orders, pricing |
| cart-service | Shopping cart |
| user-service | User management |
| warehouse-service | Stock management |
| frontend | Next.js SSR |

## External services

See `SYSTEM.md` → External Integrations table.

Email delivery for platform notifications routes through `notifications-microservice` with AWS SES as the active sender identity path.

## Quick ops

```bash
./scripts/deploy.sh
kubectl get pods -n statex-apps -l app=flipflop
```

## Docs

| File | Purpose |
|------|---------|
| `SYSTEM.md` | Architecture + integrations |
| `PLAN.md` | Active tasks |
| `SPEC.md` | Technical specification |
| `docs/INTENT_MEMORY.md` | Preserved original intent, constraints, corrections, and decision-memory contract |
| `docs/IMPLEMENTATION_ORCHESTRATOR.md` | Goal-driven orchestration workflow for agents |
| `docs/IMPLEMENTATION_STATE.md` | Current goal checkpoint and next orchestrator step |
| `implementation-goals/README.md` | Ordered goal backlog and goal execution rules |
| `docs/ENV_VARIABLES.md` | Env var reference (secrets in Vault) |
| `docs/SMART_DEPLOYMENT.md` | Deploy commands |

## Status
Status: documented; existing repository status is retained in this file.

## Documentation Authority
Git-tracked project documents and runtime manifests are authoritative.

## Capabilities
A Czech e-commerce platform with AI-driven product management, pricing, and marketing, delivered through NestJS services and a Next.js storefront.

## Interfaces
Kubernetes runtime at flipflop.alfares.cz with declared auth, PostgreSQL, Redis, catalog, warehouse, orders, payments, notifications, logging, and AI integrations.

## Development
Use the repository’s existing development commands and inspect its source before changing behavior.

## Configuration
Configuration is defined by the tracked environment examples and deployment manifests where present.

## Deployment
Deployment is defined by this repository’s tracked runtime configuration.

## Health and Observability
Use the declared runtime probe and ecosystem logging and monitoring paths.
