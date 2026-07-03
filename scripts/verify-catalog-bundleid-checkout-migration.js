#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const read = (file) => fs.readFileSync(file, 'utf8');

const packageJson = JSON.parse(read('package.json'));
const migrationGoal = read('implementation-goals/GOAL-24-durable-bundleid-checkout-migration-readiness.md');
const adoptionGoal = read('implementation-goals/GOAL-24-catalog-bundle-adoption.md');
const paidProviderGate = read('implementation-goals/GOAL-24-paid-provider-bundle-checkout-gate.md');
const implementationState = read('docs/IMPLEMENTATION_STATE.md');
const catalogAdoptionVerifier = read('scripts/verify-catalog-bundle-adoption.js');
const paidProviderVerifier = read('scripts/verify-paid-provider-bundle-checkout-gate.js');
const productsApi = read('services/frontend/lib/api/products.ts');
const guestCart = read('services/frontend/lib/guest-cart.ts');
const checkoutPage = read('services/frontend/app/checkout/page.tsx');
const orderService = read('services/order-service/src/orders/orders.service.ts');
const ordersApi = read('services/frontend/lib/api/orders.ts');

const narrowedMarker = '[RESOLVED/NARROWED: explicit ecosystem checkout migration accepts durable Catalog bundleId only as bounded bundleEvidence metadata; FlipFlop runtime checkout submission remains blocked]';
const runtimeBlocker = '[MISSING: owner-approved FlipFlop source rollout mapping display-only catalog.bundle.v1 bundleId into Orders bundleEvidence without changing totals, stock identity, or provider state]';
const paidProviderBlocker = '[MISSING: owner-approved paid/provider checkout smoke with stock and refund/cancel rollback plan]';

assert.strictEqual(
  packageJson.scripts['verify:catalog-bundleid-checkout-migration'],
  'node scripts/verify-catalog-bundleid-checkout-migration.js',
  'package script for durable bundleId migration verifier missing',
);

for (const [label, source] of [
  ['migration goal', migrationGoal],
  ['adoption goal', adoptionGoal],
  ['paid provider gate', paidProviderGate],
  ['implementation state', implementationState],
]) {
  assert(source.includes(narrowedMarker), `${label} missing narrowed migration marker`);
  assert(source.includes(runtimeBlocker), `${label} missing FlipFlop runtime rollout blocker`);
  assert(source.includes(paidProviderBlocker), `${label} missing paid/provider runtime blocker`);
}

assert(migrationGoal.includes('Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update'), 'migration goal must preserve IPS chain');
assert(migrationGoal.includes('Orders accepts optional bounded `bundleEvidence[]`'), 'Orders bundleEvidence acceptance evidence missing');
assert(migrationGoal.includes('Payments accepts bounded `catalog.bundle.v1` metadata only as audit evidence'), 'Payments metadata evidence missing');
assert(migrationGoal.includes('Warehouse accepts only normal component product reservation lines'), 'Warehouse component-line evidence missing');
assert(migrationGoal.includes('Catalog owns durable `bundleId`'), 'Catalog bundle ownership evidence missing');
assert(migrationGoal.includes('runtime_progression: blocked'), 'migration goal must keep runtime progression blocked');
assert(migrationGoal.includes('live_checkout: forbidden'), 'migration goal must forbid live checkout');

assert(productsApi.includes('checkoutEnabled: false'), 'Catalog bundle display type must remain checkout disabled');
assert(productsApi.includes('bundleId?: string'), 'frontend display type must retain optional durable bundleId evidence');
assert(guestCart.includes('catalogCandidateId'), 'guest cart must keep legacy candidate provenance only');
assert(!guestCart.includes('bundleId'), 'guest cart must not persist durable Catalog bundleId');
assert(checkoutPage.includes('catalogCandidateId: bundleIntent.catalogCandidateId'), 'checkout must still submit only candidate provenance');
assert(!checkoutPage.includes('bundleId: bundleIntent.bundleId'), 'checkout must not submit durable Catalog bundleId');
assert(!checkoutPage.includes('bundleEvidence'), 'checkout must not submit Orders bundleEvidence before rollout approval');
assert(!ordersApi.includes('bundleEvidence'), 'frontend orders API must not expose bundleEvidence before rollout approval');
assert(!orderService.includes('bundleEvidence'), 'local order-service must not synthesize central Orders bundleEvidence before rollout approval');
assert(!orderService.includes('bundleId'), 'local order-service bundle discount path must not consume durable Catalog bundleId');

assert(catalogAdoptionVerifier.includes('checkout does not submit durable Catalog bundleId'), 'catalog adoption verifier must keep checkout fail-closed assertion');
assert(paidProviderVerifier.includes('catalogBundleIdCheckoutAuthority: false'), 'paid provider verifier must report Catalog bundleId checkout authority false');
assert(paidProviderVerifier.includes(narrowedMarker), 'paid provider verifier must enforce narrowed migration marker');

console.log(JSON.stringify({
  ok: true,
  mutation: false,
  providerCall: false,
  liveCheckoutExecuted: false,
  runtimeProgression: 'blocked',
  durableBundleIdCheckoutAuthority: 'evidence_only_not_runtime_submission',
  verified: {
    ecosystemEvidenceShapeNarrowed: true,
    flipflopCartCheckoutRuntimeStillBlocked: true,
    paidProviderRuntimeStillBlocked: true,
  },
  blockers: [runtimeBlocker, paidProviderBlocker],
}, null, 2));
