# Intent Memory

## Problem

FlipFlop already has `GOALS.md`, `PLAN.md`, `SPEC.md`, and a production-readiness note, but intent is spread across those files. Without a standalone intent layer, an agent can complete a task formally while losing why the work exists, what must not be broken, and which owner constraints are already decided.

FlipFlop must make intent the primary memory layer for implementation work.

## Source Material

This initial intent memory is distilled from:

- `GOALS.md` in `flipflop-service`;
- `PLAN.md` in `flipflop-service`;
- `SPEC.md` in `flipflop-service`;
- `BUSINESS.md` in `flipflop-service`;
- `docs/PRODUCTION_READINESS_GOAL.md` in `flipflop-service`;
- the docs-rag-microservice service snapshot under `docs/services/flipflop-service/`;
- Goalkeeper's orchestration pattern for intent memory, goals, plans, operational gates, and completion reports.

## Original Human Intent

```text
Make FlipFlop production-ready on AlphaRes, serve the storefront at https://flipflop.alfares.cz/, show sellable products from catalog and warehouse data, support authenticated shopping, and reach first revenue by making checkout functional with PayU, PayPal, GP WebPay, and Stripe.
```

## Current Distilled Intent

Build FlipFlop as a production e-commerce platform coordinated by implementation goals. The first active stream is production readiness and checkout revenue:

- serve a real storefront at `/`;
- expose APIs behind `/api`;
- route services to the shared ecosystem services used in Kubernetes;
- restore product, catalog, stock, cart, order, checkout, payment, and notification paths;
- verify all payment providers end-to-end before declaring revenue readiness;
- preserve owner constraints and business safety rules during every change.

## Constraints

- Free or cheap model tiers only unless the owner approves premium model usage.
- No pricing changes without human validation.
- No order total, discount, refund, or cancellation mutation without human approval or verified provider/system evidence.
- Payment status changes must come from verified provider webhooks or documented sandbox/manual verification.
- GP WebPay `DESCRIPTION` must be derived from `applicationId`; it must not be hardcoded to another business.
- `speakasap-portal` Django WebPay code must remain live until the shared payments-microservice migration is verified end-to-end.
- Czech consumer law constraints, including the 14-day return window, must remain intact.
- Max 500k LLM units/month across agents unless the owner changes the budget.
- Documentation, prompts, reports, and user-facing implementation notes must be in English.

## Non-Goals

- No dashboard-first rebuild.
- No fake checkout success that bypasses real payment or webhook state.
- No replacement of shared ecosystem services with isolated FlipFlop-only copies unless a goal explicitly approves it.
- No migration away from existing NestJS, Next.js, PostgreSQL, Redis, Kubernetes, and Vault/ESO deployment foundations as part of the current stream.
- No uncontrolled scope growth beyond the active implementation goal.

## Success Criteria

- `https://flipflop.alfares.cz/` serves the storefront instead of `404 Cannot GET /`.
- Product listing returns sellable products with price, image, category, and stock state.
- Test user authentication works through auth-microservice.
- User can add an item to cart and start checkout.
- PayU, PayPal, GP WebPay, and Stripe each complete initiation, confirmation, order paid state, stock update, and confirmation email.
- Deployment smoke checks cover homepage, product API, login, cart, checkout, and stock.
- Each implementation goal has an execution plan, validation notes, and an Intent Compliance Report.

## What To Store For Each Goal

- raw user message or source request;
- normalized intent;
- constraints;
- success criteria;
- non-goals;
- assumptions;
- clarifying questions and answers;
- human approvals;
- plan versions;
- rejected options;
- task outputs;
- validation evidence;
- final retrospective.

## Intent Bundle For Agents

Every worker task must receive an intent bundle. For coding tasks, this bundle is part of the execution contract and must be stored in the goal's context package or execution plan.

```json
{
  "goal": {
    "title": "Make FlipFlop production-ready",
    "intent": "Serve a production storefront and complete checkout-to-first-revenue safely",
    "success_criteria": [],
    "constraints": [],
    "non_goals": []
  },
  "why_this_task_exists": "...",
  "upstream_traceability": [],
  "goal_impact_refs": [],
  "approved_execution_plan_ref": "...",
  "context_package_ref": "...",
  "coding_prompt_ref": "...",
  "relevant_decisions": [],
  "acceptance_criteria": [],
  "validation_criteria": [],
  "project_memory": {
    "current_state": "...",
    "important_files": [],
    "known_risks": []
  }
}
```

If any coding-task field above is missing or contains unresolved `[MISSING: ...]` markers for scope, approval, constraints, data handling, contract/schema impact, replay/determinism, gates, or validation, the orchestrator must create a blocker instead of starting implementation.

## Corrections

When the owner corrects intent, the system must:

1. Add an append-only correction entry to this file or the active goal report.
2. Update the distilled intent.
3. Mark impacted plans, tasks, context packages, coding prompts, and validation assumptions stale.
4. Replan before continuing implementation if the correction affects scope, safety, contracts, data, or deployment.

## Decision Log

Every approval must become a decision record:

- who approved;
- what was approved;
- what context was shown;
- when;
- optional comment.

This is more important than storing only final statuses.

## Current Decisions

| Date | Decision | Source |
| --- | --- | --- |
| 2026-06-12 | FlipFlop development must be done by goals and use an orchestrator-style workflow similar to Goalkeeper. | Owner request in Codex thread |
| 2026-06-12 | Docs-rag-microservice is the ecosystem knowledge source to consult before broad file reads when available. | docs-rag-microservice `AGENTS.md` and owner request |
| 2026-06-12 | The initial active goal is production readiness and checkout revenue enablement. | `GOALS.md`, `PLAN.md`, `docs/PRODUCTION_READINESS_GOAL.md` |
