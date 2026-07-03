const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const helper = read('services/order-service/src/orders/affinity-replay-eligibility.ts');
const orderService = read('services/order-service/src/orders/orders.service.ts');
const schema = read('prisma/schema.prisma');

const checks = [];
function check(condition, message) {
  checks.push({ ok: Boolean(condition), message });
}

check(schema.includes('enum OrderStatus') && schema.includes('confirmed') && schema.includes('processing') && schema.includes('shipped') && schema.includes('delivered'), 'Prisma order statuses expose paid/processable and fulfilled local states');
check(schema.includes('enum PaymentStatus') && schema.includes('paid'), 'Prisma payment statuses expose paid state');
check(orderService.includes('paymentStatus: PaymentStatus.paid') && orderService.includes('status: OrderStatus.confirmed'), 'payment completion maps FlipFlop orders to paid + confirmed');
check(orderService.includes('setFulfilledAt') && orderService.includes('OrderStatus.shipped') && orderService.includes('OrderStatus.delivered'), 'fulfilled local states are shipped/delivered with fulfilledAt');
check(helper.includes('FLIPFLOP_AFFINITY_REPLAY_ELIGIBLE_ORDER_STATUSES') && helper.includes('OrderStatus.confirmed') && helper.includes('OrderStatus.processing') && helper.includes('OrderStatus.shipped') && helper.includes('OrderStatus.delivered'), 'affinity helper allowlist uses confirmed/processing/shipped/delivered only');
check(helper.includes('FLIPFLOP_AFFINITY_REPLAY_ELIGIBLE_PAYMENT_STATUSES') && helper.includes('PaymentStatus.paid'), 'affinity helper requires paid payment status');
check(helper.includes('byCatalogProductId.size < 2'), 'affinity helper fails closed unless at least two distinct Catalog product ids remain');
check(helper.includes('line.catalogProductId ?? line.products?.catalogProductId'), 'affinity helper maps line items through persisted Catalog product ids');
check(helper.includes('sourceOwner: FLIPFLOP_AFFINITY_SOURCE_OWNER') && helper.includes('consumerOwner: FLIPFLOP_AFFINITY_CONSUMER_OWNER') && helper.includes('channel: FLIPFLOP_AFFINITY_CHANNEL'), 'affinity helper emits marketplace-owned provenance for Marketing');
check(helper.includes('createHash') && helper.includes('flipflop-affinity:${digest.slice(0, 32)}'), 'affinity helper emits synthetic replay refs instead of local order ids');

const forbiddenTerms = [
  'customerEmail',
  'buyer',
  'deliveryAddress',
  'shippingAddress',
  'billingAddress',
  'paymentTransactionId',
  'providerPayload',
  'providerResponse',
  'accessToken',
  'clientSecret',
  'apiKey',
  'rawPayload',
];

for (const term of forbiddenTerms) {
  check(!helper.includes(term), `affinity helper must not expose forbidden field: ${term}`);
}

function normalizeStatus(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
const allowedOrderStatuses = new Set(['confirmed', 'processing', 'shipped', 'delivered']);
const allowedPaymentStatuses = new Set(['paid']);
function eligibility(order) {
  const lines = Array.isArray(order.order_items) ? order.order_items : [];
  if (!allowedOrderStatuses.has(normalizeStatus(order.status))) return { eligible: false, reason: 'order_status_not_paid_processable' };
  if (!allowedPaymentStatuses.has(normalizeStatus(order.paymentStatus))) return { eligible: false, reason: 'payment_status_not_paid' };
  if (!lines.length) return { eligible: false, reason: 'missing_order_lines' };
  const ids = new Set(lines.map((line) => String(line.catalogProductId || line.products?.catalogProductId || '').trim()).filter(Boolean));
  if (ids.size < 2) return { eligible: false, reason: 'insufficient_distinct_catalog_products' };
  return { eligible: true, reason: 'eligible', count: ids.size };
}

assert.deepStrictEqual(eligibility({ status: 'confirmed', paymentStatus: 'paid', order_items: [{ catalogProductId: 'catalog-a' }, { products: { catalogProductId: 'catalog-b' } }] }), { eligible: true, reason: 'eligible', count: 2 });
assert.strictEqual(eligibility({ status: 'pending', paymentStatus: 'paid', order_items: [{ catalogProductId: 'catalog-a' }, { catalogProductId: 'catalog-b' }] }).reason, 'order_status_not_paid_processable');
assert.strictEqual(eligibility({ status: 'confirmed', paymentStatus: 'pending', order_items: [{ catalogProductId: 'catalog-a' }, { catalogProductId: 'catalog-b' }] }).reason, 'payment_status_not_paid');
assert.strictEqual(eligibility({ status: 'confirmed', paymentStatus: 'paid', order_items: [{ catalogProductId: 'catalog-a' }, { catalogProductId: 'catalog-a' }, {}] }).reason, 'insufficient_distinct_catalog_products');

const failed = checks.filter((row) => !row.ok);
for (const row of checks) {
  console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.message}`);
}
if (failed.length) {
  console.error(`verify-flipflop-affinity-eligibility failed: ${failed.length} failed checks`);
  process.exit(1);
}
console.log(`verify-flipflop-affinity-eligibility passed: ${checks.length} checks`);
