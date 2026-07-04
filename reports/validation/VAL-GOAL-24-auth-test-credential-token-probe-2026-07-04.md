# VAL-GOAL-24 Auth Test Credential Token Probe - 2026-07-04

```yaml
id: VAL-GOAL-24-AUTH-TEST-CREDENTIAL-TOKEN-PROBE-2026-07-04
status: test-credential-token-valid-role-actor-mismatch
repository: /home/ssf/Documents/Github/flipflop
source_repository: /home/ssf/Documents/Github/auth-microservice
captured_at: 2026-07-04T09:19:00+02:00
mutation: false
live_auth_login: true
token_issuance: true
token_output: false
decoded_jwt_output: false
secret_output: false
raw_user_output: false
raw_email_output: false
provider_call: false
live_checkout_executed: false
discount_code_created: false
orders_mutation: false
warehouse_mutation: false
channel_cleanup_mutation: false
```

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update

- Vision: Goal 24 must not use an Auth credential for guarded fixture creation unless the token is bound to the selected approved actor without exposing token or user material.
- Goal Impact: eliminates the tempting but invalid Auth test-credential path from the remaining token-source blocker, while preserving the approved actor/token hard stop.
- System: Auth owns login, JWT validation, and RBAC role claims; FlipFlop owns the guarded discount-code endpoint.
- Feature: runtime-safe Auth test credential token probe.
- Task: validate only status class, token-present boolean, actor-hash match boolean, required-role boolean, and no-output booleans for the projected Auth test credentials.
- Execution Plan: pod-local Auth login plus Auth validate; remove temporary script and token variables; no discount code, checkout, payment, provider, Orders, Warehouse, channel cleanup, deploy, migration, or DB mutation.
- Coding Prompt: do not print TEST_EMAIL, TEST_PASSWORD, token, JWT claims, raw user id, raw email, response bodies, token length, token hash, Authorization header, or cookies.
- Code: temporary pod script removed after execution; this report and verifier marker are source-controlled.
- Validation: npm run verify:paid-provider-bundle-checkout-gate, node --check scripts/verify-paid-provider-bundle-checkout-gate.js, and git diff --check.
- State Update: [RESOLVED/NARROWED: Auth TEST_EMAIL/TEST_PASSWORD token probe returned loginStatusClass=2xx, tokenPresent=true, authValidationStatusClass=2xx, requiredAdminRolePresent=true, actorHashMatches=false, and no token/JWT/user/secret output; test credentials are not an approved Goal 24 discount-fixture token source]

## Sanitized Runtime Probe

- tokenSourceCandidate: auth-microservice-secret TEST_EMAIL/TEST_PASSWORD.
- loginStatusClass: 2xx.
- tokenPresent: true.
- authValidationStatusClass: 2xx.
- actorHashMatches: false for selected actor hash 4215870ba488de17.
- requiredAdminRolePresent: true.
- tokenOutput: false.
- decodedJwtOutput: false.
- rawUserOutput: false.
- rawEmailOutput: false.
- secretOutput: false.

## Decision

[RESOLVED/NARROWED: Auth TEST_EMAIL/TEST_PASSWORD token probe returned loginStatusClass=2xx, tokenPresent=true, authValidationStatusClass=2xx, requiredAdminRolePresent=true, actorHashMatches=false, and no token/JWT/user/secret output; test credentials are not an approved Goal 24 discount-fixture token source]

The test credential token is valid and has an accepted admin role, but it is not bound to the selected approved Goal 24 actor hash. Therefore it must not be used for guarded discount-code generation in the bounded paid/provider smoke.

Remaining hard stops before guarded discount-code generation:

- [MISSING: approved token source path bound to actor hash 4215870ba488de17, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling].
- [MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin].
- [MISSING: sanitized auth/admin evidence path for guarded discount-code generation using the selected actor-bound token].

## Boundary

No discount code, checkout, order, payment, provider call, webhook replay, refund/cancel/reversal, Orders mutation, Warehouse mutation, channel cleanup mutation, deploy, migration, DB write, secret/token output, raw customer/order/payment/provider evidence, raw email, raw user id, decoded JWT, token hash, token length, response body, Authorization header, or cookie output occurred.
