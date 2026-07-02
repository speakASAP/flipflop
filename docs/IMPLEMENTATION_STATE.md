# Implementation State

## Current Status

**Date:** 2026-06-30
**Mode:** Goal-driven orchestration enabled
**Active goal:** GOAL-10-catalog-connector-content-preview
**Goal status:** implemented, validated, deployed, and runtime-smoked
**Current checkpoint:** Catalog canonical `flipflop` connector previews are deployed through the protected read-only product-service endpoint and admin sync flow. Runtime deployment completed after repairing gateway CMD layout, product-service Prisma client packaging, and product-service entrypoint layout tolerance.





## 2026-07-02 - F1 Central Orders Checkout And Cabinets

Objective: make sellable FlipFlop checkout central-Orders-first and render central Orders lifecycle state in customer and admin cabinets.

IPS chain:

- Vision: FlipFlop checkout must preserve first-revenue safety while central Orders owns authoritative order lifecycle.
- Goal Impact: Prevents Payments from receiving local-only order numbers and avoids duplicate local Warehouse stock mutation after central handoff.
- System: FlipFlop order-service, shared Orders client, shared Payments client, customer order pages, admin order pages, central Orders API, Payments bridge, Warehouse.
- Feature: Central Orders-first checkout and central lifecycle cabinets.
- Task: Accept central Orders before payment, pass central UUID to Payments, guard local Warehouse success mutations for central-owned orders, and render central lifecycle/totals/address/stale states.
- Execution Plan: `docs/orchestrator/2026-07-02-central-orders-checkout-and-cabinets-plan.md`.
- Coding Prompt: F1 FlipFlop central Orders checkout and cabinets worker prompt from orchestrator.
- Code: Implemented in `services/order-service/src/orders/orders.service.ts`, `services/order-service/src/orders/admin-orders.controller.ts`, `shared/clients/order-client.service.ts`, `shared/payments/payment.interface.ts`, `shared/payments/payment.service.ts`, `services/frontend/lib/api/orders.ts`, `services/frontend/app/orders/**`, `services/frontend/app/admin/orders/**`, and `scripts/verify-orders-hub-integration.js`.
- Validation: `cd shared && npm run build` passed; `cd services/order-service && npm run build` passed; `cd services/frontend && npm run build` passed; `npm run verify:orders-hub-integration` passed; `python3 scripts/pre_coding_gate.py --root .` passed; `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed 100/100.

Parallel execution section:

- F1 central checkout/order-service lane: complete in current source; owner role FlipFlop checkout worker; central Orders is required before payment and central-owned payment callbacks skip duplicate local Warehouse mutation.
- F1 shared client/payment contract lane: complete in current source; owner role integration contract worker; Payments receives central Orders UUID and local identifiers in metadata.
- F1 customer/admin cabinet lane: complete in current source; owner role frontend cabinets worker; customer and admin order pages render central lifecycle, totals, currency, delivery address, and stale/error state when available.
- Runtime validation lane: dependency-gated; owner role deployment/runtime validator; no deploy from this lane.
- Integration lane: final integration owner must coordinate with concurrent checkout/bundle staged work before commit/push.

Known blockers/gaps:

- `[MISSING: Orders lifecycle read endpoint]` remains as an explicit adapter placeholder until central Orders exposes a stable lifecycle read endpoint.
- Live `npm run verify:guest-checkout-ui` is blocked by `https://flipflop.alfares.cz/cart` returning HTTP 503; no deploy was run by this lane.
- Remote repo currently has concurrent unrelated staged changes in validation reports and `services/frontend/app/checkout/page.tsx`, plus an unrelated ahead commit; preserve and coordinate before any commit/push.

Next action: land or confirm the central Orders lifecycle read endpoint, then rerun live checkout/cabinet smoke after `/cart` returns HTTP 200.

## 2026-07-02 - Product Detail Bundle Discount Contract

Objective: implement a real server-side bundle-discount contract so product-detail buy-together savings can be applied to checkout/order/payment totals without trusting browser price copy.

IPS chain:

- Vision: FlipFlop storefront should sell real products efficiently and safely at `https://flipflop.alfares.cz/`.
- Goal Impact: Converts GOAL-12 display-only upsell savings into a validated checkout contract while preserving first-revenue payment safety.
- System: Next.js storefront checkout, order-service pricing/order creation, central Orders forwarding, payments-microservice initiation, Warehouse reservation.
- Feature: Server-validated product-detail bundle discount.
- Task: Carry bundle intent by product ids, validate eligibility server-side, reject raw browser money inputs, compute discount/free-shipping savings in order-service, and send the exact discounted order total to Payments.
- Execution Plan: `implementation-goals/GOAL-13-product-detail-bundle-discount-contract.execution-plan.md`.
- Coding Prompt: `implementation-goals/GOAL-13-product-detail-bundle-discount-contract.coding-prompt.md`.
- Code: pending.
- Validation: `implementation-goals/GOAL-13-product-detail-bundle-discount-contract.validation-report.md`.

Parallel execution section:

- Cart/checkout pricing contract lane: complete read-only; owner role pricing contract explorer; identified order-service as payable total authority.
- Order/payment total validation lane: complete read-only; owner role payment contract explorer; identified raw `discount` and authenticated `shippingCost` risks and payment amount propagation.
- Frontend bundle token/checkout UX lane: complete read-only; owner role storefront explorer; identified dropped bundle identity and checkout payload change.
- Verifier/docs lane: complete read-only; owner role verifier explorer; identified GOAL-13 artifact and verifier requirements.
- Integration lane: active in original thread; owner role checkout pricing integrator; allowed files listed in the GOAL-13 execution plan; validation owner original thread.

Current checkpoint: GOAL-13 plan/context/coding artifacts saved. Pre-coding gates and implementation pending.

Known blockers/gaps:

- `[UNKNOWN: whether local product prices are gross CZK prices or net prices requiring VAT]`; this goal preserves current order-service tax behavior.
- `[MISSING: Catalog bundle ownership decision]`; no durable Catalog bundle aggregate is added in GOAL-13.
- `[MISSING: Warehouse bundle reservation contract]`; GOAL-13 preserves existing per-item Warehouse reservation/decrement authority.

Next action: run IPS pre-coding gates, implement the smallest safe bundle-intent contract, validate, deploy if gates pass, and run non-mutating production smoke.

## 2026-07-02 - Product Detail Upsell Recommendations

Objective: add Amazon-style related products and a buy-together set under product detail pages, using purchase history when available and deterministic category fallback otherwise.

IPS chain:

- Vision: FlipFlop storefront should sell real products efficiently at `https://flipflop.alfares.cz/`.
- Goal Impact: Increases product discovery and basket size while preserving checkout-to-first-revenue safety.
- System: Product-service public product recommendations and Next.js product detail page.
- Feature: Product detail related products and buy-together set.
- Task: Add deterministic related products, co-purchase ranking from confirmed local orders where available, fallback bundle creation, and CZK savings presentation.
- Execution Plan: `implementation-goals/GOAL-12-product-detail-upsell-recommendations.execution-plan.md`.
- Coding Prompt: `implementation-goals/GOAL-12-product-detail-upsell-recommendations.coding-prompt.md`.
- Code: Implemented in `services/product-service/src/products/products.controller.ts`, `services/product-service/src/products/products.service.ts`, `services/frontend/lib/api/products.ts`, `services/frontend/app/products/[id]/page.tsx`, and `services/frontend/components/AddBundleToCartButton.tsx`.
- Validation: `implementation-goals/GOAL-12-product-detail-upsell-recommendations.validation-report.md`.

Parallel execution section:

- Backend recommendation contract lane: complete; owner role product-service integrator; added public read-only `GET /products/:id/recommendations`; validation owner original thread.
- Frontend product detail UI lane: complete; owner role storefront integrator; renders `Výhodný set`, CZK savings copy, bundle add-to-cart action, and related products below product detail; validation owner original thread.
- Verification/docs lane: complete; owner role original thread; added `scripts/verify-product-detail-upsell.js`, `npm run verify:product-detail-upsell`, GOAL-12 docs, and state evidence; validation owner original thread.
- Deployment lane: complete; owner role original thread; production rollout required manual image push/rollout recovery after SSH stream/context cancellation and paused deployments.

