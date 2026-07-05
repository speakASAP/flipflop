const fs = require('fs');
const path = require('path');

const root = process.cwd();
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertContains(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

function assertAtLeast(source, needle, count, label) {
  const actual = source.split(needle).length - 1;
  if (actual < count) {
    throw new Error(`${label}: expected at least ${count} occurrences of ${needle}, found ${actual}`);
  }
}

const service = read('services/order-service/src/orders/orders.service.ts');
const adminPage = read('services/frontend/app/admin/orders/[id]/page.tsx');

assertContains(service, 'async updateAdminOrderStatus(orderId: string, dto: UpdateAdminOrderStatusDto)', 'backend admin mutation');
assertContains(service, 'const centralOrdersOwned = this.isCentralOrdersOwnedOrder(order);', 'backend central ownership guard');
assertContains(service, 'const localLifecycleMutationRequested =', 'backend lifecycle mutation detector');
assertContains(service, 'dto.status !== undefined || dto.paymentStatus !== undefined', 'backend lifecycle mutation fields');
assertContains(service, 'centralOrdersOwned && localLifecycleMutationRequested', 'backend fail-closed condition');
assertContains(service, 'Central Orders owns this order lifecycle', 'backend owner-facing error');
assertContains(service, '[MISSING: central Orders admin lifecycle mutation/correction contract]', 'backend missing contract marker');
assertContains(service, '...(dto.notes !== undefined ? { notes: dto.notes } : {})', 'backend notes-only update remains allowed');

assertContains(adminPage, 'isCentralAuthorityOrder', 'frontend central authority helper import');
assertContains(adminPage, 'function isCentralStatusLocked(order: Order)', 'frontend central lock helper');
assertContains(adminPage, 'const centralStatusLocked = order ? isCentralStatusLocked(order) : false;', 'frontend lock state');
assertContains(adminPage, '...(centralStatusLocked', 'frontend status payload suppression');
assertAtLeast(adminPage, 'disabled={centralStatusLocked}', 2, 'frontend disabled status controls');
assertContains(adminPage, 'uložit lze pouze poznámky', 'frontend central ownership notice');
assertContains(adminPage, "centralStatusLocked ? 'Uložit poznámky' : 'Uložit změny'", 'frontend notes-only button label');

console.log(JSON.stringify({
  ok: true,
  checks: [
    'backend blocks local status/paymentStatus mutation for central Orders-owned orders',
    'backend leaves notes-only update path available',
    'frontend disables status/paymentStatus controls for central lifecycle orders',
    'frontend omits status/paymentStatus from central locked update payload',
  ],
}, null, 2));
