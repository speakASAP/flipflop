# GOAL 03 Context Package: Catalog, Stock, And Storefront Quality

## Important Files

- `implementation-goals/GOAL-03-catalog-stock-storefront.md`
- `implementation-goals/GOAL-03-catalog-stock-storefront.execution-plan.md`
- `services/frontend/app/page.tsx`
- `services/frontend/app/products/page.tsx`
- `services/frontend/app/products/[id]/page.tsx`
- `services/frontend/app/cart/page.tsx`
- `services/product-service/src/products/products.service.ts`
- `services/product-service/src/products/warehouse.service.ts`
- `services/cart-service/src/cart/cart.service.ts`
- `shared/clients/warehouse-client.service.ts`

## Current Evidence

- GOAL-01 is done.
- GOAL-02 remaining provider credential/webhook completion is owner-bypassed.
- `/api/products?limit=1` returns HTTP 200 in production.
- GOAL-01 smoke showed six sellable products with warehouse stock.
- Authenticated cart add worked in prior checkout smoke.

## Safety Rules

- Do not mutate prices.
- Do not hardcode production catalog or stock data.
- Do not hide catalog/warehouse failures as successful stock state.
- Do not overwrite unrelated dirty work, especially current frontend product
  detail changes in the remote repository.
- Do not mark payment-provider work complete.

## Required Evidence

- Product list response and UI behavior.
- Product detail response and UI behavior.
- Category/filtering behavior.
- Cart add with an in-stock product.
- Stock unavailable or catalog/warehouse failure behavior.
- Any operational alert/log/report path for empty catalog or stock failures.
