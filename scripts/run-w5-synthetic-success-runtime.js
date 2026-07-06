#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const apiBaseUrl = (process.env.W5_API_BASE_URL || 'https://flipflop.alfares.cz/api').replace(/\/$/, '');
const approvalId = process.env.W5_APPROVAL_ID || 'W5-OWNER-APPROVED-20260706-AUTONOMOUS-CODEX';
const runId = process.env.W5_RUN_ID || `w5-synthetic-success-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const productId = process.env.SYNTHETIC_TEST_PRODUCT_ID || 'ffb4883f-ec48-4745-8147-b836f3fb2b88';
const evidencePath = process.env.W5_RUNTIME_EVIDENCE_PATH || 'reports/validation/customer-journey-sandbox-runtime/w5-owner-approved-synthetic-success-runtime-20260706.json';
const finalEvidencePath = process.env.W5_FINAL_EVIDENCE_PATH || 'reports/validation/VAL-W5-customer-journey-sandbox-synthetic-success-2026-07-06.md';

const email = 'synthetic.customer-journey.w5@example.invalid';
const phone = '+420000000000';
const syntheticPaymentId = `w5-synthetic-payment-result:${hash(`${approvalId}:${runId}`)}`;

function hash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16);
}

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}
function sanitizedHttpError(response) {
  const body = response && response.body || {};
  const message = body.error && body.error.message || body.message || body.error || "unknown";
  return String(message).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/ig, "<uuid-redacted>").slice(0, 240);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { nonJsonLength: text.length }; }
  return { status: response.status, ok: response.status >= 200 && response.status < 300, body };
}

function kube(args, options = {}) {
  return execFileSync('kubectl', args, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 8,
    ...options,
  });
}

function psql(sql) {
  return kube([
    '-n', 'statex-apps',
    'exec', 'deploy/db-server-postgres',
    '--',
    'psql',
    '-U', 'dbadmin',
    '-d', 'flipflop',
    '-v', 'ON_ERROR_STOP=1',
    '-t',
    '-A',
    '-F', '\t',
    '-c', sql,
  ]);
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function readPodJsonl(relativePath) {
  const script = `
    p=${JSON.stringify(relativePath)}
    if [ -f "$p" ]; then cat "$p"; fi
  `;
  const text = kube(['-n', 'statex-apps', 'exec', 'deploy/flipflop-order-service', '--', 'sh', '-c', script]);
  return text.split(/\r?\n/).filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

function podEnvReadback() {
  const script = [
    'printf "PAYMENT_SANDBOX_CONTRACT_APPROVED=%s\\n" "$PAYMENT_SANDBOX_CONTRACT_APPROVED"',
    'printf "TEST_MODE_PAYMENT_PROVIDER=%s\\n" "$TEST_MODE_PAYMENT_PROVIDER"',
    'printf "CHECKOUT_MUTATION_MODE=%s\\n" "$CHECKOUT_MUTATION_MODE"',
    'printf "SYNTHETIC_EMAIL_ASSERTION_SOURCE=%s\\n" "$SYNTHETIC_EMAIL_ASSERTION_SOURCE"',
    'printf "SYNTHETIC_EMAIL_ASSERTION_DOMAIN=%s\\n" "$SYNTHETIC_EMAIL_ASSERTION_DOMAIN"',
    'printf "SYNTHETIC_EVENT_TRACE_SOURCE=%s\\n" "$SYNTHETIC_EVENT_TRACE_SOURCE"',
  ].join('; ');
  const text = kube(['-n', 'statex-apps', 'exec', 'deploy/flipflop-order-service', '--', 'sh', '-c', script]);
  return Object.fromEntries(text.trim().split(/\r?\n/).map((line) => {
    const idx = line.indexOf('=');
    return [line.slice(0, idx), line.slice(idx + 1)];
  }));
}

function invokeInternalPaymentResult(body) {
  const code = `
    const fs = require('fs');
    (async () => {
      const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
      const key = process.env.FLIPFLOP_INTERNAL_SERVICE_SECRET;
      if (!key) throw new Error('missing internal key');
      const response = await fetch('http://127.0.0.1:3003/internal/orders/payment-result', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-flipflop-internal-key': key },
        body: JSON.stringify(payload)
      });
      let parsed = {};
      try { parsed = await response.json(); } catch {}
      console.log(JSON.stringify({ status: response.status, ok: response.ok, bodyOk: parsed && parsed.ok === true }));
    })().catch((error) => { console.error(error.message); process.exit(1); });
  `;
  return JSON.parse(kube(['-n', 'statex-apps', 'exec', '-i', 'deploy/flipflop-order-service', '--', 'node', '-e', code], {
    input: JSON.stringify(body),
  }));
}

function readCentralLifecycle(centralOrderId) {
  if (!centralOrderId) return { readStatus: 'missing_central_order_id' };
  const code = `
    const fs = require('fs');
    (async () => {
      const input = JSON.parse(fs.readFileSync(0, 'utf8'));
      const token = process.env.ORDERS_SERVICE_TOKEN;
      const base = process.env.ORDERS_SERVICE_URL || 'http://orders-microservice:3203';
      if (!token) throw new Error('missing orders token');
      const response = await fetch(base.replace(/\\/$/, '') + '/api/orders/' + encodeURIComponent(input.centralOrderId) + '/lifecycle', {
        headers: { authorization: 'Bearer ' + token }
      });
      let data = {};
      try { data = await response.json(); } catch {}
      const row = data && (data.data && (data.data.order || data.data) || data.order || data);
      const lifecycle = row && row.lifecycle || {};
      const payment = row && row.payment || {};
      console.log(JSON.stringify({
        httpStatusClass: String(response.status).slice(0, 1) + 'xx',
        readStatus: response.ok ? 'available' : 'unavailable',
        lifecycleStage: lifecycle.stage || lifecycle.status || row.status || null,
        status: row.status || lifecycle.status || null,
        paymentStatus: payment.status || row.paymentStatus || null
      }));
    })().catch((error) => { console.log(JSON.stringify({ readStatus: 'error', errorClass: error.message ? 'error' : 'unknown' })); });
  `;
  return JSON.parse(kube(['-n', 'statex-apps', 'exec', '-i', 'deploy/flipflop-order-service', '--', 'node', '-e', code], {
    input: JSON.stringify({ centralOrderId }),
  }));
}

function readLocalOrder(orderId) {
  const sql = `
    select
      status,
      "paymentStatus",
      ("paymentTransactionId" is not null)::text,
      coalesce(metadata #>> '{centralOrdersForwarding,status}', ''),
      coalesce(metadata #>> '{centralOrdersForwarding,centralOrderId}', ''),
      coalesce(metadata #>> '{leadsSync,status}', ''),
      ((metadata #>> '{leadsSync,leadId}') is not null)::text
    from orders
    where id = ${sqlString(orderId)}::uuid
    limit 1
  `;
  const line = psql(sql).trim().split(/\r?\n/).filter(Boolean).pop() || '';
  const [status, paymentStatus, paymentTransactionIdPresent, centralStatus, centralOrderId, leadsStatus, leadIdPresent] = line.split('\t');
  return {
    status,
    paymentStatus,
    paymentTransactionIdPresent: paymentTransactionIdPresent === 'true',
    centralOrdersForwardingStatus: centralStatus || null,
    centralOrderId,
    crmLeadsAcknowledgement: leadsStatus || null,
    crmLeadIdPresent: leadIdPresent === 'true',
  };
}

function filterTrace(records, journeyId, correlationId) {
  return records.filter((record) => record.journey_id === journeyId || record.correlation_id === correlationId);
}

async function main() {
  const generatedAt = new Date().toISOString();
  const env = podEnvReadback();
  ensure(env.PAYMENT_SANDBOX_CONTRACT_APPROVED === '1', 'W5 payment sandbox approval env missing');
  ensure(env.TEST_MODE_PAYMENT_PROVIDER === 'invoice', 'W5 test-mode payment provider must be invoice');
  ensure(env.CHECKOUT_MUTATION_MODE === 'test-only', 'W5 checkout mutation mode must be test-only');
  ensure(env.SYNTHETIC_EMAIL_ASSERTION_DOMAIN === 'example.invalid', 'W5 synthetic email domain mismatch');

  const journeyId = `journey_w5_${hash(`${runId}:journey`)}`;
  const correlationId = `corr_w5_${hash(`${runId}:correlation`)}`;
  const sessionId = `sess_w5_${hash(`${runId}:session`)}`;

  const payload = {
    email,
    phone,
    wantsAccount: false,
    marketingConsent: false,
    billingAddress: {
      firstName: 'Synthetic',
      lastName: 'CustomerJourneyW5',
      street: 'Synthetic Street 1',
      city: 'Praha',
      postalCode: '11000',
      country: 'CZ',
      phone,
      email,
    },
    items: [{ productId, quantity: 1 }],
    paymentMethod: 'invoice',
    deliveryMethod: 'store',
    expeditionMethod: 'standard-one-shipment',
    wantsDifferentDeliveryDay: false,
    operatorTip: 0,
    notes: `W5 synthetic customer journey sandbox ${approvalId}`,
    journeyId,
    correlationId,
    sessionId,
  };

  const createResponse = await request(`${apiBaseUrl}/orders/guest`, { method: 'POST', body: payload });
  ensure(createResponse.ok, `guest checkout failed with HTTP ${createResponse.status}: ${sanitizedHttpError(createResponse)}`);
  const data = createResponse.body && createResponse.body.data || {};
  const order = data.order || data;
  ensure(order && order.id && order.orderNumber, 'guest checkout response missing order identity');

  const localBefore = readLocalOrder(order.id);
  ensure(localBefore.paymentStatus === 'pending', 'new W5 invoice order must start pending');

  const paymentResult = invokeInternalPaymentResult({
    paymentId: syntheticPaymentId,
    orderId: order.orderNumber,
    status: 'completed',
    paymentMethod: 'invoice',
    event: 'w5.synthetic_internal_payment_result_simulation.v1',
    timestamp: generatedAt,
    metadata: {
      flipflopOrderId: order.id,
      flipflopOrderNumber: order.orderNumber,
      approvalId,
      journeyId,
      correlationId,
      providerTruth: false,
      syntheticInternalSimulation: true,
    },
  });
  ensure(paymentResult.ok && paymentResult.bodyOk, `internal payment-result failed with HTTP ${paymentResult.status}`);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const localAfter = readLocalOrder(order.id);
  const central = readCentralLifecycle(localAfter.centralOrderId);
  const emailRows = readPodJsonl('reports/validation/synthetic-email-assertions/email-assertions.jsonl')
    .filter((record) => record.order_id_hash === hash(order.id) || record.order_number_hash === hash(order.orderNumber));
  const eventRows = filterTrace(
    readPodJsonl('reports/validation/customer-journey-event-trace/events.jsonl'),
    journeyId,
    correlationId,
  );
  const eventNames = Array.from(new Set(eventRows.map((record) => record.event_name))).sort();

  const evidence = {
    ok: true,
    approvalId,
    runId,
    generatedAt,
    runtimeMutation: true,
    checkoutSubmitted: true,
    orderCreated: true,
    paymentResultSimulationInvoked: true,
    paymentResultSimulationContract: 'w5.synthetic_internal_payment_result_simulation.v1',
    providerCall: false,
    externalProviderCall: false,
    realMoneyMovement: false,
    paymentCreated: false,
    providerTruth: false,
    paymentSuccessEvidence: true,
    paymentSuccessEvidenceSource: 'synthetic_internal_payment_result_handler',
    successfulCustomerJourney: true,
    paymentMethod: 'invoice',
    paymentStatus: localAfter.paymentStatus,
    orderStatus: localAfter.status,
    paymentTransactionIdPresent: localAfter.paymentTransactionIdPresent,
    journeyIdHash: hash(journeyId),
    correlationIdHash: hash(correlationId),
    orderIdHash: hash(order.id),
    orderNumberHash: hash(order.orderNumber),
    centralOrderHash: localAfter.centralOrderId ? hash(localAfter.centralOrderId) : null,
    centralOrdersForwardingStatus: localAfter.centralOrdersForwardingStatus,
    centralReadStatus: central.readStatus,
    centralLifecycleStage: central.lifecycleStage,
    centralStatus: central.status,
    centralPaymentStatus: central.paymentStatus,
    crmLeadsAcknowledgement: localAfter.crmLeadsAcknowledgement,
    crmLeadIdPresent: localAfter.crmLeadIdPresent,
    crmRawOutput: false,
    emailAssertionSource: emailRows.length > 0 ? 'synthetic-email-jsonl_row_observed' : 'missing_synthetic_email_jsonl_row',
    emailAssertionRows: emailRows.length,
    emailAssertionStatuses: Array.from(new Set(emailRows.map((record) => record.status))).sort(),
    eventTraceSource: eventRows.length > 0 ? 'synthetic-event-trace-jsonl_rows_observed' : 'missing_synthetic_event_trace_jsonl_rows',
    eventTraceRows: eventRows.length,
    eventTraceEventNames: eventNames,
    expectedEventNamesPresent: ['customer_identity_resolved', 'shipping_option_selected', 'cart_validated', 'order_created', 'payment_attempt_started', 'payment_succeeded', 'order_confirmation_email_queued', 'order_confirmation_email_sent'].every((name) => eventNames.includes(name)),
    rawCustomerOutput: false,
    rawOrderOutput: false,
    rawPaymentOutput: false,
    rawProviderPayloadOutput: false,
    secretOutput: false,
    tokenOutput: false,
    dbReadByRunner: true,
    dbWriteByRunner: false,
    cleanupContract: 'flipflop.retention.synthetic_success.channel_no_cleanup_retain_for_audit.v1',
    manualCleanupMutation: false,
    ordersRouteInvocation: false,
    remainingBlockers: [],
  };

  if (evidence.paymentStatus !== 'paid' || evidence.orderStatus !== 'confirmed') {
    evidence.ok = false;
    evidence.successfulCustomerJourney = false;
    evidence.remainingBlockers.push('[MISSING: local payment success status after synthetic internal payment-result simulation]');
  }
  if (evidence.emailAssertionRows < 1) {
    evidence.ok = false;
    evidence.successfulCustomerJourney = false;
    evidence.remainingBlockers.push('[MISSING: synthetic email JSONL assertion row after synthetic payment success]');
  }
  if (!evidence.expectedEventNamesPresent) {
    evidence.ok = false;
    evidence.successfulCustomerJourney = false;
    evidence.remainingBlockers.push('[MISSING: synthetic event JSONL rows for complete customer journey]');
  }
  if (evidence.centralPaymentStatus !== 'paid') {
    evidence.remainingBlockers.push('[MISSING: central Orders paid lifecycle evidence; local synthetic payment success does not update central payment status]');
  }

  fs.mkdirSync(path.dirname(path.join(root, evidencePath)), { recursive: true });
  fs.writeFileSync(path.join(root, evidencePath), JSON.stringify(evidence, null, 2));
  fs.writeFileSync(path.join(root, finalEvidencePath), [
    '# W5 Customer Journey Synthetic Success Runtime Evidence - 2026-07-06',
    '',
    `- approvalId: ${approvalId}`,
    `- runId: ${runId}`,
    `- checkoutSubmitted: ${evidence.checkoutSubmitted}`,
    `- orderCreated: ${evidence.orderCreated}`,
    `- paymentResultSimulationContract: ${evidence.paymentResultSimulationContract}`,
    `- paymentSuccessEvidenceSource: ${evidence.paymentSuccessEvidenceSource}`,
    `- providerCall: ${evidence.providerCall}`,
    `- externalProviderCall: ${evidence.externalProviderCall}`,
    `- realMoneyMovement: ${evidence.realMoneyMovement}`,
    `- paymentCreated: ${evidence.paymentCreated}`,
    `- providerTruth: ${evidence.providerTruth}`,
    `- orderStatus: ${evidence.orderStatus}`,
    `- paymentStatus: ${evidence.paymentStatus}`,
    `- centralOrdersForwardingStatus: ${evidence.centralOrdersForwardingStatus}`,
    `- centralLifecycleStage: ${evidence.centralLifecycleStage || 'unknown'}`,
    `- centralPaymentStatus: ${evidence.centralPaymentStatus || 'unknown'}`,
    `- crmLeadsAcknowledgement: ${evidence.crmLeadsAcknowledgement}`,
    `- crmLeadIdPresent: ${evidence.crmLeadIdPresent}`,
    `- emailAssertionSource: ${evidence.emailAssertionSource}`,
    `- emailAssertionRows: ${evidence.emailAssertionRows}`,
    `- eventTraceSource: ${evidence.eventTraceSource}`,
    `- eventTraceRows: ${evidence.eventTraceRows}`,
    `- eventTraceEventNames: ${evidence.eventTraceEventNames.join(', ')}`,
    `- successfulCustomerJourney: ${evidence.successfulCustomerJourney}`,
    `- rawCustomerOutput: ${evidence.rawCustomerOutput}`,
    `- rawOrderOutput: ${evidence.rawOrderOutput}`,
    `- rawPaymentOutput: ${evidence.rawPaymentOutput}`,
    `- rawProviderPayloadOutput: ${evidence.rawProviderPayloadOutput}`,
    `- secretOutput: ${evidence.secretOutput}`,
    '',
    '## Remaining Blockers',
    '',
    ...(evidence.remainingBlockers.length ? evidence.remainingBlockers.map((blocker) => `- ${blocker}`) : ['- none for local synthetic success evidence']),
    '',
    '## Boundary',
    '',
    'This evidence uses an owner-approved synthetic internal payment-result simulation. It is not provider, bank, or real-money completion evidence. Raw customer, order, payment, provider, token, and secret values were not written to this report.',
    '',
  ].join('\n'));

  console.log(JSON.stringify({
    ok: evidence.ok,
    successfulCustomerJourney: evidence.successfulCustomerJourney,
    paymentSuccessEvidence: evidence.paymentSuccessEvidence,
    providerTruth: evidence.providerTruth,
    providerCall: evidence.providerCall,
    paymentStatus: evidence.paymentStatus,
    orderStatus: evidence.orderStatus,
    emailAssertionRows: evidence.emailAssertionRows,
    eventTraceRows: evidence.eventTraceRows,
    centralPaymentStatus: evidence.centralPaymentStatus || null,
    remainingBlockers: evidence.remainingBlockers,
    evidencePath,
    finalEvidencePath,
  }, null, 2));
  process.exit(evidence.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
