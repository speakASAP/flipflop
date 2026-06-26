# GOAL-09 Completion Audit: Smarty-Style Guest Checkout

Date: 2026-06-26
Repository: `/home/ssf/Documents/Github/flipflop-service`
Production URL: `https://flipflop.alfares.cz`

## Objective

Rework FlipFlop checkout so customers can buy without mandatory registration, document the Smarty.cz reference flow from owner screenshots and live inspection, save reference evidence in the remote FlipFlop repo, and implement a Czech e-commerce checkout with guest/optional account, delivery, payment, order summary, upsell, and bank-transfer QR behavior.

## Intent Preservation Chain

- Vision: remove forced registration from purchase flow while matching the familiar Czech e-commerce checkout pattern represented by Smarty.cz.
- Goal Impact: lower checkout friction and allow immediate purchase, while keeping account creation as an optional post-order convenience.
- System: FlipFlop storefront, frontend checkout, API gateway, order-service, shared auth/client helpers, Kubernetes deployment.
- Feature: guest checkout with optional account intent, Czech delivery/payment flow, sticky summary, upsell, and QR bank-transfer confirmation.
- Task: implement, document, validate, and deploy the guest checkout flow.
- Execution Plan: documented in `docs/reference/smarty-checkout/USER_FLOW.md` and GOAL-09 entries in `docs/IMPLEMENTATION_STATE.md`.
- Coding Prompt: owner request from 2026-06-26 to mirror Smarty.cz checkout behavior and preserve screenshots as references.
- Code: remote working tree changes listed by `git status --short` under GOAL-09.
- Validation: commands and runtime evidence listed below.

## Requirement Audit

| Requirement | Status | Evidence |
| --- | --- | --- |
| Guest checkout does not require login | Proven | `/checkout` uses `getGuestCart()`; verifier asserts no hard login redirect; live post-deploy smoke report asserts `noLoginRedirect: true`; live invalid `POST /api/orders/guest` now returns 400 instead of 404. |
| User can choose checkout without registration or optional account creation | Proven | Checkout has `Chci vytvořit účet`; verifier asserts no password fields and `wantsAccount` contract; order metadata records `accountActivation` intent. |
| Registration is non-blocking | Proven | Checkout submits `wantsAccount` as metadata; optional account completion is magic-link style and order submission is not gated on password creation. |
| Smarty.cz reference screenshots are saved | Proven | 13 PNG files exist in `docs/reference/smarty-checkout/screenshots/`, matching owner-provided screenshot inventory. |
| Smarty.cz user flow is documented | Proven | `docs/reference/smarty-checkout/USER_FLOW.md` documents add-to-cart, cart, delivery/payment, details, completion, validation, summary, support, and unknowns. |
| Accessory/upsell behavior is represented | Proven | Reference doc covers accessory upsell and sticky selected-product bar; checkout implementation includes operator-tip upsell and service-style cart upsell references. |
| Delivery options are visible and selectable | Proven | Checkout source includes Czech delivery options; browser evidence `03-post-deploy-delivery-payment.png`; verifier checks delivery section. |
| Delivery validation is section-specific | Proven | Reference doc captures red missing-delivery state; checkout source and browser evidence cover delivery/payment validation flow. |
| Expedition is separate from delivery | Proven | Checkout source includes `Expedice`; summary includes `Standard - jedna zásilka`; verifier checks expedition section. |
| Payment selection exists | Proven | Checkout source includes Czech payment methods; verifier checks payment section. |
| Delivery in another day exists | Proven | Checkout source includes `Chci zboží doručit v jiný den`; verifier checks the option. |
| Sticky order summary exists | Proven | Checkout source has `Souhrn objednávky` in sticky aside; post-deploy screenshots show live summary. |
| Completion/payment instruction page exists | Proven | `/payment-result` returns `HTTP/2 200`; payment result source renders bank-transfer instructions, copy buttons, and order detail. |
| Guest order route is mounted and rejects invalid payloads | Proven | `GuestOrdersController` is registered in `OrdersModule`; hardened verifier asserts `guestOrderRouteMountedAndValidated: true`; direct invalid live POST returns HTTP 400. |
| Guest totals are server-owned for products, delivery, payment, and tip | Proven | Product prices are rebuilt from DB; frontend no longer sends browser-computed `shippingCost`; order-service validates delivery/payment/tip against server-side allowlists. |
| Bank-transfer QR behavior is implemented | Proven with sample data | Payment result generates local SVG QR from QR Platba payload when IBAN/amount/VS are present; `report-payment-qr.json` asserts QR rendering with sample IBAN. |
| Production bank-transfer QR is customer-ready | Proven | `BANK_TRANSFER_ACCOUNT_NUMBER` and `BANK_TRANSFER_ACCOUNT_IBAN` are mapped from the existing Vault-backed `school-committee` payment secret through `k8s/external-secret.yaml`; `k8s/configmap.yaml` no longer shadows them with blanks; production Kubernetes Secret and live `flipflop-order-service` runtime presence were verified without exposing values. |
| Real production guest order submit is proven end to end | Proven | Owner approved one synthetic production guest-order submit. Order `ORD-1782491906806-976` was created with payment method `invoice`, pending payment status, `/payment-result` redirect, bank-account/IBAN/VS/amount params present, payment-result HTTP 200, guest metadata, magic-link account activation, and central Orders forwarding accepted. Secret values were redacted. |
| Subagent-driven development evidence exists | Proven | GOAL-09 implementation state records subagent audit fixes; verifier hardening reflects subagent findings. |

