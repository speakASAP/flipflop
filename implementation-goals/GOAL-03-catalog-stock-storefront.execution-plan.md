# GOAL 03 Execution Plan: Catalog, Stock, And Storefront Quality

## Intent Bundle

```json
{
  "goal": {
    "title": "Catalog, Stock, And Storefront Quality",
    "intent": "Make FlipFlop's product browsing and stock-aware storefront experience production-ready",
    "success_criteria": [
      "product list has sellable products",
      "product detail pages render price, image, category, and stock status",
      "cart stock checks use warehouse state",
      "empty catalog and stock failures surface operational alerts"
    ],
    "constraints": [
      "no automated price mutation without human validation",
      "do not bypass catalog or warehouse services with hardcoded production data",
      "do not overwrite unrelated dirty files",
      "do not change payment-provider completion state"
    ],
    "non_goals": [
      "payment provider credential setup",
      "AI SEO generation",
      "new supplier onboarding",
      "pricing automation"
    ]
  },
  "why_this_task_exists": "GOAL-01 proved the deployed topology and GOAL-02 payment-provider completion was owner-bypassed. The next risk to launch quality is whether customers can reliably browse products, see correct stock, and add stock-valid items to cart.",
  "upstream_traceability": [
    "GOALS.md",
    "PLAN.md",
    "SPEC.md Module 1",
    "SPEC.md Module 2",
    "SPEC.md Module 6",
    "docs/INTENT_MEMORY.md",
    "implementation-goals/GOAL-03-catalog-stock-storefront.md"
  ],
  "approved_execution_plan_ref": "implementation-goals/GOAL-03-catalog-stock-storefront.execution-plan.md",
  "context_package_ref": "implementation-goals/GOAL-03-catalog-stock-storefront.context-package.md",
  "coding_prompt_ref": "implementation-goals/GOAL-03-catalog-stock-storefront.coding-prompt.md",
  "relevant_decisions": [
    "GOAL-02 payment credential/webhook completion is owner-bypassed until after project implementation"
  ],
  "acceptance_criteria": [
    "Product list has sellable products",
    "Product detail pages render price, image, category, and stock status",
    "Cart stock checks use warehouse state",
    "Empty catalog and stock failures surface operational alerts"
  ],
  "validation_criteria": [
    "production product list and category checks",
    "production product detail check",
    "authenticated cart add stock check",
    "catalog/warehouse failure behavior review",
    "narrow build/test for touched services"
  ],
  "project_memory": {
    "current_state": "Production product API currently returns six products with warehouse stock. Frontend and services are deployed and healthy.",
    "important_files": [
      "services/frontend/app/page.tsx",
      "services/frontend/app/products/page.tsx",
      "services/frontend/app/products/[id]/page.tsx",
      "services/frontend/app/cart/page.tsx",
      "services/product-service/src/products/products.service.ts",
      "services/product-service/src/products/warehouse.service.ts",
      "services/cart-service/src/cart/cart.service.ts",
      "services/order-service/src/orders/orders.service.ts"
    ],
    "known_risks": [
      "Existing remote dirty files may contain unrelated work",
      "Frontend product detail page already has unrelated dirty changes",
      "Catalog or warehouse outages must not be hidden as successful product/stock state"
    ]
  }
}
```

## Steps

1. Preserve the owner-approved GOAL-02 bypass decision.
2. Validate live product list, category filtering, and product detail pages.
3. Validate authenticated cart add uses stock-aware data and fails safely when
   stock is unavailable.
4. Inspect product-service/catalog/warehouse adapters for fallback behavior.
5. Patch the smallest storefront/catalog/stock gap first.
6. Run the narrowest relevant build/test.
7. Deploy only when code or production config changes require it.
8. Update GOAL-03 validation report and implementation state.

## Current Checkpoint

GOAL-03 started on 2026-06-12. Initial validation still needs to run.
