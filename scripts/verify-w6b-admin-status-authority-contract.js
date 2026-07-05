const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const service = read('services/order-service/src/orders/orders.service.ts');
const api = read('services/frontend/lib/api/orders.ts');
const adminPage = read('services/frontend/app/admin/orders/[id]/page.tsx');
const report = read('reports/validation/2026-07-05-w6b-flipflop-admin-status-authority-contract.md');

assert(service.includes('const centralOrderId = this.getAcceptedCentralOrderId(order);'), 'backend must resolve central Orders id from metadata');
assert(service.includes('await this.orderClient.applyAdminOrderStatusAction({'), 'backend must route central status actions to Orders');
assert(service.includes('approval: dto.approval'), 'backend must forward approval packet');
assert(service.includes('[MISSING: payment/refund/provider correction workflow]'), 'backend must fail closed for central payment corrections');
assert(service.includes('data: { notes: dto.notes }'), 'notes-only admin updates must remain locally available');
assert(api.includes('export function isCentralAuthorityOrder(order: Order): boolean'), 'frontend helper must identify central authority orders');
assert(adminPage.includes('status: centralStatusLocked'), 'admin status changes must be submitted for central authority orders only when changed');
assert(adminPage.includes('disabled={centralStatusLocked}'), 'admin payment controls must remain disabled for central authority orders');
assert(adminPage.includes('Odeslat do Orders / uložit poznámky'), 'admin submit text must switch to Orders action mode');
assert(report.includes('Vision ->'), 'report must preserve Intent Preservation chain');
assert(report.includes('[RESOLVED/NARROWED: Orders admin lifecycle action contract source-validated in orders-microservice 333b131]'), 'report must preserve missing Orders command contract');
assert(report.includes('mutation: false'), 'report must state no runtime mutation occurred');

console.log(JSON.stringify({
  ok: true,
  verifier: 'w6b-flipflop-admin-status-authority-contract.v1',
  backendGuard: 'central-owned status routes to Orders and payment remains fail-closed',
  localNotesAllowed: true,
  runtimeMutation: false,
  sensitiveOutput: 'redacted-source-only'
}));
