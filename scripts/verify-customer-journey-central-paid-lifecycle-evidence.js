#!/usr/bin/env node
const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function readJson(path) { return JSON.parse(read(path)); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const runtimePath = 'reports/validation/customer-journey-sandbox-runtime/w5-owner-approved-central-paid-lifecycle-runtime-20260707.json';
const finalEvidencePath = 'reports/validation/VAL-W5-central-orders-paid-lifecycle-evidence-2026-07-07.md';
const syntheticRuntimePath = 'reports/validation/customer-journey-sandbox-runtime/w5-owner-approved-synthetic-success-runtime-20260706.json';
const runtime = readJson(runtimePath);
const syntheticRuntime = readJson(syntheticRuntimePath);
const finalEvidence = read(finalEvidencePath);
const packageJson = readJson('package.json');
const packet = read('docs/orchestrator/2026-07-06-customer-journey-sandbox-runtime-packet.md');
const status = read('docs/orchestrator/STATUS.md');
const state = read('docs/IMPLEMENTATION_STATE.md');
const runner = read('scripts/run-w5-synthetic-success-runtime.js');

assert(packageJson.scripts['verify:customer-journey-central-paid-lifecycle-evidence'] === 'node scripts/verify-customer-journey-central-paid-lifecycle-evidence.js', 'central paid lifecycle verifier script missing');
assert(runner.includes("'x-internal-service-token': token"), 'future central lifecycle readback must use Orders internal service token header');
assert(runner.includes("'x-service-name': 'flipflop-service'"), 'future central lifecycle readback must identify flipflop-service');

assert(syntheticRuntime.remainingBlockers.includes('[MISSING: central Orders paid lifecycle evidence; local synthetic payment success does not update central payment status]'), 'previous synthetic-success evidence must preserve old central blocker');
assert(runtime.ok === true, 'central paid lifecycle runtime evidence must pass');
assert(runtime.runtimeMutation === true, 'central paid lifecycle evidence must disclose mutation');
assert(runtime.ordersPaymentStatusRouteInvoked === true, 'central paid lifecycle evidence must disclose Orders payment-status route invocation');
assert(runtime.ordersPaymentStatusContract === 'orders.payment-status.v1', 'Orders payment-status contract mismatch');
assert(runtime.ordersPaymentStatusResultHttpStatusClass === '2xx', 'Orders payment-status route must have 2xx result');
assert(runtime.centralBeforeReadStatus === 'available', 'central before read must be available');
assert(runtime.centralAfterReadStatus === 'available', 'central after read must be available');
assert(runtime.centralAfterPaymentStatus === 'paid', 'central after payment status must be paid');
assert(runtime.centralAfterStatus === 'confirmed', 'central after status must be confirmed');
assert(runtime.centralAfterLifecycleStage === 'paid_not_delivered', 'central lifecycle stage must be paid_not_delivered');
assert(runtime.warehouseHandoffStatus === 'failed', 'Warehouse handoff blocker must be preserved after central paid lifecycle');
assert(runtime.providerTruth === false, 'central paid lifecycle evidence must not claim provider truth');
assert(runtime.providerCall === false, 'central paid lifecycle evidence must not call provider');
assert(runtime.externalProviderCall === false, 'central paid lifecycle evidence must not call external provider');
assert(runtime.realMoneyMovement === false, 'central paid lifecycle evidence must not move real money');
assert(runtime.paymentCreated === false, 'central paid lifecycle evidence must not create provider payment');
assert(runtime.rawCustomerOutput === false, 'raw customer output must remain false');
assert(runtime.rawOrderOutput === false, 'raw order output must remain false');
assert(runtime.rawPaymentOutput === false, 'raw payment output must remain false');
assert(runtime.rawProviderPayloadOutput === false, 'raw provider output must remain false');
assert(runtime.secretOutput === false, 'secret output must remain false');
assert(runtime.tokenOutput === false, 'token output must remain false');
assert(runtime.centralOrdersPaidLifecycleEvidence === true, 'central paid lifecycle evidence flag must be true');
assert(!runtime.remainingBlockers.includes('[MISSING: central Orders paid lifecycle evidence; local synthetic payment success does not update central payment status]'), 'central paid lifecycle blocker must be closed');
assert(runtime.remainingBlockers.includes('[MISSING: Warehouse fulfillment handoff success after central Orders paid lifecycle; central readback shows warehouseHandoffStatus=failed]'), 'Warehouse fulfillment residual blocker must remain explicit');

for (const marker of [
  runtimePath,
  finalEvidencePath,
  'orders.payment-status.v1',
  'centralAfterPaymentStatus=paid',
  'providerTruth=false',
  'realMoneyMovement=false',
  'warehouseHandoffStatus=failed',
]) {
  assert(packet.includes(marker) || status.includes(marker) || state.includes(marker) || finalEvidence.includes(marker), `docs/evidence missing marker ${marker}`);
}

console.log(JSON.stringify({
  ok: true,
  centralPaidLifecycleEvidence: true,
  ordersPaymentStatusRouteInvoked: runtime.ordersPaymentStatusRouteInvoked,
  centralAfterPaymentStatus: runtime.centralAfterPaymentStatus,
  centralAfterLifecycleStage: runtime.centralAfterLifecycleStage,
  providerTruth: runtime.providerTruth,
  realMoneyMovement: runtime.realMoneyMovement,
  centralPaidLifecycleBlockerClosed: true,
  residualBlockers: runtime.remainingBlockers,
}, null, 2));