Validation evidence:

- `npm run verify:product-detail-upsell` passed 20 source/contract checks.
- `cd services/product-service && npm run build` passed.
- `cd services/frontend && npm run build` passed with only existing Next.js workspace-root/browserslist warnings.
- `python3 scripts/pre_coding_gate.py --root .` passed.
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed 100/100 before implementation.
- `python3 scripts/deployment_readiness_gate.py --root .` passed.
- `git diff --check` passed.

Post-deploy evidence:

- `flipflop-product-service` rolled out with image `localhost:5000/flipflop-product-service:goal12-upsell-20260702163830`; the new pod logs map `GET /products/:id/recommendations`.
- `flipflop-frontend` rolled out from `localhost:5000/flipflop-frontend:latest` after resume/restart.
- Deployments are `1/1` ready for `flipflop-frontend` and `flipflop-product-service`.
- Public `GET https://flipflop.alfares.cz/api/products/0fe70677-2b0c-4227-bdf5-0e819cefd28d/recommendations` returned HTTP 200 with `success=true`, `relatedProducts`, and bundle data.
- Public `GET https://flipflop.alfares.cz/products/0fe70677-2b0c-4227-bdf5-0e819cefd28d` returned HTTP 200 and rendered `Výhodný set`, `Ušetříte 159 Kč`, `Často kupované společně`, and `Související produkty`.

Known contract boundary:

- The bundle discount is presented as deterministic upsell savings in CZK and the bundle CTA adds items to the cart. It does not mutate checkout/order totals yet; a real applied checkout discount needs a separate server-side bundle-discount contract.

Next action: define and implement the real checkout/order bundle-discount contract if the displayed bundle savings must be applied to payment totals.

## 2026-07-02 - Storefront Dynamic Search And Top Menu Filters

Objective: move public product filtering into the top navigation and remove dedicated search buttons so the product grid remains the primary selling surface.

IPS chain:

- Vision: FlipFlop must serve a production storefront that sells products efficiently at `https://flipflop.alfares.cz/`.
- Goal Impact: Preserves more viewport space for products and removes friction from product discovery.
- System: Next.js storefront header, public `/products` page, and admin list search controls.
- Feature: Dynamic product discovery without dedicated search buttons.
- Task: Move name/type/price filters to the top menu near category navigation, remove the body filter panel, remove `Hledat` search buttons, and document the UX invariant.
- Execution Plan: Keep API contracts unchanged; update only frontend presentation/query routing and documentation; preserve category/search/minPrice/maxPrice URL parameters.
- Coding Prompt: Do not change product prices, stock, checkout, payment, auth, order behavior, or product-service filtering contracts.
- Code: Updated `services/frontend/components/Header.tsx`, `services/frontend/app/products/page.tsx`, admin dynamic list filters, `docs/INTENT_MEMORY.md`, `docs/process/PROJECT_INVARIANTS.md`, and this state entry.
- Validation: `python3 scripts/pre_coding_gate.py --root .` passed; `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed; `python3 scripts/deployment_readiness_gate.py --root .` passed; `git diff --check` passed; `cd services/frontend && npm run build` passed; live `GET https://flipflop.alfares.cz/products?search=bal` returned HTML with top-menu filters and zero `>Hledat<`/`>Search<`/`>Find<`/`>Najít<` button labels; live product API search returned `success=true`.

Parallel execution section:

- Storefront header/page lane: complete in source; owner role frontend storefront integrator; allowed files `services/frontend/components/Header.tsx`, `services/frontend/app/products/page.tsx`; validation owner original thread.
- Search-button cleanup lane: complete in source for current repo matches; owner role frontend hygiene; allowed files `services/frontend/app/admin/products/page.tsx`, `services/frontend/app/admin/users/page.tsx`; validation owner original thread.
- Documentation invariant lane: complete in source; owner role intent/documentation maintainer; allowed files `docs/INTENT_MEMORY.md`, `docs/process/PROJECT_INVARIANTS.md`, `docs/IMPLEMENTATION_STATE.md`; validation owner original thread.
- Deployment lane: ready after frontend build and deployment-readiness gate; owner role original thread; merge order source, validation, deploy, production smoke.

Next action: validate frontend build, run deployment readiness, deploy, and smoke `/products`.

## 2026-07-02 - Catalog/Warehouse Offer Gate Correction

Objective: stop FlipFlop from showing or selling local products that are no longer active in Catalog or have no sellable Warehouse stock.

IPS chain:

- Vision: FlipFlop storefront must show sellable products from shared Catalog and Warehouse data.
- Goal Impact: Removes stale local product rows from the public offer surface so deleted Catalog products or zero-stock Warehouse products cannot be bought.
- System: FlipFlop product-service public product API, cart-service add/update validation, shared Catalog client, shared Warehouse client, guest checkout verifier.
- Feature: Catalog-backed FlipFlop offer gate.
- Task: Treat local Product rows as FlipFlop listing records only; before public listing/detail/cart use, resolve Catalog truth and Warehouse availability live, fail closed when either source is missing, inactive, deleted, archived, or zero stock.
- Execution Plan: Keep schema unchanged; do not mutate Catalog, Warehouse, prices, orders, payments, or stock; only tighten public offer eligibility and add a repeatable verifier.
- Coding Prompt: Do not preserve local `stockQuantity` as sellable truth; do not reintroduce local-only product fallback; keep Warehouse as quantity authority.
- Code: Updated product-service to default public `GET /products` and `GET /products/:id` to Catalog-linked, Warehouse-positive offers only; added `source=local` as an explicit legacy/admin escape hatch; updated cart-service to reject local-only or Catalog-inactive products before Warehouse stock checks; added `scripts/verify-flipflop-offer-gate.js` and `npm run verify:flipflop-offer-gate`.
- Validation: `python3 scripts/pre_coding_gate.py --root .` passed; `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed; `node scripts/verify-flipflop-offer-gate.js` passed; `cd services/product-service && npm run build` passed; `cd services/cart-service && npm exec -- tsc --noEmit` passed; `cd services/cart-service && npm run build` still stops after TypeScript on pre-existing `tsc-alias: not found`; `git diff --check` passed; `node scripts/verify-orders-hub-integration.js` passed; `npm run verify:guest-checkout-ui` passed.

Parallel execution section:

- Product offer gate lane: complete in source; owner role storefront/catalog integrator; allowed file `services/product-service/src/products/products.service.ts`; validation owner original thread.
- Cart sellability gate lane: complete in source; owner role cart/stock integrator; allowed file `services/cart-service/src/cart/cart.service.ts`; validation owner original thread.
- Admin preview compatibility lane: complete in source; owner role frontend integration; allowed files `services/frontend/lib/api/products.ts`, `services/frontend/app/admin/sync/page.tsx`; validation owner original thread.
- Deployment lane: ready now after deployment-readiness gate; owner role original thread; merge order source, validation, deploy, production smoke.

Post-deploy evidence:

- `./scripts/deploy.sh` completed successfully in 425.67s after building and rolling out all six FlipFlop workloads.
- Final pods are `1/1 Running` for `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`, `flipflop-cart-service`, `flipflop-order-service`, and `flipflop-user-service`; old terminating pods self-cleared.
- Public `GET https://flipflop.alfares.cz/api/products?limit=8` returned `success=true`, `count=3`, and every item had `catalogProductId`, positive `stockQuantity`, and `warehouse.source=warehouse-microservice`.
- Public `GET https://flipflop.alfares.cz/api/products/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4` returned HTTP 404 for a stale local sample product that was previously shown on the storefront.
- Post-deploy `npm run verify:guest-checkout-ui` passed and remained non-mutating.
- Post-deploy `npm run verify:flipflop-offer-gate` passed.

