# FlipFlop Production Readiness Goal

## Objective

Make FlipFlop production-ready on AlphaRes so `https://flipflop.alfares.cz/` serves the storefront, shows sellable products from the catalog and warehouse ecosystem, supports authenticated shopping with the test user, and passes deployment smoke checks.

## Current Findings

- The public root currently returns `404 Cannot GET /` because ingress sends `/` to the API gateway instead of a Next.js storefront.
- The deployed API gateway points at stale Docker-era DNS names such as `product-service`, `cart-service`, `order-service`, `user-service`, and `warehouse-service`.
- Kubernetes currently exposes shared services named `catalog-microservice`, `warehouse-microservice`, `orders-microservice`, `auth-microservice`, and `notifications-microservice`.
- `catalog-microservice` is running, but `catalog_db` has no product schema; `GET /api/products` fails with `relation "products" does not exist`.
- No `products`, `categories`, or `product_variants` tables were found in any Postgres database checked on the cluster.
- Test authentication works with `test@example.com` using the password from `auth-microservice/.env`.

## Implementation Plan

1. Deploy the runtime topology the app expects:
   - API gateway deployment behind `/api`.
   - Next.js frontend deployment behind `/`.
   - Internal FlipFlop adapter services for product, cart, order, and user flows.

2. Fix service discovery:
   - Point gateway routes to `flipflop-product-service`, `flipflop-cart-service`, `flipflop-order-service`, and `flipflop-user-service`.
   - Point product/commerce adapters to `catalog-microservice:3200`, `warehouse-microservice:3201`, `orders-microservice:3203`, `auth-microservice:3370`, and `notifications-microservice:3368`.

3. Restore product data:
   - Add/apply catalog and warehouse schema migrations.
   - Seed default categories, test products, a default warehouse, and stock rows.
   - Verify `/api/products` returns products with price, images, and stock.

4. Validate authenticated shopping:
   - Login with the test user.
   - Add product to cart.
   - Checkout creates an order.
   - Stock reservation succeeds.
   - Payment sandbox/webhook updates the order.
   - Notification path is triggered.

5. Add production verification:
   - Deploy script builds/pushes all required images.
   - Rollouts wait for all deployments.
   - Smoke test covers homepage, product API, login, cart, checkout, and stock.
   - Monitoring alerts cover empty catalog, catalog 500s, checkout failures, and stock reservation failures.

## First Milestone

Make the deployed topology coherent: frontend served at `/`, API gateway served at `/api`, product API routed to the internal product adapter, and manifests/deploy script ready to build and roll out the required containers.
