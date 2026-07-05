# W6-A FlipFlop Dashboard Central Lifecycle Cleanup

status: implemented-source-validated
created_at: 2026-07-05
workstream: W6-A FlipFlop dashboard central lifecycle cleanup
repository: /home/ssf/Documents/Github/flipflop
parent_report: docs/orchestrator/2026-07-05-w6-flipflop-centralization-gap-report.md
integration_report: /home/ssf/Documents/Github/orders-microservice/reports/validation/VAL-W7-error-free-orders-lifecycle-integration-2026-07-05.md

## Intent Preservation Chain

Vision -> FlipFlop customer/admin dashboards must reflect canonical Orders lifecycle instead of local order-service status.

Goal Impact -> Removes the ready-now local-authority drift risk from recent-order dashboard widgets while preserving backend authority boundaries.

System -> Orders remains lifecycle authority; FlipFlop dashboard widgets render central lifecycle read-model data when available and show stale/missing notices when central data is absent or stale.

Feature -> Customer and admin dashboard recent-order widgets use `getOrderDisplayData`, shared lifecycle labels/colors, central totals/currency, and central stale/missing notices.

Task -> Patch only the allowed frontend dashboard surfaces and verifier; do not touch backend order-service authority semantics.

Execution Plan -> Reuse existing dedicated order-page helper contract instead of creating a new status mapper.

Coding Prompt -> Remote-only Alfares workflow; no deploy, provider/payment/checkout/backend mutation, token output, or raw customer/payment/tracking output.

Code -> `services/frontend/app/dashboard/page.tsx`, `services/frontend/app/admin/page.tsx`, `scripts/verify-orders-lifecycle-ui.js`.

Validation -> Focused lifecycle verifier, frontend lint, and diff hygiene.

## Changes

- Customer dashboard recent orders now derive display values from `getOrderDisplayData(order)`.
- Admin dashboard recent orders now derive display values from `getOrderDisplayData(order)`.
- Both dashboard widgets use shared central lifecycle labels/colors through `getOrderLifecycleLabel` and `getOrderLifecycleColor`.
- Both dashboard widgets display central stale/missing/failure notices instead of silently falling back to local status.
- Recent-order totals now use `formatOrderMoney(display.total, display.currency)` so central Orders totals/currency are rendered when available.
- `verify:orders-lifecycle-ui` now covers customer/admin dashboard recent-order surfaces and forbids direct local `order.status` rendering in those widgets.

## Validation Evidence

```bash
npm run verify:orders-lifecycle-ui
```

Result: passed. Output covered 13 lifecycle stages and surfaces: `customer-orders`, `customer-order-detail`, `admin-orders`, `admin-order-detail`, `customer-dashboard-recent-orders`, `admin-dashboard-recent-orders`.

```bash
npm --prefix services/frontend run lint -- app/dashboard/page.tsx app/admin/page.tsx lib/api/orders.ts
```

Result: passed with 0 errors. Existing warnings remained in `app/dashboard/page.tsx` for React hook dependency and `<img>` usage; these warnings predate W6-A and are unrelated to central lifecycle rendering.

```bash
git diff --check
```

Result: passed.

## Remaining Gates

- `[MISSING: central Orders admin lifecycle mutation/correction contract]` remains for W6-B. W6-A intentionally did not change `updateAdminOrderStatus` or backend local order-service mutation semantics.
- `[MISSING: approved live customer/admin bearer/session packet]` remains for W6-C browser/API smoke.
- No deploy was run.
