# GOAL 07 Coding Prompt: Leads Public Intake Adoption For FlipFlop

Do not code this goal yet.

The discovery lane found no existing FlipFlop customer lead/contact submission surface to adapt. Creating one would introduce new customer-facing UX, consent copy, and production mutation behavior, which requires explicit owner approval before implementation.

When approval exists, implement only the selected surface and use the Leads public intake contract:

- environment-configured Leads base URL;
- `sourceService: "flipflop"`;
- approved `sourceLabel` matching the selected surface;
- supported contact method types only;
- affirmative consent evidence only when the user opts in;
- bounded metadata;
- synthetic tests/build only unless exact production synthetic payload submission is separately approved.

Forbidden remains: raw contact export, raw lead logs, production mutation without exact approved payload, campaign execution, AI/CRM export, secrets, schema changes, payment/order/price changes, and unrelated refactors.

## 2026-06-21 Completion Note

Owner approval now exists for the FlipFlop public contact surface and consent copy. The source implementation is complete and validated. Future coding should not expand this lane unless the owner approves a new scope. The next allowed operational step is deployment/smoke of the current source only, after explicit owner approval.
