# GOAL 07: Leads Public Intake Adoption For FlipFlop

## Outcome

Adopt the Leads public intake contract for FlipFlop non-registered lead submissions when an existing FlipFlop lead/contact submission path exists and can be safely adapted.

## Status

Blocked after discovery on 2026-06-15.

## Owner Approval Context

The source thread selected FlipFlop as the Leads consumer for Goal 26 cross-repo product-app adoption. This worker lane was allowed to inspect Leads Goal 26 artifacts, inspect FlipFlop, adapt an existing safe submission path if present, or record the exact blocker.

## Discovery Result

No existing FlipFlop lead/contact submission path was found in editable source. Searches across `services/frontend`, `services/api-gateway`, and `shared` found storefront search, checkout, cart, auth, orders, admin, notifications, and warehouse contact fields, but no customer lead form, contact form, waitlist form, newsletter form, or non-registered inquiry endpoint.

## Exact Blocker

There is no existing FlipFlop lead/contact submission surface to adapt. Adding one would create new customer-facing UX, consent copy, and production lead-mutation behavior rather than adapting an existing path. That is outside this worker lane's safe scope.

## Leads Contract Confirmed

If a future owner-approved FlipFlop lead surface is added, it should submit to the Leads public intake endpoint using:

- `POST https://leads.alfares.cz/api/leads/submit` through environment-configured base URL, not an internal Kubernetes URL in browser code.
- `sourceService: "flipflop"`.
- A stable approved `sourceLabel`, likely `waitlist`, `pricing-interest`, `support-contact`, or `feature-interest` depending on the actual surface.
- One to thirty contact methods using only `email`, `telegram`, or `whatsapp`.
- `marketingConsent: true` only with non-empty `consentSource` and valid ISO `consentCapturedAt`.
- Bounded metadata using approved keys such as `intent`, `surface`, `campaignKey`, `utmSource`, `utmMedium`, `utmCampaign`, `referrerHost`, `locale`, `productKey`, `featureKey`, and `variantKey`.

## Non-Goals Respected

- No production lead submission.
- No raw contact export.
- No raw lead logs.
- No campaign execution.
- No AI, CRM, schema, secret, token, deployment, or payment/order behavior changes.
- No Leads runtime source changes.
- No new FlipFlop customer-facing form invented in this worker lane.

## Next Valid Work

A future owner-approved implementation goal should first define the FlipFlop lead surface, user-visible consent copy, accepted contact method(s), source label, and metadata fields. After that, a narrow implementation can add a frontend/backend adapter and synthetic tests without submitting production leads.

## 2026-06-21 Owner-Approved Source Completion

The owner approved the previously gated FlipFlop lead/contact surface and consent semantics on 2026-06-21. The blocked discovery lane was converted into a bounded source implementation.

Implemented:

- public homepage contact form with explicit e-mail consent copy;
- FlipFlop gateway endpoint `POST /api/leads/contact`;
- server-side proxy from FlipFlop gateway to Leads public intake at `POST /api/leads/submit`;
- Leads payload with `sourceService: "flipflop"`, `sourceLabel: "support-contact"`, `preferredChannel: "email"`, `consentSource: "flipflop-home-contact:v1"`, ISO `consentCapturedAt`, and bounded metadata;
- static verifier `npm run verify:leads-public-intake`.

Not performed:

- production lead submission;
- raw contact export;
- campaign execution;
- AI/CRM export;
- schema migration;
- payment, order, price, checkout, or provider webhook mutation;
- production deployment.

Status: deployed. Production smoke passed after explicit owner approval.
