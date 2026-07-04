#!/usr/bin/env node
const fs = require('fs');
const sourceWaveCMarker = '[RESOLVED/NARROWED: Goal 24 source-governance wave GOAL24-SOURCE-WAVE-2026-07-04C input set records Auth `2faf719 docs: complete goal10 customer data wallet rollout`, Catalog `b20e95b merge goal24 catalog source wave c`, FlipFlop `2310c90 merge goal24 flipflop stale blocker wording sync`, Payments `080f293 merge goal24 payments source wave c`, Orders `d32abd2 merge goal24 orders source wave c`, and Warehouse `ea7b9e9 merge goal24 warehouse cleanup packet readback sync` as Wave C input heads for renewed runtime planning; post-merge source-sync commits are validation evidence only; runtime checkout/channel side effects remain blocked]';
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
const runtimePreflightBlocker = read('reports/validation/VAL-GOAL-24-discount-fixture-runtime-preflight-blocker.md');
const discountFixtureQuoteHardStop = read('reports/validation/VAL-GOAL-24-discount-fixture-quote-hard-stop.md');
const bundlePreservingFixtureSource = read('reports/validation/VAL-GOAL-24-bundle-preserving-fixture-source.md');
const bundlePreservingFixtureRuntimeQuote = read('reports/validation/VAL-GOAL-24-bundle-preserving-fixture-runtime-quote.md');
const runtimeOwnerCheck = read('reports/validation/VAL-GOAL-24-runtime-preflight-owner-check-2026-07-04.md');
const authAdminActorTokenHandling = read('reports/validation/VAL-GOAL-24-auth-admin-actor-token-handling-2026-07-04.md');
const authAdminActorReadback = read('reports/validation/VAL-GOAL-24-auth-admin-actor-readback-2026-07-04.md');
const authAdminTokenBindingProofContract = read('reports/validation/VAL-GOAL-24-auth-admin-token-binding-proof-contract-2026-07-04.md');
const authTestCredentialTokenProbe = read('reports/validation/VAL-GOAL-24-auth-test-credential-token-probe-2026-07-04.md');
const authActorTokenProvisioning = read('/home/ssf/Documents/Github/auth-microservice/reports/validation/VAL-GOAL-24-auth-actor-token-provisioning-2026-07-04.md');
const paymentResultUrlRuntimeReadback = read('reports/validation/VAL-GOAL-24-payment-result-url-runtime-readback.md');
const channelCleanupPacket = read('reports/validation/VAL-GOAL-24-channel-cleanup-packet-2026-07-04.md');
const channelCleanupOwnerSupersession = read('reports/validation/VAL-GOAL-24-channel-cleanup-owner-supersession-2026-07-04.md');
const channelSideEffectAckReport = read('reports/validation/VAL-GOAL-24-channel-side-effect-ack-packet-2026-07-04.md');
const autonomousApprovalIntegrationDecision = read('reports/validation/VAL-GOAL-24-autonomous-approval-integration-decision-2026-07-04.md');
const autonomousRuntimeOwnershipPacket = read('reports/validation/VAL-GOAL-24-autonomous-runtime-ownership-packet-2026-07-04.md');
const flipflopWarehouseBlockerWordingSync = read('reports/validation/VAL-GOAL-24-flipflop-warehouse-blocker-wording-sync-2026-07-04.md');
const currentHeadSync = read('reports/validation/VAL-GOAL-24-current-head-sync-2026-07-04.md');
const warehouseTargetFactsWordingSync = read('reports/validation/VAL-GOAL-24-warehouse-target-facts-wording-sync-2026-07-04.md');
const implementationState = read('docs/IMPLEMENTATION_STATE.md');
const orchestratorStatus = read('docs/orchestrator/STATUS.md');
const migrationGoal = read('implementation-goals/GOAL-24-durable-bundleid-checkout-migration-readiness.md');


const goal24CurrentHeadVerifierSync = read('reports/validation/VAL-GOAL-24-current-head-verifier-sync-2026-07-04.md');
const goal24CurrentHeadMarker = '[RESOLVED/NARROWED: Goal 24 current-head verifier sync GOAL24-CURRENT-HEADS-2026-07-04H requires Auth 2faf719 docs: complete goal10 customer data wallet rollout, Payments 0207876 docs: sync goal24 fiobanka runtime image evidence, Catalog 0e37b4c docs: sync goal24 catalog payments runtime image evidence, FlipFlop 490913a docs: clean goal24 owner wording, Orders 154c5cd docs: sync goal24 orders payments runtime image evidence, and Warehouse 0289dc2 docs: require goal24 current heads in verifier as the pre-H validation input heads; the H sync commits and later source-only status commits are validation evidence only; historical Wave A-G markers are evidence only; runtime side effects remain blocked]';
for (const [label, source] of [
  ['current-head verifier sync report', goal24CurrentHeadVerifierSync],
  ['orchestrator status', orchestratorStatus],
  ['implementation state', implementationState],
]) {
  if (!source.includes(goal24CurrentHeadMarker)) {
    throw new Error(label + ' missing Goal 24 current-head verifier sync marker');
  }
}

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
const approvedDiscountFixtureMarker = 'Owner-Approved Discount Fixture Narrowing';
const successCancelUrlOwnerMarker = '[RESOLVED/NARROWED: FlipFlop owns exact customer-visible payment-result success/cancel URLs for provider redirects; provider callback evidence still owns payment truth]';
const retryStateCleanupOwnerMarker = '[RESOLVED/NARROWED: FlipFlop owns retry-state cleanup policy for payment-result cancelled/failed views; retry-safe execution remains blocked until provider, Orders, Warehouse, and channel cleanup evidence exists]';
const channelCleanupPacketMarker = '[RESOLVED/NARROWED: channel cleanup packet is policy-complete for FlipFlop-owned URL, retry, cart/session/local projection duties; runtime remains blocked until named executor, rollback owner, and sanitized evidence path are supplied]';
const runtimeUrlReadbackResolvedMarker = '[RESOLVED/NARROWED: runtime config readback shows PAYMENT_SUCCESS_URL and PAYMENT_CANCEL_URL resolve to approved FlipFlop payment-result URLs without secret output]';
const runtimeUrlReadbackMissingMarker = '[MISSING: sanitized runtime config readback or owner confirmation that PAYMENT_SUCCESS_URL and PAYMENT_CANCEL_URL are unset or exactly match the approved FlipFlop payment-result URLs for the future smoke]';
const autonomousApprovalDecisionMarker = '[RESOLVED/NARROWED: owner delegated autonomous Goal 24 continuation to Codex, but integration validation keeps new Fiobanka paid/provider side effects hard-stopped until bank/refund authority, exact Orders/Warehouse packet, and redacted provider proof exist]';
const ownerApproval003Marker = '[RESOLVED/NARROWED: owner-approved bounded paid/provider smoke intake GOAL24-PAID-PROVIDER-SMOKE-20260704-CODEX-OWNER-APPROVED-003 covers Fiobanka QR, flipflop-service, catalog.bundle.v1 919be990-1c76-4f9c-b100-829281c6a709, component qty 1 each, max 300 CZK, one attempt, window 2026-07-04T09:00:08+02:00 through 2026-07-04T23:59:59+02:00 Europe/Prague, and sanitized evidence path reports/validation/VAL-GOAL-24-live-paid-provider-runtime-evidence-2026-07-04.md; runtime remains blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and final redacted evidence exist]';
const autonomousRuntimeOwnershipMarker = '[RESOLVED/NARROWED: Codex Goal 24 integration thread is the runtime validation owner and FlipFlop channel cleanup executor for future source-controlled smoke coordination; runtime side effects remain blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and redacted evidence path exist]';
const channelCleanupOwnerSupersessionMarker = '[RESOLVED/NARROWED: Codex Goal 24 integration thread supersedes earlier FlipFlop channel executor/runtime owner blockers; channel cleanup runtime remains blocked until bank/refund authority, exact provider proof, Orders side-effect acknowledgements, Warehouse target facts, Auth token source, and final redacted evidence path exist]';
const channelSideEffectAckPacket = '[RESOLVED/NARROWED: FlipFlop channel side-effect acknowledgement packet shape is source-defined; runtime channel acknowledgement remains blocked until selected order hash, provider proof, Orders approval, Warehouse approval, idempotency key, cleanup evidence, and final redacted evidence path exist]';
const sourceWaveFreezeMarker = '[RESOLVED/NARROWED: Goal 24 frozen source-governance wave GOAL24-SOURCE-WAVE-2026-07-04A records Catalog `e379b54 merge goal24 current source head sync`, FlipFlop `e1f3e3a merge goal24 current source head sync`, Payments `eab6351 merge goal24 current source head sync`, Orders `d53de9f merge goal24 current source head sync`, and Warehouse `11df002 merge goal24 warehouse target facts reconcile` as input heads for runtime planning; post-merge self heads are validation evidence only; runtime side effects remain blocked]';
const sourceWaveBMarker = '[RESOLVED/NARROWED: Goal 24 source-governance wave GOAL24-SOURCE-WAVE-2026-07-04B input set records Auth `2faf719 docs: complete goal10 customer data wallet rollout`, Catalog `43608e5 merge goal24 catalog source wave b`, FlipFlop `e8abb44 merge goal24 implementation target facts wording sync`, Payments `9069fd3 merge goal24 payments source wave b`, Orders `908b6ee merge goal24 orders source wave b`, and Warehouse `3fdeabd merge goal24 live target readback wording sync` as Wave B input heads for renewed runtime planning; post-merge source-sync commits are validation evidence only; runtime side effects remain blocked]';
const sourceWaveEMarker = '[RESOLVED/NARROWED: Goal 24 source-governance wave GOAL24-SOURCE-WAVE-2026-07-04E input set records Auth `2faf719 docs: complete goal10 customer data wallet rollout`, Catalog `6cdd4f5 docs: clarify goal24 catalog current surface`, FlipFlop `7f2fcb9 docs: sync goal24 url readback owner wording`, Payments `da1e9a6 docs: sync goal24 payments readiness owner wording`, Orders `4dca5e6 docs: sync goal24 orders source wave d`, and Warehouse `ea7b9e9 merge goal24 warehouse cleanup packet readback sync` as Wave E input heads for renewed runtime planning; post-merge source-sync commits are validation evidence only; runtime provider/payment/Orders/Warehouse/channel side effects remain blocked]';

