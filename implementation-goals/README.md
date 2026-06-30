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
- task and goal-impact traceability when new implementation work is introduced;
- allowed and forbidden changes;
- acceptance criteria;
- validation plan.
- passing IPS pre-coding gate or a recorded blocker.

Before completion, each goal must have:

- validation report;
- Intent Compliance Report;
- updated `docs/IMPLEMENTATION_STATE.md`.
- deployment-readiness gate evidence when deployment or release closure is in scope.

## IPS Gate Commands

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
python3 scripts/deployment_readiness_gate.py --root .
```

## Ordered Goals

| Goal | Status | Dependency | Outcome |
| --- | --- | --- | --- |
| `GOAL-01-production-readiness` | done | none | Coherent deployed topology, storefront at `/`, API at `/api`, smokeable product/auth/cart/checkout paths |
| `GOAL-02-checkout-payments` | blocked with owner-approved bypass | Goal 01 | PayU, PayPal, GP WebPay, and Stripe payment flows verified or explicitly blocked by credentials |
| `GOAL-03-catalog-stock-storefront` | done | Goal 01 and Goal 02 provider findings/bypass | Product catalog, images, categories, price display, and stock state are production-ready |
| `GOAL-04-agent-content-seo` | done | Goal 03 | AI product descriptions and SEO metadata generated through approved review flow |
| `GOAL-05-operational-closure` | done | Goals 01-04 | Final validation, runbook, monitoring checks, and handoff state |
| `GOAL-06-orders-hub-integration` | done | Goals 01-05 and owner approval | FlipFlop server-side order-service feeds central Orders with deployed evidence |
| `GOAL-07-leads-public-intake-adoption` | deployed | Leads Goal 26 owner selection of FlipFlop and 2026-06-21 owner approvals | Public FlipFlop contact surface submits through gateway to Leads public intake; production smoke passed |
| `GOAL-09-smarty-checkout-reference-ux` | planned | Owner 2026-06-26 checkout UX correction and GOAL-02 payment-safety constraints | Guest checkout modeled on Smarty.cz, optional account creation by magic link, no mandatory registration before purchase |
| `GOAL-09-guest-checkout-smarty-flow` | active | Owner 2026-06-26 checkout UX request | Guest checkout, Smarty.cz-inspired Czech checkout flow, optional registration, and bank-transfer QR completion |
| `GOAL-10-catalog-connector-content-preview` | done, not deployed | Goal 03 and Catalog content preview contract | Admins can inspect Catalog canonical `flipflop` connector previews without touching Allegro, checkout, pricing, stock, or deployment ownership |

## Orchestrator Rule

Do not skip goals unless the skipped goal is explicitly marked `done`, `not-applicable`, or `blocked with owner-approved bypass`.

## Reporting Format

At the end of each session, report:

- active goal;
- files changed;
- validation run;
- blockers;
- next step.
