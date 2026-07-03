# VAL-GOAL-24 Discount Fixture Runtime Preflight Blocker

```yaml
id: VAL-GOAL-24-DISCOUNT-FIXTURE-RUNTIME-PREFLIGHT-BLOCKER
status: blocked-before-side-effects
repository: /home/ssf/Documents/Github/flipflop
commit: 9a4bf90
captured_at: 2026-07-03T23:59:02+02:00
mutation: false
provider_call: false
live_checkout_executed: false
```

## Evidence

- Remote repo was clean on `main` at `9a4bf90 docs: approve goal24 discount fixture gate`.
- Safe unauthenticated guarded endpoint preflight was attempted against `POST /api/admin/marketing/discount-codes` with the owner-approved fixed `1698 CZK` fixture shape.
- Result: `401 Unauthorized`, message class `Missing or invalid authorization header`.
- No admin token, secret, raw customer/order/payment/provider data, discount code, order, payment, provider call, Warehouse reservation, Orders mutation, DB write, deploy, migration, or checkout side effect was created by this preflight.
- Runtime clock at preflight: `2026-07-03T23:59:02+02:00`; the earlier approval window ending `2026-07-03T23:59:59+02:00` was no longer safe for a full paid/provider attempt.

## Blockers

- `[MISSING: renewed owner-approved execution window for Europe/Prague after 2026-07-03T23:59:59+02:00]`.
- `[MISSING: named admin/actor or approved token-handling path for guarded discount-code generation]`.
- `[MISSING: named runtime validation owner for the exact side-effectful smoke]`.
- `[MISSING: named FlipFlop channel cleanup executor]`.
- `[MISSING: approved post-discount-code runtime sequence for quote -> order/payment -> provider completion evidence -> rollback/cleanup]`.

## Decision

Stop before creating a discount code, order, payment, provider call, Warehouse reservation, Orders mutation, or channel cleanup. The owner-approved fixture contract remains valid as source/docs/verifier state, but runtime execution needs the missing actor/window/token-handling path above.
