# Synthetic Customer Journey Monitor

Goal id: FLIPFLOP-SYNTHETIC-JOURNEY-MONITOR-2026-07-06
Status: implemented-read-only-monitor; cart/checkout/payment/order path remains dependency-gated

## Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

Vision: FlipFlop needs scheduled proof that the customer journey remains usable without allowing monitoring to create unsafe production orders or payment/provider side effects.

Goal Impact: customer-visible regressions from landing, discovery, product detail, cart, checkout, payment, order creation, email, or event trace must be detected with sanitized evidence and explicit severity.

System: FlipFlop frontend and public product API, with central Orders, Payments, Warehouse, notification/email path, and event/logging trace surfaces explicitly dependency-gated.

Feature: synthetic customer journey monitor with a read-only browser/API path and a gated sandbox checkout/payment/order/email/event path.

Task: add a machine-checkable monitor contract that verifies the safe live read-only journey now and fails closed on the unsafe half until the sandbox facts exist.

Execution Plan: keep `scripts/smoke-checkout.js` unchanged as a known mutating smoke; add `scripts/synthetic-customer-journey-monitor.js`; add `verify:synthetic-journey-monitor`; persist sanitized reports under `reports/validation/synthetic-journey-monitor/`; do not enter cart, submit checkout, call providers, or create orders by default.

Coding Prompt: implement a monitor that can be scheduled safely today, classifies missing payment/order/email/event contracts as `blocked_missing_contract`, redacts product/customer/order/payment identifiers, and never prints secrets or raw customer/payment/provider payloads.

Code: `scripts/synthetic-customer-journey-monitor.js`, `package.json` script `verify:synthetic-journey-monitor`, and this document.

Validation: `node --check scripts/synthetic-customer-journey-monitor.js`, `npm run verify:synthetic-journey-monitor`, `npm run verify:paid-provider-bundle-checkout-gate`, `npm run verify:orders-lifecycle-ui`, and `git diff --check`.

## Playwright scenario outline

1. Open `[FLIPFLOP_BASE_URL]` and assert landing returns HTTP 2xx/3xx with storefront content.
2. Open `/products` and `/api/products?limit=20`; assert product discovery is not empty.
3. Select `[SYNTHETIC_TEST_PRODUCT_ID]` when configured; otherwise use the first sellable product only for read-only discovery.
4. Open `/products/:id` and `/api/products/:id?includeWarehouse=true`; assert product id, SKU, title/name, price, and stock/availability.
5. Stop before cart, checkout, payment, provider, order, email, or event mutation unless every sandbox fact below is present.
6. In a separate owner-approved sandbox runner, assert payment success, central order creation, email queued/delivered, and event trace by `journeyRunId`.

## URL, route, and selector discovery

Live URL: `https://flipflop.alfares.cz/`.

Read-only routes:

| Surface | Route | Method | Mutation boundary |
| --- | --- | --- | --- |
| Landing | `/` | `GET` | read-only |
| Product discovery page | `/products` | `GET` | read-only |
| Product discovery API | `/api/products?limit=20` | `GET` | read-only |
| Product detail page | `/products/:id` | `GET` | read-only; `:id` is hashed in artifacts |
| Product detail API | `/api/products/:id?includeWarehouse=true` | `GET` | read-only; `:id` is hashed in artifacts |
| Cart reachability | `/cart` | `GET` | dependency-gated; not visited by default |
| Checkout reachability | `/checkout` | `GET` | dependency-gated; not visited by default |
| Guest order route mount check | `/api/orders/guest` | `POST {}` | disabled by default; only with `FLIPFLOP_SYNTHETIC_VALIDATE_ORDER_ROUTE=1` |

Browser selector candidates for a future Playwright runtime:

| Surface | Selector or fallback | Source |
| --- | --- | --- |
| Product card link | `a[href^="/products/"]` | `services/frontend/components/ProductCard.tsx` |
| Product detail heading | `h1` | `services/frontend/app/products/[id]/page.tsx` |
| Product price | text matching `Kč` | `services/frontend/app/products/[id]/page.tsx` |
| Back to products | `a[href="/products"]` | `services/frontend/app/products/[id]/page.tsx` |
| Forbidden controls | add-to-cart and checkout submit buttons | present in source, intentionally not clicked |

