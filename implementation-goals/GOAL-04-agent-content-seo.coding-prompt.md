# GOAL 04 Coding Prompt: Agent Content And SEO

You are implementing `GOAL-04-agent-content-seo` for `flipflop-service`.

## Objective

Build an approval-first AI content and SEO workflow for priority products.
Generated content may be drafted, but it must not publish product facts,
pricing, stock, shipping, warranty, or compliance claims that are not present in
approved catalog data.

## Required Context

Read:

```text
implementation-goals/GOAL-04-agent-content-seo.md
implementation-goals/GOAL-04-agent-content-seo.execution-plan.md
implementation-goals/GOAL-04-agent-content-seo.context-package.md
docs/INTENT_MEMORY.md
docs/process/PROJECT_INVARIANTS.md
docs/process/AGENT_GAP_FILLING_RULES.md
```

## Implementation Rules

- Inspect existing schema, admin product UI, product APIs, and frontend metadata
  before editing.
- Prefer existing services and database patterns over introducing a new content
  subsystem.
- Use a free/cheap local or existing configured generation path unless owner
  approval is present for paid API usage.
- Store draft content with a review status before publication.
- Render SEO metadata only from reviewed/published content or approved product
  facts.
- Do not alter checkout, payment providers, order state, prices, stock, refunds,
  or cancellations.

## Validation

- Run focused builds/tests for touched services.
- Verify priority products have draft content and review status.
- Verify at least one product detail page renders SEO metadata from approved
  content or approved fallback facts.
- Update `implementation-goals/GOAL-04-agent-content-seo.validation-report.md`
  and `docs/IMPLEMENTATION_STATE.md`.