const baseRequiredBlockers = [
  paidProviderRuntimeBlocker,
  '[RESOLVED/NARROWED: owner-approved bounded paid/provider smoke intake GOAL24-PAID-PROVIDER-SMOKE-20260704-CODEX-OWNER-APPROVED-003 covers Fiobanka QR, flipflop-service, catalog.bundle.v1 919be990-1c76-4f9c-b100-829281c6a709, component qty 1 each, max 300 CZK, one attempt, window 2026-07-04T09:00:08+02:00 through 2026-07-04T23:59:59+02:00 Europe/Prague, and sanitized evidence path reports/validation/VAL-GOAL-24-live-paid-provider-runtime-evidence-2026-07-04.md; runtime remains blocked until bank/refund authority, exact provider proof, Orders/Warehouse packets, and final redacted evidence exist]',
  '[MISSING: provider webhook/callback evidence that marks the paid order complete without manual payment-state bypass]',
  '[MISSING: Warehouse stock decrement/reservation-release evidence for every bundle component line]',
  '[MISSING: owner-approved refund/cancel rollback plan proving provider refund or cancellation plus Orders/Warehouse cleanup]',
];

const channelRequiredBlockers = [
  '[MISSING: provider rollback proof from Payments before customer-visible success or completed cleanup]',
  '[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]',
  '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
  '[MISSING: Orders cancellation actor, reason, idempotency key, and side-effect acknowledgements before channel side-effect acknowledgement]',
  '[MISSING: deterministic Warehouse component reservation state and approved cleanup operation before customer-visible stock/restored messaging]',
];

const requiredBlockers = [...baseRequiredBlockers, ...channelRequiredBlockers];
const operativeRequiredBlockers = [
  '[MISSING: fresh Auth actor-bound token generated through the Auth c389c1e no-print/no-decode/no-persist pattern for the exact guarded discount-fixture step]',
  '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation using the fresh selected actor-bound token]',
  '[MISSING: provider webhook/callback evidence that marks the paid order complete without manual payment-state bypass]',
  '[MISSING: Fiobanka provider-side completed-transfer refund/reversal/correction proof path with redacted evidence]',
  '[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]',
  '[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]',
  '[MISSING: concrete side-effectful rollback run id and cleanup idempotency keys]',
  '[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]',
  '[MISSING: Orders cancellation actor, reason, idempotency key, and side-effect acknowledgements before channel side-effect acknowledgement]',
  '[MISSING: owner-approved payment/warehouse/notification/crm/channel sideEffectsHandled acknowledgements for the selected central order hash]',
  '[MISSING: live current target row readback at execution time]',
  '[MISSING: Warehouse hold/release duration]',
  '[MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]',
  '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
];

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

for (const staleOutputBlocker of baseRequiredBlockers.filter((blocker) => !operativeRequiredBlockers.includes(blocker))) {
  assert(!operativeRequiredBlockers.includes(staleOutputBlocker), `operative blocker output must not preserve stale broad blocker: ${staleOutputBlocker}`);
}
assert(!baseRequiredBlockers.includes('[MISSING: owner-approved paid/provider test window, non-secret approval id, target active catalog.bundle.v1 bundle id, provider method, and sanitized evidence policy]'), 'base required blockers must not preserve stale broad owner approval/test window blocker');
for (const marker of operativeRequiredBlockers) {
  assert(
    implementationState.includes(marker) || orchestratorStatus.includes(marker) || bundlePreservingFixtureRuntimeQuote.includes(marker) || autonomousApprovalIntegrationDecision.includes(marker) || authTestCredentialTokenProbe.includes(marker),
    `operative blocker output marker missing source evidence: ${marker}`,
  );
}

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
assert(channelCleanupContract.includes('[RESOLVED/NARROWED: owner-confirmed manual Fiobanka refund was executed through the external refund service; FlipFlop acknowledgement path remains available for exact order marking]'), 'channel cleanup contract missing owner-confirmed manual refund execution marker');
assert(channelCleanupContract.includes('[MISSING: sanitized exact-order linkage between the manual refund confirmation and the Goal 24 completed Fiobanka smoke order]'), 'channel cleanup contract missing exact-order linkage blocker');
assert(channelCleanupContract.includes('[MISSING: FlipFlop runtime readback showing the exact smoke order acknowledged as status=refunded and paymentStatus=refunded after manual refund]'), 'channel cleanup contract missing runtime refunded acknowledgement readback blocker');
assert(channelCleanupContract.includes('[RESOLVED/NARROWED: sanitized runtime readback found completed Fiobanka provider-payment evidence but no FlipFlop exact-order linkage for the retained Goal 24 payment]'), 'channel cleanup contract missing sanitized no-linkage readback marker');
assert(channelCleanupContract.includes('[RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact FlipFlop order linkage]'), 'channel cleanup contract missing owner accepted no-linkage closeout marker');
assert(channelCleanupContract.includes('[RESOLVED/NARROWED: runtime readback found no linked FlipFlop order state, so no FlipFlop refunded acknowledgement mutation is required for this evidence-only closeout]'), 'channel cleanup contract missing no FlipFlop mutation required marker');
assert(channelCleanupContract.includes('[RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]'), 'channel cleanup contract missing no Orders/Warehouse correction required marker');
assert(orchestratorStatus.includes('[RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact FlipFlop order linkage]'), 'orchestratorStatus missing owner accepted no-linkage closeout marker');
assert(implementationState.includes('[RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact FlipFlop order linkage]'), 'implementationState missing owner accepted no-linkage closeout marker');
assert(orchestratorStatus.includes('[RESOLVED/NARROWED: sanitized runtime readback found completed Fiobanka provider-payment evidence but no FlipFlop exact-order linkage for the retained Goal 24 payment]'), 'orchestratorStatus missing sanitized no-linkage readback marker');
assert(implementationState.includes('[RESOLVED/NARROWED: sanitized runtime readback found completed Fiobanka provider-payment evidence but no FlipFlop exact-order linkage for the retained Goal 24 payment]'), 'implementationState missing sanitized no-linkage readback marker');
assert(orchestratorStatus.includes('[RESOLVED/NARROWED: owner-confirmed manual Fiobanka refund was executed through the external refund service; FlipFlop acknowledgement path remains available for exact order marking]'), 'orchestratorStatus missing owner-confirmed manual refund execution marker');
assert(implementationState.includes('[RESOLVED/NARROWED: owner-confirmed manual Fiobanka refund was executed through the external refund service; FlipFlop acknowledgement path remains available for exact order marking]'), 'implementationState missing owner-confirmed manual refund execution marker');

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

