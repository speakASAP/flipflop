# VAL-GOAL-24 Discount Fixture Quote Hard Stop

```yaml
id: VAL-GOAL-24-DISCOUNT-FIXTURE-QUOTE-HARD-STOP
status: hard-stop-before-checkout
repository: /home/ssf/Documents/Github/flipflop
commit_before_run: 236488d
captured_at: 2026-07-04T00:05:00+02:00
mutation: discount_code_created_only
provider_call: false
live_checkout_executed: false
order_created: false
payment_created: false
warehouse_reservation_created: false
orders_mutation_created: false
```

## Sanitized Evidence

- Owner delegated runtime continuation to Codex with message `сделай это сам` on `2026-07-04` Europe/Prague.
- Token-handling path used existing smoke credential pattern: Auth login materialized a temporary bearer token in process memory only; token/password/raw email were not printed or recorded.
- Login returned `200`, token was present, and decoded role set contained a required admin role for guarded `POST /api/admin/marketing/discount-codes`.
- One guarded fixed discount code was created from the stale draft fixture amount: fixed `1698 CZK`, `maxUses=1`, `goalId=GOAL24-paid-provider-fixture-20260704`, short expiry. This value is not the final executable fixture because tax-inclusive recalculation requires `2117.58 CZK` for a `300 CZK` checkout/payment total.
- Redacted discount-code readback: `codeHash=c918c89d0b2fcf25`, `usedCount=0`, `remainingUses=1`, `expiresAt=2026-07-03T22:34:57.312Z` (`2026-07-04T00:34:57.312+02:00`).
- Guest quote preflight with the target `catalog.bundle.v1` `bundleIntent` plus that `discountCode` returned HTTP `400` before checkout/order/payment creation.
- Source contract explains the failure: `calculateCheckoutDiscount` rejects `discountCode` combined with `bundleIntent` using `Discount code cannot be combined with a bundle discount`.

## Decision

Stop before live checkout, order, Fiobanka QR/payment, provider call, Warehouse reservation, Orders mutation, channel cleanup, deploy, migration, or raw evidence capture.

The existing server-validated discount-code fixture path cannot be used for the Goal 24 paid/provider bundle smoke because it is mutually exclusive with the `catalog.bundle.v1` bundle intent needed for the smoke evidence. The remaining safe paths are:

- `[MISSING: owner-approved source change/deploy for a dedicated Goal 24 server-validated bundle fixture that preserves bundleIntent and produces total <= 300 CZK]`.
- `[MISSING: owner-approved non-persistent price fixture implemented through an existing guarded server-side price contract, if such a contract exists]`.
- `[MISSING: different active target bundle whose checkout-authoritative total is <= 300 CZK without discountCode]`.

Direct client `discount`, direct DB row edits, Catalog price mutation, marketplace/feed/listing mutation, persistent product price changes, and provider/payment side effects remain forbidden for this stopped attempt.
