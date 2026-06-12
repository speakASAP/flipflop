# FlipFlop Core Entities

```yaml
id: FF-CORE-ENTITIES
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../03_domain_model/GLOSSARY.md
downstream:
  - ../04_systems/SYS-001-commerce-platform.md
related_adrs: []
```

## Entities

- Product: sellable catalog item with image, category, price, SEO metadata, and stock state.
- Cart: authenticated customer shopping state.
- Order: purchase record whose totals and status require validated evidence.
- Payment: provider-specific initiation, status, webhook, refund, or failure event.
- Stock: warehouse-backed availability and reservation state.
- AI draft: generated content that remains unpublished until reviewed.
- Implementation goal: bounded delivery unit with plan, context, prompt, validation, and state update.

