# GOAL 07 Context Package: Leads Public Intake Adoption For FlipFlop

## Reviewed Context

Leads:

- `implementation-goals/GOAL-26-product-app-intake-compatibility-matrix.md`
- `implementation-goals/GOAL-26-product-app-intake-compatibility-matrix.context-package.md`
- `implementation-goals/GOAL-26-product-app-intake-compatibility-matrix.execution-plan.md`
- `implementation-goals/GOAL-26-product-app-intake-compatibility-matrix.validation-report.md`
- `implementation-goals/GOAL-11-ecosystem-lead-lifecycle-contracts.product-apps.md`
- `src/leads/integrations/product-app-intake.ts`
- `src/leads/integrations/product-app-intake-matrix.fixtures.ts`

FlipFlop:

- `AGENTS.md`
- Required IPS source docs listed in `AGENTS.md`
- `docs/IMPLEMENTATION_STATE.md`
- `implementation-goals/README.md`
- `services/frontend`
- `services/api-gateway`
- `shared`

## DocsRAG Limitation

DocsRAG was not queried from this worker shell because `JWT_TOKEN` was unavailable in the remote SSH environment. Repo-local Leads Goal 26 artifacts and FlipFlop source-of-truth docs were used for this narrow discovery lane. No token value was printed or persisted.

## Leads Contract Summary

- Endpoint: `POST /api/leads/submit` on the Leads public base URL.
- Production public base URL: `https://leads.alfares.cz`.
- Approved FlipFlop source service: `flipflop`.
- Supported contact method types: `email`, `telegram`, `whatsapp`.
- Affirmative marketing consent requires `consentSource` and ISO `consentCapturedAt`.
- Metadata must stay bounded and must not duplicate raw contact values or sensitive private context.

## FlipFlop Discovery Summary

Editable source searches did not identify any customer lead/contact submission path. The matches found were unrelated API routing, auth/order/customer profile email fields, warehouse contact fields, notification types, storefront search forms, checkout/cart flows, and docs.

## Blocker For Implementation

A runtime integration would require creating a new product surface and consent language. That requires owner-approved UX and consent semantics before code can safely submit to Leads.

## Handoff Notes

Future implementation should be a new explicit FlipFlop goal, not a hidden extension of this blocked adoption lane. It should define the exact surface and consent text before adding code.

## 2026-06-21 Added Context

Owner approval supplied the missing UX/consent decision. The implemented surface is the FlipFlop homepage contact form. It uses e-mail as the only supported contact method for this slice and consent copy requiring the user to allow FlipFlop to contact them by e-mail for the request and follow-up offer.

The gateway, not the browser, owns the Leads public intake payload construction.
