# W4a FlipFlop Proactive Consumer Foundation

## Intent Preservation Chain

Vision -> FlipFlop must not keep selling products after Catalog or Warehouse declares them unavailable.

Goal Impact -> Local FlipFlop offers converge proactively, while W1 request-time gates remain the fail-closed runtime protection.

System -> FlipFlop product-service imports the shared RabbitMQ module. Warehouse stock events already flow through `shared/rabbitmq/stock-events.subscriber.ts`; Catalog product events now have a matching subscriber foundation in `shared/rabbitmq/catalog-events.subscriber.ts`.

Feature -> Proactive local offer disablement for:
- `stock.out`
- `stock.updated` with `available=0`
- `catalog.product.archived.v1`
- `catalog.product.deleted.v1`
- `catalog.product.sellability_changed.v1` when `afterSellable=false` or equivalent payload fields are false

Task -> Disable local products linked by `catalogProductId`, preserve idempotent audit attempts, skip stale events when event timestamps are older than local product `updatedAt`, and avoid blind publication for sellable Catalog events.

Execution Plan -> Extend existing Warehouse stock consumer, add Catalog event consumer, wire it into `RabbitMQModule`, document env knobs, and validate with a focused no-RabbitMQ/no-DB script.

Coding Prompt -> W4a worker scope: remote-only edits in FlipFlop, no deploy, no secrets or production DB mutation, leave unrelated dirty files untouched.

Code -> Changed files:
- `shared/rabbitmq/stock-events.subscriber.ts`
- `shared/rabbitmq/catalog-events.subscriber.ts`
- `shared/rabbitmq/rabbitmq.module.ts`
- `shared/index.ts`
- `.env.example`
- `scripts/verify-flipflop-proactive-consumers.js`
- `docs/orchestrator/W4A_FLIPFLOP_PROACTIVE_CONSUMERS.md`

Validation -> Expected commands:
- `node scripts/verify-flipflop-proactive-consumers.js`
- `node scripts/verify-flipflop-offer-gate.js`
- `npm --prefix shared run build`
- `npm --prefix services/product-service run build`
- `git diff --check`

## Runtime Blockers

- `[MISSING: confirmed Catalog producer exchange/routing key contract]` FlipFlop defaults to `catalog.events` and queue `catalog.flipflop-service`, with overrides via `FLIPFLOP_CATALOG_EVENTS_EXCHANGE` and `FLIPFLOP_CATALOG_EVENTS_QUEUE`. The producer contract was not discoverable inside the FlipFlop repo.
- `[MISSING: safe FlipFlop catalog-event refresh policy]` Sellable Catalog upsert/update/category events are acknowledged and audited without local publication or refresh until the authoritative field policy is defined.

## Non-Goals

- No Catalog, Warehouse, Orders, Payments, frontend, or external marketplace deletion calls.
- No deployment and no production database mutation.