Current implementation note: the repo does not currently define a Playwright dependency or `playwright.config.*`; the committed-safe monitor is a browser/API-ready Node runner using `fetch`. A Playwright wrapper can consume the same route and selector discovery after the runtime dependency is approved. Stable `data-testid` anchors are still `[MISSING: explicit monitor selectors]`.

## Result JSON schema

The monitor writes `reports/validation/synthetic-journey-monitor/report-latest.json` and a run-id JSON file with this shape:

```json
{
  "ok": "boolean",
  "status": "running|failed|read_only_passed_full_flow_blocked_missing_contract|read_only_passed_sandbox_contract_ready",
  "runId": "string",
  "generatedAt": "ISO-8601 UTC string",
  "timezone": "Europe/Prague",
  "baseUrl": "string",
  "apiBaseUrl": "string",
  "nonMutating": true,
  "mutation": false,
  "liveCheckoutExecuted": false,
  "providerCall": false,
  "cartMutation": false,
  "ordersMutation": false,
  "warehouseMutation": false,
  "channelCleanupMutation": false,
  "secretOutput": false,
  "rawCustomerOrPaymentEvidence": false,
  "intentChain": "Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation",
  "scenario": ["string"],
  "routeSelectorDiscovery": {
    "routes": [{ "name": "string", "path": "string", "method": "GET|POST", "mutation": false }],
    "browserSelectors": [{ "surface": "string", "selector": "string", "source": "string" }]
  },
  "failureClasses": { "P0_MUTATION_GUARD": "string" },
  "steps": [{ "name": "string", "path": "string", "url": "string", "status": 200 }],
  "assertions": { "sourceContractsPreserveFailClosedMonitor": true },
  "selectedProduct": {
    "idHash": "16-char sha256 prefix",
    "skuHash": "16-char sha256 prefix",
    "hasName": true,
    "priceClass": "positive|non-positive",
    "stockClass": "available|unavailable"
  },
  "syntheticProductSource": "configured|read-only-first-sellable",
  "paymentOrderEmailEventGate": {
    "status": "blocked_missing_contract|ready_for_owner_approved_sandbox_runner",
    "missing": ["[MISSING: ...]"],
    "assertions": {
      "paymentSuccess": "string",
      "orderCreated": "string",
      "emailQueuedOrDelivered": "string",
      "eventTrace": "string"
    }
  },
  "classification": "P0_MUTATION_GUARD|P1_LANDING_DISCOVERY_DOWN|P1_PRODUCT_DETAIL_DOWN|P1_CHECKOUT_BLOCKED|P1_PAYMENT_CONTRACT_BLOCKED|P2_ORDER_EMAIL_EVENT_DRIFT|P3_OBSERVABILITY_DEBT",
  "severity": "critical|high|medium|low",
  "error": "string only when failed"
}
```

## Required test data

- `[MISSING: approved synthetic product/SKU]` as `SYNTHETIC_TEST_PRODUCT_ID`.
- `[MISSING: synthetic customer/contact]` as `SYNTHETIC_CUSTOMER_EMAIL` or approved token-bound synthetic identity.
- `[MISSING: approved delivery test contract]` as `SYNTHETIC_DELIVERY_CONTRACT_ID`.
- `[MISSING: sandbox/test-mode payment provider contract]` with `PAYMENT_SANDBOX_CONTRACT_APPROVED=1`, `TEST_MODE_PAYMENT_PROVIDER`, and `CHECKOUT_MUTATION_MODE=sandbox|test-only`.
- `[RESOLVED/NARROWED: synthetic email assertion source]` as `SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl` plus `SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid`.
- `[RESOLVED/NARROWED: event trace assertion source]` as `SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl`.
- `[MISSING: order/payment cleanup or retention contract]` as `SYNTHETIC_ORDER_CLEANUP_CONTRACT`.

