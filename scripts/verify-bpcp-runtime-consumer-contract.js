#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const docPath = 'docs/orchestrator/2026-07-06-bpcp-runtime-consumer-contract.md';
const processKey = 'flipflop.successful_customer_journey.v1';

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function kubectl(args) {
  return execFileSync('kubectl', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function podGet(pod, endpoint) {
  return kubectl([
    'exec',
    '-n',
    'statex-apps',
    pod,
    '--',
    'wget',
    '-qO-',
    `http://127.0.0.1:3375${endpoint}`,
  ]);
}

const packageJson = readJson('package.json');
const doc = read(docPath);
const state = read('docs/IMPLEMENTATION_STATE.md');
const bpcpAdoption = fs.existsSync(path.join(root, 'docs/business-process-control-plane/HOLIDAY_DISCOUNT_ADOPTION.md'))
  ? read('docs/business-process-control-plane/HOLIDAY_DISCOUNT_ADOPTION.md')
  : '';

assert(
  packageJson.scripts['verify:bpcp-runtime-consumer-contract'] ===
    'node scripts/verify-bpcp-runtime-consumer-contract.js',
  'package script is missing',
);

for (const marker of [
  'Intent Preservation Chain',
  'GET /api/processes/flipflop.successful_customer_journey.v1/versions/1',
  'No BPCP `POST /publish`, `POST /schedule`, or `POST /validate` from this verifier.',
  'Current expected result: blocked',
  '[MISSING: approved BPCP policyRefs for flipflop.successful_customer_journey.v1]',
  '[MISSING: approved BPCP workflowRefs for flipflop.successful_customer_journey.v1]',
  'runtimeMutation=false',
]) {
  assert(doc.includes(marker), `contract doc missing marker: ${marker}`);
}

assert(
  state.includes('BPCP runtime consumer contract') ||
    state.includes('bpcp-runtime-consumer-contract') ||
    state.includes('flipflop.successful_customer_journey.v1'),
  'implementation state must mention BPCP/FlipFlop process state',
);

if (bpcpAdoption) {
  assert(
    bpcpAdoption.includes('business-process-control-plane') ||
      bpcpAdoption.includes('BPCP'),
    'BPCP adoption doc should identify BPCP boundary',
  );
}

const result = {
  ok: true,
  verifier: 'flipflop.bpcp-runtime-consumer-contract.v1',
  sourceOnly: process.env.RUN_BPCP_RUNTIME_CONSUMER_LIVE !== '1',
  runtimeRead: false,
  runtimeMutation: false,
  processKey,
  expectedStatus: 'draft',
  expectedRuntimeReady: false,
  blockers: [
    '[MISSING: approved BPCP policyRefs for flipflop.successful_customer_journey.v1]',
    '[MISSING: approved BPCP workflowRefs for flipflop.successful_customer_journey.v1]',
    '[MISSING: FlipFlop runtime_reader service identity and RBAC mapping]',
  ],
};

if (process.env.RUN_BPCP_RUNTIME_CONSUMER_LIVE === '1') {
  const pod = kubectl([
    'get',
    'pod',
    '-n',
    'statex-apps',
    '-l',
    'app=business-process-control-plane',
    '-o',
    'jsonpath={.items[0].metadata.name}',
  ]);
  assert(pod, 'BPCP pod was not found');

  const health = JSON.parse(podGet(pod, '/health'));
  assert(health.ok === true, 'BPCP health must be ok');

  const processDefinition = JSON.parse(podGet(pod, `/api/processes/${processKey}/versions/1`));
  assert(processDefinition.processId === processKey, 'unexpected process id from BPCP');
  assert(processDefinition.version === 1, 'unexpected process version from BPCP');
  assert(processDefinition.status === 'draft', 'BPCP process must remain draft');
  assert(Array.isArray(processDefinition.policyRefs), 'policyRefs must be an array');
  assert(Array.isArray(processDefinition.workflowRefs), 'workflowRefs must be an array');
  assert(processDefinition.policyRefs.length === 0, 'policyRefs must remain empty until approved');
  assert(processDefinition.workflowRefs.length === 0, 'workflowRefs must remain empty until approved');
  assert(processDefinition.killSwitch === true, 'killSwitch must stay enabled');

  const transport = JSON.parse(podGet(pod, '/api/events/transport/info'));
  assert(transport.schemaVersion === 'bpcp.process-event-transport-info.v1', 'unexpected transport info schema');

  result.sourceOnly = false;
  result.runtimeRead = true;
  result.bpcpPod = pod;
  result.health = 'ok';
  result.transportReadyForDispatch = transport.readyForDispatch === true;
  result.observed = {
    status: processDefinition.status,
    policyRefs: processDefinition.policyRefs.length,
    workflowRefs: processDefinition.workflowRefs.length,
    killSwitch: processDefinition.killSwitch,
  };
}

console.log(JSON.stringify(result, null, 2));
