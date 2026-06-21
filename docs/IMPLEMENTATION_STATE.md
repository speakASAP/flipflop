# Implementation State

## Current Status

**Date:** 2026-06-21
**Mode:** Goal-driven orchestration enabled
**Active goal:** none
**Goal status:** GOAL-07-leads-public-intake-adoption deployed and production smoke passed
**Current checkpoint:** Owner approved deployment on 2026-06-21. GOAL-07 public Leads intake is deployed to production; homepage, product API, and one bounded synthetic Leads contact smoke passed. Payment-provider residual risks remain pending separate readiness evidence.

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
- Deployed GOAL-06 after owner approval with `./scripts/deploy.sh`.
  Build and image push completed for all FlipFlop workloads. The initial
  rollout wait timed out while replacement pods were still pulling images from
  the local registry, but the current replacements later completed
  successfully and all six deployments reached ready state:
  `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`,
  `flipflop-cart-service`, `flipflop-order-service`, and
  `flipflop-user-service` are each 1/1 ready.
- Confirmed deployed order-service runtime wiring:
  `ORDERS_SERVICE_URL=http://orders-microservice:3203`,
  `ORDERS_MICROSERVICE_URL=http://orders-microservice:3203`, and
  local `ORDER_SERVICE_URL=http://flipflop-order-service:3003`.
- Validated post-deploy public homepage and product API. Re-ran
  `npm run verify:orders-hub-integration` successfully after deployment.
- Captured operational residuals after deployment: service health endpoints
  returned HTTP 200 with body status `degraded` due a logging dependency
  error while `logging-microservice` itself reported healthy.
- Fixed deployed runtime authorization for FlipFlop-to-Orders forwarding by
  storing an Orders-runtime-signed `ORDERS_SERVICE_TOKEN` in the FlipFlop
  Vault path, forcing ExternalSecret refresh, verifying the Kubernetes Secret
  against the central Orders runtime signing key without printing secret
  values, and restarting only `flipflop-order-service`.
- Proved central Orders auth from inside the deployed FlipFlop order-service
  pod: non-mutating `GET /api/orders?channel=flipflop` returned HTTP 200.
- Added GOAL-08 Leads lifecycle replay consumer source/config path for owner-selected Leads Goal 24 first consumer. `LeadsClientService` calls the guarded one-lead replay route as `flipflop-service`, clamps limit to 30, sends only internal service identity headers from env, and is statically verified by `npm run verify:leads-lifecycle-replay`. Not deployed.
- Proved live checkout and central Orders forwarding after deployment:
  `node scripts/smoke-checkout.js` created FlipFlop order
  `ORD-1781378332000-840` with pending Stripe payment and redirect URL; the
  local order metadata recorded `centralOrdersForwarding.status=accepted`
  and `centralOrderId=ae51a415-ded0-4bf9-ac4e-c9adcab97d80`; central
  Orders logged `operation=order.create`, `channel=flipflop`,
  `outcome=success`.
- Evaluated Leads Goal 26 cross-repo product-app adoption for FlipFlop after owner selection of FlipFlop as the Leads consumer. Reviewed Leads Goal 26 and product-app intake contract artifacts, searched FlipFlop editable source for existing lead/contact/newsletter/waitlist/inquiry submission paths, and recorded GOAL-07 as blocked because no existing path exists to adapt safely. No production lead submission, runtime code change, schema change, secret change, deployment, raw contact export, campaign execution, or AI/CRM export was performed.

## Next Step

Active implementation goal: none. `GOAL-07-leads-public-intake-adoption` is deployed with production smoke evidence after owner approval. `GOAL-06-orders-hub-integration` remains closed with deployed live evidence.

Owner bypass decision remains in force:

The owner deferred the remaining GOAL-02 payment provider setup and webhook
validation until after the whole project is implemented. PayU, PayPal, GP
WebPay, and Stripe webhook completion remain manual follow-up work and must not
be marked verified automatically.

Next implementation step: return to H8 candidate application integration decisions and choose the next application/service to migrate into central Orders using the FlipFlop evidence as the reference pattern.

## Goal Register