for (const [label, source] of [
  ['channel cleanup contract', channelCleanupContract],
  ['paid/provider gate', gateGoal],
  ['implementation state', implementationState],
  ['orchestrator status', orchestratorStatus],
  ['channel side-effect acknowledgement report', channelSideEffectAckReport],
]) {
  assert(source.includes(channelSideEffectAckPacket), `${label} missing channel side-effect acknowledgement packet marker`);
  assert(source.includes('[MISSING: owner-approved channel side-effect acknowledgement for the selected central order hash]'), `${label} missing selected-order channel acknowledgement blocker`);
  assert(source.includes('[MISSING: selected central order hash and FlipFlop local order/session correlation for channel cleanup acknowledgement]'), `${label} missing selected-order channel correlation blocker`);
  assert(source.includes('[MISSING: redacted channel cleanup evidence proving synthetic cart/session/payment-result/local projection cleanup for the selected central order hash]'), `${label} missing redacted channel cleanup evidence blocker`);
  assert(source.includes('[MISSING: channel cleanup idempotency key derived from approval id and sanitized payment/order hash]'), `${label} missing channel idempotency blocker`);
  assert(source.includes('channel:goal24:checkout-cleanup:<approvalId>:<paymentHash>'), `${label} missing channel cleanup idempotency namespace`);
  assert(source.includes('must not infer Warehouse stock effects from Payments refund state'), `${label} missing no Warehouse stock inference rule`);
}

for (const [label, source] of [
  ['channel cleanup contract', channelCleanupContract],
  ['paid/provider gate', gateGoal],
  ['runtime preflight owner check report', runtimeOwnerCheck],
  ['channel cleanup packet report', channelCleanupPacket],
]) {
  for (const stale of [
    '[MISSING: owner-approved paid/provider checkout smoke packet naming FlipFlop channel cleanup executor and runtime validation owner]',
    '[MISSING: named runtime validation owner for the exact side-effectful smoke]',
    '[MISSING: named runtime validation owner]',
    '[MISSING: runtime validation owner]',
  ]) {
    assert(!source.includes(stale), `${label} still contains stale runtime owner hard stop ${stale}`);
  }
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
  'status: draft-discount-fixture-approved-runtime-side-effects-still-gated',
  'runtime_authority: owner-approved-discount-fixture-preflight-only',
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
  autonomousRuntimeOwnershipMarker,
  '[MISSING: Fiobanka provider-side completed-transfer refund/reversal/correction proof path with redacted evidence]',
  '[MISSING: Orders cancellation actor/approvedBy, reasonCode, cleanup idempotency key, and payment/warehouse/notification/crm/channel side-effect acknowledgements]',
  '[MISSING: final owner acceptance of redacted evidence policy and forbidden evidence list]',
]) {
  assert(approvalDraft.includes(value), `approval draft missing ${value}`);
}

for (const [label, source] of [['source-wave freeze report', currentHeadSync], ['implementation state', implementationState], ['orchestrator status', orchestratorStatus]]) {
  assert(source.includes(sourceWaveBMarker), `${label} missing source-wave B marker`);
  for (const value of [
    'Auth `2faf719 docs: complete goal10 customer data wallet rollout`',
    'Catalog `43608e5 merge goal24 catalog source wave b`',
    'FlipFlop `e8abb44 merge goal24 implementation target facts wording sync`',
    'Payments `9069fd3 merge goal24 payments source wave b`',
    'Orders `908b6ee merge goal24 orders source wave b`',
    'Warehouse `3fdeabd merge goal24 live target readback wording sync`',
    '[MISSING: live current target row readback at execution time]',
    '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
  ]) {
    assert(source.includes(value), `${label} missing source-wave B value ${value}`);
  }
}

