const fs = require('fs');
const assert = require('assert/strict');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function requireIncludes(source, needle, label) { assert.ok(source.includes(needle), `${label} missing: ${needle}`); }

const marker = '[RESOLVED/NARROWED: owner-approved FlipFlop channel no-cleanup acknowledgement for Goal 24 centralOrderHash 04d7d08c82a07853 accepts the selected read-only channel correlation state with one pending local fiobanka order, paymentStatus pending, total 300.00, and central forwarding accepted; no cart/session/payment-result/local projection cleanup mutation is required before Orders unpaid cancellation planning, and no channel cleanup mutation occurred]';
const report = read('reports/validation/VAL-GOAL-24-channel-no-cleanup-ack-2026-07-04.md');
const state = read('docs/IMPLEMENTATION_STATE.md');
const status = read('docs/orchestrator/STATUS.md');

for (const [label, source] of [['report', report], ['state', state], ['status', status]]) {
  requireIncludes(source, marker, `${label} no-cleanup marker`);
}

for (const required of [
  'cart cleanup: `false`',
  'session cleanup: `false`',
  'payment-result cleanup: `false`',
  'local projection cleanup: `false`',
  'sideEffectsHandled.channel=true',
  'channel_cleanup_mutation: false',
  'orders_mutation: false',
  'raw_ids_printed: false',
]) requireIncludes(report, required, `report evidence ${required}`);

console.log('Goal 24 channel no-cleanup acknowledgement verified');
