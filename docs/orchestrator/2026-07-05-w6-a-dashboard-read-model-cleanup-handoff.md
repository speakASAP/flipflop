# W6-A Dashboard Read-Model Cleanup Handoff

status: source-verified-no-deploy
created_at: 2026-07-05
workstream: W6-A Dashboard read-model cleanup
repository: /home/ssf/Documents/Github/flipflop
source_thread_id: 019f314d-89b3-7dc2-8620-9b5b358e1863

## Intent Preservation Chain

Vision -> Every sellable order is error-free and every customer/admin cabinet reflects the canonical Orders lifecycle.

Goal Impact -> Prevent FlipFlop dashboard recent-order widgets from displaying local `order.status` when central Orders lifecycle data is available.

System -> Orders owns central order lifecycle and lifecycle reads. Warehouse owns stock/reservation/fulfillment/delivery status. FlipFlop owns storefront UI, local checkout adapter, and bounded local order metadata.

Feature -> FlipFlop dashboard recent-order widgets use the same central lifecycle display helpers as dedicated order pages.

Task -> Close `[MISSING: dashboard recent-order central lifecycle rendering]` by proving dashboard recent-order widgets read central display data and by hardening `verify:orders-lifecycle-ui` to fail on direct `order.status` lifecycle rendering inside dashboard recent-order widgets.

Execution Plan -> Inspect W6 handoff/report, inspect dashboard widgets and shared order display helpers, keep source changes narrow, strengthen verifier coverage, run required verifier, run focused frontend lint where available, run `git diff --check`, and do not deploy.

Coding Prompt -> Remote-only workflow on `ssh alfares` and `/home/ssf/Documents/Github/flipflop`; allowed files limited to dashboard pages, shared Orders UI helpers if needed, lifecycle verifier, and W6 docs; no backend order-service, checkout/payment/provider, secrets, deploy, or unrelated page changes.

Code -> Dashboard source already rendered recent orders through `getOrderDisplayData(order)`, `formatOrderMoney(display.total, display.currency)`, `getStatusText(display.status)`, `getStatusColor(display.status)`, and `getCentralNotice(order)` on remote `main`. This pass changed only `scripts/verify-orders-lifecycle-ui.js` to parse each dashboard `recentOrders.map((order) => { ... })` block and fail if lifecycle text/color reads local `order.status` directly instead of `display.status` from `getOrderDisplayData(order)`.

Validation -> Required verifier passed. Focused dashboard eslint completed with warnings only on pre-existing customer dashboard issues. Broad frontend lint is blocked by unrelated repo-wide debt. `git diff --check` passed. No deploy run.

## Commands And Results

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && pwd && git status --short --branch && git branch --show-current && git log -1 --oneline'
```

Result: `/home/ssf/Documents/Github/flipflop`, `## main...origin/main`, branch `main`, latest commit `8d22e06 Fix product detail bundle threshold selection`.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && sed -n "1,220p" docs/orchestrator/2026-07-05-error-free-orders-lifecycle-handoff.md'
```

Result: handoff status `active`; invariant preserved: Orders owns order lifecycle and FlipFlop may only implement assigned adapter/UI/proof slice.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && sed -n "1,260p" docs/orchestrator/2026-07-05-w6-flipflop-centralization-gap-report.md'
```

Result: W6 report identified `[MISSING: dashboard recent-order central lifecycle rendering]` and marked W6-A dashboard read-model cleanup as ready now.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && rg -n "recentOrders|order.status|getOrderDisplayData|getStatusText|getStatusColor|getCentralNotice|formatOrderMoney" services/frontend/app/dashboard/page.tsx services/frontend/app/admin/page.tsx services/frontend/lib/api/orders.ts scripts/verify-orders-lifecycle-ui.js'
```

Result: dashboard and admin recent-order widgets derive `display = getOrderDisplayData(order)`, `centralNotice = getCentralNotice(order)`, money from `formatOrderMoney(display.total, display.currency)`, and lifecycle label/color from `display.status`. No dashboard source edits were required.

```bash
npm run verify:orders-lifecycle-ui
```

Result:

```json
{"ok":true,"verifier":"flipflop-orders-lifecycle-ui.v1","coveredStages":13,"surfaces":["customer-orders","customer-order-detail","admin-orders","admin-order-detail","customer-dashboard-recent-orders","admin-dashboard-recent-orders"],"refresh":"useVisiblePolling(30000)","sensitiveOutput":"redacted-source-only"}
```

```bash
npm --prefix services/frontend run lint
```

Result: failed from unrelated repo-wide lint debt: `services/frontend/app/cart/page.tsx` explicit `any` errors, `services/frontend/app/checkout/page.tsx` explicit `any` errors, login/register/payment-result/Header/ShoppingAssistant React hook purity/set-state errors, `services/frontend/instrumentation.ts` and `services/frontend/lib/api/client.ts` explicit `any` errors. Dashboard page had warnings only.

```bash
cd /home/ssf/Documents/Github/flipflop/services/frontend && npm exec -- eslint app/dashboard/page.tsx app/admin/page.tsx
```

Result: completed with 0 errors and 2 warnings, both pre-existing in `app/dashboard/page.tsx`: missing `loadDashboardData` dependency at line 49 and `<img>` warning at line 418. `app/admin/page.tsx` reported no errors.

```bash
git diff --check
```

Result: passed with no output.

## Files Changed

- `scripts/verify-orders-lifecycle-ui.js` -> added dashboard recent-orders block parser and central display assertions.
- `docs/orchestrator/2026-07-05-w6-a-dashboard-read-model-cleanup-handoff.md` -> this handoff report.

No changes were made to:

- `services/frontend/app/dashboard/page.tsx`
- `services/frontend/app/admin/page.tsx`
- `services/frontend/lib/api/orders.ts`
- backend order-service, checkout/payment/provider code, deploy scripts, secrets, or unrelated frontend pages

## Dirty Worktree State

After this handoff report, expected dirty state:

```text
M scripts/verify-orders-lifecycle-ui.js
?? docs/orchestrator/2026-07-05-w6-a-dashboard-read-model-cleanup-handoff.md
```

## Remaining Blockers

- `[MISSING: central-authority admin status mutation contract]` remains from W6/W6-B and was intentionally not touched in this UI-only W6-A lane.
- `[MISSING: live customer/admin auth session smoke]` remains blocked without an approved safe live bearer/session packet.
- `[MISSING: deployed W6-specific proof gate]` remains because no deploy was requested or run.
- `[MISSING: repo-wide frontend lint cleanup]` broad `npm --prefix services/frontend run lint` still fails on unrelated existing lint debt outside the allowed W6-A files.

## Deployment

Not run. This was a source-only cleanup/verifier hardening pass and no deploy gate was requested.
