# Project Invariants

These invariants protect the original FlipFlop intent. Goals may refine implementation details, but they must not violate these rules without explicit owner approval.

## Business Invariants

- FlipFlop is a Czech e-commerce storefront at `https://flipflop.alfares.cz/`.
- The primary near-term business goal is checkout-to-first-revenue.
- Product pricing, discounts, order totals, cancellations, and refunds require human validation or verified provider/system evidence.
- Czech consumer-law behavior, including the 14-day return window, must remain intact.

## Technical Invariants

- The platform uses NestJS services, Next.js SSR frontend, PostgreSQL, Redis, Kubernetes, Vault, and External Secrets Operator.
- Shared ecosystem services are preferred over isolated duplicate service implementations.
- Payment processing routes through payments-microservice.
- Authentication routes through auth-microservice.
- Product/catalog data should align with catalog-microservice and warehouse-microservice.
- Order processing should align with orders-microservice while current in-repo order-service code remains the local implementation boundary.

## Storefront UX Invariants

- Product search must be dynamic: changing the query field updates matching products during typing without a dedicated submit/search button.
- Do not add customer-facing buttons labeled or behaving as search/find actions (`Hledat`, `Search`, `Find`, `Najít`, or equivalent). If a list needs query matching, wire the input to update results directly.
- Storefront product filters belong in the top navigation/menu area near category navigation, not in a large page-body panel, so the product grid keeps priority as the selling surface.

## Agent Invariants

- Work proceeds by implementation goals.
- Each coding goal needs intent, allowed changes, forbidden changes, acceptance criteria, and validation.
- Agents must not overwrite unrelated dirty changes.
- Agents must not bypass payment, stock, auth, or order validation to create a false success.
- Agents must update implementation state after each session.