Cart availability follow-up:

- Authenticated `GET /cart` now revalidates every persisted cart row against Catalog lifecycle state and Warehouse sellable stock before returning it.
- Persisted cart rows for missing, inactive, deleted, archived, unlinked, or zero-stock products are removed during cart read; rows with quantity above live Warehouse stock are reduced to the available stock.
- Guest cart display now refreshes localStorage items through the public product API and removes or reduces stale items before showing the cart.
- Updated `npm run verify:flipflop-offer-gate` to cover cart read cleanup in addition to add/update rejection.
- Validation: `npm run verify:flipflop-offer-gate` passed; `cd services/cart-service && npm exec -- tsc --noEmit` passed; `cd services/frontend && npm run build` passed; `git diff --check` passed.

Next action: monitor Catalog bulk publication volume; if the public storefront should show more products, publish additional Catalog products through the native FlipFlop lifecycle after Warehouse stock is positive.



## 2026-07-02 - Product Detail Photo Gallery

Objective: make product photos easier to inspect from the public product detail page without changing catalog, stock, price, cart, checkout, payment, auth, or order contracts.

IPS chain:

- Vision: FlipFlop must serve a production storefront that helps customers evaluate sellable products at `https://flipflop.alfares.cz/`.
- Goal Impact: Improves buyer confidence by making product imagery browsable, previewable, and zoomable on desktop and mobile.
- System: Next.js storefront product detail page.
- Feature: Product photo carousel and enlarged image preview.
- Task: Replace static image thumbnails with an interactive gallery supporting thumbnails, explicit previous/next controls, fullscreen preview, zoom, keyboard arrows, Escape close, and mobile swipe navigation.
- Execution Plan: Keep API and data contracts unchanged; normalize existing `mainImageUrl`, `imageUrls`, and `images` fields in the frontend only; add a local client component without new dependencies; do not deploy.
- Coding Prompt: Do not mutate prices, stock, checkout, payment state, auth, order behavior, backend product filtering, or warehouse/catalog integration.
- Code: Added `services/frontend/components/ProductImageGallery.tsx` and connected it from `services/frontend/app/products/[id]/page.tsx`.
- Validation: `python3 scripts/pre_coding_gate.py --root .` passed; `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed; `cd services/frontend && npm exec eslint app/products/[id]/page.tsx components/ProductImageGallery.tsx` passed; `npm --prefix services/frontend run build` passed. Full `npm --prefix services/frontend run lint` remains blocked by pre-existing lint errors in unrelated files (`app/cart/page.tsx`, `app/checkout/page.tsx`, login/register/payment-result pages, Header, ShoppingAssistant, instrumentation, and API client).

Parallel execution section:

- Gallery component lane: complete in source; owner role frontend product-detail integrator; allowed files `services/frontend/components/ProductImageGallery.tsx`, `services/frontend/app/products/[id]/page.tsx`; validation owner original thread.
- Sidecar audit lane: complete read-only through sub-agent; owner role codebase explorer; allowed scope remote inspection only; output identified product detail files and validation scripts.
- Commit/push lane: ready now; owner role original thread; scope all current FlipFlop repository changes per owner request; forbidden scope deployment; merge order source, docs/state, validation, commit, push.

Next action: commit and push all current FlipFlop changes without deployment.


## 2026-07-01 - Hosted Auth Local Profile Sync Hotfix

Objective: stop hosted Auth users from being logged out immediately after returning to FlipFlop when no local FlipFlop profile exists yet.

IPS chain:

- Vision: Preserve checkout-to-first-revenue and shared ecosystem Auth at `https://flipflop.alfares.cz/`.
- Goal Impact: Lets existing Alfares Auth users stay signed in on FlipFlop without requiring app-local login/register forms.
- System: Auth-hosted login, FlipFlop api-gateway JWT validation, `flipflop-user-service`, local FlipFlop customer profile rows.
- Feature: Post-handoff local customer profile synchronization.
- Task: Resolve or create the local FlipFlop profile from the validated Auth user before returning `/api/users/profile` or address data.
- Execution Plan: Keep Auth as credential/token owner; never copy passwords; create only a local application profile using the existing `magic-link-pending:<uuid>` placeholder pattern when no local profile exists; preserve existing local profile rows by email when present.
- Coding Prompt: Do not change Auth JWT issuance, hosted Auth routes, checkout totals, payment state, order state, secrets, or production user data manually.
- Code: Updated `services/user-service/src/users/users.service.ts` and `services/user-service/src/users/users.controller.ts` so user profile/address operations resolve a local profile from the validated Auth user and create one on first login if needed.
- Validation: `python3 scripts/pre_coding_gate.py --root .` passed; `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed before code edits; `git diff --check -- services/user-service/src/users/users.service.ts services/user-service/src/users/users.controller.ts` passed; `cd services/user-service && npm exec -- tsc --noEmit` passed. `cd services/user-service && npm run build` is blocked by pre-existing service-local dependency layout: `tsc-alias: not found` after TypeScript compilation.

Parallel execution section:

- User-service profile sync lane: complete in source; owner role Auth consumer integrator; allowed files `services/user-service/src/users/users.service.ts`, `services/user-service/src/users/users.controller.ts`; validation owner original thread.
- Runtime deployment lane: ready after deployment-readiness gate; owner role integration/deploy operator; forbidden scope Auth microservice secrets, production DB manual edits, payment/order/stock mutations; validation owner original thread.

Next action: run deployment-readiness gate, deploy FlipFlop, then smoke hosted Auth callback/profile behavior.


## 2026-07-01 - Fio QR Payment Via Payments Microservice

Objective: add QR-code bank payment to FlipFlop checkout using the same shared `payments-microservice` Fio provider contract that Marathon uses.

IPS chain:

- Vision: Preserve checkout-to-first-revenue through shared ecosystem payments at `https://flipflop.alfares.cz/`.
- Goal Impact: Adds a customer-visible QR bank-transfer option without changing prices, discounts, order totals, stock logic, or payment-state transitions.
- System: Next.js checkout, NestJS order-service, shared payment client, `payments-microservice` Fio provider.
- Feature: `fiobanka` QR payment option in checkout.
- Task: Expose `fiobanka` in checkout, allow it through guest-order validation, forward `successUrl` and `cancelUrl` to `payments-microservice`, and verify runtime callback configuration.
- Execution Plan: Keep local `invoice` bank-transfer QR unchanged; route the new customer QR option through `payments-microservice` with `applicationId=flipflop-service`, `paymentMethod=fiobanka`, callback URL, and hosted result URLs.
- Coding Prompt: Do not mutate order totals, payment status, webhook trust, provider credentials, Stripe/PayPal keys, stock reservation logic, or local invoice QR rendering.
- Code: Updated checkout payment options, order-service payment validation/request payloads, shared payment client success/cancel forwarding, and guest-checkout verifier assertions.
- Validation: `python3 scripts/pre_coding_gate.py --root .` passed; `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed; `git diff --check` passed; `node --check scripts/verify-guest-checkout-ui.js` passed; `npm run verify:guest-checkout-ui` passed; `cd shared && npm run build` passed; `cd services/order-service && npm run build` passed; `cd services/frontend && npm run build` passed.

Runtime evidence before config repair:

- `payments-microservice` allows `flipflop-service` in `PAYMENT_ALLOWED_APPLICATION_IDS`.
- `payments-microservice` has Stripe and PayPal provider credentials present by env-name check only.
- `payments-microservice` has `FIO_BANKA_ACCOUNT_NUMBER` present by env-name check only.
- `[MISSING: flipflop-service entry in payments-microservice PAYMENT_CALLBACK_API_KEYS]` was found before runtime callback-map repair.
- Runtime callback-map repair merged the existing FlipFlop webhook key into `payments-marathon-integration/PAYMENT_CALLBACK_API_KEYS`; `payments-microservice` rollout completed and the new pod reports `flipflop-service` present in callback keys.

Parallel execution section:

- Frontend checkout lane: complete in this session; owner role frontend integrator; allowed file `services/frontend/app/checkout/page.tsx`; validation owner original thread.
- Backend payment contract lane: complete in this session; owner role payment integration; allowed files `services/order-service/src/orders/orders.service.ts`, `shared/payments/payment.service.ts`, `shared/payments/payment.interface.ts`; validation owner original thread.
- Runtime callback-map lane: complete in this session; owner role platform/secrets operator; allowed scope Kubernetes secret value merge for `PAYMENT_CALLBACK_API_KEYS`; forbidden scope provider keys and payment account values; validation owner original thread.
- Deployment lane: complete in this session; `./scripts/deploy.sh` built and pushed images, timed out on k3s/containerd rollout waits, then manual recovery waited all deployments ready and removed stuck old terminating pods.

Post-deploy evidence:

- `python3 scripts/deployment_readiness_gate.py --root .` passed.
- `./scripts/deploy.sh` built/pushed FlipFlop images and applied manifests; rollout needed manual wait/cleanup for the known stale terminating pod condition.
- Final deployments are `1/1` ready/available for `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`, `flipflop-cart-service`, `flipflop-order-service`, and `flipflop-user-service`.
- Public smoke returned HTTP 200 for `/`, `/checkout`, `GET /api/products?limit=1`, and `https://payments.alfares.cz/health`.
- Deployed checkout JavaScript contains the `QR platba bankovnim prevodem` option text.
- Deployed order-service runtime has `PAYMENT_APPLICATION_ID=flipflop-service`, payment service URL, success/cancel result URLs, API key, and webhook key present by env-name check only.
- Deployed `payments-microservice` runtime allows `flipflop-service`, has `flipflop-service` in callback keys, and has Fio account, Stripe, and PayPal provider config present by env-name check only.
- `npm run verify:guest-checkout-ui` passed after deploy and remained non-mutating.

