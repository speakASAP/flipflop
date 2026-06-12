# GOAL 03 Coding Prompt: Catalog, Stock, And Storefront Quality

You are implementing `GOAL-03-catalog-stock-storefront` for `flipflop-service`.

## Read First

```text
docs/INTENT_MEMORY.md
docs/IMPLEMENTATION_STATE.md
docs/IMPLEMENTATION_ORCHESTRATOR.md
docs/process/PROJECT_INVARIANTS.md
docs/process/OPERATIONAL_GATES.md
implementation-goals/GOAL-03-catalog-stock-storefront.md
implementation-goals/GOAL-03-catalog-stock-storefront.execution-plan.md
implementation-goals/GOAL-03-catalog-stock-storefront.context-package.md
implementation-goals/GOAL-03-catalog-stock-storefront.validation-report.md
```

## Task

Make the product browsing and stock-aware storefront experience production-ready:

- product list;
- product detail;
- category/filtering;
- price/image/category/stock display;
- cart add stock validation;
- operational visibility for empty catalog and stock failures.

## Constraints

- Do not mutate product prices.
- Do not hardcode production product or stock data.
- Do not bypass catalog-microservice or warehouse-microservice.
- Do not overwrite unrelated dirty files.
- Do not complete payment-provider work that the owner explicitly deferred.

## Required Output

- Files changed.
- Validation commands and results.
- Intent Compliance Report.
- Updated implementation state.
