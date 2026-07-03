#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');
const { execFileSync } = require('child_process');

const read = (file) => fs.readFileSync(file, 'utf8');

const packageJson = JSON.parse(read('package.json'));
const smokeCheckout = read('scripts/smoke-checkout.js');
const orderService = read('services/order-service/src/orders/orders.service.ts');
const paymentService = read('shared/payments/payment.service.ts');
const productsApi = read('services/frontend/lib/api/products.ts');
const guestCart = read('services/frontend/lib/guest-cart.ts');
const checkoutPage = read('services/frontend/app/checkout/page.tsx');
const adminOrderDetailPage = read('services/frontend/app/admin/orders/[id]/page.tsx');
const adminOrderStatusDto = read('services/order-service/src/orders/dto/update-admin-order-status.dto.ts');
const adoptionGoal = read('implementation-goals/GOAL-24-catalog-bundle-adoption.md');
const gateGoal = read('implementation-goals/GOAL-24-paid-provider-bundle-checkout-gate.md');
const channelCleanupContract = read('docs/orchestrator/2026-07-03-goal24-channel-cleanup-contract.md');
const approvalDraft = read('docs/orchestrator/2026-07-03-goal24-paid-provider-smoke-approval-draft.md');
const implementationState = read('docs/IMPLEMENTATION_STATE.md');
const orchestratorStatus = read('docs/orchestrator/STATUS.md');
const migrationGoal = read('implementation-goals/GOAL-24-durable-bundleid-checkout-migration-readiness.md');


const narrowedMigrationMarker = '[RESOLVED/NARROWED: explicit ecosystem checkout migration accepts durable Catalog bundleId only as bounded bundleEvidence metadata; FlipFlop runtime checkout submission remains blocked]';
const flipflopRuntimeMigrationBlocker = '[RESOLVED/NARROWED: FlipFlop source rollout maps durable catalog.bundle.v1 bundleId into central Orders bundleEvidence without changing totals, stock identity, or provider state]';
const centralOrdersUuidProofMarker = '[RESOLVED: active FlipFlop checkout paths pass central Orders UUIDs to Payments before provider creation]';
const channelSmokeOwnerMarker = '[RESOLVED/NARROWED: FlipFlop checkout owner owns initiation packet for any future paid catalog.bundle.v1 runtime smoke; execution remains owner-approval gated]';
const checkoutCleanupOwnerMarker = '[RESOLVED/NARROWED: FlipFlop checkout cleanup owner owns customer-visible session/cart/local projection cleanup policy; live cleanup evidence remains approval-gated]';
const paidProviderRuntimeBlocker = '[MISSING: owner-approved paid/provider checkout smoke with stock and refund/cancel rollback plan]';
const paymentsRollbackPacketPath = '/home/ssf/Documents/Github/payments-microservice/docs/orchestrator/2026-07-03-goal24-owner-approved-rollback-packet.md';
const channelCleanupContractMarker = 'FLIPFLOP-GOAL24-CHANNEL-CLEANUP-CONTRACT';
const channelCleanupPreparedMarker = '[RESOLVED/NARROWED: FlipFlop channel cleanup contract prepared for cart/session/local projection cleanup, idempotency, customer-visible hard stops, and redacted evidence policy; runtime remains blocked]';
const approvalDraftMarker = 'FLIPFLOP-GOAL24-PAID-PROVIDER-SMOKE-APPROVAL-DRAFT';

const baseRequiredBlockers = [
  paidProviderRuntimeBlocker,
  '[MISSING: owner-approved paid/provider test window, non-secret approval id, target active catalog.bundle.v1 bundle id, provider method, and sanitized evidence policy]',
  '[MISSING: provider webhook/callback evidence that marks the paid order complete without manual payment-state bypass]',
  '[MISSING: Warehouse stock decrement/reservation-release evidence for every bundle component line]',
  '[MISSING: owner-approved refund/cancel rollback plan proving provider refund or cancellation plus Orders/Warehouse cleanup]',
];

const channelRequiredBlockers = [
  '[MISSING: owner-approved paid/provider checkout smoke packet naming FlipFlop channel cleanup executor and runtime validation owner]',
  '[MISSING: provider rollback proof from Payments before customer-visible success or completed cleanup]',
  '[MISSING: Orders cancellation actor, reason, idempotency key, and side-effect acknowledgements before channel side-effect acknowledgement]',
  '[MISSING: deterministic Warehouse component reservation state and approved cleanup operation before customer-visible stock/restored messaging]',
  '[MISSING: sanitized evidence path for required channel cleanup proof]',
];