Live payment mutation: not run in this session; no production order/payment was created without a separate owner-approved mutating smoke.

Next action: optional owner-approved live `fiobanka` test order/payment smoke if provider-level QR creation evidence is required.



## 2026-07-01 - Checkout Address Autocomplete

Objective: let FlipFlop customers choose Czech billing and delivery addresses from search suggestions during checkout/profile address entry instead of manually filling street, city, and PSČ.

IPS chain:

- Vision: Make FlipFlop production-ready and revenue-capable while preserving guest checkout and shared ecosystem service boundaries.
- Goal Impact: Reduces checkout friction and address-entry mistakes without changing order totals, payment status, stock, auth, or customer-data contracts.
- System: FlipFlop Next.js frontend, api-gateway public `/api/address-autocomplete`, PostgreSQL `ruian_address_points`, and a controlled RÚIAN/ČÚZK import script.
- Feature: Czech address autocomplete for checkout billing/delivery and saved delivery addresses.
- Task: Replace paid Google Places dependency with local RÚIAN address search, preserve manual fallback fields, document the free source, and add validation coverage.
- Execution Plan: Import official ČÚZK RÚIAN address points into PostgreSQL; search normalized local address text through api-gateway; return street, city, PSČ, country, and stable `ruian:<id>` suggestions to the existing frontend component.
- Coding Prompt: Do not change order payload shape, shipping/payment calculation, product/cart behavior, hosted Auth flow, pricing, stock, or payment state.
- Code: Added `ruian_address_points` migration, `AddressAutocompleteService`, public api-gateway route, local dev frontend proxy, RÚIAN importer script, env docs, verifier assertions, and removed Google Places frontend secret wiring.
- Validation: `python3 scripts/pre_coding_gate.py --root .` passed before implementation; `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed before implementation. Post-change validation is tracked in the implementation handoff.

Provider decision:

- The public OpenStreetMap Nominatim service was rejected for this use because its current usage policy forbids autocomplete against the public API.
- Google Places was rejected because Maps Platform billing is required for production Places usage.
- Official ČÚZK/RÚIAN address data is the selected free Czech-only source. Current import default: `https://services.cuzk.gov.cz/vfr/202604/20260403_ST_UADS.xml.zip`.

Runtime blocker:

- `[MISSING: production ruian_address_points import until migration is applied and scripts/import-ruian-addresses.js is run with DATABASE_URL]`

Parallel execution section:

- Backend/local data lane: complete in source; owner role backend integrator; files changed `services/api-gateway/src/gateway/*`, `prisma/migrations/20260701_ruian_address_points/migration.sql`, `scripts/import-ruian-addresses.js`; validation owner original thread.
- Frontend checkout/profile lane: complete; owner role frontend integrator; files changed `services/frontend/components/AddressAutocomplete.tsx`, `services/frontend/app/api/address-autocomplete/route.ts`; validation owner original thread.
- Data import lane: ready now after migration; owner role platform/database operator; allowed scope run importer with `DATABASE_URL`; forbidden scope order/payment/product mutations; validation owner integration owner.
- Production deploy lane: dependency-gated on migration/import validation; merge order source, migration, sample import, full import, deploy, production smoke.

Next action: apply the migration, run a sample RÚIAN import, then run the full import and smoke `/checkout?step=details` address suggestions.

## 2026-07-01 - Goal 7.2 Orders Smoke Production Readiness Recheck

Objective: prepare a sanitized FlipFlop-to-Orders create/idempotency/Warehouse-reservation production smoke and run it only if runtime prerequisites are present.

IPS chain:

- Vision: Make FlipFlop production-ready and revenue-capable while using shared ecosystem services for Orders, Warehouse, Catalog, Payments, Auth, and Logging.
- Goal Impact: Goal 7.2 checks whether the deployed FlipFlop order-service can safely prove central Orders forwarding and Warehouse reservation in production without printing secrets or personal data.
- System: FlipFlop order-service, central Orders API, Warehouse API, ExternalSecret/Vault-projected runtime tokens.
- Feature: Orders hub integration production readiness smoke.
- Task: Run source verifier, verify runtime prerequisites by presence/status only, prepare sanitized smoke runner, and block before mutation when prerequisites are missing.
- Execution Plan: Use `scripts/smoke-orders-readiness.js`; it runs non-mutating deployment/env/auth probes first, writes `reports/validation/orders-readiness-smoke/report-latest.json`, and only creates a live test order when prerequisites pass and `RUN_LIVE_ORDERS_SMOKE=1` is set.
- Coding Prompt: Keep edits to lane-local smoke/validation docs only; do not edit Orders, Warehouse, Catalog, Leads, Marketing, or unrelated FlipFlop service code; do not print secret values.
- Code: Added `scripts/smoke-orders-readiness.js` as a sanitized, prerequisite-gated runner.
- Validation: `npm run verify:orders-hub-integration` passed; `node --check scripts/smoke-orders-readiness.js` passed; `cd shared && npm run build` passed; `cd services/order-service && npm run build` passed; `RUN_LIVE_ORDERS_SMOKE=1 node scripts/smoke-orders-readiness.js` stopped before mutation and wrote the blocker report.

Runtime prerequisite result:

- `flipflop-order-service` deployment ready/available: 1/1.
- `flipflop-service-secret` ExternalSecret Ready=True and `ORDERS_SERVICE_TOKEN` Kubernetes Secret data is present.
- Deployed order-service env presence: `ORDERS_SERVICE_URL`, `ORDERS_MICROSERVICE_URL`, `ORDERS_SERVICE_TOKEN`, `WAREHOUSE_SERVICE_URL`, `JWT_TOKEN`, and `TEST_PASSWORD` are present by name; `WAREHOUSE_SERVICE_TOKEN` and `DEFAULT_WAREHOUSE_ID` are not present.
- Central Orders auth probe from the deployed order-service pod now uses `x-internal-service-token` plus `x-service-name=flipflop-service`; the non-mutating synthetic create probe returned HTTP 400, proving auth reached create-body validation without creating an order.
- Warehouse `/api/warehouses` probe from the deployed order-service pod still returned HTTP 401 and no Warehouse id was available.

Blockers:

