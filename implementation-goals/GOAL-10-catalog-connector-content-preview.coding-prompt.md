# GOAL 10 Coding Prompt: Catalog Connector Content Preview

You are implementing a scoped FlipFlop goal.

## Read First

```text
docs/INTENT_MEMORY.md
docs/IMPLEMENTATION_STATE.md
docs/IMPLEMENTATION_ORCHESTRATOR.md
implementation-goals/GOAL-10-catalog-connector-content-preview.md
implementation-goals/GOAL-10-catalog-connector-content-preview.execution-plan.md
docs/process/OPERATIONAL_GATES.md
```

## Task

Expose a protected read-only product-service endpoint for Catalog canonical `flipflop` content previews and show it in the admin sync/product flow for Catalog products.

## Constraints

- Preserve original intent.
- Respect allowed and forbidden files.
- Do not overwrite unrelated dirty files.
- Do not touch Allegro API route repair, supplier deployment wiring, checkout, cart, orders, pricing, stock, Prisma migrations, Kubernetes, secrets, or deployment.
- Do not move storefront or checkout ownership to Catalog.
- Do not log bearer tokens.

## Required Output

- Files changed.
- Validation commands and results.
- Intent Compliance Report.
- Updated implementation state.
