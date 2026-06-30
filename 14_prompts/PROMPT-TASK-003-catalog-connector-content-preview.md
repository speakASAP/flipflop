# PROMPT-TASK-003: Catalog Connector Content Preview

```yaml
id: PROMPT-TASK-003
status: approved
owner: project owner
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: planned
upstream:
  - ../13_context_packages/CP-TASK-003-catalog-connector-content-preview.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Role

You are the worker agent for the bounded FlipFlop Catalog connector content preview lane, with the original thread acting as integration and validation owner.

## Task

Add a read-only admin preview path that lets FlipFlop admins inspect Catalog canonical content previews for Catalog-backed products using marketplace key `flipflop`.

## Context

Catalog contract now exists:

```text
GET api/products/:productId/content-previews/:marketplace
```

with response data containing `marketplace`, `label`, `format`, `product`, `content`, `source`, `overridesApplied`, and `warnings`. The FlipFlop endpoint must expose this through product-service under the existing products gateway path.

## Constraints

- Allowed source files: `shared/clients/catalog-client.service.ts`, `services/product-service/src/products/products.controller.ts`, `services/product-service/src/products/products.service.ts`, `services/frontend/lib/api/admin.ts`, and `services/frontend/app/admin/sync/page.tsx`.
- Necessary IPS docs may be updated.
- Forbidden: supplier-service deployment wiring, Allegro API route repair, order/cart checkout, Prisma migrations, Kubernetes, secrets, and deploy.
- Do not move storefront or checkout ownership to Catalog.
- Do not log bearer tokens or secret values.
- Preserve other agents' changes.

## Acceptance criteria

- Product-service exposes protected `GET /products/:id/catalog-content-preview`.
- The service calls Catalog GET api/products/:productId/content-previews/flipflop.
- The frontend admin sync/product flow lists Catalog products and shows the selected preview details.
- The frontend page does not call the Allegro API route for this lane.
- Required validation commands pass or blockers are documented.

## Validation

Run:

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
git diff --check
cd services/product-service && npm run build
cd services/frontend && npm run build
```

Do not deploy.
