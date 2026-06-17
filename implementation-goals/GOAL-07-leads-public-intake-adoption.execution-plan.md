# GOAL 07 Execution Plan: Leads Public Intake Adoption For FlipFlop

## Intent Bundle

Goal: process Leads Goal 26 cross-repo product-app adoption for FlipFlop intake compatibility.

Owner-approved source-thread context: FlipFlop was selected as the Leads consumer. The worker may adapt an existing safe FlipFlop lead/contact submission path to the Leads public intake contract, or record the exact blocker.

## Upstream Traceability

- Leads Goal 26 product-app intake compatibility matrix.
- Leads Goal 11 product-app intake contract and source taxonomy.
- FlipFlop constitution, vision, business case, system, specification, implementation state, and project invariants.
- FlipFlop implementation goal workflow.

## Scope

Allowed:

- Read Leads Goal 26 artifacts and product-app intake contract docs/builders.
- Read FlipFlop AGENTS/instructions and source needed to identify existing lead/contact paths.
- Change FlipFlop docs/status evidence for handoff.
- Add synthetic tests only if a safe implementation path exists.

Forbidden:

- Production lead submissions or production lead mutation validation.
- Raw contact export or raw lead logging.
- Campaign execution, AI/CRM export, secrets, tokens, schema changes, or unrelated refactors.
- Leads runtime source edits.
- New customer-facing FlipFlop submission UX without owner-approved surface and consent semantics.

## Discovery Steps

1. Read Leads Goal 26 artifacts and Leads product-app intake contract.
2. Read FlipFlop required instructions and current implementation state.
3. Search editable FlipFlop source for lead/contact/newsletter/waitlist/inquiry submission paths.
4. If a path exists, map it to the Leads public intake payload and validate synthetically.
5. If no path exists, record the blocker and do not invent a new surface.

## Gate Review

- Upstream traceability: present through Leads Goal 26 and FlipFlop IPS docs.
- Invariant impact: no runtime behavior changed; checkout, pricing, orders, payments, stock, and auth untouched.
- Sensitive-data classification: synthetic/documentation only.
- Consent impact: no consent behavior changed; future implementation requires owner-approved visible consent copy and evidence fields.
- Contract/schema impact: none in this blocked handoff; future implementation must use existing Leads public contract.
- Replay/determinism: no runtime submission or mutation occurred.
- Rollback: revert Goal 07 docs/state updates only.

## Validation Plan

- Source search evidence over editable FlipFlop source.
- Documentation audit and pre-coding gate after docs update.
- `git diff --check`.
- Secret-pattern scan over Goal 07 and state docs.
- No production mutation, deployment, or synthetic HTTP submit.

## Result

Blocked before runtime implementation because no existing FlipFlop lead/contact submission path exists to adapt safely.
