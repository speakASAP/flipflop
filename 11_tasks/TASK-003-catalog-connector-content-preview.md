# TASK-003: Catalog Connector Content Preview

```yaml
id: TASK-003
status: validated
owner: project owner
created: 2026-06-30
last_updated: 2026-06-30
completeness_level: complete
upstream:
  - ../10_features/FEAT-001-intent-preserved-revenue-readiness.md
  - ../01_vision/VISION.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-003-catalog-connector-content-preview.md
execution_plan:
  - ../21_execution_plans/EP-TASK-003-catalog-connector-content-preview.md
```

## Objective

Expose Catalog canonical content connector previews inside the FlipFlop admin product-service flow so operators can inspect the `flipflop` marketplace preview for Catalog-backed products without publishing content, mutating product data, or repairing the Allegro live route.

## Upstream Links

- `00_constitution/CONSTITUTION.md`
- `01_vision/VISION.md`
- `02_business_case/BUSINESS_CASE.md`
- `10_features/FEAT-001-intent-preserved-revenue-readiness.md`
- `17_governance/PROJECT_INVARIANTS.md`
- `docs/process/PROJECT_INVARIANTS.md`
- `SPEC.md` Module 1 Products and Catalogue
- Owner request on 2026-06-30 for Catalog canonical content connector previews.

## Goal Impact

This task strengthens the shared Catalog integration by letting FlipFlop admins read the canonical content preview that Catalog already generates for marketplace key `flipflop`. It preserves the storefront and checkout ownership boundaries because the preview is read-only and does not move order, cart, checkout, pricing, or storefront publication ownership to Catalog.

## Project Invariant Impact

Applies all invariants in `17_governance/PROJECT_INVARIANTS.md`. The task especially protects shared ecosystem service usage, no unapproved price or order mutation, no fake AI content publication, and sensitive-data redaction.

## Sensitive-Data Classification

Classification: low. Product titles, descriptions, content blocks, warnings, and source hashes are operational product-content metadata. The implementation must not print tokens, secret values, raw customer data, or private production records in docs or validation output.

## Contract/Schema Impact

Adds one FlipFlop product-service read-only admin endpoint that delegates to the existing Catalog contract:

```text
GET api/products/:productId/catalog-content-preview
```

The endpoint calls Catalog:

```text
GET api/products/:productId/content-previews/flipflop
```

Expected Catalog response shape:

```text
{ success, data: { marketplace, label, format, product, content: { title, plainText, html?, blocks?, sections? }, source: { canonicalDocumentVersion, legacyDescriptionFallback, sourceHash, generatedAt }, overridesApplied, warnings } }
```

No Prisma migration, schema mutation, supplier deployment wiring, Allegro route repair, order/cart checkout change, or Kubernetes/secret change is in scope.

## Replay/Determinism Impact

The FlipFlop endpoint is read-only and deterministic for a fixed Catalog product, marketplace key, and Catalog canonical content version. It must not cache mutable state or trigger content generation, publication, stock sync, order creation, or checkout side effects.

## Scope

- Add a Catalog client method for canonical content previews.
- Add a protected read-only product-service endpoint under the existing products gateway path.
- Add frontend admin API typing for the preview response.
- Update one admin product sync/import flow to show the FlipFlop connector preview for Catalog products without calling the Allegro API route.
- Update IPS artifacts, validation report, and implementation state.

## Non-Goals

- No supplier-service deployment wiring.
- No Allegro API live route repair or smoke dependency.
- No order, cart, checkout, payment, refund, cancellation, price, discount, or stock mutation.
- No Prisma migration.
- No Kubernetes, secret, or deployment change.
- No storefront ownership transfer to Catalog and no customer-visible publication change.

## Acceptance Criteria

- [x] Product-service exposes a protected read-only admin endpoint for Catalog `flipflop` content previews.
- [x] The endpoint returns Catalog preview data without mutating FlipFlop or Catalog data.
- [x] The admin frontend can list Catalog-backed products and show a selected product preview title, plain text, source metadata, overrides, and warnings.
- [x] The admin frontend does not call the Allegro API route for this preview lane.
- [x] IPS pre-coding and strict documentation gates pass before source edits or a blocker is recorded.
- [x] `git diff --check`, product-service build, and frontend build pass or blockers are recorded.

## Required Context

- `shared/clients/catalog-client.service.ts`
- `services/product-service/src/products/products.controller.ts`
- `services/product-service/src/products/products.service.ts`
- `services/frontend/lib/api/admin.ts`
- `services/frontend/app/admin/sync/page.tsx`
- `services/api-gateway/src/gateway/gateway.controller.ts`
- `docs/IMPLEMENTATION_STATE.md`
- `docs/orchestrator/VALIDATION_DEBT.md`

## Validation Task

Run pre-coding/doc gates before code edits, then run whitespace diff validation plus the affected product-service and frontend builds. Do not deploy.

## Required Gates

- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `git diff --check`
- `cd services/product-service && npm run build`
- `cd services/frontend && npm run build`

## Execution Plan Requirement

This task must not be converted into coding work until `21_execution_plans/EP-TASK-003-catalog-connector-content-preview.md` exists and records scope, forbidden files, validation, rollback, and parallel ownership.
