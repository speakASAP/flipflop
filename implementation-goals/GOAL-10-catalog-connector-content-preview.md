# GOAL 10: Catalog Connector Content Preview

## Outcome

Expose Catalog canonical content connector previews to FlipFlop admins through a read-only product-service/admin flow for marketplace key `flipflop`.

## Dependencies

- `GOAL-03-catalog-stock-storefront` done.
- Catalog contract `GET /api/products/:productId/content-previews/:marketplace` available.

## Acceptance Criteria

- Admins can inspect Catalog preview title, plain text, optional HTML/blocks/sections, source metadata, overrides, and warnings for Catalog products.
- Product-service endpoint remains protected and read-only.
- Admin flow avoids the currently failing `/api/allegro` live route.
- No checkout, cart, order, payment, pricing, stock, Prisma migration, Kubernetes, secret, or deploy changes are made.

## Constraints

- Marketplace key is fixed to `flipflop` for this lane.
- Do not move storefront or checkout ownership to Catalog.
- Do not publish or mutate product content.
- Do not deploy.