## Current Validation Evidence

Commands passed on 2026-06-26:

```bash
git diff --check
npm run verify:guest-checkout-ui
cd services/frontend && npm run build
cd services/order-service && npm run build
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
python3 scripts/deployment_readiness_gate.py --root .
```

Deployment:

```bash
./scripts/deploy.sh
```

Result: completed successfully after rebuilding and rolling out all six FlipFlop services. Later hardening deploys also completed successfully after guest-order route registration, server-side fee calculation fixes, and Vault-backed bank-transfer secret wiring.

Post-deploy live checks:

```text
flipflop-service           1/1 Running
flipflop-frontend          1/1 Running
flipflop-product-service   1/1 Running
flipflop-cart-service      1/1 Running
flipflop-order-service     1/1 Running
flipflop-user-service      1/1 Running

https://flipflop.alfares.cz/cart HTTP/2 200
https://flipflop.alfares.cz/checkout HTTP/2 200
https://flipflop.alfares.cz/payment-result?...bankAccountIban=... HTTP/2 200
POST https://flipflop.alfares.cz/api/orders/guest with {} HTTP 400
POST https://flipflop.alfares.cz/api/orders/guest approved synthetic payload created ORD-1782491906806-976
```

## Completion Gates

All GOAL-09 completion gates are closed. The only production mutation performed for final validation was one owner-approved synthetic guest order using the dedicated `CODEX-STOCK-TRACE-011` test SKU.


## Production Bank-Transfer Secret Evidence

Verified on 2026-06-26 without printing decoded secret values:

```text
ExternalSecret flipflop-service-secret: Ready=True
Kubernetes Secret contains BANK_TRANSFER_ACCOUNT_NUMBER and BANK_TRANSFER_ACCOUNT_IBAN
flipflop-order-service runtime: BANK_TRANSFER_ACCOUNT_NUMBER_PRESENT=yes
flipflop-order-service runtime: BANK_TRANSFER_ACCOUNT_IBAN_PRESENT=yes
```

The bank-transfer values are intentionally not stored in documentation or source files.


## Approved Production Guest-Order Smoke Evidence

Verified on 2026-06-26 with secret values redacted:

```text
orderNumber: ORD-1782491906806-976
productSku: CODEX-STOCK-TRACE-011
paymentMethod: invoice
paymentStatus: pending
total: 90.21
redirectPath: /payment-result
redirectHasBankAccountNumber: true
redirectHasBankAccountIban: true
redirectHasVariableSymbol: true
redirectHasAmount: true
paymentResultHttpStatus: 200
checkoutMode: guest
wantsAccount: true
accountActivation: magic-link-sent
centralOrdersForwardingStatus: accepted
```

Machine-readable evidence: `reports/validation/guest-checkout-smoke/report-production-guest-order-smoke.json`.
