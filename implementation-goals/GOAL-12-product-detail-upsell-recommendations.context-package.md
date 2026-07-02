# Context Package: GOAL-12 Product Detail Upsell Recommendations

```yaml
id: CP-GOAL-12-PRODUCT-DETAIL-UPSELL-RECOMMENDATIONS
status: active
created: 2026-07-02
```

## Intent Bundle

```json
{
  "goal": {
    "title": "Product detail upsell recommendations",
    "intent": "Show deterministic related products and a buy-together set below product detail pages to increase basket value without AI or unsafe checkout mutation.",
    "success_criteria": [
      "Related products render below product detail.",
      "A buy-together set renders even without purchase history.",
      "History-based co-purchases are preferred when present.",
      "Savings are shown in CZK, not percent text.",
      "No AI, payment, checkout total, stock, or order-state mutation."
    ],
    "constraints": [
      "Preserve checkout-to-first-revenue intent.",
      "Do not mutate product prices, discounts, order totals, refunds, cancellations, or payment state without validated server contract.",
      "Use shared Catalog/Warehouse sellability through existing product APIs.",
      "Do not expose customer/order PII."
    ],
    "non_goals": [
      "No AI recommendation model.",
      "No real checkout discount implementation in this increment.",
      "No schema migration unless later proven necessary."
    ]
  },
  "why_this_task_exists": "Owner requested Amazon-style related products and buy-together sets under product detail pages.",
  "upstream_traceability": [
    "00_constitution/CONSTITUTION.md",
    "01_vision/VISION.md",
    "02_business_case/BUSINESS_CASE.md",
    "docs/INTENT_MEMORY.md",
    "docs/process/PROJECT_INVARIANTS.md"
  ],
  "approved_execution_plan_ref": "implementation-goals/GOAL-12-product-detail-upsell-recommendations.execution-plan.md",
  "context_package_ref": "implementation-goals/GOAL-12-product-detail-upsell-recommendations.context-package.md",
  "coding_prompt_ref": "implementation-goals/GOAL-12-product-detail-upsell-recommendations.coding-prompt.md",
  "acceptance_criteria": [
    "GET /products/:id/recommendations returns relatedProducts and bundle.",
    "Product page renders the sections below the current product detail.",
    "Bundle CTA adds product set using existing cart behavior.",
    "Source verifier checks no percent copy and no checkout total mutation."
  ],
  "validation_criteria": [
    "IPS gates pass or blockers are recorded.",
    "Product-service build passes.",
    "Frontend build passes.",
    "Verifier passes."
  ],
  "project_memory": {
    "current_state": "Repository has unrelated dirty changes; do not revert them.",
    "important_files": [
      "services/frontend/app/products/[id]/page.tsx",
      "services/frontend/lib/api/products.ts",
      "services/product-service/src/products/products.controller.ts",
      "services/product-service/src/products/products.service.ts",
      "prisma/schema.prisma"
    ],
    "known_risks": [
      "Actual bundle discount in checkout requires follow-up server-side discount contract.",
      "Legal delivery document thresholds differ from owner-requested 1000 Kč upsell threshold."
    ]
  }
}
```
