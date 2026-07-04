# Goal 24 FlipFlop Provider Completion Wording Sync

status: source-only-runtime-hard-stopped
source_payments_evidence: authenticated Fiobanka transaction-polling accepted as production-authentic path in Payments docs/verifiers

## Intent Preservation Chain

- Vision: complete Goal 24 paid/provider smoke without requiring an invented native Fio callback contract.
- Goal Impact: FlipFlop no longer names callback/webhook as the only acceptable provider completion proof; it accepts Payments-owned callback evidence or owner-accepted authenticated transaction-polling reconciliation.
- System: Payments owns payment truth; FlipFlop owns customer-visible redirect/session cleanup surfaces.
- Feature: paid-provider bundle checkout gate.
- Task: reconcile FlipFlop provider completion blocker wording with Payments Fiobanka authenticity decision.
- Execution Plan: docs/verifier wording only; do not run checkout, payment, provider, polling, Orders, Warehouse, or channel side effects.
- Coding Prompt: preserve fail-closed missing selected paid-order completion evidence until future smoke has exact payment/order/provider hashes and redacted proof.
- Code: `scripts/verify-paid-provider-bundle-checkout-gate.js`, docs/status reports.
- Validation: `npm run verify:paid-provider-bundle-checkout-gate` and `git diff --check`.
- State Update: callback-native Fio evidence is not invented; accepted polling can satisfy provider completion evidence only when tied to the selected future paid order.

## Marker

- `[MISSING: provider completion evidence from accepted Fiobanka callback or authenticated transaction-polling reconciliation that marks the selected paid order complete without manual payment-state bypass]`

## Boundaries

- live_checkout_executed: false
- payment_creation: false
- provider_call: false
- webhook_replay: false
- polling_run: false
- orders_mutation: false
- warehouse_mutation: false
- channel_cleanup_mutation: false
- deployment: false
- secret_output: false
- raw_customer_or_payment_evidence: false