- `[MISSING: warehouseId]`
- `[MISSING: WAREHOUSE_SERVICE_TOKEN accepted by warehouse-microservice]`
- `[UNKNOWN: approved Auth/Vault runtime path for a FlipFlop-to-Warehouse service principal token with the Warehouse-required role]`

Live smoke status: not run; the runner stopped before creating an order because runtime prerequisites are missing.

Parallel execution section:

- Orders auth lane: complete in FlipFlop source; `OrderClientService` now sends Orders internal service headers and the sanitized probe verifies create-route auth acceptance without mutation.
- Warehouse reservation lane: ready now; owner role Warehouse/Auth/Secrets operator; allowed scope is Warehouse/Auth service-principal provisioning and Vault/Kubernetes projection for `WAREHOUSE_SERVICE_TOKEN`, plus an approved default warehouse source if required; forbidden files are Orders code and unrelated FlipFlop service behavior; expected output is Warehouse accepting the deployed FlipFlop service token for `/api/warehouses` and reservation endpoints, with one Warehouse-owned `warehouseId` available; validation owner FlipFlop integration owner.
- FlipFlop final smoke lane: dependency-gated; owner role this integration lane; allowed files `scripts/smoke-orders-readiness.js`, `reports/validation/orders-readiness-smoke/*`, and this status addendum; forbidden files Orders/Warehouse/Catalog/Leads/Marketing repos unless owner explicitly opens those lanes; merge order Warehouse service principal/default warehouse, FlipFlop rerun.

Next action: provision/project an Auth-compatible Warehouse service token and a Warehouse-owned default id for FlipFlop, then rerun `RUN_LIVE_ORDERS_SMOKE=1 node scripts/smoke-orders-readiness.js`.

Post-deploy evidence:

- Commit `83c71c7` was deployed with `./scripts/deploy.sh`; the deploy script timed out during rollout while replacement pods were still pulling images, with old ready pods continuing to serve.
- Recovery was limited to recreating stuck replacement pods; all six FlipFlop deployments then reported `1/1` ready/available: `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`, `flipflop-cart-service`, `flipflop-order-service`, and `flipflop-user-service`.
- Post-rollout public checks returned HTTP 200 for `GET https://flipflop.alfares.cz/` and `GET https://flipflop.alfares.cz/api/products?limit=1`.
- Post-rollout `RUN_LIVE_ORDERS_SMOKE=1 node scripts/smoke-orders-readiness.js` stopped before mutation and refreshed `reports/validation/orders-readiness-smoke/report-latest.json`; Orders create auth still reached validation with HTTP 400, while Warehouse remained blocked with HTTP 401 and no Warehouse id.
- Remaining blockers are `[MISSING: warehouseId]` and `[MISSING: WAREHOUSE_SERVICE_TOKEN accepted by warehouse-microservice]`.

## 2026-06-30 - GOAL-10 Runtime Deployment Addendum

Deployment status changed from no-deploy source lane to deployed Goal 19 channel integration after owner requested full connector rollout.

Runtime deployment evidence:

- Commit `1580942` added the Catalog connector preview endpoint and admin sync UI.
- Commit `0c199ce` repaired runtime image packaging: gateway now starts whichever compiled layout is present, and product-service syncs generated Prisma client into service-local `node_modules`.
- Commit `e4f8781` made the product-service image entrypoint layout tolerant.
- Final `./scripts/deploy.sh` completed successfully in 181.24s.
- New pods reached `1/1 Running`: `flipflop-service-6c9646f57d-hwvzk`, `flipflop-product-service-6bfd8555f8-zm4bn`, `flipflop-frontend-5b9d5985d8-789cl`, `flipflop-cart-service-55d6446c9b-f6g6h`, `flipflop-order-service-76748648fd-f6vh5`, and `flipflop-user-service-5cf5fc9895-4b49w`.
- Production smoke returned `https://flipflop.alfares.cz/` HTTP 200 and `https://flipflop.alfares.cz/api/products?limit=1` HTTP 200.
- The protected preview route is mapped as `GET /products/:id/catalog-content-preview`; anonymous calls are blocked by the existing JWT guard, although missing/invalid token exceptions currently surface as HTTP 500 because of the shared guard exception-class boundary.

Boundary decision: no checkout, cart, order, payment, pricing, stock, supplier-service, storefront ownership, marketplace publish, or customer-data mutation was performed.

Next action: optional hardening to normalize shared guard missing/invalid token failures to HTTP 401.

## 2026-06-30 - GOAL-10 Catalog Connector Content Preview Implementation

Implemented a bounded no-deploy Catalog connector preview lane:

- Added `CatalogClientService.getProductContentPreview(...)` for Catalog canonical content previews with marketplace key `flipflop`.
- Added protected product-service `GET products/:id/catalog-content-preview` under the existing products gateway path.
- Added frontend admin API typing and method for the preview response.
- Replaced the admin sync page's live Allegro dependency with a Catalog product list and selected connector preview display.
- Preserved storefront, checkout, cart, order, payment, pricing, stock, Prisma, Kubernetes, secret, supplier-service, and deploy boundaries.

Parallel execution section completion:

- Backend connector preview endpoint: completed; validation owner original thread.
- Frontend admin preview surface: completed after backend contract; validation owner original thread.
- IPS/state integration: completed after source validation; merge order docs, backend, frontend, validation/state.

Validation passed:

- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `git diff --check`
- `cd services/product-service && npm run build`
- `cd services/frontend && npm run build`

Validation notes:

- Strict documentation audit initially failed on new-doc route literals and graph edges; docs were corrected and final audit passed 100/100.
- Product-service build initially failed on stale generated shared declarations; source was adjusted without generated shared-dist churn and final build passed.
- Frontend build passed with non-blocking baseline-browser-mapping age and Next.js workspace-root warnings.

Deployment: not run by owner instruction.

Next step: owner review and deployment approval if the admin preview should be released.

## 2026-06-30 - GOAL-10 Catalog Connector Content Preview Planning

Owner requested a bounded no-deploy FlipFlop lane to expose Catalog canonical content connector previews in the product-service/admin flow. Scope is limited to a read-only `flipflop` marketplace preview path and one admin product/sync surface. Forbidden areas remain supplier-service deployment wiring, `/api/allegro` live route repair, checkout/cart/order/payment/pricing/stock ownership, Prisma migrations, Kubernetes, secrets, and deployment.

Planning artifacts added:

- `implementation-goals/GOAL-10-catalog-connector-content-preview.md`
- `implementation-goals/GOAL-10-catalog-connector-content-preview.execution-plan.md`
- `implementation-goals/GOAL-10-catalog-connector-content-preview.context-package.md`
- `implementation-goals/GOAL-10-catalog-connector-content-preview.coding-prompt.md`
- `implementation-goals/GOAL-10-catalog-connector-content-preview.validation-report.md`
- `11_tasks/TASK-003-catalog-connector-content-preview.md`
- `22_goal_impact/GOAL-IMPACT-TASK-003-catalog-connector-content-preview.md`
- `21_execution_plans/EP-TASK-003-catalog-connector-content-preview.md`
- `13_context_packages/CP-TASK-003-catalog-connector-content-preview.md`
- `14_prompts/PROMPT-TASK-003-catalog-connector-content-preview.md`
- `12_validation/VAL-TASK-003-catalog-connector-content-preview.md`

Parallel execution section:

- Backend connector preview endpoint: ready now; owner role worker; allowed files `shared/clients/catalog-client.service.ts`, `services/product-service/src/products/products.controller.ts`, `services/product-service/src/products/products.service.ts`; validation owner original thread.
- Frontend admin preview surface: dependency-gated on backend response type; owner role worker; allowed files `services/frontend/lib/api/admin.ts`, `services/frontend/app/admin/sync/page.tsx`; validation owner original thread.
- IPS/state integration: final integration; owner role original thread; shared files `implementation-goals/README.md`, `docs/IMPLEMENTATION_STATE.md`, validation reports; merge order docs, backend, frontend, validation/state.

