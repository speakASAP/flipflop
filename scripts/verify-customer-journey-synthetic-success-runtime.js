#!/usr/bin/env node
const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function readJson(path) { return JSON.parse(read(path)); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const runtimePath = 'reports/validation/customer-journey-sandbox-runtime/w5-owner-approved-synthetic-success-runtime-20260706.json';
const finalEvidencePath = 'reports/validation/VAL-W5-customer-journey-sandbox-synthetic-success-2026-07-06.md';
const runtime = readJson(runtimePath);
const finalEvidence = read(finalEvidencePath);
const packageJson = readJson('package.json');
const runner = read('scripts/run-w5-synthetic-success-runtime.js');
const packet = read('docs/orchestrator/2026-07-06-customer-journey-sandbox-runtime-packet.md');
const status = read('docs/orchestrator/STATUS.md');
const state = read('docs/IMPLEMENTATION_STATE.md');

assert(packageJson.scripts['runtime:w5-synthetic-success'] === 'node scripts/run-w5-synthetic-success-runtime.js', 'runtime script missing');
assert(packageJson.scripts['verify:customer-journey-synthetic-success-runtime'] === 'node scripts/verify-customer-journey-synthetic-success-runtime.js', 'verifier script missing');

for (const marker of [
  'w5.synthetic_internal_payment_result_simulation.v1',
  'providerTruth: false',
  'providerCall: false',
  'rawCustomerOutput: false',
  'rawOrderOutput: false',
  'rawPaymentOutput: false',
  'secretOutput: false',
  'SYNTHETIC_EMAIL_ASSERTION_DOMAIN',
  'SYNTHETIC_EVENT_TRACE_SOURCE',
]) {
  assert(runner.includes(marker), `runner missing safety marker ${marker}`);
}

assert(runtime.ok === true, 'runtime evidence must pass local synthetic success gate');
assert(runtime.runtimeMutation === true, 'runtime must disclose mutation');
assert(runtime.checkoutSubmitted === true, 'checkout submission must be recorded');
assert(runtime.orderCreated === true, 'order creation must be recorded');
assert(runtime.paymentResultSimulationInvoked === true, 'synthetic payment-result simulation must be recorded');
assert(runtime.paymentResultSimulationContract === 'w5.synthetic_internal_payment_result_simulation.v1', 'simulation contract mismatch');
assert(runtime.providerCall === false, 'provider call must remain false');
assert(runtime.externalProviderCall === false, 'external provider call must remain false');
assert(runtime.realMoneyMovement === false, 'real money movement must remain false');
assert(runtime.paymentCreated === false, 'provider payment creation must remain false');
assert(runtime.providerTruth === false, 'runtime must not claim provider truth');
assert(runtime.paymentSuccessEvidence === true, 'local synthetic payment success evidence must be true');
assert(runtime.paymentSuccessEvidenceSource === 'synthetic_internal_payment_result_handler', 'payment evidence source mismatch');
assert(runtime.paymentMethod === 'invoice', 'payment method must remain invoice');
assert(runtime.paymentStatus === 'paid', 'local payment status must be paid after synthetic simulation');
assert(runtime.orderStatus === 'confirmed', 'local order status must be confirmed after synthetic simulation');
assert(runtime.emailAssertionRows >= 1, 'synthetic email assertion row missing');
assert(runtime.eventTraceRows >= 1, 'synthetic event trace rows missing');
assert(runtime.expectedEventNamesPresent === true, 'expected event trace names missing');
assert(runtime.crmLeadsAcknowledgement === 'accepted', 'CRM/Leads acknowledgement must be accepted');
assert(runtime.crmRawOutput === false, 'CRM raw output must be false');
assert(runtime.rawCustomerOutput === false, 'raw customer output must be false');
assert(runtime.rawOrderOutput === false, 'raw order output must be false');
assert(runtime.rawPaymentOutput === false, 'raw payment output must be false');
assert(runtime.rawProviderPayloadOutput === false, 'raw provider output must be false');
assert(runtime.secretOutput === false, 'secret output must be false');
assert(runtime.tokenOutput === false, 'token output must be false');
assert(runtime.dbWriteByRunner === false, 'runner must not write DB rows directly');

assert(
  runtime.remainingBlockers.includes('[MISSING: central Orders paid lifecycle evidence; local synthetic payment success does not update central payment status]'),
  'central paid lifecycle limitation must remain explicit',
);

for (const marker of [
  runtimePath,
  finalEvidencePath,
  'w5.synthetic_internal_payment_result_simulation.v1',
  'providerTruth=false',
  'central Orders paid lifecycle evidence',
]) {
  assert(packet.includes(marker) || status.includes(marker) || state.includes(marker) || finalEvidence.includes(marker), `docs/evidence missing marker ${marker}`);
}

console.log(JSON.stringify({
  ok: true,
  syntheticSuccessRuntime: true,
  successfulCustomerJourney: runtime.successfulCustomerJourney,
  paymentSuccessEvidence: runtime.paymentSuccessEvidence,
  providerTruth: runtime.providerTruth,
  providerCall: runtime.providerCall,
  paymentStatus: runtime.paymentStatus,
  orderStatus: runtime.orderStatus,
  emailAssertionRows: runtime.emailAssertionRows,
  eventTraceRows: runtime.eventTraceRows,
  remainingBlockers: runtime.remainingBlockers.length,
}, null, 2));
