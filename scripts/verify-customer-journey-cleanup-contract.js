#!/usr/bin/env node
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const orderService = read('services/order-service/src/orders/orders.service.ts');
const packet = read('docs/orchestrator/2026-07-06-customer-journey-sandbox-runtime-packet.md');
const monitorDoc = read('docs/orchestrator/2026-07-06-synthetic-customer-journey-monitor.md');
const status = read('docs/orchestrator/STATUS.md');
const packageJson = JSON.parse(read('package.json'));

assert(packageJson.scripts['verify:customer-journey-cleanup-contract'] === 'node scripts/verify-customer-journey-cleanup-contract.js', 'package script is missing');

for (const marker of [
  'SYNTHETIC_ORDER_CLEANUP_CONTRACT=flipflop.retention.invoice_pending.no_provider.channel_no_cleanup_until_stale_unpaid.v1',
  'cleanup_mode=retain_then_platform_stale_unpaid_cancel',
  'manual_cleanup_mutation=false',
  'orders_route_invocation=false',
  'db_write_by_runner=false',
  'FINAL_REDACTED_EVIDENCE_PATH=reports/validation/VAL-W5-customer-journey-sandbox-final-redacted-evidence-2026-07-06.md',
]) {
  assert(packet.includes(marker), `runtime packet missing marker ${marker}`);
}

assert(monitorDoc.includes('SYNTHETIC_ORDER_CLEANUP_CONTRACT=flipflop.retention.invoice_pending.no_provider.channel_no_cleanup_until_stale_unpaid.v1'), 'monitor doc missing cleanup contract env value');
assert(status.includes('SYNTHETIC_ORDER_CLEANUP_CONTRACT=flipflop.retention.invoice_pending.no_provider.channel_no_cleanup_until_stale_unpaid.v1'), 'STATUS missing cleanup contract update');
assert(status.includes('FINAL_REDACTED_EVIDENCE_PATH=reports/validation/VAL-W5-customer-journey-sandbox-final-redacted-evidence-2026-07-06.md'), 'STATUS missing final evidence path update');
assert(packet.includes('SYNTHETIC_CUSTOMER_EMAIL=synthetic.customer-journey.w5@example.invalid'), 'packet missing synthetic customer contact contract');

for (const marker of [
  'async cancelStaleUnpaidOrders()',
  'STALE_UNPAID_ORDER_HOURS || 24',
  'paymentStatus: PaymentStatus.pending',
  'status: OrderStatus.pending',
  'this.isCentralOrdersOwnedOrder(o)',
  'PaymentStatus.failed',
  'OrderStatus.cancelled',
]) {
  assert(orderService.includes(marker), `order service missing stale unpaid marker ${marker}`);
}

console.log(JSON.stringify({
  ok: true,
  sourceOnly: true,
  cleanupContract: 'flipflop.retention.invoice_pending.no_provider.channel_no_cleanup_until_stale_unpaid.v1',
  cleanupMode: 'retain_then_platform_stale_unpaid_cancel',
  manualCleanupMutation: false,
  ordersRouteInvocation: false,
  dbWriteByRunner: false,
  finalRedactedEvidencePath: 'reports/validation/VAL-W5-customer-journey-sandbox-final-redacted-evidence-2026-07-06.md',
  runtimeMutation: false,
  syntheticCustomerContact: 'synthetic.customer-journey.w5@example.invalid'
}, null, 2));