for (const value of [
  approvedDiscountFixtureMarker,
  'Direct client-provided `discount` is rejected',
  'server-validated `discountCode`',
  'fixed one-use discount code for `2117.58 CZK`',
  'final checkout/payment amount `300 CZK`',
  'JwtAuthGuard',
  'RolesGuard',
  'This approval does not authorize Catalog price mutation',
]) {
  assert(approvalDraft.includes(value), `approval draft missing approved discount fixture marker ${value}`);
}
assert(channelCleanupContract.includes('owner approved the discount/price fixture path'), 'channel cleanup contract missing owner-approved fixture update');
assert(channelCleanupContract.includes('server-validated fixed discount-code fixture'), 'channel cleanup contract missing server-validated fixture constraint');
for (const [label, source] of [['channel cleanup contract', channelCleanupContract], ['paid/provider gate', gateGoal], ['implementation state', implementationState], ['orchestrator status', orchestratorStatus]]) {
  assert(source.includes(successCancelUrlOwnerMarker), `${label} missing success/cancel URL ownership marker`);
  assert(source.includes(retryStateCleanupOwnerMarker), `${label} missing retry-state cleanup ownership marker`);
}
assert(channelCleanupContract.includes('https://flipflop.alfares.cz/payment-result?status=completed&orderId=<local-flipflop-order-id>'), 'channel cleanup contract missing exact success URL shape');
assert(channelCleanupContract.includes('https://flipflop.alfares.cz/payment-result?status=cancelled&orderId=<local-flipflop-order-id>'), 'channel cleanup contract missing exact cancel URL shape');
assert(channelCleanupContract.includes('https://flipflop.alfares.cz/api/webhooks/payment-result'), 'channel cleanup contract missing provider callback URL boundary');
assert(channelCleanupContract.includes('[RESOLVED/NARROWED: runtime config readback shows PAYMENT_SUCCESS_URL and PAYMENT_CANCEL_URL resolve to approved FlipFlop payment-result URLs without secret output]'), 'channel cleanup contract missing runtime URL override resolution');
assert(paymentResultUrlRuntimeReadback.includes('PAYMENT_SUCCESS_URL_STATE=set approved_payment_result_url') && paymentResultUrlRuntimeReadback.includes('PAYMENT_CANCEL_URL_STATE=set approved_payment_result_url'), 'runtime URL readback report must prove success/cancel URLs are approved');
assert(paymentResultUrlRuntimeReadback.includes(autonomousRuntimeOwnershipMarker), 'runtime URL readback report missing current runtime owner/channel executor narrowing');
assert(!paymentResultUrlRuntimeReadback.includes('named runtime validation owner, named FlipFlop cleanup executor'), 'runtime URL readback report still treats owner/executor as current missing blockers');
const normalizedOrderService = orderService.replace(/\s+/g, ' ');
assert(normalizedOrderService.includes("const envKey = status === 'completed' ? 'PAYMENT_SUCCESS_URL' : 'PAYMENT_CANCEL_URL'"), 'order service must expose success/cancel URL override keys');
assert(orderService.includes("'https://flipflop.alfares.cz'"), 'order service must keep FlipFlop frontend base fallback');
assert(/new URLSearchParams\(\s*\{\s*status\s*\}\s*\)/.test(orderService), 'order service must construct payment-result query params from the explicit status argument');
assert(normalizedOrderService.includes("return this.getPaymentResultUrl('completed', orderId)"), 'order service must build explicit success payment-result status');
assert(normalizedOrderService.includes("return this.getPaymentResultUrl('cancelled', orderId)"), 'order service must build explicit cancel payment-result status');
assert(normalizedOrderService.includes('successUrl: this.getPaymentSuccessUrl(order.id)') && normalizedOrderService.includes('cancelUrl: this.getPaymentCancelUrl(order.id)'), 'order service must pass exact success/cancel URLs to Payments');
assert(read('services/frontend/app/payment-result/page.tsx').includes("status === 'cancelled'") && read('services/frontend/app/payment-result/page.tsx').includes("router.push('/checkout')"), 'payment-result page must own cancelled retry routing');
assert(orchestratorStatus.includes('Owner approved Goal 24 discount/price fixture path'), 'orchestrator status missing owner-approved fixture update');
assert(implementationState.includes('Owner approved Goal 24 discount/price fixture path'), 'implementation state missing owner-approved fixture update');
assert(orderService.includes('Client-provided discount is not accepted without a server-validated contract'), 'order service must reject direct client discount');
assert(orderService.includes('const after = await this.discountService.applyDiscount(params.orderTotalBeforeDiscount, trimmedDiscountCode)') || orderService.includes('const discount = this.roundMoney(Number(validation.discountValue));'), 'order service must apply server-validated discount code to authoritative total or use already guarded validation discount value');
assert(read('services/order-service/src/marketing/marketing.controller.ts').includes('@UseGuards(JwtAuthGuard, RolesGuard)'), 'discount code generation endpoint must remain guarded');
assert(runtimePreflightBlocker.includes('401 Unauthorized'), 'runtime preflight blocker must record guarded admin endpoint 401');
assert(runtimePreflightBlocker.includes('blocked-before-side-effects'), 'runtime preflight blocker must stop before side effects');
assert(runtimePreflightBlocker.includes('[MISSING: named admin/actor or approved token-handling path for guarded discount-code generation]'), 'runtime preflight blocker must preserve admin actor/token-handling blocker');
assert(approvalDraft.includes('Runtime Preflight Blocker'), 'approval draft missing runtime preflight blocker');
assert(discountFixtureQuoteHardStop.includes('hard-stop-before-checkout'), 'discount fixture quote hard-stop report must stop before checkout');
assert(discountFixtureQuoteHardStop.includes('Discount code cannot be combined with a bundle discount'), 'discount fixture quote hard-stop must preserve source rejection reason');
assert(discountFixtureQuoteHardStop.includes('codeHash=c918c89d0b2fcf25'), 'discount fixture quote hard-stop must include redacted code hash readback');
assert(orderService.includes('Discount code cannot be combined with a bundle discount'), 'order service must reject discountCode combined with bundleIntent');
assert(approvalDraft.includes('Discount Fixture Quote Hard Stop'), 'approval draft missing discount fixture quote hard stop');
assert(bundlePreservingFixtureSource.includes('source-prepared-runtime-deploy-gated'), 'bundle-preserving fixture source report must remain deploy gated');
assert(bundlePreservingFixtureSource.includes('goalId=GOAL24-paid-provider-fixture-20260704'), 'bundle-preserving fixture source report missing goal id gate');
assert(bundlePreservingFixtureRuntimeQuote.includes('quote-preflight-passed-before-checkout'), 'bundle-preserving fixture runtime quote must record passed quote preflight');
assert(bundlePreservingFixtureRuntimeQuote.includes('codeHash=8533c8372a079955'), 'bundle-preserving fixture runtime quote must include redacted code hash');
assert(bundlePreservingFixtureRuntimeQuote.includes('schemaVersion=flipflop.checkout-quote.v1'), 'bundle-preserving fixture runtime quote must include quote schema');
assert(bundlePreservingFixtureRuntimeQuote.includes('sideEffects=[]'), 'bundle-preserving fixture runtime quote must prove no quote side effects');
assert(bundlePreservingFixtureRuntimeQuote.includes('total=300'), 'bundle-preserving fixture runtime quote must prove exact 300 CZK total');
assert(bundlePreservingFixtureRuntimeQuote.includes('usedCount=0') && bundlePreservingFixtureRuntimeQuote.includes('remainingUses=1'), 'bundle-preserving fixture runtime quote must prove discount code stayed unredeemed');
assert(bundlePreservingFixtureRuntimeQuote.includes('provider_call: false') && bundlePreservingFixtureRuntimeQuote.includes('live_checkout_executed: false'), 'bundle-preserving fixture runtime quote must stop before checkout/provider');
assert(approvalDraft.includes('Bundle-Preserving Fixture Runtime Quote'), 'approval draft missing bundle-preserving fixture runtime quote');
assert(!approvalDraft.includes('[MISSING: migration/deploy approval for persisted Orders cleanup idempotency key]'), 'approval draft must not preserve stale Orders idempotency migration blocker');
assert(approvalDraft.includes('[RESOLVED/NARROWED: Orders cleanup idempotency persistence is source/deploy-evidence recorded; runtime exact sanitized cleanup idempotency key remains missing]'), 'approval draft missing narrowed Orders idempotency persistence marker');
for (const marker of [
  '[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]',
  '[MISSING: live current target row readback at execution time]',
  '[RESOLVED/NARROWED: approval intake 003 supplies the bounded smoke execution window]; [MISSING: Warehouse hold/release duration]',
  '[MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]',
]) {
  assert(approvalDraft.includes(marker), `approval draft missing Warehouse split blocker ${marker}`);
  assert(bundlePreservingFixtureRuntimeQuote.includes(marker), `bundle-preserving quote report missing Warehouse split blocker ${marker}`);
}
assert(bundlePreservingFixtureRuntimeQuote.includes('[RESOLVED/NARROWED: FlipFlop channel cleanup executor is the Codex Goal 24 integration thread for future source-controlled coordination]'), 'bundle-preserving quote report missing channel executor narrowing');
assert(orchestratorStatus.includes('VAL-GOAL-24-bundle-preserving-fixture-runtime-quote.md'), 'orchestrator status missing runtime quote report');
assert(implementationState.includes('VAL-GOAL-24-bundle-preserving-fixture-runtime-quote.md'), 'implementation state missing runtime quote report');
assert(orderService.includes('GOAL24_BUNDLE_FIXTURE_DISCOUNT_CZK = 2117.58'), 'order service missing exact Goal 24 fixture amount');
assert(orderService.includes('private isGoal24BundleFixtureDiscount'), 'order service missing Goal 24 fixture guard');
assert(orderService.includes('Number(params.validation.discountValue)'), 'Goal 24 fixture guard must normalize persisted discount value before money comparison');
assert(orderService.includes('const discount = this.roundMoney(Number(validation.discountValue));'), 'Goal 24 fixture branch must use the already guarded validation discount value with explicit numeric normalization');
assert(orderService.includes('goal24_bundle_fixture_exclusive'), 'order service missing fixture metadata marker');
assert(orderService.includes('Discount code cannot be combined with a bundle discount'), 'order service must keep fallback discountCode+bundleIntent rejection');
assert(read('services/order-service/src/marketing/discount.service.ts').includes('goalId: row.goalId'), 'discount validation must expose goalId for fixture gating');
assert(approvalDraft.includes('Bundle-Preserving Fixture Source Gate'), 'approval draft missing bundle-preserving fixture source gate');
assert(approvalDraft.includes('2026-07-04 Runtime Preflight Owner Check'), 'approval draft missing runtime owner check');
assert(runtimeOwnerCheck.includes('blocked-before-side-effects'), 'runtime owner check must stop before side effects');
assert(runtimeOwnerCheck.includes('[MISSING: named admin/actor or approved token-handling path for guarded discount-code generation]'), 'runtime owner check must preserve admin actor/token-handling blocker');
assert(autonomousRuntimeOwnershipPacket.includes(autonomousRuntimeOwnershipMarker), 'runtime ownership packet must supersede runtime owner/channel executor blocker');
assert(runtimeOwnerCheck.includes('[MISSING: provider webhook/callback evidence that marks the paid order complete without manual payment-state bypass]'), 'runtime owner check must preserve provider callback blocker');
assert(runtimeOwnerCheck.includes('[MISSING: deterministic Warehouse component reservation state and approved cleanup operation before customer-visible stock/restored messaging]'), 'runtime owner check must preserve Warehouse cleanup blocker');
assert(runtimeOwnerCheck.includes('Secret retrieval alone is not a safe runtime path'), 'runtime owner check must reject secret-only execution path');
assert(orchestratorStatus.includes('VAL-GOAL-24-runtime-preflight-owner-check-2026-07-04.md'), 'orchestrator status missing runtime owner check report');
assert(implementationState.includes('VAL-GOAL-24-runtime-preflight-owner-check-2026-07-04.md'), 'implementation state missing runtime owner check report');

