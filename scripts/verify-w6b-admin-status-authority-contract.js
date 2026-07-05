const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const service = read('services/order-service/src/orders/orders.service.ts');
const api = read('services/frontend/lib/api/orders.ts');
const adminPage = read('services/frontend/app/admin/orders/[id]/page.tsx');
const report = read('reports/validation/2026-07-05-w6b-flipflop-admin-status-authority-contract.md');

assert(service.includes('const localLifecycleMutationRequested ='), 'backend must identify lifecycle mutation requests');
assert(service.includes('dto.status !== undefined || dto.paymentStatus !== undefined'), 'backend must identify status/payment lifecycle fields');
assert(service.includes('const centralOrdersOwned = this.isCentralOrdersOwnedOrder(order);'), 'backend must evaluate central ownership from metadata');
assert(service.includes('centralOrdersOwned && localLifecycleMutationRequested'), 'backend must fail closed for central-owned lifecycle mutation');
assert(service.includes('[MISSING: central Orders admin lifecycle mutation/correction contract]'), 'backend rejection must preserve central contract blocker');
assert(service.includes('...(dto.notes !== undefined ? { notes: dto.notes } : {})'), 'notes-only admin updates must remain locally available');
assert(api.includes('export function isCentralAuthorityOrder(order: Order): boolean'), 'frontend helper must identify central authority orders');
assert(adminPage.includes('disabled={centralStatusLocked}'), 'admin status/payment controls must be disabled for central authority orders');
assert(adminPage.includes('Uložit poznámky'), 'admin submit text must switch to notes-only mode');
assert(report.includes('Vision ->'), 'report must preserve Intent Preservation chain');
assert(report.includes('[MISSING: approved Orders admin lifecycle correction command for FlipFlop admin actors]'), 'report must preserve missing Orders command contract');
assert(report.includes('mutation: false'), 'report must state no runtime mutation occurred');

console.log(JSON.stringify({
  ok: true,
  verifier: 'w6b-flipflop-admin-status-authority-contract.v1',
  backendGuard: 'central-owned status/payment fail-closed',
  localNotesAllowed: true,
  runtimeMutation: false,
  sensitiveOutput: 'redacted-source-only'
}));