Next checkpoint: run IPS pre-coding and strict documentation gates before source edits.

## 2026-06-30 - Warehouse Stock Event Orchestration

Implemented FlipFlop sales-channel stock sync parity with the Allegro Warehouse-only policy:

- Warehouse remains the only source of sellable quantity for FlipFlop stock orchestration.
- `stock.updated` events mirror Warehouse `available` into linked FlipFlop `Product.stockQuantity` rows where `catalogProductId` matches and `trackInventory=true`.
- `stock.out` events force target quantity `0`; the existing storefront/cart contract treats `stockQuantity=0` as not sellable while cart writes still re-check Warehouse directly.
- Automatic execution requires no manual approval and never mutates Warehouse or Catalog.
- Durable audit state is recorded in `flipflop_stock_sync_attempts` with idempotency key, policy snapshot, request payload, result snapshot, blocked reasons, failure context, and remediation context.
- Default pacing is one product-cache write per second via `FLIPFLOP_STOCK_SYNC_RATE_LIMIT_MS=1000`.
- `[UNKNOWN: whether Warehouse getTotalAvailable includes reservations or only physical available stock]` is preserved in the policy snapshot.

Validation and deployment evidence: git diff --check pass; Prisma generate pass; shared build pass; product-service build pass; pre-coding gate pass; strict doc audit pass; deployment readiness gate pass. Commit 3b150c5 was pushed to origin/main. ./scripts/deploy.sh initially timed out while backend replacement pods were stuck in kubelet/containerd sandbox/image-pull startup, then integration follow-up recreated the stuck replacement pods and all FlipFlop deployments reached NewReplicaSetAvailable with ready=1 updated=1 available=1. Production smoke: https://flipflop.alfares.cz/ HTTP 200 and /api/products?limit=1 HTTP 200.

## 2026-06-29 - Checkout Login Return Loop Fix

Owner reported that clicking `Přihlaste se` from checkout delivery-details step returned them to the previous `Doprava a platba` step and could create a login loop for customers who thought they already had an account.

Implemented source changes:

- Checkout account prompt now redirects login/register to `/checkout?step=details` instead of bare `/checkout`.
- Checkout restores the delivery-details step from `step=details` after Auth callback return.
- Checkout account prompt now explicitly offers guest continuation, registration, and access recovery without leaving the current checkout step.
- FlipFlop login landing now shows both registration and `Obnovit přístup` links preserving the same checkout return target.
- Hosted Auth helper now builds shared password-reset URLs with `client_id=flipflop` and `return_url=https://flipflop.alfares.cz/auth/callback?next=/checkout?step=details`.
- Guest checkout verifier now asserts this redirect-step preservation contract.

Validation passed:

- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `git diff --check`
- `npm run verify:guest-checkout-ui`
- `cd services/frontend && npm run build`
- `python3 scripts/deployment_readiness_gate.py --root .`
- `./scripts/deploy.sh` completed successfully; all FlipFlop deployments rolled out and deploy HTTP checks passed.
- In-app Browser production QA: `/checkout?step=details` rendered `Kontaktní údaje`, login/register/reset links preserved `/checkout?step=details`, local `/login?redirect=%2Fcheckout%3Fstep%3Ddetails` showed registration and recovery options, and hosted Auth redirected to `auth.alfares.cz/login` with `client_id=flipflop`, generated `state`, and return URL `https://flipflop.alfares.cz/auth/callback?next=%2Fcheckout%3Fstep%3Ddetails`. Browser console warnings/errors were empty for the verified pages.

Intent compliance:

- Preserves guest checkout and optional account creation; no order, payment, price, stock, password, token, OAuth, database schema, or production user-data behavior was changed.
- Auth remains delegated to the shared hosted Auth surface.

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

- Started `GOAL-09-smarty-checkout-reference-ux` as a planning-only goal after
  owner correction that checkout must support purchase without mandatory
  registration and optional account creation by post-order magic link.
- Added Smarty.cz checkout reference documentation under
  `docs/reference/smarty-checkout/README.md`, tied to 13 reference screenshots
  in `docs/reference/smarty-checkout/screenshots/`.
- Added GOAL-09 planning artifacts:
  `implementation-goals/GOAL-09-smarty-checkout-reference-ux.md`,
  `.execution-plan.md`, `.context-package.md`, `.coding-prompt.md`, and
  `.validation-report.md`.
- Added IPS traceability artifacts for TASK-002 guest checkout:
  `11_tasks/TASK-002-smarty-checkout-reference-ux.md`,
  `22_goal_impact/GOAL-IMPACT-TASK-002-smarty-checkout-reference-ux.md`,
  `21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md`,
  `13_context_packages/CP-TASK-002-smarty-checkout-reference-ux.md`,
  `14_prompts/PROMPT-TASK-002-smarty-checkout-reference-ux.md`, and
  `12_validation/VAL-TASK-002-smarty-checkout-reference-ux.md`.
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

## 2026-06-26 - Catalog Goal 17 Canonical Orders Product IDs

Catalog Goal 17 / FlipFlop channel workstream completed source validation without deployment.

- Updated central Orders forwarding in `services/order-service/src/orders/orders.service.ts` so central payload item `productId` is the canonical `Product.catalogProductId`, not the local FlipFlop product ID.
- Added explicit `[MISSING: catalogProductId]` blocking when an order item cannot be mapped to a Catalog product ID before forwarding.
- Preserved local `OrderItem.productId` as the FlipFlop local FK by stripping `catalogProductId` before Prisma order-item persistence.
- Updated `scripts/verify-orders-hub-integration.js` to assert canonical Catalog product ID forwarding and missing-ID blocking.
- Validation passed: `python3 scripts/pre_coding_gate.py --root .`, `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`, `npm run verify:orders-hub-integration`, `git diff --check`, and `cd services/order-service && npm run build`.
- Deployment was intentionally not run.

## Next Step

Active implementation goal: `GOAL-09-smarty-checkout-reference-ux`.

Owner bypass decision remains in force:

The owner deferred the remaining GOAL-02 payment provider setup and webhook
validation until after the whole project is implemented. PayU, PayPal, GP
WebPay, and Stripe webhook completion remain manual follow-up work and must not
be marked verified automatically.

Next implementation step: before code edits, classify the existing dirty guest-cart/checkout changes, inspect the auth-microservice magic-link or passwordless account contract, and choose the backend guest-order contract documented in `implementation-goals/GOAL-09-smarty-checkout-reference-ux.execution-plan.md`.

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
| `GOAL-09-smarty-checkout-reference-ux` | done | closed with Smarty.cz reference docs, deployed guest checkout, Vault-backed bank-transfer QR, and approved synthetic production guest-order smoke |

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


## 2026-06-26 - GOAL-09 Bank-Transfer Vault Wiring

Owner confirmed that reusable bank-transfer account and IBAN values exist in the Alfares Kubernetes/Vault estate and approved using them for FlipFlop.

Implemented source/config:

- Added `BANK_TRANSFER_ACCOUNT_NUMBER` and `BANK_TRANSFER_ACCOUNT_IBAN` to `k8s/external-secret.yaml`.
- Mapped both values from the existing Vault-backed `secret/prod/school-committee/payments` source used for QR payment generation elsewhere.
- Removed blank `BANK_TRANSFER_ACCOUNT_NUMBER` and `BANK_TRANSFER_ACCOUNT_IBAN` entries from `k8s/configmap.yaml` so the ConfigMap cannot shadow Secret-provided runtime values.
- Hardened `scripts/verify-guest-checkout-ui.js` to assert the ExternalSecret mapping and blank-shadow prevention.

Validation and deployment:

- `git diff --check` passed.
- `npm run verify:guest-checkout-ui` passed.
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed.
- `./scripts/deploy.sh` completed successfully after applying ConfigMap and ExternalSecret updates.
- Kubernetes `ExternalSecret flipflop-service-secret` reported `Ready=True`.
- The generated Kubernetes Secret contains both bank-transfer keys, verified only by key presence and encoded length.
- The running `flipflop-order-service` process sees both env vars as present; values were not printed.

