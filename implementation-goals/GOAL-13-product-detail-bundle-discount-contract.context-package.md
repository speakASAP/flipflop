# Context Package: GOAL-13 Product Detail Bundle Discount Contract

```yaml
id: CP-GOAL-13-PRODUCT-DETAIL-BUNDLE-DISCOUNT-CONTRACT
status: active
created: 2026-07-02
owner: original Codex integration thread
```

## Intent Bundle

```json
{
  "goal": {
    "title": "Product Detail Bundle Discount Contract",
    "intent": "Apply product-detail buy-together savings only through a server-validated checkout/order/payment total contract.",
    "success_criteria": [
      "Order-service validates bundle eligibility server-side.",
      "Browser savings are never trusted as payable totals.",
      "Payment amount equals persisted discounted order total.",
      "Guest and authenticated checkout paths keep working.",
      "Warehouse stock authority remains in the existing reservation path."
    ],
    "constraints": [
      "Do not run real paid order/payment mutations without approval.",
      "Do not mutate production data manually.",
      "Do not change provider webhook trust boundaries.",
      "Do not mention 5% in customer-facing UI."
    ],
    "non_goals": [
      "No schema migration.",
      "No payment provider implementation change.",
      "No Catalog bundle aggregate.",
      "No Warehouse reservation contract redesign."
    ]
  },
  "why_this_task_exists": "GOAL-12 displays bundle savings and adds bundle items to cart, but checkout/order/payment totals still need a real server-side discount contract.",
  "upstream_traceability": [
    "docs/00_constitution/CONSTITUTION.md",
    "docs/01_vision/VISION.md",
    "docs/02_business_case/BUSINESS_CASE.md",
    "docs/INTENT_MEMORY.md",
    "implementation-goals/GOAL-12-product-detail-upsell-recommendations.md",
    "implementation-goals/GOAL-13-ecosystem-related-products-order-affinity-plan.md"
  ],
  "approved_execution_plan_ref": "implementation-goals/GOAL-13-product-detail-bundle-discount-contract.execution-plan.md",
  "context_package_ref": "implementation-goals/GOAL-13-product-detail-bundle-discount-contract.context-package.md",
  "coding_prompt_ref": "implementation-goals/GOAL-13-product-detail-bundle-discount-contract.coding-prompt.md",
  "relevant_decisions": [
    "Order-service is the payable total authority for this goal.",
    "Frontend carries product identifiers only, not authoritative discount amounts.",
    "Bundle and discount-code stacking is deferred."
  ],
  "acceptance_criteria": [
    "Raw client discount is rejected.",
    "Bundle intent is validated against server-side eligible products.",
    "Applied discount metadata is persisted on the order.",
    "Payment amount equals discounted order total."
  ],
  "validation_criteria": [
    "IPS gates pass.",
    "New verifier passes.",
    "Order-service build passes.",
    "Frontend build passes.",
    "No real payment mutation is run."
  ],
  "project_memory": {
    "current_state": "GOAL-12 deployed display-only bundle savings; remote worktree has unrelated dirty central Orders/payment work.",
    "important_files": [
      "services/order-service/src/orders/orders.service.ts",
      "services/frontend/app/checkout/page.tsx",
      "services/frontend/components/AddBundleToCartButton.tsx",
      "services/frontend/lib/guest-cart.ts",
      "services/frontend/lib/api/orders.ts",
      "services/product-service/src/products/products.service.ts"
    ],
    "known_risks": [
      "Existing product-service fallback may include deterministic cross-category products.",
      "Existing authenticated checkout frontend uses guest-order creation; preserve this behavior unless safely improving cart loading.",
      "Existing order-service dirty diff must not be reverted."
    ]
  }
}
```
