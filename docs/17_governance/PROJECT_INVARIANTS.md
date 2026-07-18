# FlipFlop Project Invariants

```yaml
id: FF-PROJECT-INVARIANTS
status: approved
owner: project owner
created: 2026-06-12
last_updated: 2026-06-12
completeness_level: complete
upstream:
  - ../00_constitution/CONSTITUTION.md
  - ../01_vision/VISION.md
downstream:
  - ../docs/process/PROJECT_INVARIANTS.md
related_adrs:
  - ../07_decisions/ADR-001-adopt-intent-preservation-system.md
```

## Purpose

These invariants are non-negotiable truths that future FlipFlop work must preserve.

## Invariants

| ID | Level | Rule | Forbidden outcome | Validation method | Gate applicability | Owner |
|---|---|---|---|---|---|---|
| FF-INV-001 | vision | FlipFlop remains a Czech e-commerce storefront aimed at production readiness and first revenue. | Generic app drift or dashboard-only rebuild. | Traceability review. | Pre-coding, closure. | Project owner |
| FF-INV-002 | business | Price, discount, order total, cancellation, refund, and payment-state changes require human approval or verified provider/system evidence. | Fake or unapproved money-state changes. | Validation report and provider evidence. | Pre-coding, deployment. | Project owner |
| FF-INV-003 | payment | PayU, PayPal, GP WebPay, and Stripe webhook gaps remain visible until verified or owner-bypassed. | Marking provider readiness complete without evidence. | Payment gate review. | Closure, deployment. | Project owner |
| FF-INV-004 | architecture | Shared ecosystem services remain preferred integration points. | Creating isolated duplicate services without approved scope. | Architecture review. | Pre-coding. | Project owner |
| FF-INV-005 | security | Secrets and raw production data must not appear in docs, prompts, reports, logs, or commits. | Credential or customer-data leakage. | Sensitive-data scan. | Pre-coding, deployment. | Project owner |
| FF-INV-006 | content | AI product and SEO content must remain draft until approved. | Fake or unreviewed AI content published to customers. | SEO validation report. | Closure. | Project owner |

## Failure Policy

If a change would violate an invariant, stop, record a blocker in `docs/IMPLEMENTATION_STATE.md`, and ask the owner for a decision.

