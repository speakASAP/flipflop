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
const runtimeBlocker = '[RESOLVED/NARROWED: FlipFlop source rollout maps durable catalog.bundle.v1 bundleId into central Orders bundleEvidence without changing totals, stock identity, or provider state]';
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
assert(migrationGoal.includes('runtime_progression: source-rollout-enabled-paid-provider-blocked'), 'migration goal must keep paid/provider runtime progression blocked after source rollout');
assert(migrationGoal.includes('live_checkout: owner-approved-smoke-only'), 'migration goal must keep live checkout owner-approved only');

assert(productsApi.includes('checkoutEnabled: false'), 'Catalog bundle display type must remain checkout disabled');
assert(productsApi.includes('bundleId?: string'), 'frontend display type must retain optional durable bundleId evidence');
assert(guestCart.includes('catalogCandidateId'), 'guest cart must keep legacy candidate provenance only');
assert(guestCart.includes('bundleId?: string'), 'guest cart must carry durable Catalog bundleId as bounded intent evidence');
assert(checkoutPage.includes('bundleId: bundleIntent.bundleId'), 'checkout must submit durable Catalog bundleId as bounded intent evidence');
assert(!checkoutPage.includes('bundleEvidence'), 'browser checkout must not submit raw Orders bundleEvidence directly');
assert(!ordersApi.includes('bundleEvidence'), 'frontend orders API must not expose raw bundleEvidence before server normalization');
assert(orderService.includes('buildCatalogBundleEvidence'), 'order-service must synthesize bounded central Orders bundleEvidence server-side');
assert(orderService.includes("contractVersion: 'catalog.bundle.v1'"), 'central Orders bundleEvidence must use catalog.bundle.v1');
assert(orderService.includes("serverTotalSource: 'checkout_authoritative'"), 'bundleEvidence must keep checkout totals authoritative');

assert(catalogAdoptionVerifier.includes('bundle button forwards durable Catalog bundleId as bounded evidence'), 'catalog adoption verifier must check bounded bundleId forwarding');
assert(paidProviderVerifier.includes("catalogBundleIdCheckoutAuthority: 'bounded_evidence_only'"), 'paid provider verifier must report Catalog bundleId as bounded evidence only');
assert(paidProviderVerifier.includes(narrowedMarker), 'paid provider verifier must enforce narrowed migration marker');

console.log(JSON.stringify({
  ok: true,
  mutation: false,
  providerCall: false,
  liveCheckoutExecuted: false,
  runtimeProgression: 'source_rollout_enabled_paid_provider_still_blocked',
  durableBundleIdCheckoutAuthority: 'bounded_bundleEvidence_only',
  verified: {
    ecosystemEvidenceShapeNarrowed: true,
    flipflopCartCheckoutBundleEvidenceMapped: true,
    paidProviderRuntimeStillBlocked: true,
  },
  blockers: [runtimeBlocker, paidProviderBlocker],
}, null, 2));
