#!/usr/bin/env node
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function readJson(path) {
  return JSON.parse(read(path));
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const runtimeJsonPath = 'reports/validation/customer-journey-sandbox-runtime/w5-owner-approved-invoice-runtime-20260706-2130.json';
const finalEvidencePath = 'reports/validation/VAL-W5-customer-journey-sandbox-final-redacted-evidence-2026-07-06.md';
const runtime = readJson(runtimeJsonPath);
const finalEvidence = read(finalEvidencePath);
const packet = read('docs/orchestrator/2026-07-06-customer-journey-sandbox-runtime-packet.md');
const status = read('docs/orchestrator/STATUS.md');
const state = read('docs/IMPLEMENTATION_STATE.md');
const packageJson = readJson('package.json');

assert(packageJson.scripts['verify:customer-journey-runtime-evidence-contract'] === 'node scripts/verify-customer-journey-runtime-evidence-contract.js', 'package script is missing');

assert(runtime.ok === true, 'runtime evidence must be successful for invoice/no-provider order creation');
assert(runtime.runtimeMutation === true, 'runtime evidence must identify that a checkout-side runtime attempt occurred');
assert(runtime.checkoutSubmitted === true, 'runtime evidence must record checkout submission attempt');
assert(runtime.orderCreated === true, 'runtime evidence must record order creation');
assert(runtime.paymentMethod === 'invoice', 'runtime evidence must be invoice-only');
assert(runtime.providerCall === false, 'runtime evidence must not call provider');
assert(runtime.externalProviderCall === false, 'runtime evidence must not call external provider');
assert(runtime.realMoneyMovement === false, 'runtime evidence must not move real money');
assert(runtime.paymentCreated === false, 'runtime evidence must not create provider payment');
assert(runtime.paymentStatus === 'pending', 'runtime evidence must keep invoice payment pending');
assert(runtime.centralReadStatus === 'available', 'runtime evidence must include sanitized central Orders readback');
assert(runtime.centralLifecycleStage === 'ordered_unpaid', 'runtime evidence must keep central lifecycle unpaid');
assert(runtime.paymentSuccessEvidence === false, 'runtime evidence must not claim payment success');
assert(runtime.emailAssertionSource === 'unavailable_deployed_env_missing', 'runtime evidence must preserve missing deployed email assertion source');
assert(runtime.eventTraceSource === 'unavailable_deployed_env_missing', 'runtime evidence must preserve missing deployed event trace source');
assert(runtime.rawCustomerOutput === false, 'runtime evidence must not output raw customer data');
assert(runtime.rawOrderOutput === false, 'runtime evidence must not output raw order data');
assert(runtime.rawPaymentOutput === false, 'runtime evidence must not output raw payment data');
assert(runtime.secretOutput === false, 'runtime evidence must not output secrets');
assert(runtime.manualCleanupMutation === false, 'runtime evidence must not run manual cleanup mutation');
assert(runtime.ordersRouteInvocation === false, 'runtime evidence must not invoke Orders cleanup route');
assert(runtime.dbWriteByRunner === false, 'runtime evidence must not write DB rows by runner');

for (const blocker of [
  '[MISSING: CRM no-op/retention acknowledgement]',
  '[MISSING: sandbox/test-mode payment success evidence; invoice remains pending/no-provider]',
  '[MISSING: synthetic email JSONL assertion because deployed env lacks SYNTHETIC_EMAIL_ASSERTION_SOURCE]',
  '[MISSING: synthetic event JSONL assertion because deployed env lacks SYNTHETIC_EVENT_TRACE_SOURCE]',
]) {
  assert(runtime.remainingBlockers.includes(blocker), `runtime evidence missing blocker ${blocker}`);
  assert(finalEvidence.includes(blocker), `final evidence missing blocker ${blocker}`);
}

for (const marker of [
  runtimeJsonPath,
  finalEvidencePath,
  'partial invoice/no-provider order-created path',
  'checkoutSubmitted=true',
  'orderCreated=true',
  'providerCall=false',
  'paymentCreated=false',
  'rawCustomerOutput=false',
  'rawOrderOutput=false',
  'rawPaymentOutput=false',
  'secretOutput=false',
]) {
  assert(packet.includes(marker), `packet missing marker ${marker}`);
}

assert(status.includes('verify:customer-journey-runtime-evidence-contract'), 'STATUS missing verifier marker');
assert(state.includes('W5 owner-approved pre-prod invoice/no-provider runtime attempt completed'), 'IMPLEMENTATION_STATE missing runtime evidence marker');

console.log(JSON.stringify({
  ok: true,
  sourceOnlyVerifier: true,
  runtimeEvidence: 'partial_invoice_no_provider_runtime_success_not_paid_journey',
  checkoutSubmitted: runtime.checkoutSubmitted,
  orderCreated: runtime.orderCreated,
  providerCall: runtime.providerCall,
  paymentCreated: runtime.paymentCreated,
  paymentStatus: runtime.paymentStatus,
  centralLifecycleStage: runtime.centralLifecycleStage,
  successfulCustomerJourney: runtime.successfulCustomerJourney,
  paymentSuccessEvidence: runtime.paymentSuccessEvidence,
  rawCustomerOutput: runtime.rawCustomerOutput,
  rawOrderOutput: runtime.rawOrderOutput,
  rawPaymentOutput: runtime.rawPaymentOutput,
  secretOutput: runtime.secretOutput,
  remainingBlockers: runtime.remainingBlockers.length
}, null, 2));
