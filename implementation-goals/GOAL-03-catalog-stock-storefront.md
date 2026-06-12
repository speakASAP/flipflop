# GOAL 03: Catalog, Stock, And Storefront Quality

## Outcome

Make the storefront product experience production-ready with catalog data, categories, images, pricing display, and stock state aligned with shared catalog and warehouse services.

## Dependencies

- `GOAL-01-production-readiness` done.

## Acceptance Criteria

- Product list has sellable products.
- Product detail pages render price, image, category, and stock status.
- Cart stock checks use warehouse state.
- Empty catalog and stock failures surface operational alerts.

## Constraints

- No automated price mutation without human validation.
- Do not bypass catalog or warehouse services with hardcoded production data.
