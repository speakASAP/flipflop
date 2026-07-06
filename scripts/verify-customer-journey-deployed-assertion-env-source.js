#!/usr/bin/env node
const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function readJson(path) { return JSON.parse(read(path)); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const emailSource = 'synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl';
const emailDomain = 'example.invalid';
const eventSource = 'synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl';

const configmap = read('k8s/configmap.yaml');
const envExample = read('.env.example');
const deployment = read('k8s/deployment.yaml');
const notificationService = read('shared/notifications/notification.service.ts');
const journeyPublisher = read('shared/rabbitmq/customer-journey-events.publisher.ts');
const packet = read('docs/orchestrator/2026-07-06-customer-journey-sandbox-runtime-packet.md');
const status = read('docs/orchestrator/STATUS.md');
const state = read('docs/IMPLEMENTATION_STATE.md');
const packageJson = readJson('package.json');

assert(packageJson.scripts['verify:customer-journey-deployed-assertion-env-source'] === 'node scripts/verify-customer-journey-deployed-assertion-env-source.js', 'package script is missing');

for (const marker of [
  `SYNTHETIC_EMAIL_ASSERTION_SOURCE: "${emailSource}"`,
  `SYNTHETIC_EMAIL_ASSERTION_DOMAIN: "${emailDomain}"`,
  `SYNTHETIC_EVENT_TRACE_SOURCE: "${eventSource}"`,
]) {
  assert(configmap.includes(marker), `configmap missing ${marker}`);
}

for (const marker of [
  `SYNTHETIC_EMAIL_ASSERTION_SOURCE=${emailSource}`,
  `SYNTHETIC_EMAIL_ASSERTION_DOMAIN=${emailDomain}`,
  `SYNTHETIC_EVENT_TRACE_SOURCE=${eventSource}`,
]) {
  assert(envExample.includes(marker), `.env.example missing ${marker}`);
}

assert(deployment.includes('name: flipflop-order-service'), 'deployment missing order service');
assert(deployment.includes('configMapRef:') && deployment.includes('name: flipflop-config'), 'deployment missing flipflop-config envFrom');
assert(notificationService.includes('SYNTHETIC_EMAIL_ASSERTION_SOURCE'), 'notification service does not read email assertion env');
assert(notificationService.includes('SYNTHETIC_EMAIL_ASSERTION_DOMAIN'), 'notification service does not read email assertion domain');
assert(notificationService.includes('captured_not_sent'), 'notification service must capture without sending');
assert(journeyPublisher.includes('SYNTHETIC_EVENT_TRACE_SOURCE'), 'journey publisher does not read event trace env');
assert(journeyPublisher.includes('synthetic-event-trace-jsonl:'), 'journey publisher must use synthetic JSONL trace source');

for (const marker of [
  'source-controlled deployed synthetic email JSONL assertion env prepared',
  'source-controlled deployed synthetic event JSONL assertion env prepared',
  'live ConfigMap apply/restart/readback still pending',
  'checkout_submission=false',
  'order_created=false',
  'email_sent=false',
  'event_published_by_packet=false',
  'deploy=false',
]) {
  assert(packet.includes(marker) || status.includes(marker) || state.includes(marker), `status docs missing ${marker}`);
}

console.log(JSON.stringify({
  ok: true,
  sourceOnly: true,
  configmapSourceReady: true,
  emailAssertionSource: 'synthetic-email-jsonl',
  emailAssertionDomain: emailDomain,
  eventTraceSource: 'synthetic-event-trace-jsonl',
  liveConfigMapApplied: false,
  podRestarted: false,
  runtimeReadback: false,
  checkoutSubmission: false,
  orderCreated: false,
  emailSent: false,
  eventPublishedByPacket: false,
  deploy: false
}, null, 2));
