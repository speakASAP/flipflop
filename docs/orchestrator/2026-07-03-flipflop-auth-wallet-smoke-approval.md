# FlipFlop Auth Wallet Checkout/Profile Smoke Approval Packet

Date: 2026-07-03
Repo: flipflop
Operation class: owner-approved authenticated synthetic FlipFlop Auth wallet smoke
Status: source-prepared; live execution blocked until synthetic account/token approval

## IPS Chain

Vision: Auth remains the single source of truth for reusable registered-user
profile, delivery address, and invoice profile data, while FlipFlop consumes
that data for checkout/profile convenience.
Goal Impact: FlipFlop can prove its deployed gateway and checkout/profile
source paths use Auth wallet data without storing reusable profile truth locally.
System: FlipFlop frontend source, API gateway `/api/auth/*` proxy, Auth wallet
runtime, and one owner-approved synthetic Auth subject.
Feature: authenticated Auth wallet checkout/profile smoke for selector/source
coverage plus gateway-proxied wallet CRUD/default/delete runtime coverage.
Task: run existing source verifiers for manual-edit guard, explicit selector
override, checkout save-back, and profile invoice CRUD/default UI; then, after
approval, create/update/default/delete synthetic wallet rows through FlipFlop
gateway and verify checkout-data visibility.
Execution Plan: default mode is source-only; live mode requires explicit env
gates and synthetic token; cleanup is mandatory; output is sanitized.
Coding Prompt: do not submit orders, read DB rows, inspect secrets/tokens, or
print raw request/response bodies.
Code: `scripts/smoke-auth-wallet-checkout-profile.js`,
`scripts/verify-auth-wallet-checkout-selectors.js`,
`scripts/verify-auth-wallet-profile-ui.js`, and
`scripts/verify-orders-hub-integration.js`.
Validation: default source-only harness run plus existing verifier suite; live
gateway smoke only after synthetic token approval.

## Approval Phrase

Owner approval must explicitly include this exact phrase:

```text
I approve FlipFlop Auth wallet smoke on alfares for one synthetic Auth account/token, gateway wallet create/update/default/delete only, no checkout submit, cleanup required, redacted output only.
```

## Required Owner Inputs

- Synthetic Auth bearer token for one approved synthetic account:
  `[MISSING: owner-approved synthetic Auth token]`.
- Non-secret approval id:
  `[MISSING: FLIPFLOP_AUTH_WALLET_SMOKE_APPROVAL_ID]`.
- Confirmation that the token can create/delete wallet rows for its own Auth
  subject only.
- Optional base URL; default is `https://flipflop.alfares.cz`.

## Command Shape

Run only after approval. Do not paste token values into chat or docs.

```bash
ssh alfares 'cd /home/ssf/Documents/Github/flipflop && \
RUN_LIVE_FLIPFLOP_AUTH_WALLET_SMOKE=1 \
FLIPFLOP_AUTH_WALLET_SMOKE_CONFIRM=CHECKOUT_PROFILE_WALLET \
FLIPFLOP_AUTH_WALLET_SMOKE_APPROVAL_ID=<non-secret-approval-id> \
FLIPFLOP_AUTH_WALLET_SMOKE_BEARER_TOKEN=<synthetic-token> \
npm run smoke:auth-wallet-checkout-profile -- --execute'
```

## Allowed Runtime Calls

- `GET /checkout`
- `GET /profile/addresses`
- `GET /profile/invoice-profiles`
- `GET /api/auth/profile/checkout-data`
- `POST /api/auth/profile/delivery-addresses`
- `PATCH /api/auth/profile/delivery-addresses/:id`
- `POST /api/auth/profile/delivery-addresses/:id/default`
- `DELETE /api/auth/profile/delivery-addresses/:id`
- `GET /api/auth/profile/delivery-addresses`
- `POST /api/auth/profile/invoice-profiles`
- `PATCH /api/auth/profile/invoice-profiles/:id`
- `POST /api/auth/profile/invoice-profiles/:id/default`
- `DELETE /api/auth/profile/invoice-profiles/:id`
- `GET /api/auth/profile/invoice-profiles`

## Not Covered By This Gateway Smoke

- It does not submit checkout orders.
- It does not prove an interactive browser session with delayed wallet response
  timing. Existing source verifier covers the manual-edit guard and explicit
  selector override; a browser-session smoke remains a separate approval gate.
- It does not inspect local or Auth database rows.

## Expected Output Contract

Allowed output:

- HTTP method/path/status metadata.
- Boolean assertions for source verifier coverage, gateway checkout-data
  visibility, default selection, cleanup, and post-cleanup absence.
- Short non-reversible ID hashes.

Forbidden output:

- Bearer token, JWT, cookie, password, raw request payload, raw response body,
  DB row data, production customer data, payment/order data, or decoded token
  claims.

## Stop Conditions

Stop and do not retry automatically if:

- approval env gates are missing;
- token is not explicitly synthetic/approved;
- any cleanup fails;
- output includes raw token, cookie, request body, response body, or production
  customer data;
- a checkout/order/payment mutation would be required.

## Current Missing Facts

- `[MISSING: owner-approved synthetic Auth token for FlipFlop gateway wallet smoke]`.
- `[MISSING: owner-approved authenticated browser/session smoke for delayed wallet response and selector interaction]`.