for (const marker of [
  '[RESOLVED/NARROWED: guarded Goal 24 discount-code generation must use an Auth-issued user access token carrying global:superadmin or app:flipflop-service:admin; service tokens/API keys are not approved user actor substitutes]',
  '[RESOLVED/NARROWED: approved token-handling shape is token file or in-process environment material read only by the final approved runner, never printed, never decoded into reports, never committed, and removed after the run]',
  '[RESOLVED/NARROWED: sanitized auth evidence may record only auth endpoint status class, token-present boolean, role-check boolean, actor label/hash, approval id, and timestamps]',
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
]) {
  assert(authAdminActorTokenHandling.includes(marker), `auth/admin actor report missing ${marker}`);
  assert(channelCleanupContract.includes(marker) || approvalDraft.includes(marker) || implementationState.includes(marker) || orchestratorStatus.includes(marker), `Goal 24 docs missing auth/admin marker ${marker}`);
}
assert(authAdminActorTokenHandling.includes('mutation: false'), 'auth/admin actor report must remain non-mutating');
assert(authAdminActorTokenHandling.includes('token_output: false'), 'auth/admin actor report must forbid token output');
assert(authAdminActorTokenHandling.includes('service tokens/API keys are not approved user actor substitutes'), 'auth/admin actor report must reject service token user substitution');
assert(authAdminActorTokenHandling.includes('[MISSING: sanitized auth/admin evidence path for guarded discount-code generation]'), 'auth/admin actor report missing sanitized evidence fallback');
for (const [label, source] of [['auth/admin actor report', authAdminActorTokenHandling], ['implementation state', implementationState], ['orchestrator status', orchestratorStatus]]) {
  assert(!source.includes('[MISSING: named runtime validation owner with authority to stop before each side effect]'), `${label} still contains stale runtime validation owner blocker`);
  assert(source.includes(autonomousRuntimeOwnershipMarker), `${label} missing autonomous runtime validation owner marker`);
}
for (const marker of [
  'status: actor-hash-resolved-token-source-still-blocked',
  'candidateCount: `3`',
  'matchingAdminActorCount: `1`',
  'selectedActorHash: `4215870ba488de17`',
  'selectedActorRequiredAdminRolePresent: `true`',
  'selectedActorFlipflopAdminPresent: `true`',
  'tokenOutput: `false`',
  'rawEmailOutput: `false`',
  'rawUserIdOutput: `false`',
  '[RESOLVED/NARROWED: sanitized Auth readback found one active verified Goal 24 actor hash 4215870ba488de17 with app:flipflop-service:admin and no token/raw email/user id output]',
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
]) {
  assert(authAdminActorReadback.includes(marker), `auth/admin actor readback missing ${marker}`);
}

for (const marker of [
  '[RESOLVED/NARROWED: Goal 24 token-binding proof may record only token-present, Auth validation status class, actor-hash match, required-role boolean, approval id, runner id, timestamps, and no-output booleans]',
  '[RESOLVED/NARROWED: Goal 24 approved token source shape is owner-approved on-host token file or in-memory handoff read only by the approved runner, never printed, never decoded into reports, never persisted, never committed, and removed or invalidated after the run]',
  '[RESOLVED/NARROWED: Goal 24 Auth token binding does not authorize Orders, Warehouse, Payments/provider, or channel side effects and does not prove stock effects]',
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
  '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation]',
  'tokenSourceType=on-host-token-file',
  'tokenSourceType=in-memory-handoff',
  'actorHashMatches=true',
  'requiredAdminRolePresent=true',
  'tokenOutput=false',
  'decodedJwtOutput=false',
  'rawUserOutput=false',
  'secretOutput=false',
  'tokenSourceDestroyedOrInvalidated=true',
  'Auth token-binding proof is not Warehouse stock evidence and is not Orders cleanup authorization',
]) {
  assert(authAdminTokenBindingProofContract.includes(marker), `auth/admin token-binding proof contract missing ${marker}`);
  assert(implementationState.includes(marker) || orchestratorStatus.includes(marker) || gateGoal.includes(marker) || channelCleanupContract.includes(marker) || approvalDraft.includes(marker), `Goal 24 docs missing token-binding marker ${marker}`);
}
for (const marker of [
  '[RESOLVED/NARROWED: Auth TEST_EMAIL/TEST_PASSWORD token probe returned loginStatusClass=2xx, tokenPresent=true, authValidationStatusClass=2xx, requiredAdminRolePresent=true, actorHashMatches=false, and no token/JWT/user/secret output; test credentials are not an approved Goal 24 discount-fixture token source]',
  'status: test-credential-token-valid-role-actor-mismatch',
  'live_auth_login: true',
  'token_issuance: true',
  'token_output: false',
  'decoded_jwt_output: false',
  'secret_output: false',
  'raw_user_output: false',
  'raw_email_output: false',
  'provider_call: false',
  'live_checkout_executed: false',
  'discount_code_created: false',
  'actorHashMatches: false for selected actor hash 4215870ba488de17',
  'requiredAdminRolePresent: true',
  '[MISSING: approved token source path bound to actor hash 4215870ba488de17, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
  '[MISSING: sanitized auth/admin evidence path for guarded discount-code generation using the selected actor-bound token]',
]) {
  assert(authTestCredentialTokenProbe.includes(marker), `auth test credential token probe missing ${marker}`);
  assert(implementationState.includes(marker) || orchestratorStatus.includes(marker) || authTestCredentialTokenProbe.includes(marker), `Goal 24 docs missing auth test credential marker ${marker}`);
}
assert(!authTestCredentialTokenProbe.includes('actorHashMatches: true'), 'test credential probe must not claim selected actor hash match');