Remaining GOAL-09 completion gate:

- Run one owner-approved synthetic production guest-order submit smoke to prove order creation, redirect/payment-result behavior, and optional account intent end to end.

## 2026-06-26 - GOAL-09 Approved Production Guest-Order Smoke

Owner approved one synthetic production guest-order submit to close the final GOAL-09 completion gate.

Smoke result:

- Created order `ORD-1782491906806-976` through public `POST /api/orders/guest`.
- Used dedicated synthetic production SKU `CODEX-STOCK-TRACE-011`.
- Used guest checkout with `wantsAccount=true`.
- Used `paymentMethod=invoice`, which is the bank-transfer / zálohová faktura path.
- Response redirect pointed to `/payment-result`.
- Redirect contained non-empty bank account number, IBAN, variable symbol, and amount parameters; values were redacted.
- `/payment-result` returned HTTP 200.
- Database metadata confirmed `checkoutMode=guest`, `wantsAccount=true`, `accountActivation=magic-link-sent`, and central Orders forwarding `accepted`.
- Machine-readable evidence was saved to `reports/validation/guest-checkout-smoke/report-production-guest-order-smoke.json`.

GOAL-09 completion gates are closed.

## 2026-06-26 - GOAL-09 Guest Checkout And Smarty.cz Reference Flow

Owner requested removal of mandatory login/registration from checkout and asked to model the Czech checkout flow after Smarty.cz screenshots.

Current active goal: `GOAL-09-guest-checkout-smarty-flow`.

Reference evidence added:

- `docs/reference/smarty-checkout/USER_FLOW.md`
- `docs/reference/smarty-checkout/screenshots/01-add-to-cart-accessory-upsell-top.png` through `13-completion-payment-instructions-detail.png`

Subagent findings preserved:

- UX/reference explorer documented all 13 screenshots and extracted required checkout states.
- Code explorer found forced `/checkout` login redirect, authenticated-only `/api/orders*`, likely stale frontend payment initiation, and address route mismatch.

Execution decision:

- Implement guest-first checkout without marking payment as paid.
- Backend must recalculate prices and totals from product/order data.
- Guest order uses internal technical customer identity while real contact email is stored in order metadata and used for payment/notification where applicable.
- Optional registration remains a visible checkbox; purchase must not depend on registration.

Validation checkpoint before code edits:

- `python3 scripts/pre_coding_gate.py --root .` passed.
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed 100/100.

## 2026-06-26 - GOAL-09 Guest Checkout Implementation And Deployment Checkpoint

Implemented checkout changes:

- `/checkout` no longer requires an authenticated session before purchase.
- Guest cart data from browser storage can proceed through delivery, expedition, payment, delivery details, and order submission.
- Delivery/payment flow mirrors the owner-provided Smarty.cz reference structure: delivery method selection, expedition block, payment block, optional different delivery day, operator-tip upsell, sticky order summary, and final delivery data form.
- Optional registration is handled as a low-friction checkbox (`Chci vytvořit účet`); when selected, password fields appear, but purchase remains guest-first.
- Bank-transfer completion page includes variable-symbol/amount layout and an explicit QR placeholder.

Validation passed:

- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `python3 scripts/deployment_readiness_gate.py --root .`
- `git diff --check`
- `cd services/order-service && npm run build`
- `cd services/api-gateway && npm run build`
- `cd services/frontend && npm run build`

Deployment and smoke checkpoint:

- `./scripts/deploy.sh` rebuilt and applied all FlipFlop services, then timed out while waiting for rollout status.
- Direct follow-up rollout checks completed successfully for `flipflop-frontend`, `flipflop-order-service`, and `flipflop-service`.
- Kubernetes deployment readiness showed all six FlipFlop deployments at `1/1` ready/available/updated.
- `GET https://flipflop.alfares.cz/cart` returned HTTP 200.
- `GET https://flipflop.alfares.cz/checkout` returned HTTP 200.

Remaining explicit contract gap:

- `[MISSING: production bank account]` is required before generating a real bank-transfer QR code. The implementation intentionally does not hardcode dummy bank details or call a third-party QR generator with unverified payment data.

## 2026-06-26 - GOAL-09 Continuation Browser Smoke And Optional Account Correction

Additional checkout correction:

- Removed checkout password and password-confirmation fields from optional account creation.
- Removed pre-order `authApi.register` call from checkout; registration no longer blocks purchase.
- Added `wantsAccount` to the frontend guest-order payload and backend guest-order DTO.
- Guest order metadata now records `wantsAccount` and `accountActivation` (`magic-link-required` when selected) without pretending that a passwordless account API already exists.
- Added `status=created` handling on `/payment-result` so a missing redirect does not render a false failure page.

Non-mutating browser smoke evidence:

- Live browser flow used `https://flipflop.alfares.cz` with a synthetic 1 Kč product seeded into guest localStorage.
- Verified `/checkout` does not redirect to login.
- Verified delivery/payment step, different-day delivery control, operator-tip control, details form, optional account checkbox, and enabled final submit button.
- Final submit was intentionally not clicked because it would create a production order and forward to downstream order systems.
- Evidence files: `reports/validation/guest-checkout-smoke/report.json`, `01-delivery-payment.png`, `02-delivery-details-filled-guest.png`.

Remaining explicit gaps:

- `[MISSING: auth-microservice magic-link or passwordless account API]` prevents real post-order account activation.
- `[MISSING: production bank account]` prevents real bank-transfer QR generation.
- Owner-approved production guest order-submit smoke is still required before claiming end-to-end purchase completion.

Post-deploy continuation evidence:

- `./scripts/deploy.sh` completed successfully in 172.53s after rebuilding and rolling out all six FlipFlop services.
- Post-deploy browser smoke passed against `https://flipflop.alfares.cz`.
- Verified optional account checkbox is passwordless in checkout: no `input[type=password]` fields were present after checking `Chci vytvořit účet`.
- Evidence files: `reports/validation/guest-checkout-smoke/report-post-deploy.json`, `03-post-deploy-delivery-payment.png`, `04-post-deploy-details-passwordless.png`.

## 2026-06-26 - GOAL-09 Bank Transfer QR Contract And Smoke

Implemented QR payment behavior:

- Added frontend dependency `qrcode` for local client-side QR SVG generation on `/payment-result`.
- Added `BANK_TRANSFER_ACCOUNT_NUMBER` and `BANK_TRANSFER_ACCOUNT_IBAN` runtime contract in `.env.example` and `k8s/configmap.yaml`.
- Order-service bank-transfer redirect now includes `bankAccountNumber` and `bankAccountIban` query parameters only when runtime env values are configured.
- Payment-result keeps explicit `[MISSING: production bank account]` and `[MISSING: production IBAN]` states when payment recipient config is absent.
- Payment-result renders a Czech QR Platba payload (`SPD*1.0*ACC:*AM:*CC:CZK*X-VS:*MSG:*`) when an IBAN, amount, and variable symbol are present.

Validation passed:

- `git diff --check`
- `cd services/frontend && npm run build`
- `cd services/order-service && npm run build`
- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `python3 scripts/deployment_readiness_gate.py --root .`
- `node` QR package sanity check generated SVG output.

Deployment and live QR smoke:

- `./scripts/deploy.sh` completed successfully in 190.25s after applying ConfigMap updates and rolling out all six FlipFlop services.
- Live browser smoke verified missing-IBAN placeholder on bank-transfer completion URL.
- Live browser smoke verified a bank-transfer completion URL with a sample IBAN renders one local SVG QR element and no console/page errors.
- Evidence files: `reports/validation/guest-checkout-smoke/report-payment-qr.json`, `05-bank-transfer-missing-iban.png`, `06-bank-transfer-rendered-qr.png`.

Remaining explicit gaps:

- `[MISSING: production bank account]` and `[MISSING: production IBAN]` are still unset in production config; QR generation is implemented and verified with a sample IBAN but production payment recipient data must be supplied before live customers see a real QR.
- Owner-approved production guest order-submit smoke remains required before claiming a fully completed end-to-end purchase.

## 2026-06-26 - GOAL-09 Repeatable Non-Mutating Verifier

Added repeatable validation command:

```bash
npm run verify:guest-checkout-ui
```

Verifier scope:

- Checks checkout source contract for guest cart loading, no hard login redirect, no checkout password fields, no pre-order `authApi.register`, optional `wantsAccount`, Czech delivery/payment/expedition sections, different-day delivery, operator-tip upsell, and order summary.
- Checks frontend/backend guest-order contracts for `wantsAccount`, gateway `POST /api/orders/guest`, server-side product validation, and account activation metadata.
- Checks bank-transfer QR contract for local `qrcode` dependency, QR Platba payload fields, missing-production-IBAN state, and bank-transfer env contract.
- Checks required browser smoke evidence files under `reports/validation/guest-checkout-smoke/`.
- Checks saved post-deploy smoke reports for no login redirect, no checkout password inputs, non-mutating final-submit behavior, missing-IBAN placeholder, and QR SVG rendering.
- Checks live `/cart`, `/checkout`, `/payment-result?status=bank-transfer...`, and `/api/products?limit=1` endpoints return successful responses.

Validation result:

- `npm run verify:guest-checkout-ui` passed with `nonMutating: true`.

Remaining explicit gaps:

- Production `BANK_TRANSFER_ACCOUNT_NUMBER` and `BANK_TRANSFER_ACCOUNT_IBAN` are still required for customer-visible QR payment.
- Owner-approved real guest-order submit smoke remains required for end-to-end order creation evidence.

## 2026-06-26 - GOAL-09 Verifier Hardening And Checkout Fixes

Additional fixes from subagent audit:

- Fixed checkout marketing-consent checkbox to update the quoted `marketingConsent` form key and initialize it to `false`.
- Fixed untracked `/auth/callback` page syntax and wrapped `useSearchParams` in `Suspense` for Next.js build compatibility.
- Fixed shared auth magic-link helper syntax and exported `LeadsClientService` from shared index so order-service can compile with checkout follow-up integrations.
- Removed accidental order-service package-lock churn from validation side effects.
- Hardened `npm run verify:guest-checkout-ui` to catch the marketing-consent regression and current magic-link metadata states.

Validation passed after fixes:

- `npm run verify:guest-checkout-ui`
- `cd services/frontend && npm run build`
- `cd services/order-service && npm run build`
- `git diff --check`
- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `python3 scripts/deployment_readiness_gate.py --root .`

## 2026-06-26 - GOAL-09 Guest Order Route And Fee Integrity Hardening

Subagent completion audit found two non-mutating gaps:

- Live `POST /api/orders/guest` returned 404 because `GuestOrdersController` was exported but not registered in `OrdersModule`.
- Guest checkout totals accepted client-provided `shippingCost`, and frontend sent `operatorTip` both as `operatorTip` and inside `shippingCost`.

Fixes:

- Registered `GuestOrdersController` in `services/order-service/src/orders/orders.module.ts`.
- Hardened `scripts/verify-guest-checkout-ui.js` to send a non-mutating invalid `POST /api/orders/guest` and fail if the route returns 404.
- Moved guest delivery fee, payment method allowlist, and operator-tip allowlist into order-service server-side helpers.
- Removed browser-computed `shippingCost` from the frontend guest order payload.
- Hardened the verifier to assert no browser-computed `shippingCost` and server-side delivery/payment/tip calculation helpers.

Validation passed:

- `git diff --check`
- `npm run verify:guest-checkout-ui`
- `cd services/frontend && npm run build`
- `cd services/order-service && npm run build`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`

Deployment and live evidence:

- `./scripts/deploy.sh` completed successfully after rebuilding and rolling out all six FlipFlop services.
- All six deployments reached `1/1`: `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`, `flipflop-cart-service`, `flipflop-order-service`, `flipflop-user-service`.
- Public endpoints returned `HTTP/2 200`: `/cart`, `/checkout`, and `/payment-result` with sample bank-transfer QR parameters.
- Non-mutating invalid guest order probe returned HTTP 400, proving the live guest order route is mounted and validation rejects empty payloads before order creation.

Remaining explicit gates:

- `[MISSING: production bank account]` and `[MISSING: production IBAN]` still need owner-provided runtime values.
- Owner-approved real production guest-order submit smoke remains required before claiming full end-to-end purchase completion.

## 2026-06-30 - Native Catalog Bulk Publish Endpoint

GOAL-11 `native-catalog-bulk-publish` is active in branch `codex/flipflop-native-bulk-publish`.

Implemented source changes:

- Added protected product-service `POST /products/publish/bulk` for Catalog-origin FlipFlop publication.
- Added protected product-service `GET /products/publish/:catalogProductId/status` for per-item lifecycle status.
- FlipFlop now fetches Catalog product truth, checks Warehouse sellable stock, upserts the local storefront Product row, and records `flipflop_catalog_publish_attempts` lifecycle rows per item.
- Catalog Goal 20 is expected to call this native endpoint for FlipFlop instead of treating projection availability as publication.

Validation passed before deploy:

- Pre-coding gate passed.
- Strict documentation audit passed.
- `git diff --check` passed.
- Product-service build passed.
- Deployment-readiness gate passed.

Next checkpoint: commit and deploy FlipFlop before deploying the Catalog caller switch.

## 2026-07-01 - Storefront Footer Legal Document Parity

Objective: add a quiet site-wide footer and make the customer/legal documents visible on every FlipFlop storefront page, matching the document set exposed by `flipflop.cz` while keeping the visual treatment aligned with `flipflop.alfares.cz`.

IPS chain:

- Vision: Make FlipFlop production-ready and legally complete for customer-facing commerce.
- Goal Impact: Customers can reach terms, privacy, claims, delivery, cookies, contact, size-table, blog, and marketplace references from every page without disrupting checkout, catalog, cart, order, payment, pricing, stock, auth, or admin flows.
- System: Next.js storefront root layout, footer component, static legal/customer document pages, shared legal document data module, and document styling.
- Feature: Site-wide understated footer with complete customer/legal document access.
- Task: Import the current public `flipflop.cz` document set, render it in local FlipFlop styling, add aliases for source routes where useful, and ensure the footer is mounted in the root layout.
- Execution Plan: Keep the source content static and sanitized from the source document body only; avoid third-party scripts/tracking/header markup; preserve downloadable claim/return/exchange form links from the source document; use a subdued footer so it does not compete with the storefront.
- Coding Prompt: Do not alter checkout, cart, order, payment, pricing, stock, product API, auth, or Kubernetes behavior.
- Code: Added `services/frontend/lib/legal-documents.ts`, `services/frontend/components/SiteFooter.tsx`, `services/frontend/components/LegalDocumentPage.tsx`, document routes for `kontakty`, `kontakt`, `obchodni-podminky`, `ochrana-osobnich-udaju`, `reklamace`, `doprava`, `doprava-a-platba`, `cookies`, `tabulky-velikosti-crocs`, and `blog`; replaced the root layout footer with `SiteFooter`; added `.legal-document` styles.
- Validation: `python3 scripts/pre_coding_gate.py --root .` passed; `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed; `git diff --check` passed; `cd services/frontend && npm run build` passed.

Parallel execution section:

- Source document parity lane: complete; owner role frontend/content integrator; allowed files `services/frontend/lib/legal-documents.ts` and legal/customer route pages; validation owner original thread.
- Site-wide footer lane: complete; owner role frontend integrator; allowed files `services/frontend/components/SiteFooter.tsx`, `services/frontend/app/layout.tsx`, and `services/frontend/app/globals.css`; validation owner original thread.
- Deployment lane: ready now after deployment-readiness gate; owner role original thread; merge order source, validation, deploy, production smoke.

Next action: run deployment-readiness gate, deploy, then smoke homepage and representative legal document routes.