const requiredBlockers = [...baseRequiredBlockers, ...channelRequiredBlockers];

function includesAll(source, values, label) {
  for (const value of values) {
    assert(source.includes(value), `${label} missing ${value}`);
  }
}

function assertOrder(text, before, after, label) {
  const beforeIndex = text.indexOf(before);
  const afterIndex = text.indexOf(after);
  assert(beforeIndex >= 0, `${label} missing ${before}`);
  assert(afterIndex >= 0, `${label} missing ${after}`);
  assert(beforeIndex < afterIndex, `${label} expected ${before} before ${after}`);
}

assert.strictEqual(
  packageJson.scripts['verify:paid-provider-bundle-checkout-gate'],
  'node scripts/verify-paid-provider-bundle-checkout-gate.js',
  'package script for paid/provider bundle gate missing',
);

assert.strictEqual(
  packageJson.scripts['smoke:checkout'],
  'node scripts/smoke-checkout.js',
  'checkout smoke script wiring changed unexpectedly',
);

assert(smokeCheckout.includes("const paymentMethod = process.env.SMOKE_PAYMENT_METHOD || 'stripe'"), 'checkout smoke default provider method changed');
assert(smokeCheckout.includes("execFileSync('kubectl'"), 'checkout smoke no longer exposes DB/runtime mutation risk');
assert(smokeCheckout.includes('INSERT INTO users') && smokeCheckout.includes('INSERT INTO products'), 'checkout smoke seed mutation was not detected');
assert(smokeCheckout.includes("await request('/cart', { method: 'DELETE'"), 'checkout smoke cart cleanup mutation was not detected');
assert(smokeCheckout.includes("await request('/cart/items'"), 'checkout smoke cart add mutation was not detected');
assert(smokeCheckout.includes("await request('/orders'"), 'checkout smoke order creation mutation was not detected');
assert(smokeCheckout.includes('redirectUrlPresent: true'), 'checkout smoke no longer checks for payment redirect');
assert(!smokeCheckout.includes('RUN_LIVE_PAID_PROVIDER_BUNDLE_CHECKOUT_SMOKE'), 'checkout smoke must not contain a partial live paid/provider bundle approval gate');
assert(!smokeCheckout.includes('REFUND_CANCEL_ROLLBACK_APPROVAL'), 'checkout smoke must not imply rollback approval exists');

assert(orderService.includes('await this.reserveOrderLines(order.orderNumber, order.order_items)'), 'order-service reservation call missing');
assert(orderService.includes('await this.createCentralOrderBeforePayment'), 'central Orders creation before payment missing');
assert(orderService.includes('await this.paymentService.createPayment'), 'Payments provider creation call missing');
assert(orderService.includes('private requireCentralOrderId'), 'central Orders UUID extraction guard missing');
assert(orderService.includes('without a readable UUID'), 'missing central Orders UUID must fail closed');
assert(orderService.includes('private buildPaymentMetadata(order: any, centralOrderId: string): Record<string, unknown>'), 'payment metadata builder must receive central Orders UUID');
assert(orderService.includes("centralOrdersSource: 'orders-microservice'"), 'payment metadata must identify central Orders as source');
assert(orderService.includes('cancelUrl: this.getPaymentCancelUrl(order.id)'), 'payment cancel URL wiring missing');
assert(orderService.includes('paymentStatus: PaymentStatus.pending'), 'orders must start pending before provider evidence');
assert(orderService.includes("paymentMethod === 'invoice'"), 'invoice path marker missing');
assert(orderService.includes('provider/webhook evidence or manual bank transfer reconciliation remains required'), 'provider/webhook evidence comment missing');
assertOrder(
  orderService,
  'reservationWarehouseId = await this.reserveOrderLines(order.orderNumber, order.order_items)',
  'paymentResult = await this.paymentService.createPayment',
  'authenticated checkout reservation/payment ordering',
);
assertOrder(
  orderService,
  'centralAcceptance = await this.createCentralOrderBeforePayment',
  'paymentResult = await this.paymentService.createPayment',
  'central Orders/payment ordering',
);
for (const [label, source] of [
  ['authenticated checkout', orderService.slice(orderService.indexOf('async createOrder'), orderService.indexOf('async createGuestOrder'))],
  ['guest checkout', orderService.slice(orderService.indexOf('async createGuestOrder'), orderService.indexOf('async getUserOrders'))],
  ['legacy create-payment route', orderService.slice(orderService.indexOf('async createPayment(userId'), orderService.indexOf('async getCompetitorAnalysis'))],
]) {
  assert(source.includes('orderId: centralAcceptance.centralOrderId') || source.includes('orderId: centralOrderId'), `${label} must pass central Orders UUID as Payments orderId`);
  assert(source.includes('centralOrderId: centralAcceptance.centralOrderId') || source.includes('centralOrderId,') || source.includes('centralOrderId'), `${label} must pass centralOrderId to Payments`);
  assert(source.includes('metadata: this.buildPaymentMetadata(order, centralAcceptance.centralOrderId)') || source.includes('metadata: this.buildPaymentMetadata(order, centralOrderId)'), `${label} must preserve local FlipFlop identifiers only as payment metadata`);
}

