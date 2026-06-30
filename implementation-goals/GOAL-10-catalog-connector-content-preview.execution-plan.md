# GOAL 10 Execution Plan: Catalog Connector Content Preview

## Intent Bundle

```json
{
  "goal": {
    "title": "Catalog Connector Content Preview",
    "intent": "Let FlipFlop admins inspect Catalog canonical connector previews without changing storefront, checkout, pricing, order, stock, or publication ownership.",
    "success_criteria": [
      "protected read-only product-service preview endpoint exists",
      "endpoint calls Catalog content preview contract with marketplace flipflop",
      "admin sync/product flow shows preview content and source metadata",
      "forbidden routes and ownership boundaries remain untouched"
    ],
    "constraints": [
      "do not touch Allegro API route repair",
      "do not modify supplier-service deployment wiring",
      "do not modify checkout, cart, orders, pricing, stock, Prisma migrations, Kubernetes, secrets, or deploy",
      "do not move storefront or checkout ownership to Catalog",
      "do not publish or mutate product content"
    ],
    "non_goals": [
      "Allegro live route repair",
      "storefront rendering migration",
      "content publication workflow",
      "deployment"
    ]
  },
  "why_this_task_exists": "Catalog now exposes canonical content connector previews. FlipFlop needs an admin inspection surface for the flipflop connector while preserving its existing service boundaries and avoiding the failing Allegro route.",
  "upstream_traceability": [
    "00_constitution/CONSTITUTION.md",
    "01_vision/VISION.md",
    "02_business_case/BUSINESS_CASE.md",
    "10_features/FEAT-001-intent-preserved-revenue-readiness.md",
    "11_tasks/TASK-003-catalog-connector-content-preview.md",
    "22_goal_impact/GOAL-IMPACT-TASK-003-catalog-connector-content-preview.md"
  ],
  "approved_execution_plan_ref": "implementation-goals/GOAL-10-catalog-connector-content-preview.execution-plan.md",
  "context_package_ref": "implementation-goals/GOAL-10-catalog-connector-content-preview.context-package.md",
  "coding_prompt_ref": "implementation-goals/GOAL-10-catalog-connector-content-preview.coding-prompt.md",
  "relevant_decisions": [
    "Use shared ecosystem Catalog service as the source of canonical preview data",
    "Keep this lane read-only and no-deploy",
    "Avoid Allegro API live route repair"
  ],
  "acceptance_criteria": [
    "Admin can request the flipflop preview for a Catalog product",
    "Preview response includes content, source, overrides, and warnings",
    "No forbidden files are changed",
    "Required validation commands pass or blockers are recorded"
  ],
  "validation_criteria": [
    "IPS gates pass before source edits",
    "git diff --check passes",
    "product-service build passes",
    "frontend build passes"
  ],
  "project_memory": {
    "current_state": "GOAL-03 catalog storefront is done; current admin sync page still depends on Allegro-facing helpers.",
    "important_files": [
      "shared/clients/catalog-client.service.ts",
      "services/product-service/src/products/products.controller.ts",
      "services/product-service/src/products/products.service.ts",
      "services/frontend/lib/api/admin.ts",
      "services/frontend/app/admin/sync/page.tsx"
    ],
    "known_risks": [
      "Catalog endpoint is protected and requires forwarding authorization",
      "The existing Allegro route is out of scope and must not become a validation dependency",
      "Frontend build may surface unrelated Next.js or TypeScript debt and must be separated from current-task failures"
    ]
  }
}
```

## Steps

1. Create TASK-003 IPS chain artifacts.
2. Run IPS gates.
3. Add Catalog client content preview method.
4. Add product-service read-only protected endpoint.
5. Add frontend admin API type/method.
6. Update admin sync page to list Catalog products and display selected preview.
7. Run validation commands.
8. Update validation reports and implementation state.

## Current Checkpoint

GOAL-10 implemented and validated on 2026-06-30. Deployment was intentionally not run.
