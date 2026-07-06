#!/usr/bin/env node
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const notificationService = read('shared/notifications/notification.service.ts');
const journeyPublisher = read('shared/rabbitmq/customer-journey-events.publisher.ts');
const packet = read('docs/orchestrator/2026-07-06-customer-journey-sandbox-runtime-packet.md');
const monitorDoc = read('docs/orchestrator/2026-07-06-synthetic-customer-journey-monitor.md');
const packageJson = JSON.parse(read('package.json'));

assert(notificationService.includes('SYNTHETIC_EMAIL_ASSERTION_SOURCE'), 'notification service must read SYNTHETIC_EMAIL_ASSERTION_SOURCE');
assert(notificationService.includes('synthetic-email-jsonl:'), 'notification service must require the synthetic-email-jsonl source prefix');
assert(notificationService.includes('captured_not_sent'), 'synthetic email assertion must capture without delivery');
assert(notificationService.includes('SYNTHETIC_EMAIL_ASSERTION_DOMAIN'), 'synthetic email assertion must require a synthetic recipient domain');
assert(notificationService.includes('raw_recipient_output: false'), 'synthetic email assertion must document raw recipient suppression');
assert(notificationService.includes('secret_output: false'), 'synthetic email assertion must document secret suppression');

assert(journeyPublisher.includes('SYNTHETIC_EVENT_TRACE_SOURCE'), 'journey publisher must read SYNTHETIC_EVENT_TRACE_SOURCE');
assert(journeyPublisher.includes('synthetic-event-trace-jsonl:'), 'journey publisher must require the synthetic-event-trace-jsonl source prefix');
assert(journeyPublisher.includes('recordSyntheticEventTrace(event, routingKey)'), 'journey publisher must record trace after broker publish');
assert(journeyPublisher.includes('raw_payload_output: false'), 'event trace assertion must document raw payload suppression');
assert(journeyPublisher.includes('raw_customer_or_payment_evidence: false'), 'event trace assertion must document customer/payment redaction');

for (const marker of [
  'SYNTHETIC_EMAIL_ASSERTION_SOURCE=synthetic-email-jsonl:reports/validation/synthetic-email-assertions/email-assertions.jsonl',
  'SYNTHETIC_EVENT_TRACE_SOURCE=synthetic-event-trace-jsonl:reports/validation/customer-journey-event-trace/events.jsonl',
]) {
  assert(packet.includes(marker), `runtime packet missing marker ${marker}`);
  assert(monitorDoc.includes(marker), `monitor doc missing marker ${marker}`);
}

assert(packageJson.scripts['verify:customer-journey-assertion-sources'] === 'node scripts/verify-customer-journey-assertion-sources.js', 'package script is missing');

console.log(JSON.stringify({
  ok: true,
  sourceOnly: true,
  mutation: false,
  emailAssertionSource: 'synthetic-email-jsonl',
  eventTraceSource: 'synthetic-event-trace-jsonl',
  rawRecipientOutput: false,
  rawPayloadOutput: false,
  secretOutput: false
}, null, 2));