for (const marker of [
  '[RESOLVED/NARROWED: Goal 24 Auth actor-bound token source can be generated for actor hash 4215870ba488de17 using actorHashField=emailLower, requiredRole=app:flipflop-service:admin, tokenFileMode=0600, authValidationStatusClass=2xx, actorHashMatches=true, requiredAdminRolePresent=true, tokenOutput=false, decodedJwtOutput=false, rawUserOutput=false, rawEmailOutput=false, secretOutput=false, and tokenSourceDestroyedOrInvalidated=true]',
  'contract: `auth-goal24-actor-token-provisioning.v1`',
  'actorHashField: `emailLower`',
  'selectedActorUserType: `service`',
  'requiredAdminRolePresent: `true`',
  'tokenFileModeOctal: `0600`',
  'authValidationStatusClass: `2xx`',
  'actorHashMatches: `true`',
  'tokenSourceDestroyedOrInvalidated: `true`',
  'No user, role, discount-code, checkout, order, payment, provider, refund, Orders, Warehouse, channel, deploy, migration, or DB mutation occurred',
]) {
  assert(authActorTokenProvisioning.includes(marker), `auth actor token provisioning report missing ${marker}`);
  assert(implementationState.includes(marker) || orchestratorStatus.includes(marker) || authActorTokenProvisioning.includes(marker), `Goal 24 docs missing auth actor token marker ${marker}`);
}
assert(authActorTokenProvisioning.includes('tokenOutput: `false`'), 'auth actor token proof must not output token');
assert(authActorTokenProvisioning.includes('decodedJwtOutput: `false`'), 'auth actor token proof must not output decoded JWT');
assert(authActorTokenProvisioning.includes('rawUserOutput: `false`'), 'auth actor token proof must not output raw user');
assert(authActorTokenProvisioning.includes('secretOutput: `false`'), 'auth actor token proof must not output secrets');

for (const boundary of [
  'mutation: false',
  'live_auth_login: false',
  'token_issuance: false',
  'token_output: false',
  'decoded_jwt_output: false',
  'secret_output: false',
  'raw_user_output: false',
  'provider_call: false',
  'live_checkout_executed: false',
  'orders_mutation: false',
  'warehouse_mutation: false',
  'channel_cleanup_mutation: false',
]) {
  assert(authAdminTokenBindingProofContract.includes(boundary), `auth/admin token-binding proof contract missing boundary ${boundary}`);
}
for (const forbidden of [
  'Bearer ey',
  'access_token=',
  'refresh_token=',
  'Authorization: Bearer ',
  'raw email:',
  'raw user id:',
]) {
  assert(!authAdminTokenBindingProofContract.includes(forbidden), `auth/admin token-binding proof contract contains forbidden token/raw pattern ${forbidden}`);
}
assert(authAdminActorTokenHandling.includes('[RESOLVED/NARROWED: approved token-handling shape is token file or in-process environment material read only by the final approved runner, never printed, never decoded into reports, never committed, and removed after the run]'), 'auth/admin token handling must still define non-printing token shape');


assert(implementationState.includes('VAL-GOAL-24-auth-admin-actor-token-handling-2026-07-04.md'), 'implementation state missing auth/admin actor report');
assert(orchestratorStatus.includes('VAL-GOAL-24-auth-admin-actor-token-handling-2026-07-04.md'), 'orchestrator status missing auth/admin actor report');

for (const [label, source] of [['channel cleanup contract', channelCleanupContract], ['approval draft', approvalDraft], ['paid/provider gate', gateGoal], ['implementation state', implementationState], ['orchestrator status', orchestratorStatus], ['channel cleanup packet report', channelCleanupPacket]]) {
  assert(source.includes(channelCleanupPacketMarker), `${label} missing channel cleanup packet marker`);
  assert(source.includes('[RESOLVED/NARROWED: runtime config readback shows PAYMENT_SUCCESS_URL and PAYMENT_CANCEL_URL resolve to approved FlipFlop payment-result URLs without secret output]'), `${label} missing success/cancel runtime override blocker`);
}
for (const [label, source] of [
  ['implementation state', implementationState],
  ['orchestrator status', orchestratorStatus],
  ['approval draft', approvalDraft],
  ['autonomous runtime ownership packet', autonomousRuntimeOwnershipPacket],
  ['FlipFlop Warehouse blocker wording sync', flipflopWarehouseBlockerWordingSync],
]) {
  assert(!source.includes('Warehouse target rows/window/max quantity'), `${label} still contains generic Warehouse target/window/max wording`);
  assert(!source.includes('Warehouse live target rows/window/max quantity'), `${label} still contains generic Warehouse live target/window/max wording`);
  assert(!source.includes('approved Warehouse stock hold/release window and max quantity'), `${label} still contains stale Warehouse hold/max wording`);
  assert(source.includes('[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]'), `${label} missing Warehouse candidate target facts marker`);
  assert(source.includes('[MISSING: live current target row readback at execution time]'), `${label} missing live Warehouse readback blocker`);
  assert(source.includes('[RESOLVED/NARROWED: approval intake 003 supplies the bounded smoke execution window]; [MISSING: Warehouse hold/release duration]'), `${label} missing renewed Warehouse window blocker`);
  assert(source.includes('[MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]'), `${label} missing final Warehouse mutation approval blocker`);
}

for (const [label, source] of [['autonomous runtime ownership packet', autonomousRuntimeOwnershipPacket], ['channel cleanup contract', channelCleanupContract], ['approval draft', approvalDraft], ['paid/provider gate', gateGoal], ['implementation state', implementationState], ['orchestrator status', orchestratorStatus]]) {
  assert(source.includes(autonomousRuntimeOwnershipMarker), `${label} missing autonomous runtime ownership marker`);
}

const currentFlipFlopStatusSurface = orchestratorStatus.split('\n').slice(0, 80).join('\n');
for (const stale of [
  '[MISSING: named runtime validation owner for the exact side-effectful smoke]',
  '[MISSING: named runtime validation owner for the exact side-effectful full paid/refund smoke]',
  '[MISSING: named FlipFlop channel cleanup executor]',
  '[MISSING: named FlipFlop channel cleanup executor for exact-order refunded acknowledgement]',
  'missing runtime validation owner, missing provider/Orders/Warehouse cleanup proofs',
]) {
  assert(!currentFlipFlopStatusSurface.includes(stale), 'current FlipFlop status still contains stale owner/executor wording: ' + stale);
  assert(!runtimePreflightBlocker.includes(stale), 'runtime preflight blocker report still contains stale owner/executor wording: ' + stale);
}
assert(currentFlipFlopStatusSurface.includes(autonomousRuntimeOwnershipMarker), 'current FlipFlop status missing autonomous runtime ownership marker');