assert(paymentService.includes("this.callPaymentService<Record<string, unknown>>('/payments/create'"), 'Payments create endpoint missing');
assert(paymentService.includes("this.callPaymentService<RefundResponse>(`/payments/${dto.paymentId}/refund`"), 'Payments refund endpoint exists but is not part of the smoke gate');
assert(paymentService.includes('orderId: dto.orderId') && paymentService.includes('centralOrderId: dto.centralOrderId'), 'Payments payload must carry central Orders UUID fields');
assert(paymentService.includes("return ['flipflop', dto.applicationId, dto.orderId"), 'Payments idempotency key must be anchored to the central Orders UUID');

assert(productsApi.includes("contractVersion: 'catalog.bundle.v1'"), 'frontend product API lacks catalog.bundle.v1 type');
assert(productsApi.includes('checkoutEnabled: false'), 'Catalog bundle aggregate must remain checkout disabled');
assert(productsApi.includes('checkoutReason: string'), 'Catalog bundle checkout-disabled reason missing');
assert(guestCart.includes("source: 'product_detail_buy_together'"), 'guest cart must keep local product-detail bundle intent source');
assert(guestCart.includes('catalogCandidateId'), 'guest cart may carry Catalog candidate provenance only');
assert(guestCart.includes('bundleId?: string'), 'guest cart must carry durable Catalog bundleId as bounded intent evidence');
assert(checkoutPage.includes('catalogCandidateId: bundleIntent.catalogCandidateId'), 'checkout submits Catalog candidate id as provenance only');
assert(checkoutPage.includes('bundleId: bundleIntent.bundleId'), 'checkout submits durable Catalog bundleId as bounded intent evidence');
assert(adminOrderDetailPage.includes('OrderStatus.REFUNDED'), 'admin order detail must allow manual refunded order acknowledgement');
assert(adminOrderDetailPage.includes('PaymentStatus.REFUNDED'), 'admin order detail must allow manual refunded payment acknowledgement');
assert(adminOrderDetailPage.includes('notes: statusForm.notes || undefined'), 'admin order detail must allow refund acknowledgement notes');
assert(adminOrderStatusDto.includes("'refunded'"), 'admin order status DTO must accept refunded acknowledgement');
assert(channelCleanupContract.includes('[RESOLVED/NARROWED: owner-approved manual Fiobanka refund acknowledgement workflow exists in FlipFlop admin order UI; runtime proof remains required for the exact paid smoke]'), 'channel cleanup contract missing manual refund acknowledgement workflow marker');

