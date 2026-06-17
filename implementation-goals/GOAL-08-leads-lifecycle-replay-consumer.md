# GOAL-08 - Leads Lifecycle Replay Consumer

## Status

complete for source/config verification; not deployed.

## Intent

FlipFlop may consume minimized Leads lifecycle replay evidence as the first trusted internal consumer selected for Leads Goal 24, without changing checkout, payments, order totals, catalog, warehouse, frontend, campaign execution, notification dispatch, or raw lead handling.

## Scope

- `shared/clients/leads-client.service.ts`
- `shared/clients/clients.module.ts`
- `k8s/configmap.yaml`
- `k8s/external-secret.yaml`
- `scripts/verify-leads-lifecycle-replay-integration.js`
- `package.json`

## Non-Goals

No production deployment, no production lead read, no token value capture, no raw lead export, no checkout/order/payment mutation, no campaign execution, and no frontend/browser token exposure.

## Validation

- `npm run verify:leads-lifecycle-replay`: passed.
- `./shared/node_modules/.bin/tsc -p shared/tsconfig.json --noEmit`: passed.
