#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredStages = [
  'ordered_unpaid',
  'payment_failed',
  'paid_not_delivered',
  'warehouse_fulfillment_requested',
  'warehouse_collecting',
  'warehouse_forming',
  'warehouse_formed',
  'handed_to_delivery',
  'in_delivery',
  'received',
  'not_received',
  'returned',
  'cancelled',
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const orderApi = read('services/frontend/lib/api/orders.ts');
for (const stage of requiredStages) {
  assert(orderApi.includes(`'${stage}'`) || orderApi.includes(`${stage}:`), `missing lifecycle label coverage: ${stage}`);
}
assert(orderApi.includes('CENTRAL_ORDER_LIFECYCLE_STAGES'), 'shared lifecycle stage list missing');
assert(orderApi.includes('getOrderLifecycleLabel'), 'shared lifecycle label helper missing');
assert(orderApi.includes('getOrderLifecycleColor'), 'shared lifecycle color helper missing');

const uiFiles = [
  'services/frontend/app/orders/page.tsx',
  'services/frontend/app/orders/[id]/page.tsx',
  'services/frontend/app/admin/orders/page.tsx',
  'services/frontend/app/admin/orders/[id]/page.tsx',
];
for (const file of uiFiles) {
  const source = read(file);
  assert(source.includes('useVisiblePolling'), `${file} must keep visible polling refresh`);
  assert(source.includes('Aktualizovat') && source.includes('Aktualizuji'), `${file} must expose visible manual refresh/loading state`);
  assert(source.includes('getOrderLifecycleLabel'), `${file} must use shared lifecycle labels`);
  assert(source.includes('getOrderLifecycleColor'), `${file} must use shared lifecycle colors`);
  assert(!source.includes('providerPayload'), `${file} must not render provider payloads`);
  assert(!source.includes('trackingNumber'), `${file} must not render tracking values`);
  assert(!source.includes('accessToken'), `${file} must not render access tokens`);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'flipflop-orders-lifecycle-ui.v1',
  coveredStages: requiredStages.length,
  surfaces: ['customer-orders', 'customer-order-detail', 'admin-orders', 'admin-order-detail'],
  refresh: 'useVisiblePolling(30000)',
  sensitiveOutput: 'redacted-source-only',
}));
