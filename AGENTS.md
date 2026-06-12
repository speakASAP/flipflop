# Agents: flipflop-service

## One-Command Continuation

When the user says:

```text
FLIPFLOP ORCHESTRATOR: continue implementation
```

or:

```text
Continue implementation of flipflop-service.
```

act as the flipflop implementation orchestrator.

Do not ask the user which goal is next. Determine the next action from:

```text
docs/IMPLEMENTATION_STATE.md
docs/IMPLEMENTATION_ORCHESTRATOR.md
implementation-goals/README.md
```

Then continue from the latest checkpoint.

## Required Reading

Before implementation, branch orchestration, or launching workers, read:

```text
README.md
BUSINESS.md
SYSTEM.md
SPEC.md
GOALS.md
PLAN.md
docs/INTENT_MEMORY.md
docs/IMPLEMENTATION_STATE.md
docs/IMPLEMENTATION_ORCHESTRATOR.md
docs/process/PROJECT_INVARIANTS.md
docs/process/DOCUMENTATION_COMPLETENESS_STANDARD.md
docs/process/OPERATIONAL_GATES.md
docs/process/AGENT_GAP_FILLING_RULES.md
implementation-goals/README.md
```

For a specific goal, also read the matching file in `implementation-goals/` and its companion artifacts.

If docs-rag-microservice is available, query it before broad repository reads:

```text
POST http://docs-rag-microservice.statex-apps.svc.cluster.local:3397/retrieval/agent-context
{"query":"flipflop-service <topic>","maxTokens":3000,"repoName":"flipflop-service"}
```

## Core Intent

```text
Make FlipFlop production-ready and revenue-capable.
Serve the storefront at https://flipflop.alfares.cz/.
Preserve the original checkout-to-first-revenue intent through goals, plans, tasks, execution, validation, and reports.
Use shared ecosystem services for auth, catalog, warehouse, orders, payments, notifications, logging, and AI.
Never mutate prices, discounts, order totals, order cancellation, or customer-facing payment state without explicit human approval or verified provider webhook evidence.
Development must proceed by implementation goals, with an orchestrator selecting the next valid goal and reporting the next step.
```

## Orchestrator Duties

1. Read `docs/IMPLEMENTATION_STATE.md`.
2. Identify the active goal, next ready goal, or blocked checkpoint.
3. Run only the next valid goal according to `implementation-goals/README.md`.
4. Keep goal edits scoped to the allowed files in the selected goal.
5. Update `docs/IMPLEMENTATION_STATE.md` after every implementation session.
6. Require an Intent Compliance Report before marking a goal complete.
7. Run or document validation before moving to the next goal.
8. For coding work, create or update an execution plan before editing code.
9. Run the narrowest relevant gate from `docs/process/OPERATIONAL_GATES.md`.
10. After each goal is complete, commit goal changes and verify a clean working tree before starting the next goal.

## User Checkpoints

The user should only need to review:

- goal completion reports;
- running app URLs or screenshots when available;
- validation summaries;
- merge conflict decisions if any;
- MVP boundary or intent deviations;
- production deployment approval.

Ask the user only when a decision cannot be safely inferred from the docs and current repository state.

## Coordinator Config

```yaml
model_tier: cheap
cycle_interval_minutes: 60
max_tasks_per_cycle: 15
```

## Worker Pool Config

```yaml
max_concurrent_workers: 5
default_model_tier: free
allowed_mcp_servers: [filesystem, postgres, playwright]
```

## Typical Task Types

- write_product_description
- generate_seo_meta
- analyze_competitor_prices
- write_email_campaign

## Active Agents
<!-- Coordinator-maintained -->
