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
const runtimePreflightBlocker = read('reports/validation/VAL-GOAL-24-discount-fixture-runtime-preflight-blocker.md');
const discountFixtureQuoteHardStop = read('reports/validation/VAL-GOAL-24-discount-fixture-quote-hard-stop.md');
const bundlePreservingFixtureSource = read('reports/validation/VAL-GOAL-24-bundle-preserving-fixture-source.md');
const runtimeOwnerCheck = read('reports/validation/VAL-GOAL-24-runtime-preflight-owner-check-2026-07-04.md');
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
const approvedDiscountFixtureMarker = 'Owner-Approved Discount Fixture Narrowing';
const successCancelUrlOwnerMarker = '[RESOLVED/NARROWED: FlipFlop owns exact customer-visible payment-result success/cancel URLs for provider redirects; provider callback evidence still owns payment truth]';
const retryStateCleanupOwnerMarker = '[RESOLVED/NARROWED: FlipFlop owns retry-state cleanup policy for payment-result cancelled/failed views; retry-safe execution remains blocked until provider, Orders, Warehouse, and channel cleanup evidence exists]';

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
  '[MISSING: named runtime validation owner for the exact side-effectful smoke]',
  '[MISSING: named FlipFlop channel cleanup executor]',
  '[MISSING: Fiobanka provider-side completed-transfer refund/reversal/correction proof path with redacted evidence]',
  '[MISSING: Orders cancellation actor/approvedBy, reasonCode, cleanup idempotency key, and payment/warehouse/notification/crm/channel side-effect acknowledgements]',
  '[MISSING: final owner acceptance of redacted evidence policy and forbidden evidence list]',
]) {
  assert(approvalDraft.includes(value), `approval draft missing ${value}`);
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
assert(channelCleanupContract.includes('[MISSING: sanitized runtime config readback or owner confirmation that PAYMENT_SUCCESS_URL and PAYMENT_CANCEL_URL are unset or exactly match the approved FlipFlop payment-result URLs for the future smoke]'), 'channel cleanup contract missing runtime URL override blocker');
assert(orderService.includes("const envKey = status === 'completed' ? 'PAYMENT_SUCCESS_URL' : 'PAYMENT_CANCEL_URL'"), 'order service must expose success/cancel URL override keys');
assert(orderService.includes("'https://flipflop.alfares.cz'"), 'order service must keep FlipFlop frontend base fallback');
assert(orderService.includes('new URLSearchParams({ status })') && orderService.includes("return this.getPaymentResultUrl('completed', orderId)") && orderService.includes("return this.getPaymentResultUrl('cancelled', orderId)"), 'order service must build explicit success/cancel payment-result statuses');
assert(orderService.includes('successUrl: this.getPaymentSuccessUrl(order.id)') && orderService.includes('cancelUrl: this.getPaymentCancelUrl(order.id)'), 'order service must pass exact success/cancel URLs to Payments');
assert(read('services/frontend/app/payment-result/page.tsx').includes("status === 'cancelled'") && read('services/frontend/app/payment-result/page.tsx').includes("router.push('/checkout')"), 'payment-result page must own cancelled retry routing');
assert(orchestratorStatus.includes('Owner approved Goal 24 discount/price fixture path'), 'orchestrator status missing owner-approved fixture update');
assert(implementationState.includes('Owner approved Goal 24 discount/price fixture path'), 'implementation state missing owner-approved fixture update');
assert(orderService.includes('Client-provided discount is not accepted without a server-validated contract'), 'order service must reject direct client discount');
assert(orderService.includes('const after = await this.discountService.applyDiscount(params.orderTotalBeforeDiscount, trimmedDiscountCode)') || orderService.includes('const discount = this.roundMoney(validation.discountValue);'), 'order service must apply server-validated discount code to authoritative total or use already guarded validation discount value');
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
assert(orderService.includes('GOAL24_BUNDLE_FIXTURE_DISCOUNT_CZK = 2117.58'), 'order service missing exact Goal 24 fixture amount');
assert(orderService.includes('private isGoal24BundleFixtureDiscount'), 'order service missing Goal 24 fixture guard');
assert(orderService.includes('const discount = this.roundMoney(validation.discountValue);'), 'Goal 24 fixture branch must use the already guarded validation discount value');
assert(orderService.includes('goal24_bundle_fixture_exclusive'), 'order service missing fixture metadata marker');
assert(orderService.includes('Discount code cannot be combined with a bundle discount'), 'order service must keep fallback discountCode+bundleIntent rejection');
assert(read('services/order-service/src/marketing/discount.service.ts').includes('goalId: row.goalId'), 'discount validation must expose goalId for fixture gating');
assert(approvalDraft.includes('Bundle-Preserving Fixture Source Gate'), 'approval draft missing bundle-preserving fixture source gate');
assert(approvalDraft.includes('2026-07-04 Runtime Preflight Owner Check'), 'approval draft missing runtime owner check');
assert(runtimeOwnerCheck.includes('blocked-before-side-effects'), 'runtime owner check must stop before side effects');
assert(runtimeOwnerCheck.includes('[MISSING: named admin/actor or approved token-handling path for guarded discount-code generation]'), 'runtime owner check must preserve admin actor/token-handling blocker');
assert(runtimeOwnerCheck.includes('[MISSING: owner-approved paid/provider checkout smoke packet naming FlipFlop channel cleanup executor and runtime validation owner]'), 'runtime owner check must preserve runtime owner/channel executor blocker');
assert(runtimeOwnerCheck.includes('[MISSING: provider webhook/callback evidence that marks the paid order complete without manual payment-state bypass]'), 'runtime owner check must preserve provider callback blocker');
assert(runtimeOwnerCheck.includes('[MISSING: deterministic Warehouse component reservation state and approved cleanup operation before customer-visible stock/restored messaging]'), 'runtime owner check must preserve Warehouse cleanup blocker');
assert(runtimeOwnerCheck.includes('Secret retrieval alone is not a safe runtime path'), 'runtime owner check must reject secret-only execution path');
assert(orchestratorStatus.includes('VAL-GOAL-24-runtime-preflight-owner-check-2026-07-04.md'), 'orchestrator status missing runtime owner check report');
assert(implementationState.includes('VAL-GOAL-24-runtime-preflight-owner-check-2026-07-04.md'), 'implementation state missing runtime owner check report');

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
    runtimeOwnerCheck: 'blocked_secret_access_is_not_sufficient_without_named_actor_and_cleanup_packet',
    successCancelUrlOwnership: 'source_prepared_runtime_blocked',
    retryStateCleanupOwnership: 'source_prepared_runtime_blocked',
    defaultAuthSubjectSmokeNonMutating: true,
  },
  blockers: requiredBlockers,
}, null, 2));