for (const stale of [
  '[MISSING: named runtime validation owner for the exact side-effectful smoke]',
  '[MISSING: named runtime validation owner for the exact side-effectful full paid/refund smoke]',
  'runtime validation owner [MISSING: owner], channel cleanup executor [MISSING: executor]',
  'the missing runtime validation owner, missing provider/Orders/Warehouse cleanup proofs',
  '| Final live smoke | final integration | `[MISSING: named runtime validation owner]` |',
]) {
  assert(!approvalDraft.includes(stale), `approval draft still contains stale runtime validation owner wording: ${stale}`);
}
for (const marker of [
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
  '[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]',
  '[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]',
  '[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]',
  '[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]; [RESOLVED/NARROWED: approval intake 003 supplies the bounded smoke execution window]; [MISSING: Warehouse hold/release duration]; [MISSING: live current target row readback at execution time]; [MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]',
  '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
]) {
  assert(autonomousRuntimeOwnershipPacket.includes(marker), `autonomous runtime ownership packet missing ${marker}`);
}
assert(autonomousRuntimeOwnershipPacket.includes('mutation: false'), 'autonomous runtime ownership packet must remain non-mutating');
assert(autonomousRuntimeOwnershipPacket.includes('provider_call: false'), 'autonomous runtime ownership packet must forbid provider calls');
assert(autonomousRuntimeOwnershipPacket.includes('live_checkout_executed: false'), 'autonomous runtime ownership packet must forbid live checkout');
assert(autonomousRuntimeOwnershipPacket.includes('secret_output: false'), 'autonomous runtime ownership packet must forbid secret output');
assert(channelCleanupPacket.includes('mutation: false'), 'channel cleanup packet report must remain non-mutating');
assert(channelCleanupPacket.includes('live_checkout_executed: false'), 'channel cleanup packet report must forbid live checkout');
assert(channelCleanupPacket.includes('provider_call: false'), 'channel cleanup packet report must forbid provider calls');
assert(channelCleanupPacket.includes('secret_output: false'), 'channel cleanup packet report must forbid secret output');
assert(channelCleanupPacket.includes('raw_customer_or_payment_evidence: false'), 'channel cleanup packet report must forbid raw customer/payment evidence');

for (const [label, source] of [['channel cleanup owner supersession report', channelCleanupOwnerSupersession], ['channel cleanup contract', channelCleanupContract], ['approval draft', approvalDraft], ['paid/provider gate', gateGoal], ['implementation state', implementationState], ['orchestrator status', orchestratorStatus]]) {
  assert(source.includes(channelCleanupOwnerSupersessionMarker), `${label} missing channel cleanup owner supersession marker`);
  assert(source.includes(autonomousRuntimeOwnershipMarker), `${label} missing autonomous runtime ownership marker for channel supersession`);
}
for (const marker of [
  '[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]',
  '[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]',
  '[MISSING: concrete side-effectful rollback run id and cleanup idempotency keys]',
  '[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]',
  '[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]; [RESOLVED/NARROWED: approval intake 003 supplies the bounded smoke execution window]; [MISSING: Warehouse hold/release duration]; [MISSING: live current target row readback at execution time]; [MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]',
  '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
  '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
  '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
]) {
  assert(channelCleanupOwnerSupersession.includes(marker), `channel cleanup owner supersession report missing ${marker}`);
  assert(channelCleanupContract.includes(marker), `channel cleanup contract missing current supersession blocker ${marker}`);
}
for (const value of [
  'mutation: false',
  'live_checkout_executed: false',
  'provider_call: false',
  'orders_mutation: false',
  'warehouse_mutation: false',
  'channel_cleanup_mutation: false',
  'secret_output: false',
  'raw_customer_or_payment_evidence: false',
  'must not infer Warehouse stock effects from Payments refund state',
  'may acknowledge `sideEffectsHandled.channel=true` only after',
  'only the source-controlled coordination and stop-authority owner',
]) {
  assert(channelCleanupOwnerSupersession.includes(value), `channel cleanup owner supersession report missing ${value}`);
}

assert(autonomousApprovalIntegrationDecision.includes('status: autonomous-approval-consumed-runtime-hard-stop'), 'autonomous approval integration decision must record hard-stop status');
assert(autonomousApprovalIntegrationDecision.includes('mutation: false'), 'autonomous approval integration decision must remain non-mutating');
assert(autonomousApprovalIntegrationDecision.includes('provider_call: false'), 'autonomous approval integration decision must forbid provider calls');
assert(autonomousApprovalIntegrationDecision.includes('live_checkout_executed: false'), 'autonomous approval integration decision must forbid live checkout');
for (const [label, source] of [['autonomous approval report', autonomousApprovalIntegrationDecision], ['approval draft', approvalDraft], ['paid/provider gate', gateGoal], ['channel cleanup contract', channelCleanupContract], ['implementation state', implementationState], ['orchestrator status', orchestratorStatus]]) {
  assert(source.includes(autonomousApprovalDecisionMarker), `${label} missing autonomous approval integration decision marker`);
}
for (const value of [
  '[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]',
  '[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]',
  '[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]',
  '[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]; [RESOLVED/NARROWED: approval intake 003 supplies the bounded smoke execution window]; [MISSING: Warehouse hold/release duration]; [MISSING: live current target row readback at execution time]; [MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]',
  '[MISSING: final redacted integration evidence packet before any live side effect]',
]) {
  assert(autonomousApprovalIntegrationDecision.includes(value), `autonomous approval integration decision missing ${value}`);
}


for (const [label, source] of [['source-wave freeze report', currentHeadSync], ['implementation state', implementationState], ['orchestrator status', orchestratorStatus]]) {
  assert(source.includes(sourceWaveEMarker), `${label} missing source-wave E marker`);
  for (const value of [
    'Catalog `6cdd4f5 docs: clarify goal24 catalog current surface`',
    'FlipFlop `7f2fcb9 docs: sync goal24 url readback owner wording`',
    'Payments `da1e9a6 docs: sync goal24 payments readiness owner wording`',
    'Orders `4dca5e6 docs: sync goal24 orders source wave d`',
    'Warehouse `ea7b9e9 merge goal24 warehouse cleanup packet readback sync`',
    '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
  ]) {
    assert(source.includes(value), `${label} missing source-wave E marker ${value}`);
  }
}
for (const [label, source] of [['source-wave freeze report', currentHeadSync], ['implementation state', implementationState], ['orchestrator status', orchestratorStatus]]) {
  assert(source.includes(sourceWaveFreezeMarker), `${label} missing source-wave freeze marker`);
  for (const value of [
    '[MISSING: approved token source path, such as an on-host token file path or in-memory handoff, with explicit no-print/no-decode/no-persist handling]',
    '[MISSING: confirmation that the token belongs to actor hash 4215870ba488de17 and carries app:flipflop-service:admin or global:superadmin]',
    '[MISSING: named human Payments/provider rollback execution owner with bank/refund authority for runtime]',
    '[MISSING: future paymentId/orderId/variableSymbolHash/providerTransactionHash for exact smoke]',
    '[MISSING: concrete side-effectful rollback run id and cleanup idempotency keys]',
    '[MISSING: exact Orders cleanup packet and sideEffectsHandled acknowledgements]',
    '[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]',
    '[RESOLVED/NARROWED: approval intake 003 supplies the bounded smoke execution window]; [MISSING: Warehouse hold/release duration]',
    '[MISSING: live current target row readback at execution time]',
    '[MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]',
    '[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]',
  ]) {
    assert(source.includes(value), `${label} missing preserved blocker ${value}`);
  }
}
for (const value of [
  'mutation: false',
  'provider_call: false',
  'live_checkout_executed: false',
  'orders_mutation: false',
  'warehouse_mutation: false',
  'channel_cleanup_mutation: false',
  'secret_output: false',
  'raw_customer_or_payment_evidence: false',
  'Catalog `e379b54 merge goal24 current source head sync`',
  'Orders `d53de9f merge goal24 current source head sync`',
  'Payments `eab6351 merge goal24 current source head sync`',
  'Warehouse `11df002 merge goal24 warehouse target facts reconcile`',
  'FlipFlop `e1f3e3a merge goal24 current source head sync`',
]) {
  assert(currentHeadSync.includes(value), `source-wave freeze report missing ${value}`);
}

