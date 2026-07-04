const fs = require('fs');
const assert = require('assert/strict');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function requireIncludes(source, needle, label) {
  assert.ok(source.includes(needle), `${label} missing: ${needle}`);
}

const marker = '[RESOLVED/NARROWED: FlipFlop selected channel correlation lookup resolved for Goal 24 centralOrderHash 04d7d08c82a07853 as one local order correlated through centralOrdersForwarding, local status pending/paymentStatus pending/paymentMethod fiobanka/total 300.00, and central forwarding accepted; no channel cleanup mutation occurred]';
const report = read('reports/validation/VAL-GOAL-24-selected-channel-correlation-lookup-2026-07-04.md');
const state = read('docs/IMPLEMENTATION_STATE.md');
const status = read('docs/orchestrator/STATUS.md');

for (const [label, source] of [['report', report], ['state', state], ['status', status]]) {
  requireIncludes(source, marker, `${label} selected channel lookup marker`);
}

for (const required of [
  'flipflopCorrelationCount: `1`',
  'flipflopStatus: `pending`',
  'flipflopPaymentStatus: `pending`',
  'flipflopPaymentMethod: `fiobanka`',
  'flipflopTotal: `300.00`',
  'centralForwardingAcceptedCount: `1`',
  '[MISSING: owner-approved channel side-effect acknowledgement for centralOrderHash 04d7d08c82a07853]',
  '[MISSING: redacted channel cleanup/no-cleanup evidence for cart/session/payment-result/local projection state for centralOrderHash 04d7d08c82a07853]',
  '[MISSING: Orders sideEffectsHandled.channel acknowledgement packet]',
  'channel_cleanup_mutation: false',
  'raw_ids_printed: false',
]) requireIncludes(report + '\n' + state + '\n' + status, required, `selected channel evidence ${required}`);

console.log('Goal 24 selected channel correlation lookup verified');
