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
assert(runtime.crmLeadsAcknowledgement === 'accepted', 'runtime evidence must record sanitized CRM/Leads acknowledgement');
assert(runtime.crmLeadIdPresent === true, 'runtime evidence must record lead id presence without printing it');
assert(runtime.crmReadbackSource === 'sanitized_orders_metadata_keys_only', 'runtime evidence must identify sanitized CRM readback source');
assert(runtime.crmRawOutput === false, 'runtime evidence must not output raw CRM data');
assert(runtime.rawCustomerOutput === false, 'runtime evidence must not output raw customer data');
assert(runtime.rawOrderOutput === false, 'runtime evidence must not output raw order data');
assert(runtime.rawPaymentOutput === false, 'runtime evidence must not output raw payment data');
assert(runtime.secretOutput === false, 'runtime evidence must not output secrets');
assert(runtime.manualCleanupMutation === false, 'runtime evidence must not run manual cleanup mutation');
assert(runtime.ordersRouteInvocation === false, 'runtime evidence must not invoke Orders cleanup route');
assert(runtime.dbWriteByRunner === false, 'runtime evidence must not write DB rows by runner');

for (const blocker of [
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
  'crmLeadsAcknowledgement: accepted',
  'crmRawOutput: false',
  'rawCustomerOutput=false',
  'rawOrderOutput=false',
  'rawPaymentOutput=false',
  'secretOutput=false',
]) {
  assert(packet.includes(marker), `packet missing marker ${marker}`);
}

assert(status.includes('verify:customer-journey-runtime-evidence-contract'), 'STATUS missing verifier marker');
assert(state.includes('W5 owner-approved pre-prod invoice/no-provider runtime attempt completed'), 'IMPLEMENTATION_STATE missing runtime evidence marker');

const freshRuntimeJsonPath = 'reports/validation/customer-journey-sandbox-runtime/w5-owner-approved-invoice-runtime-20260706-2200-env-readback.json';
const freshEvidencePath = 'reports/validation/VAL-W5-customer-journey-sandbox-env-readback-2026-07-06.md';
const freshRuntime = readJson(freshRuntimeJsonPath);
const freshEvidence = read(freshEvidencePath);

assert(freshRuntime.ok === true, 'fresh runtime evidence must be successful for invoice/no-provider order creation');
assert(freshRuntime.orderCreated === true, 'fresh runtime evidence must record order creation');
assert(freshRuntime.paymentMethod === 'invoice', 'fresh runtime evidence must be invoice-only');
assert(freshRuntime.paymentStatus === 'pending', 'fresh runtime evidence must keep invoice pending');
assert(freshRuntime.providerCall === false, 'fresh runtime evidence must not call provider');
assert(freshRuntime.externalProviderCall === false, 'fresh runtime evidence must not call external provider');
assert(freshRuntime.realMoneyMovement === false, 'fresh runtime evidence must not move real money');
assert(freshRuntime.paymentSuccessEvidence === false, 'fresh runtime evidence must not claim payment success');
assert(freshRuntime.centralOrdersForwardingStatus === 'accepted', 'fresh runtime evidence must record central forwarding acceptance');
assert(freshRuntime.crmLeadsAcknowledgement === 'accepted', 'fresh runtime evidence must record CRM/Leads acceptance');
assert(freshRuntime.crmRawOutput === false, 'fresh runtime evidence must not output raw CRM data');
assert(freshRuntime.emailAssertionSource === 'runtime_env_present_no_jsonl_row_observed_for_invoice_pending', 'fresh runtime evidence must preserve missing email JSONL row');
assert(freshRuntime.eventTraceSource === 'runtime_env_present_no_jsonl_file_observed_after_invoice_order', 'fresh runtime evidence must preserve missing event JSONL row');
assert(freshRuntime.rawCustomerOutput === false, 'fresh runtime evidence must not output raw customer data');
assert(freshRuntime.rawOrderOutput === false, 'fresh runtime evidence must not output raw order data');
assert(freshRuntime.rawPaymentOutput === false, 'fresh runtime evidence must not output raw payment data');
assert(freshRuntime.secretOutput === false, 'fresh runtime evidence must not output secrets');

