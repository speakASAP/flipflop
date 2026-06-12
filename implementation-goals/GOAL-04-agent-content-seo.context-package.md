# GOAL 04 Context Package: Agent Content And SEO

## Read First

- `implementation-goals/GOAL-04-agent-content-seo.md`
- `implementation-goals/GOAL-04-agent-content-seo.execution-plan.md`
- `docs/INTENT_MEMORY.md`
- `docs/process/PROJECT_INVARIANTS.md`
- `docs/process/AGENT_GAP_FILLING_RULES.md`
- `implementation-goals/GOAL-03-catalog-stock-storefront.validation-report.md`

## Current Production Facts

- Live storefront and product API are deployed at `https://flipflop.alfares.cz/`.
- `/api/products?limit=20` returns six sellable products with catalog category,
  price, image, and warehouse stock.
- Product detail pages already render product name, description, price, image,
  category, and stock.
- GOAL-02 provider/webhook completion is owner-bypassed until after the whole
  project is implemented.

## Constraints To Preserve

- Do not mutate prices, stock, orders, refunds, cancellations, or payment state.
- Do not publish generated content without explicit review state.
- Do not invent product facts. Generated drafts must be based on catalog facts
  already present in the product record or approved source fields.
- Do not use paid AI services unless an approved low-cost/free model path is
  already configured or the owner approves it.

## Evidence Needed

- Which products are considered priority and why.
- Where AI draft content is stored.
- How human review status is represented.
- How the storefront decides whether SEO metadata is publishable.
- Build/test output for touched services.
- Live rendered metadata check for at least one reviewed/published product.