| Goal | Status | Next action |
| --- | --- | --- |
| `GOAL-01-production-readiness` | done | closed with live validation evidence |
| `GOAL-02-checkout-payments` | blocked with owner-approved bypass | owner will finish provider credentials/webhooks manually after project implementation |
| `GOAL-03-catalog-stock-storefront` | done | closed with live catalog, storefront, stock, deploy, and alert evidence |
| `GOAL-04-agent-content-seo` | done | closed with draft AI content, review status, SEO metadata, and no-publish validation |
| `GOAL-05-operational-closure` | done | closed with final validation docs, monitoring notes, runbook, and handoff |
| `GOAL-06-orders-hub-integration` | done | closed with deployed live checkout and central Orders forwarding evidence |
| `GOAL-08-leads-lifecycle-replay-consumer` | done for source/config verification; not deployed | deploy only after integration-owner approval and Leads internal trust/token provisioning |
| `GOAL-07-leads-public-intake-adoption` | deployed | production smoke passed after owner approval |

## Owner Manual Follow-Up

- PayU production credentials are missing in the running payments pod.
- PayPal production credentials are missing in the running payments pod.
- GP WebPay production merchant/key/application/description config checked in
  the running payments pod is missing.
- Stripe webhook verification is blocked until `STRIPE_WEBHOOK_SECRET` or an
  approved verified callback path is configured.


## 2026-06-21 - Owner-Approved GOAL-07 Source Implementation

Owner approval reopened the previously blocked `GOAL-07-leads-public-intake-adoption` lane for a new FlipFlop public contact surface with visible consent copy.

Implemented source/config:

- Added public gateway route `POST /api/leads/contact` in `services/api-gateway/src/gateway/gateway.controller.ts`.
- Added bounded gateway DTO `services/api-gateway/src/gateway/dto/create-lead-contact.dto.ts`.
- Added server-side Leads public intake proxy in `services/api-gateway/src/gateway/gateway.service.ts` using `LEADS_PUBLIC_URL` and the Leads product-app contract.
- Added homepage lead-contact form `services/frontend/components/LeadContactForm.tsx` and frontend wrapper `services/frontend/lib/api/leads.ts`.
- Added `LEADS_PUBLIC_URL: "https://leads.alfares.cz"` to `k8s/configmap.yaml`.
- Added `scripts/verify-leads-public-intake.js` and `npm run verify:leads-public-intake` for synthetic/static validation.

Contract and privacy posture:

- Leads payload uses `sourceService: "flipflop"`, `sourceLabel: "support-contact"`, one `email` contact method, `preferredChannel: "email"`, consent source `flipflop-home-contact:v1`, ISO `consentCapturedAt`, and bounded metadata keys `intent`, `surface`, and `locale`.
- Browser code calls only FlipFlop `/api/leads/contact`; it does not use internal Kubernetes URLs or internal service tokens.
- No raw contact export, campaign execution, production lead submission, payment/order/price mutation, schema migration, or deployment was performed during source validation.

Validation passed:

- `npm run verify:leads-public-intake`
- `git diff --check`
- `cd services/api-gateway && npm run build`
- `cd services/frontend && npm run build`

Current checkpoint: GOAL-07 is deployed and production smoke passed. GOAL-02 payment-provider credentials/webhook follow-up remains pending separate readiness evidence.

## 2026-06-21 - GOAL-07 Production Deployment And Smoke

Owner approved production deployment and smoke for the completed GOAL-07 source.

Deployment command:

```bash
./scripts/deploy.sh
```

Deployment result:

- Deployment completed successfully in 517.80s.
- Built and pushed images for `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`, `flipflop-cart-service`, `flipflop-order-service`, and `flipflop-user-service`.
- Applied Kubernetes manifests; `flipflop-config` was updated with `LEADS_PUBLIC_URL`.
- Rollout completed for all six FlipFlop deployments.
- Deploy-script post checks for `/` and `/api/products?limit=1` passed.

Production smoke:

- `GET https://flipflop.alfares.cz/` returned HTTP 200.
- `GET https://flipflop.alfares.cz/api/products?limit=1` returned HTTP 200.
- `POST https://flipflop.alfares.cz/api/leads/contact` with one synthetic contact payload returned HTTP 200, `success: true`, Leads status `new`, `confirmationSent: true`, and a lead id was present.

Safety notes:

- The production lead smoke used a synthetic `example.invalid` contact and no raw contact value is recorded in this state file.
- No payment provider, order total, price, cancellation, database migration, object storage, campaign execution, AI/CRM export, or manual secret change was performed.
- Residual GOAL-02 payment-provider credential/webhook risk remains preserved.
