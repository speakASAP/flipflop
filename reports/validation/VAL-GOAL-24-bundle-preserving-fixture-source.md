# VAL-GOAL-24 Bundle-Preserving Fixture Source Gate

```yaml
id: VAL-GOAL-24-BUNDLE-PRESERVING-FIXTURE-SOURCE
status: source-prepared-runtime-deploy-gated
repository: /home/ssf/Documents/Github/flipflop
captured_at: 2026-07-04T00:09:00+02:00
mutation: source-only
provider_call: false
live_checkout_executed: false
```

## Sanitized Evidence

- Owner approved server-side bundle-preserving fixture on `2026-07-04`.
- Source now keeps ordinary `discountCode + bundleIntent` fail-closed with `Discount code cannot be combined with a bundle discount`.
- The only exception is a Goal 24 fixture gate that requires all of the following before applying the discount while preserving `bundleIntent` evidence:
  - `goalId=GOAL24-paid-provider-fixture-20260704`.
  - `type=fixed`.
  - fixed value `2117.58 CZK`.
  - `maxUses=1` and not already used.
  - `bundleId=919be990-1c76-4f9c-b100-829281c6a709`.
  - exact component Catalog product ids `ce4a51aa-2d12-4ab7-a965-7a36609d01fc` and `dbc51dde-fc66-4511-b178-f929183f4647`.
  - checkout-authoritative final total `>0` and `<=300 CZK`.
- Direct client `discount`, Catalog price mutation, marketplace/feed/listing mutation, persistent product price changes, direct DB row edits, and unbounded discount-code usage remain disallowed.

## Runtime Gate

This report is source evidence only. A runtime quote/order/payment still requires deploy of the source change, a fresh correct one-use code, quote proving total `300 CZK` with bundle evidence, and the remaining provider/Orders/Warehouse cleanup packet.