for (const marker of [
  freshRuntimeJsonPath,
  freshEvidencePath,
  'runtimeEnvReadback: passed',
  'centralOrdersForwardingStatus: accepted',
  'crmLeadsAcknowledgement: accepted',
  'eventTraceSource: runtime_env_present_no_jsonl_file_observed_after_invoice_order',
]) {
  assert(packet.includes(marker) || status.includes(marker) || state.includes(marker) || freshEvidence.includes(marker), `fresh evidence marker missing ${marker}`);
}

const eventJsonlRuntimeJsonPath = 'reports/validation/customer-journey-sandbox-runtime/w5-owner-approved-invoice-runtime-20260706-event-jsonl-after-92c51f9.json';
const eventJsonlEvidencePath = 'reports/validation/VAL-W5-customer-journey-sandbox-event-jsonl-after-92c51f9-2026-07-06.md';
const eventJsonlRuntime = readJson(eventJsonlRuntimeJsonPath);
const eventJsonlEvidence = read(eventJsonlEvidencePath);

assert(eventJsonlRuntime.ok === true, 'event JSONL runtime evidence must pass');
assert(eventJsonlRuntime.afterCommit === '92c51f9', 'event JSONL runtime evidence must be after 92c51f9');
assert(eventJsonlRuntime.orderCreated === true, 'event JSONL runtime evidence must record order creation');
assert(eventJsonlRuntime.paymentMethod === 'invoice', 'event JSONL runtime evidence must be invoice-only');
assert(eventJsonlRuntime.paymentStatus === 'pending', 'event JSONL runtime evidence must keep invoice pending');
assert(eventJsonlRuntime.providerCall === false, 'event JSONL runtime evidence must not call provider');
assert(eventJsonlRuntime.externalProviderCall === false, 'event JSONL runtime evidence must not call external provider');
assert(eventJsonlRuntime.realMoneyMovement === false, 'event JSONL runtime evidence must not move real money');
assert(eventJsonlRuntime.paymentCreated === false, 'event JSONL runtime evidence must not create provider payment');
assert(eventJsonlRuntime.eventTraceSource === 'synthetic_event_trace_jsonl_observed_after_92c51f9_invoice_order', 'event JSONL runtime evidence must observe synthetic event trace JSONL');
assert(eventJsonlRuntime.eventJsonlObserved === true, 'event JSONL runtime evidence must observe JSONL rows');
assert(eventJsonlRuntime.eventJsonlMatchedRows >= 5, 'event JSONL runtime evidence must include expected matching rows');
for (const eventName of ['cart_validated', 'customer_identity_resolved', 'shipping_option_selected', 'order_created', 'payment_attempt_started']) {
  assert(eventJsonlRuntime.eventNames.includes(eventName), `event JSONL runtime evidence missing ${eventName}`);
  assert(eventJsonlEvidence.includes(eventName), `event JSONL evidence missing ${eventName}`);
}
assert(eventJsonlRuntime.rawCustomerOutput === false, 'event JSONL runtime evidence must not output raw customer data');
assert(eventJsonlRuntime.rawOrderOutput === false, 'event JSONL runtime evidence must not output raw order data');
assert(eventJsonlRuntime.rawPaymentOutput === false, 'event JSONL runtime evidence must not output raw payment data');
assert(eventJsonlRuntime.secretOutput === false, 'event JSONL runtime evidence must not output secrets');
assert(eventJsonlRuntime.remainingBlockers.includes('[MISSING: sandbox/test-mode payment success evidence; invoice remains pending/no-provider]'), 'event JSONL runtime evidence must preserve payment success blocker');
assert(eventJsonlRuntime.remainingBlockers.includes('[MISSING: synthetic email JSONL assertion row for payment-success confirmation path; invoice pending/no-provider does not send payment-success confirmation]'), 'event JSONL runtime evidence must preserve email JSONL blocker');


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
  crmLeadsAcknowledgement: runtime.crmLeadsAcknowledgement,
  remainingBlockers: runtime.remainingBlockers.length,
  freshRuntimeEvidence: freshRuntimeJsonPath,
  freshRuntimeRemainingBlockers: freshRuntime.remainingBlockers.length,
  eventJsonlRuntimeEvidence: eventJsonlRuntimeJsonPath,
  eventJsonlMatchedRows: eventJsonlRuntime.eventJsonlMatchedRows
}, null, 2));