## Assertions

Landing: HTTP 2xx/3xx, no route failure.

Product discovery: product API returns at least one product and a monitor candidate can be selected.

Product detail: product page and detail API are reachable; product id/SKU/name/price/availability are present or classified.

Add-to-cart and cart: source contract supports guest cart; monitor opens cart without mutating server state.

Cart/checkout/order boundary: not entered by default. Optional invalid guest-order route probing is disabled unless `FLIPFLOP_SYNTHETIC_VALIDATE_ORDER_ROUTE=1`; final submit is never clicked by this monitor.

Payment success: `[MISSING: sandbox/test-mode payment success evidence]` until approved sandbox runner exists.

Order created: `[MISSING: central Orders create/read evidence for synthetic order]` until approved sandbox runner exists.

Email queued/delivered: use `SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl` with `SYNTHETIC_EMAIL_ASSERTION_DOMAIN=example.invalid`; the sink captures sanitized JSONL and returns `captured_not_sent` for matching synthetic recipients.

Event trace: use `SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl`; the trace file is queryable by `journey_id` and `correlation_id` and contains sanitized metadata only.

## Failure classification

- `P0_MUTATION_GUARD`: unapproved production checkout/payment/order/provider mutation attempted or implied. Severity: critical.
- `P1_LANDING_DISCOVERY_DOWN`: landing, discovery, product detail, cart, or checkout is unavailable. Severity: high.
- `P1_CHECKOUT_BLOCKED`: cart, quote, checkout, or submit preflight fails before provider mutation. Severity: high.
- `P1_PAYMENT_CONTRACT_BLOCKED`: payment/provider/order/email/event path lacks sandbox/test contract or cleanup evidence. Severity: medium until an approved sandbox schedule exists, then high.
- `P2_ORDER_EMAIL_EVENT_DRIFT`: approved sandbox order, email, or trace readback mismatches expected data. Severity: high.
- `P3_OBSERVABILITY_DEBT`: screenshot/HAR/JSON/timestamps/redaction missing. Severity: low or medium depending on recurrence.

## Schedule proposal

- Read-only journey monitor: every 15 minutes.
- Evidence-rich browser run with screenshots/HAR: hourly after a Playwright runner is installed in the target runtime.
- Full sandbox checkout/payment/order/email/event run: disabled until all required test data and sandbox contracts are resolved.
- Nightly summary: aggregate first failure, last pass, classifications, blockers, and artifact paths.

## Evidence artifacts

Every failed run should collect sanitized JSON, step timeline, HTTP status summary, screenshots/trace/HAR when a Playwright runtime is available, console errors, base URL, commit/image when available, UTC and Europe/Prague timestamps, and hash-only product/customer/order/payment/provider ids.

Forbidden evidence: bearer tokens, cookies, JWT claims, passwords, raw customer/contact/address/payment/provider payloads, full order ids, full payment ids, provider raw payloads, DB rows, and secrets.

Current report path: `reports/validation/synthetic-journey-monitor/report-latest.json` plus one run-id JSON file per execution.

## Production safety notes

`scripts/smoke-checkout.js` is intentionally not reused for scheduling because it logs in, seeds DB rows, mutates cart/order state, and expects a payment redirect. The new monitor is read-only by default and classifies the full cart/checkout/payment/order/email/event path as blocked until the sandbox/test-mode contract is explicit. The default command does not visit cart or checkout and does not call order endpoints.

## Parallel execution section

Ready now: browser/API read-only journey monitor. Owner role: FlipFlop monitor worker. Allowed files: monitor script, package script, monitor docs, sanitized validation reports. Validation owner: integration thread.

Dependency-gated: sandbox checkout/payment/order/email/event runner. Owner role: payment/orders runtime worker. Blockers: approved synthetic product, synthetic customer/contact, delivery contract, sandbox/test provider, cleanup/retention contract, email assertion source, event trace source, and final redacted evidence path.

Final integration: scheduler/alerting. Owner role: monitor integration owner. Merge order: read-only monitor first, sandbox runner second after contracts, scheduler last.
