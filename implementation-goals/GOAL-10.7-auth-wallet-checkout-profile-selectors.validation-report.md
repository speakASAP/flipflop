# GOAL 10.7 Validation Report: Auth Wallet Checkout/Profile Selectors

## Status

Implemented as a source-only frontend change. Deployment and live checkout smoke were intentionally not run.

## Scope

- `services/frontend/app/checkout/page.tsx`
- `services/frontend/app/profile/addresses/page.tsx`

## Behavior

- Authenticated checkout now reads Auth wallet checkout data defensively through the existing `authApi.getCheckoutData()` bridge.
- Auth delivery addresses prefill the existing optional different-delivery address fields only.
- Auth invoice profiles prefill the existing contact and billing address fields only.
- Guest checkout and manual checkout entry remain available.
- `/profile/addresses` now prefers Auth wallet delivery addresses when the endpoint is available.
- If Auth wallet address endpoints fail or return unavailable responses, `/profile/addresses` falls back to the existing local `/users/addresses` API.
- No destructive migration or backfill from local addresses to Auth wallet was added.
- No order payload semantics or backend order fields were added.

## Fallback Notes

- Checkout treats Auth wallet data as optional. If the Auth wallet endpoint fails, returns 404, or returns no data, wallet selectors stay hidden and the existing user profile/manual checkout behavior remains.
- Profile addresses use Auth wallet CRUD only after Auth wallet listing succeeds. If listing is unavailable, the page uses the existing local address API.


## Manual Edit Race Follow-Up

- Follow-up source fix added a manual-edit guard for checkout fields that Auth wallet defaults can prefill.
- If an authenticated user starts editing contact, billing, or different-delivery fields before the Auth wallet request resolves, automatic default wallet prefill is skipped.
- Explicit user selection from the wallet selectors still applies the selected invoice profile or delivery address.
- Follow-up validation rerun after this guard passed: `git diff --check`, `python3 scripts/pre_coding_gate.py --root .`, `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`, `cd services/frontend && npm exec -- tsc --noEmit`, and `cd services/frontend && npm run build`.

## Non-Mutating Selector Verifier Follow-Up

- Added `npm run verify:auth-wallet-checkout-selectors`.
- The verifier is source-only and non-mutating. It does not call live checkout,
  submit an order, read customer data, or require Auth wallet endpoints to be
  deployed.
- It proves the Auth wallet client paths, checkout selectors, manual-edit-before
  wallet-response guard, explicit selector override path, profile-address Auth
  fallback, and order payload snapshot boundary remain present.
- It fails if checkout starts sending Auth delivery/invoice wallet IDs to Orders
  before the provenance contract is approved.

## Guarded Gateway Smoke Follow-Up

- Added `npm run smoke:auth-wallet-checkout-profile`.
- Default mode remains source-only and non-mutating. It runs
  `verify:auth-wallet-profile-ui`, `verify:auth-wallet-checkout-selectors`, and
  `verify:orders-hub-integration`, then reports missing approval gates without
  calling authenticated endpoints.
- Approved live mode is limited to FlipFlop public pages and gateway-proxied
  Auth wallet endpoints under `/api/auth/profile/*`. It may create, update,
  default, and delete synthetic delivery-address and invoice-profile rows for
  one owner-approved synthetic Auth token, then verify cleanup.
- The gateway smoke does not submit checkout orders, inspect DB rows, read
  cookies, or prove interactive browser timing. Browser-session proof for a
  delayed wallet response and selector interaction remains a separate approval
  gate.

## Validation

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
npm run verify:auth-wallet-checkout-selectors
npm run smoke:auth-wallet-checkout-profile
cd services/frontend && npm exec -- tsc --noEmit
cd services/frontend && npm run build
git diff --check
```

## Results

- `python3 scripts/pre_coding_gate.py --root .`: passed; report written to `reports/validation/ips-pre-coding-gate.json`.
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`: passed, score 100/100.
- `npm run verify:auth-wallet-checkout-selectors`: passed.
- `cd services/frontend && npm exec -- tsc --noEmit`: passed.
- `cd services/frontend && npm run build`: passed. Non-blocking warnings: `baseline-browser-mapping` data age and Next.js workspace-root inference with multiple lockfiles.
- `git diff --check`: passed.

## Intent Compliance Report

- Original intent preserved: Auth remains the ecosystem owner for wallet addresses and invoice profiles, while FlipFlop only uses selected values to prefill existing checkout/profile fields.
- Constraints respected: no Auth or Orders repo edits, no order-service/backend order payload changes, no deployment, no live checkout smoke, no secrets or customer data inspection.
- Non-goals respected: no destructive local-to-Auth migration/backfill, no pricing/payment/order-total mutation, and no new unsupported invoice/order fields.
- Remaining gates: Auth wallet endpoints still need deployment/runtime verification outside this source-only worker scope.
