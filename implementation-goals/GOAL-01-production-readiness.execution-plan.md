# GOAL 01 Execution Plan: Production Readiness

## Intent Bundle

```json
{
  "goal": {
    "title": "Production Readiness",
    "intent": "Make FlipFlop serve a usable storefront and smokeable checkout path on production infrastructure",
    "success_criteria": [
      "homepage served at /",
      "API gateway reachable at /api",
      "product API returns sellable products",
      "auth, cart, checkout, stock paths smoke-testable"
    ],
    "constraints": [
      "no price changes without human validation",
      "no fake payment success",
      "do not overwrite unrelated dirty files"
    ],
    "non_goals": [
      "full payment-provider certification",
      "AI SEO generation",
      "second-business onboarding"
    ]
  },
  "why_this_task_exists": "The deployed site previously returned 404 at / and checkout-to-first-revenue cannot be validated until topology, storefront, product, auth, cart, and checkout paths are coherent.",
  "upstream_traceability": [
    "GOALS.md",
    "PLAN.md",
    "docs/PRODUCTION_READINESS_GOAL.md",
    "docs/INTENT_MEMORY.md"
  ],
  "approved_execution_plan_ref": "implementation-goals/GOAL-01-production-readiness.execution-plan.md",
  "context_package_ref": "implementation-goals/GOAL-01-production-readiness.context-package.md",
  "coding_prompt_ref": "implementation-goals/GOAL-01-production-readiness.coding-prompt.md",
  "acceptance_criteria": [
    "Public root does not return 404",
    "API routes through /api",
    "Product API returns products with stock",
    "Cart and checkout initiation are smoke-testable"
  ],
  "validation_criteria": [
    "build/test commands relevant to touched services",
    "production curl checks",
    "deployment smoke script"
  ]
}
```

## Steps

1. Recheck remote git status and preserve unrelated dirty files.
2. Recheck production root, `/api`, health endpoints, product API, and Kubernetes service names.
3. Compare current manifests and deploy script with expected topology from `docs/PRODUCTION_READINESS_GOAL.md`.
4. Patch the smallest routing/deployment/config gap first.
5. Run narrow validation for touched code.
6. Deploy only with owner approval or when the active workflow already authorizes deployment.
7. Record evidence in the validation report.
8. Update `docs/IMPLEMENTATION_STATE.md`.

## Current Checkpoint

Production evidence gathered on 2026-06-12.

Current findings:

- `https://flipflop.alfares.cz/` returns HTTP 200 and serves the Next.js
  storefront.
- `/api/products` returns HTTP 200 with six sellable products, prices, images,
  categories, and warehouse stock.
- Bare `/api` reaches the gateway but returns Nest 404 JSON because no API index
  route exists.
- Kubernetes has running FlipFlop frontend/gateway/product/cart/order/user
  services and shared auth/catalog/warehouse/orders/payments/notifications
  services.
- `node scripts/smoke-checkout.js` passed: test login, cart add, and checkout
  initiation produced pending order `ORD-1781249507919-759` with a payment
  redirect URL.

No production code change was made in this validation session. The next
decision is whether to accept routed API validation as sufficient for GOAL-01 or
add a minimal `/api` index/health route before marking the goal done.
