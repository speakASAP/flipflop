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

function extractRecentOrdersMapBlock(source, file) {
  const marker = 'recentOrders.map((order) => {';
  const start = source.indexOf(marker);
  assert(start !== -1, `${file} must render recent orders through an order map`);

  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(bodyStart + 1, index);
      }
    }
  }
  throw new Error(`${file} recent orders map block is not closed`);
}

function assertDashboardRecentOrdersUseCentralDisplay(file) {
  const source = read(file);
  const block = extractRecentOrdersMapBlock(source, file);

  assert(source.includes('getCentralNotice'), `${file} must expose stale/missing central lifecycle notices`);
  assert(source.includes('central.stale'), `${file} must flag stale central Orders lifecycle`);
  assert(block.includes('const display = getOrderDisplayData(order)'), `${file} recent orders must derive display data from getOrderDisplayData(order)`);
  assert(block.includes('const centralNotice = getCentralNotice(order)'), `${file} recent orders must derive central lifecycle notice from getCentralNotice(order)`);
  assert(block.includes('formatOrderMoney(display.total, display.currency)'), `${file} recent orders must render central-aware totals/currency`);
  assert(block.includes('getStatusText(display.status)'), `${file} recent orders must render lifecycle text from display.status`);
  assert(
    block.includes('getStatusColor(\n                              display.status') ||
      block.includes('getStatusColor(\n                            display.status') ||
      block.includes('getStatusColor(display.status'),
    `${file} recent orders must color lifecycle from display.status`,
  );
  assert(!block.includes('getStatusText(order.status)'), `${file} must not render local order.status text directly in recent orders`);
  assert(!block.includes('getStatusColor(order.status)'), `${file} must not color local order.status directly in recent orders`);
  assert(!/getStatusColor\(\s*order\.status/.test(block), `${file} must not color local order.status directly in recent orders`);
  assert(!/getOrderLifecycleLabel\(\s*order\.status/.test(block), `${file} must not label local order.status directly in recent orders`);
  assert(!/getOrderLifecycleColor\(\s*order\.status/.test(block), `${file} must not color local order.status directly in recent orders`);
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

const dashboardFiles = [
  'services/frontend/app/dashboard/page.tsx',
  'services/frontend/app/admin/page.tsx',
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

for (const file of dashboardFiles) {
  const source = read(file);
  assertDashboardRecentOrdersUseCentralDisplay(file);
  assert(!source.includes('providerPayload'), `${file} must not render provider payloads`);
  assert(!source.includes('trackingNumber'), `${file} must not render tracking values`);
  assert(!source.includes('accessToken'), `${file} must not render access tokens`);
}

console.log(JSON.stringify({
  ok: true,
  verifier: 'flipflop-orders-lifecycle-ui.v1',
  coveredStages: requiredStages.length,
  surfaces: ['customer-orders', 'customer-order-detail', 'admin-orders', 'admin-order-detail', 'customer-dashboard-recent-orders', 'admin-dashboard-recent-orders'],
  refresh: 'useVisiblePolling(30000)',
  sensitiveOutput: 'redacted-source-only',
}));
