# BPCP Holiday Discount Adoption

Status: service-local adoption contract
Date: 2026-07-02
Service: `flipflop`
Central contract pack: `statex-ecosystem/docs/business-process-control-plane/`

## Role

Customer-facing storefront and checkout consumer for BPCP slots and discount display.

## Responsibilities

- Render product badge, cart banner, cart discount line, and upsell block when backed by BPCP/pricing decisions.
- Avoid frontend monetary authority.
- Preserve current checkout/order integration work.

## Required interfaces

- Experience slot API.
- Pricing/cart quote result.
- Order snapshot display if customer cabinet shows order detail.

## Boundaries

- This service must not become the global owner of BPCP process definitions.
- This service must fail closed on invalid or unknown BPCP process versions.
- This service must keep existing domain ownership and invariants.
- This service must expose or document dry-run behavior before live execution.
- This service must not overwrite existing service contracts without an
  explicit integration owner and validation owner.

## Holiday Discount pilot expectations

- Recognize `holiday-discount-2026` only through versioned BPCP contracts.
- Preserve `processId`, `processVersion`, and `policyId` in every relevant
  decision, event, snapshot, log, or rendered experience.
- Support rollback by respecting BPCP pause and retired states.
- Keep process display and process execution separate where applicable.

## Blockers and unknowns

- [MISSING: final cart/checkout owner]
- [MISSING: current dirty checkout files must be reconciled before implementation]

## Validation evidence required before implementation is accepted

- Desktop/mobile UI smoke for badge, cart message, upsell.
- No frontend-only discount calculation.
- Existing checkout verification remains green.

## Parallel handoff

This adoption doc is safe for a focused service owner to implement in parallel
after the central BPCP schemas are accepted. The service owner must not edit
shared BPCP schemas directly; schema changes go through the BPCP integration
owner.