for (const value of [
  '[RESOLVED/NARROWED: owner-approved stop-before-paid Fiobanka QR smoke executed and cleaned up]',
  '[RESOLVED/NARROWED: owner-confirmed manual Fiobanka refund was executed through the external refund service; FlipFlop acknowledgement path remains available for exact order marking]',
  '[RESOLVED/NARROWED: Orders source accepts sanitized approval.idempotencyKey and persists statusTransitionAudit]',
  '[RESOLVED/NARROWED: Warehouse operation-selection matrix exists for release/cancel/return by component-line state]',
  '[RESOLVED: owner accepted owner-confirmed manual Fiobanka refund as sufficient Goal 24 closeout without exact FlipFlop order linkage]',
  '[RESOLVED/NARROWED: runtime readback found no linked FlipFlop order state, so no FlipFlop refunded acknowledgement mutation is required for this evidence-only closeout]',
  '[RESOLVED/NARROWED: runtime readback found no linked central Orders or FlipFlop state, so no Orders/Warehouse post-paid correction is required for this evidence-only closeout]',
  '[MISSING: owner-approved post-paid Orders/Warehouse correction packet for the exact completed payment state]',
]) {
  assert(approvalDraft.includes(value), `approval draft self-discovery missing ${value}`);
}
assert(orchestratorStatus.includes('Payments repo had uncommitted Goal 24 reconciliation files during discovery'), 'orchestrator status missing Payments dirty-worktree caveat');
for (const source of [approvalDraft, channelCleanupContract, orchestratorStatus, implementationState]) {
  assert(source.includes('[HARD-STOP: current target component total is 1998 CZK, exceeding approved Fiobanka paid/provider smoke maximum 300 CZK]'), 'Goal 24 amount gate hard-stop marker missing');
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



const staleWarehouseTargetFactsBlocker = '[MISSING: owner-approved Warehouse stock hold/release window, max quantity, target rows]';
for (const [label, source] of [
  ['channel cleanup contract', channelCleanupContract],
  ['paid/provider gate', gateGoal],
  ['implementation state', implementationState],
  ['orchestrator status', orchestratorStatus],
  ['current head sync report', currentHeadSync],
  ['channel cleanup owner supersession report', channelCleanupOwnerSupersession],
  ['autonomous runtime ownership packet', autonomousRuntimeOwnershipPacket],
  ['warehouse target facts wording sync report', warehouseTargetFactsWordingSync],
]) {
  assert(source.includes('[RESOLVED/NARROWED: candidate target component stock rows and max component quantity are source-documented from Catalog packet]'), `${label} missing source-documented target facts marker`);
  assert(source.includes('[RESOLVED/NARROWED: approval intake 003 supplies the bounded smoke execution window]; [MISSING: Warehouse hold/release duration]'), `${label} missing Warehouse hold/release duration blocker`);
  assert(source.includes('[MISSING: live current target row readback at execution time]'), `${label} missing live target row readback blocker`);
  assert(source.includes('[MISSING: final owner approval before any live Warehouse reservation/cleanup mutation]'), `${label} missing final Warehouse mutation approval blocker`);
  if (label !== 'implementation state') {
    assert(!source.includes(staleWarehouseTargetFactsBlocker), `${label} still contains stale combined Warehouse target facts blocker`);
  }
}
for (const boundary of [
  'mutation: false',
  'live_checkout_executed: false',
  'discount_code_created: false',
  'payment_creation: false',
  'provider_call: false',
  'orders_mutation: false',
  'warehouse_mutation: false',
  'channel_cleanup_mutation: false',
  'deployment: false',
  'secret_output: false',
  'token_output: false',
  'raw_customer_or_payment_evidence: false',
]) {
  assert(warehouseTargetFactsWordingSync.includes(boundary), `Warehouse target facts wording sync missing boundary ${boundary}`);
}

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
    approvalDraft: 'discount_fixture_approved_side_effects_gated',
    approvalDraftSelfDiscovery: 'refreshed_runtime_blocked',
    amountGate: 'owner_approved_server_validated_discount_fixture_to_300_czk',
    runtimePreflight: 'blocked_guarded_admin_endpoint_requires_actor_or_token_path',
    discountFixtureQuote: 'blocked_discount_code_is_mutually_exclusive_with_bundle_intent',
    bundlePreservingFixtureSource: 'source_prepared_runtime_deploy_gated',
    bundlePreservingFixtureRuntimeQuote: 'quote_preflight_passed_before_checkout',
    runtimeOwnerCheck: 'blocked_secret_access_is_not_sufficient_without_named_actor_and_cleanup_packet',
    authAdminActorTokenHandling: 'actor_bound_source_proven_fresh_fixture_step_blocked',
    successCancelUrlOwnership: 'runtime_url_readback_resolved',
    retryStateCleanupOwnership: 'source_prepared_runtime_blocked',
    channelCleanupPacket: 'policy_complete_runtime_blocked',
    autonomousApprovalIntegrationDecision: 'approval_consumed_new_runtime_side_effects_hard_stopped',
    defaultAuthSubjectSmokeNonMutating: true,
  },
  blockers: operativeRequiredBlockers,
}, null, 2));

const goalDoc = fs.readFileSync('implementation-goals/GOAL-24-paid-provider-bundle-checkout-gate.md', 'utf8');
assert(!read('docs/orchestrator/STATUS.md').includes('[MISSING: owner-approved paid/provider test window, non-secret approval id, target active catalog.bundle.v1 bundle id, provider method, and sanitized evidence policy]'), 'docs/orchestrator/STATUS.md must not preserve stale broad owner approval/test window blocker as current');
assert(!read('docs/IMPLEMENTATION_STATE.md').includes('[MISSING: owner-approved paid/provider test window, non-secret approval id, target active catalog.bundle.v1 bundle id, provider method, and sanitized evidence policy]'), 'docs/IMPLEMENTATION_STATE.md must not preserve stale broad owner approval/test window blocker as current');
assert(!read('implementation-goals/GOAL-24-paid-provider-bundle-checkout-gate.md').includes('[MISSING: owner-approved paid/provider test window, non-secret approval id, target active catalog.bundle.v1 bundle id, provider method, and sanitized evidence policy]'), 'implementation-goals/GOAL-24-paid-provider-bundle-checkout-gate.md must not preserve stale broad owner approval/test window blocker as current');
for (const marker of [
  sourceWaveCMarker,
  'Operative Runtime Hard Stops',
  ...operativeRequiredBlockers,
]) {
  assert(goalDoc.includes(marker), `Goal 24 FlipFlop goal doc missing operative marker: ${marker}`);
}
for (const rel of ['reports/validation/VAL-GOAL-24-current-head-sync-2026-07-04.md', 'docs/IMPLEMENTATION_STATE.md', 'docs/orchestrator/STATUS.md']) {
  const source = fs.readFileSync(rel, 'utf8');
  assert(source.includes(sourceWaveCMarker), `${rel} missing source Wave C marker`);
}
