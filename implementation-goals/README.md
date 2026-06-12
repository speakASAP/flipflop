# FlipFlop Implementation Goals

Development for `flipflop-service` proceeds through these goals. The orchestrator chooses the next valid goal from this file and `docs/IMPLEMENTATION_STATE.md`.

## Goal Lifecycle

```text
backlog -> ready -> active -> validating -> done
                    \-> blocked
```

Before coding, each goal must have:

- goal file;
- execution plan;
- intent bundle or context package;
- allowed and forbidden changes;
- acceptance criteria;
- validation plan.

Before completion, each goal must have:

- validation report;
- Intent Compliance Report;
- updated `docs/IMPLEMENTATION_STATE.md`.

## Ordered Goals

| Goal | Status | Dependency | Outcome |
| --- | --- | --- | --- |
| `GOAL-01-production-readiness` | done | none | Coherent deployed topology, storefront at `/`, API at `/api`, smokeable product/auth/cart/checkout paths |
| `GOAL-02-checkout-payments` | blocked with owner-approved bypass | Goal 01 | PayU, PayPal, GP WebPay, and Stripe payment flows verified or explicitly blocked by credentials |
| `GOAL-03-catalog-stock-storefront` | done | Goal 01 and Goal 02 provider findings/bypass | Product catalog, images, categories, price display, and stock state are production-ready |
| `GOAL-04-agent-content-seo` | done | Goal 03 | AI product descriptions and SEO metadata generated through approved review flow |
| `GOAL-05-operational-closure` | done | Goals 01-04 | Final validation, runbook, monitoring checks, and handoff state |

## Orchestrator Rule

Do not skip goals unless the skipped goal is explicitly marked `done`, `not-applicable`, or `blocked with owner-approved bypass`.

## Reporting Format

At the end of each session, report:

- active goal;
- files changed;
- validation run;
- blockers;
- next step.
