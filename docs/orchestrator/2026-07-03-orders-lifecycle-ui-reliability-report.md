# Orders Lifecycle UI Reliability Report - FlipFlop

Date: 2026-07-03
Worker: Frontend-A
Scope: customer/admin order cabinet lifecycle UI only.

## Intent Preservation

- Vision: channel cabinets show canonical Orders lifecycle without owning lifecycle truth.
- Goal Impact: FlipFlop customers/admins can see friendly central lifecycle labels for every known Orders lifecycle stage and can refresh stale views safely.
- System: Orders remains lifecycle authority; FlipFlop renders read-model fields returned by existing order APIs.
- Feature: customer/admin order list and detail pages render shared central lifecycle labels/colors.
- Task: add lifecycle label coverage, visible refresh/loading state, and focused source verifier.
- Execution Plan: centralize UI label mapping in `services/frontend/lib/api/orders.ts`, reuse existing `useVisiblePolling`, add manual refresh affordance, verify source coverage without live row/token output.
- Coding Prompt: do not touch Orders docs or shared schemas; do not print customer/order/token payloads.
- Code: `services/frontend/lib/api/orders.ts`, order pages under `services/frontend/app/orders/**` and `services/frontend/app/admin/orders/**`, `scripts/verify-orders-lifecycle-ui.js`, `package.json`.
- Validation: see commands below.

## Coverage

Covered lifecycle stages: `ordered_unpaid`, `payment_failed`, `paid_not_delivered`, `warehouse_fulfillment_requested`, `warehouse_collecting`, `warehouse_forming`, `warehouse_formed`, `handed_to_delivery`, `in_delivery`, `received`, `not_received`, `returned`, `cancelled`.

Refresh: existing 30s visible polling retained; customer/admin order list/detail pages now also expose manual `Aktualizovat` and `Aktualizuji`/last-updated state.

Sensitive output: verifier is source-only and prints no token values, customer payloads, order rows, tracking values, provider payloads, or DB rows.

## Validation

- `npm run verify:orders-lifecycle-ui` -> PASS, 13 stages, 4 surfaces, source-only redacted output.
- `npm --prefix services/frontend run lint -- app/orders/page.tsx app/orders/[id]/page.tsx app/admin/orders/page.tsx app/admin/orders/[id]/page.tsx lib/api/orders.ts` -> PASS; warning only about stale baseline-browser-mapping data.
- `npm --prefix services/frontend run build` -> PASS; warnings only about stale baseline-browser-mapping data and Next workspace-root inference due multiple lockfiles.
- `npm --prefix services/frontend run lint` -> FAILS on pre-existing broad frontend lint debt outside this slice (for example cart/checkout/login/payment-result/Header/ShoppingAssistant/lib/api/client/instrumentation). Touched file lint is clean.

## Remaining Gates

- [MISSING: browser smoke] Customer `/orders`, customer `/orders/:id`, admin `/admin/orders`, and admin `/admin/orders/:id` were not browser-smoked in a live deployed environment in this source-only slice.
- [MISSING: deploy] Source changes were not deployed in this worker slice.