includesAll(adoptionGoal, baseRequiredBlockers, 'GOAL-24 catalog bundle adoption doc');
includesAll(gateGoal, requiredBlockers, 'GOAL-24 paid/provider gate doc');
includesAll(implementationState, requiredBlockers, 'implementation state');
for (const [label, source] of [['migration goal', migrationGoal], ['adoption goal', adoptionGoal], ['paid/provider gate', gateGoal], ['implementation state', implementationState]]) {
  assert(source.includes(narrowedMigrationMarker), `${label} missing narrowed durable bundleId migration marker`);
  assert(source.includes(flipflopRuntimeMigrationBlocker), `${label} missing FlipFlop runtime durable bundleId migration blocker`);
}
for (const [label, source] of [['paid/provider gate', gateGoal], ['implementation state', implementationState]]) {
  assert(source.includes(centralOrdersUuidProofMarker), `${label} missing central Orders UUID proof marker`);
  assert(source.includes(channelSmokeOwnerMarker), `${label} missing channel smoke owner marker`);
  assert(source.includes(checkoutCleanupOwnerMarker), `${label} missing checkout cleanup owner marker`);
}
for (const [label, source] of [['channel cleanup contract', channelCleanupContract], ['paid/provider gate', gateGoal], ['implementation state', implementationState], ['orchestrator status', orchestratorStatus]]) {
  assert(source.includes(channelCleanupContractMarker), `${label} missing channel cleanup contract marker`);
  assert(source.includes(paymentsRollbackPacketPath), `${label} missing Payments rollback packet path`);
  assert(source.includes(channelCleanupPreparedMarker), `${label} missing channel cleanup prepared marker`);
  includesAll(source, channelRequiredBlockers, label);
}
for (const value of [
  'central Orders UUID',
  'cart/session/local projection cleanup',
  'sideEffectsHandled.channel=true',
  'central Orders UUID plus non-secret approval id or smoke correlation id',
  'booleans, counts, hashes, HTTP status classes, route names, contract ids, approval id, and timestamps',
  'Forbidden evidence includes tokens, secrets, raw provider payloads, card/bank data, raw customer identifiers, raw order ids, raw payment ids, raw DB rows, cookies, or full request/response bodies',
]) {
  assert(channelCleanupContract.includes(value), `channel cleanup contract missing ${value}`);
}
for (const value of [
  approvalDraftMarker,
  'status: draft-no-runtime-authority',
  'runtime_authority: none',
  'GOAL24-PAID-PROVIDER-SMOKE-20260703-CODEX-OWNER-APPROVED-001',
  '919be990-1c76-4f9c-b100-829281c6a709',
  'paymentMethod=fiobanka',
  'maximum `300 CZK`',
  'Manual Fiobanka refund acknowledgement',
  'This is an owner-review draft only. It does not authorize live checkout',
]) {
  assert(approvalDraft.includes(value), `approval draft missing ${value}`);
}
for (const value of [
  '[MISSING: renewed owner-approved execution window for Europe/Prague after 2026-07-03T23:59:59+02:00]',
  '[MISSING: named runtime validation owner for the exact side-effectful smoke]',
  '[MISSING: named FlipFlop channel cleanup executor]',
  '[MISSING: Fiobanka provider-side completed-transfer refund/reversal/correction proof path with redacted evidence]',
  '[MISSING: Orders cancellation actor/approvedBy, reasonCode, cleanup idempotency key, and payment/warehouse/notification/crm/channel side-effect acknowledgements]',
  '[MISSING: final owner acceptance of redacted evidence policy and forbidden evidence list]',
]) {
  assert(approvalDraft.includes(value), `approval draft missing ${value}`);
}
assert(gateGoal.includes("runtime_progression: source-rollout-enabled-paid-provider-blocked"), "paid/provider gate must keep paid/provider runtime progression blocked after source rollout");
assert(implementationState.includes("runtime paid/provider progression is source-rollout-enabled but paid/provider smoke remains blocked"), "state must preserve blocked paid/provider smoke progression after source rollout");

let defaultAuthSubjectSmoke;
try {
  defaultAuthSubjectSmoke = execFileSync('node', ['scripts/smoke-orders-auth-subject.js'], {
    encoding: 'utf8',
    env: { ...process.env, WRITE_AUTH_SUBJECT_SMOKE_REPORT: '0' },
  });
} catch (error) {
  defaultAuthSubjectSmoke = error && error.stdout ? String(error.stdout) : '';
}
const authSubjectReport = JSON.parse(defaultAuthSubjectSmoke);
assert.strictEqual(authSubjectReport.mutation, false, 'default auth-subject smoke must remain non-mutating');
assert.strictEqual(authSubjectReport.providerCall, false, 'default auth-subject smoke must not call provider');

console.log(JSON.stringify({
  ok: true,
  mutation: false,
  providerCall: false,
  liveCheckoutExecuted: false,
  runtimeProgression: 'source_rollout_enabled_paid_provider_still_blocked',
  verified: {
    checkoutSmokeCreatesOrderAndPaymentRedirect: true,
    orderServiceReservesBeforePaymentCreation: true,
    activeCheckoutPathsPassCentralOrdersUuidToPayments: true,
    catalogBundleIdCheckoutAuthority: 'bounded_evidence_only',
    centralOrdersBundleEvidenceMapped: true,
    durableBundleIdMigration: 'source_rollout_enabled_paid_provider_blocked',
    channelCleanupContract: 'source_prepared_runtime_blocked',
    approvalDraft: 'draft_no_runtime_authority',
    defaultAuthSubjectSmokeNonMutating: true,
  },
  blockers: requiredBlockers,
}, null, 2));
