# Agent Gap-Filling Rules

Agents may fill routine implementation details, but they must not silently change intent.

## Fill Without Asking

- file paths and command names discoverable from the repository;
- small docs cross-reference fixes;
- test command selection when a narrower command exists;
- implementation details that follow existing code patterns and do not change contracts.

## Ask Or Block

- price, discount, order total, cancellation, refund, or payment-state decisions;
- production deployment when risk is not already approved;
- missing provider credentials;
- schema or API contract changes that affect other services;
- changing a goal's success criteria;
- replacing a shared ecosystem service with local-only behavior.

## Mark Stale And Replan

If owner correction changes scope, constraints, or acceptance criteria:

- mark affected execution plans stale;
- regenerate context packages and coding prompts;
- update `docs/IMPLEMENTATION_STATE.md`;
- continue only after the new plan reflects the correction.
