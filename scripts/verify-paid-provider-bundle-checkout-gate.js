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
const adoptionGoal = read('implementation-goals/GOAL-24-catalog-bundle-adoption.md');
const gateGoal = read('implementation-goals/GOAL-24-paid-provider-bundle-checkout-gate.md');
const implementationState = read('docs/IMPLEMENTATION_STATE.md');

const requiredBlockers = [
  '[MISSING: owner-approved paid/provider checkout smoke with stock and refund/cancel rollback plan]',
  '[MISSING: owner-approved paid/provider test window, non-secret approval id, target active catalog.bundle.v1 bundle id, provider method, and sanitized evidence policy]',
  '[MISSING: provider webhook/callback evidence that marks the paid order complete without manual payment-state bypass]',
  '[MISSING: Warehouse stock decrement/reservation-release evidence for every bundle component line]',
  '[MISSING: owner-approved refund/cancel rollback plan proving provider refund or cancellation plus Orders/Warehouse cleanup]',
  '[MISSING: explicit ecosystem checkout migration accepting durable Catalog bundleId]',
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

assert(paymentService.includes("this.callPaymentService<Record<string, unknown>>('/payments/create'"), 'Payments create endpoint missing');
assert(paymentService.includes("this.callPaymentService<RefundResponse>(`/payments/${dto.paymentId}/refund`"), 'Payments refund endpoint exists but is not part of the smoke gate');

assert(productsApi.includes("contractVersion: 'catalog.bundle.v1'"), 'frontend product API lacks catalog.bundle.v1 type');
assert(productsApi.includes('checkoutEnabled: false'), 'Catalog bundle aggregate must remain checkout disabled');
assert(productsApi.includes('checkoutReason: string'), 'Catalog bundle checkout-disabled reason missing');
assert(guestCart.includes("source: 'product_detail_buy_together'"), 'guest cart must keep local product-detail bundle intent source');
assert(guestCart.includes('catalogCandidateId'), 'guest cart may carry Catalog candidate provenance only');
assert(!guestCart.includes('bundleId'), 'guest cart must not persist durable Catalog bundleId');
assert(checkoutPage.includes('catalogCandidateId: bundleIntent.catalogCandidateId'), 'checkout submits Catalog candidate id as identifier only');
assert(!checkoutPage.includes('bundleId: bundleIntent.bundleId'), 'checkout must not submit durable Catalog bundleId');

includesAll(adoptionGoal, requiredBlockers, 'GOAL-24 catalog bundle adoption doc');
includesAll(gateGoal, requiredBlockers, 'GOAL-24 paid/provider gate doc');
includesAll(implementationState, requiredBlockers, 'implementation state');
assert(gateGoal.includes('runtime_progression: blocked'), 'paid/provider gate must keep runtime progression blocked');
assert(implementationState.includes('runtime paid/provider progression remains blocked'), 'state must preserve blocked paid/provider runtime progression');

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
  runtimeProgression: 'blocked',
  verified: {
    checkoutSmokeCreatesOrderAndPaymentRedirect: true,
    orderServiceReservesBeforePaymentCreation: true,
    catalogBundleIdCheckoutAuthority: false,
    defaultAuthSubjectSmokeNonMutating: true,
  },
  blockers: requiredBlockers,
}, null, 2));
