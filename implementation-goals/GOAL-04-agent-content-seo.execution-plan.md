# GOAL 04 Execution Plan: Agent Content And SEO

## Intent Bundle

```json
{
  "goal": {
    "title": "Agent Content And SEO",
    "intent": "Generate and render reviewable AI product content and SEO metadata without inventing commercial facts",
    "success_criteria": [
      "top priority products have draft AI content",
      "human review status is recorded before publication",
      "SEO metadata renders in the storefront",
      "generated content uses approved product facts and does not invent pricing or stock"
    ],
    "constraints": [
      "free or cheap model tier unless owner approves otherwise",
      "AI content must not publish price changes",
      "do not publish generated content without review state",
      "do not alter checkout, payment, order, refund, cancellation, price, or stock state"
    ],
    "non_goals": [
      "payment provider credential setup",
      "pricing automation",
      "supplier onboarding",
      "full marketing campaign automation"
    ]
  },
  "why_this_task_exists": "GOAL-03 proved the live catalog and stock storefront. The next launch-quality step is richer product content and SEO metadata, but it must remain approval-first so generated copy cannot invent facts or silently publish risky commercial claims.",
  "upstream_traceability": [
    "GOALS.md",
    "PLAN.md",
    "SPEC.md Module 4",
    "docs/INTENT_MEMORY.md",
    "implementation-goals/GOAL-04-agent-content-seo.md",
    "implementation-goals/GOAL-03-catalog-stock-storefront.validation-report.md"
  ],
  "approved_execution_plan_ref": "implementation-goals/GOAL-04-agent-content-seo.execution-plan.md",
  "context_package_ref": "implementation-goals/GOAL-04-agent-content-seo.context-package.md",
  "coding_prompt_ref": "implementation-goals/GOAL-04-agent-content-seo.coding-prompt.md",
  "relevant_decisions": [
    "GOAL-02 payment credential/webhook completion remains owner-bypassed manual follow-up",
    "GOAL-03 catalog and stock storefront is done"
  ],
  "acceptance_criteria": [
    "Top priority products have draft AI content",
    "Human review status is recorded before publication",
    "SEO metadata renders in the storefront",
    "Generated content uses approved product facts and does not invent pricing or stock"
  ],
  "validation_criteria": [
    "inspect existing product/content/SEO data model and admin surfaces",
    "generate or seed draft content only from approved product facts",
    "verify review status before storefront publication",
    "verify product detail metadata renders generated SEO fields",
    "run narrow builds/tests for touched services"
  ],
  "project_memory": {
    "current_state": "GOAL-03 is deployed. Product list/detail/category and warehouse-backed cart stock paths pass production checks.",
    "important_files": [
      "services/frontend/app/products/[id]/page.tsx",
      "services/frontend/app/admin/products/[id]/page.tsx",
      "services/frontend/app/admin/products/page.tsx",
      "services/product-service/src/products/products.service.ts",
      "services/product-service/src/marketing",
      "prisma/schema.prisma"
    ],
    "known_risks": [
      "Existing remote dirty files may contain unrelated work",
      "Generated copy must not invent price, stock, shipping, warranty, safety, or compliance claims",
      "Paid AI API usage requires owner approval unless an existing approved cheap/free path is present"
    ]
  }
}
```

## Steps

1. Preserve GOAL-02 bypass and GOAL-03 completion state.
2. Inspect current schema, product APIs, frontend metadata, and admin content
   surfaces.
3. Identify priority products from live catalog data.
4. Define or reuse a draft/review/publish status model for generated content.
5. Implement the smallest approval-first workflow that stores drafts without
   silently publishing them.
6. Render reviewed SEO metadata on product detail pages.
7. Run narrow builds/tests and live metadata checks.
8. Update GOAL-04 validation report and implementation state.

## Current Checkpoint

GOAL-04 started on 2026-06-12 after GOAL-03 was closed.

SEO pass-through and metadata rendering are deployed. AI draft generation is
implemented but blocked by missing `AI_SERVICE_TOKEN`.
