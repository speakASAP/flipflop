# Implementation State

## Current Status

**Date:** 2026-06-13
**Mode:** Goal-driven orchestration enabled
**Active goal:** GOAL-06-orders-hub-integration
**Goal status:** implemented and validated; deployment pending owner approval
**Current checkpoint:** GOAL-06 server-side Orders Hub integration is implemented in FlipFlop order-service and validated locally. Runtime deployment has not been run.

## Current Intent Summary

Make FlipFlop production-ready and revenue-capable by serving the storefront, restoring coherent service routing, showing sellable products, supporting authenticated shopping, and completing checkout through PayU, PayPal, GP WebPay, and Stripe.

## Repository Notes

The remote repository had unrelated dirty files before this orchestration setup started:

```text
package.json
services/order-service/src/orders/orders.controller.ts
services/order-service/src/orders/orders.module.ts
shared/resilience/circuit-breaker.service.ts
scripts/smoke-checkout.js
services/order-service/src/orders/gateway-user.guard.ts
```

Orchestrator agents must not overwrite or revert those changes unless the owner explicitly asks.

## Completed In This Setup

- Added canonical Intent Preservation System baseline: constitution, vision, business case, domain model, system/subsystem, architecture, ADR, roadmap, milestone, feature, task, goal-impact record, execution plan, context package, coding prompt, validation report, audit checklist, project graph, and local gate scripts.
- Updated FlipFlop orchestrator and process docs so future coding must pass IPS pre-coding and strict documentation gates before code edits, and deployment-readiness before release closure.
- Validated IPS baseline locally: `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed 100/100, `python3 scripts/pre_coding_gate.py --root .` passed, `python3 scripts/deployment_readiness_gate.py --root .` passed, and `./scripts/next_goal.sh` preserved the no-active-goal/payment-follow-up state.
- Validated IPS baseline on remote `alfares:/home/ssf/Documents/Github/flipflop-service`: strict documentation audit passed 100/100, pre-coding gate passed with `reports/validation/ips-pre-coding-gate.json`, and deployment-readiness gate passed with `reports/validation/ips-deployment-readiness-gate.json`.
- Added standalone intent memory.
- Added Goalkeeper-style implementation orchestrator instructions.
- Added process gates and gap-filling rules.
- Added ordered implementation-goals backlog.
- Added active production-readiness goal artifacts.
- Updated root agent instructions to use the goal workflow.
- Validated live homepage, API routing, product API, Kubernetes services,
  authenticated cart add, and checkout initiation.
- Closed `GOAL-01-production-readiness` with accepted validation evidence.
- Created GOAL-02 execution plan, context package, coding prompt, and validation
  report.
- Checked production payment-provider readiness without exposing secret values.
- Fixed stale payment payload reuse in `shared/payments/payment.service.ts` by
  using request-scoped circuit breaker names for payment create/status/refund.
- Deployed FlipFlop and validated Stripe initiation now returns a Stripe
  Checkout URL for a Stripe order.
- Recorded owner-approved bypass for remaining GOAL-02 payment provider
  credential/webhook completion.
- Closed `GOAL-03-catalog-stock-storefront` after validating live catalog,
  category, product detail, warehouse-backed cart stock checks, and operational
  empty-catalog alert logging.
- Deployed product-service/frontend updates for category display names,
  catalog unavailable empty state, and explicit product-service
  `OPERATIONAL_ALERT` warnings.
- Started `GOAL-04-agent-content-seo`.
- Deployed catalog SEO pass-through from product-service to frontend metadata.
- Added an approval-first SEO draft generator that writes only
  `seoData.aiDraft.reviewStatus = "draft"` and refuses to generate or store
  fake AI content when `AI_SERVICE_TOKEN` is absent.
- Connected `AI_SERVICE_TOKEN` through Vault and ExternalSecrets without
  printing the secret value.
- Generated AI SEO drafts for the first three priority catalog products and
  verified each remains `reviewStatus: "draft"`.
- Tightened the draft generator to reject generated price, stock, delivery,
  warranty, safety, compliance, and discount claims.
- Closed `GOAL-04-agent-content-seo` with SEO pass-through, draft review state,
  and no-draft-publication evidence.
- Closed `GOAL-05-operational-closure` after validating homepage, product API,
  checkout smoke, cart stock enforcement, AI draft non-publication, monitoring,
  operational alert logging, and workload health.
- Added final operational runbook and handoff notes.
- Updated machine-readable `STATE.json` to show no active implementation goal
  and preserve the owner-bypassed payment provider risk.
- Started `GOAL-06-orders-hub-integration` after owner approval naming
  FlipFlop as the specific application for central Orders. Scope is the
  FlipFlop server-side `order-service` forwarding path, not provider
  credentials, provider webhook verification, price mutation, refund,
  cancellation, warehouse ownership, or catalog ownership.
- Implemented GOAL-06 server-side central Orders forwarding hardening:
  `shared/clients/order-client.service.ts` now uses `ORDERS_SERVICE_URL`
  for central Orders with compatibility for existing `ORDERS_MICROSERVICE_URL`,
  sends `orders.create.v1`, and maps central Orders HTTP 409 to
  `ORDER_IDEMPOTENCY_CONFLICT`. `order-service` now builds a bounded
  FlipFlop payload with stable `channel=flipflop`,
  `channelAccountId`, `externalOrderId=order.orderNumber`, nested totals,
  payment, shipping, and bounded customer/address fields, and records
  accepted/conflict/failed central forwarding status in local order metadata.
- Added explicit `ORDERS_SERVICE_URL=http://orders-microservice:3203` to
  `k8s/configmap.yaml` while preserving the existing `ORDERS_MICROSERVICE_URL`
  alias.
- Added `scripts/verify-orders-hub-integration.js` and
  `npm run verify:orders-hub-integration`.

## Next Step

Active implementation goal: none. `GOAL-06-orders-hub-integration` is code-complete and validated; deployment is pending explicit owner approval.

Owner bypass decision remains in force:

The owner deferred the remaining GOAL-02 payment provider setup and webhook
validation until after the whole project is implemented. PayU, PayPal, GP
WebPay, and Stripe webhook completion remain manual follow-up work and must not
be marked verified automatically.

Next implementation step: obtain owner approval for FlipFlop runtime deployment, then run the deployment readiness gate and deploy.

## Goal Register

| Goal | Status | Next action |
| --- | --- | --- |
| `GOAL-01-production-readiness` | done | closed with live validation evidence |
| `GOAL-02-checkout-payments` | blocked with owner-approved bypass | owner will finish provider credentials/webhooks manually after project implementation |
| `GOAL-03-catalog-stock-storefront` | done | closed with live catalog, storefront, stock, deploy, and alert evidence |
| `GOAL-04-agent-content-seo` | done | closed with draft AI content, review status, SEO metadata, and no-publish validation |
| `GOAL-05-operational-closure` | done | closed with final validation docs, monitoring notes, runbook, and handoff |
| `GOAL-06-orders-hub-integration` | implemented, deployment pending | owner approval for runtime deployment |

## Owner Manual Follow-Up

- PayU production credentials are missing in the running payments pod.
- PayPal production credentials are missing in the running payments pod.
- GP WebPay production merchant/key/application/description config checked in
  the running payments pod is missing.
- Stripe webhook verification is blocked until `STRIPE_WEBHOOK_SECRET` or an
  approved verified callback path is configured.
