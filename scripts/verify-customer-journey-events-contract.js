#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const schemaPath = 'docs/contracts/flipflop.customer_journey.events.v1.schema.json';
const fixturePath = 'docs/contracts/fixtures/flipflop.customer_journey.events.v1.valid.json';
const contractDocPath = 'docs/contracts/flipflop.customer_journey.events.v1.md';

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function typeName(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (typeof value === 'number' && Number.isInteger(value)) return 'integer';
  return typeof value;
}

function validateScalar(schema, value, pathLabel) {
  if (schema.const !== undefined) assert(value === schema.const, pathLabel + ' must equal ' + JSON.stringify(schema.const));
  if (schema.enum) assert(schema.enum.includes(value), pathLabel + ' must be one of ' + schema.enum.join(', '));
  if (schema.type) assert(typeName(value) === schema.type, pathLabel + ' must be ' + schema.type + ', got ' + typeName(value));
  if (schema.pattern && typeof value === 'string') assert(new RegExp(schema.pattern).test(value), pathLabel + ' does not match ' + schema.pattern);
  if (schema.minLength !== undefined && typeof value === 'string') assert(value.length >= schema.minLength, pathLabel + ' must have minLength ' + schema.minLength);
  if (schema.maxLength !== undefined && typeof value === 'string') assert(value.length <= schema.maxLength, pathLabel + ' must have maxLength ' + schema.maxLength);
  if (schema.minimum !== undefined && typeof value === 'number') assert(value >= schema.minimum, pathLabel + ' must be >= ' + schema.minimum);
  if (schema.format === 'date-time' && typeof value === 'string') {
    const millis = Date.parse(value);
    assert(Number.isFinite(millis) && value.includes('T'), pathLabel + ' must be RFC3339 date-time');
  }
}

function validateObject(schema, value, pathLabel) {
  validateScalar({ type: schema.type }, value, pathLabel);
  for (const key of schema.required || []) assert(Object.prototype.hasOwnProperty.call(value, key), pathLabel + '.' + key + ' is required');
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) assert(schema.properties && schema.properties[key], pathLabel + '.' + key + ' is not allowed');
  }
  for (const [key, propertySchema] of Object.entries(schema.properties || {})) {
    if (Object.prototype.hasOwnProperty.call(value, key)) validateValue(propertySchema, value[key], pathLabel + '.' + key);
  }
}

function validateValue(schema, value, pathLabel) {
  if (schema.type === 'object') return validateObject(schema, value, pathLabel);
  validateScalar(schema, value, pathLabel);
}

function walkForbidden(value, forbiddenNames, pathParts = []) {
  if (!value || typeof value !== 'object') return [];
  const findings = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => findings.push(...walkForbidden(item, forbiddenNames, pathParts.concat(String(index)))));
    return findings;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenNames.has(key.toLowerCase())) findings.push(pathParts.concat(key).join('.'));
    findings.push(...walkForbidden(nested, forbiddenNames, pathParts.concat(key)));
  }
  return findings;
}

const schema = readJson(schemaPath);
const fixture = readJson(fixturePath);
const contractDoc = read(contractDocPath);
const packageJson = readJson('package.json');
const scriptSource = read('scripts/verify-customer-journey-events-contract.js');
const orderServiceSource = read('services/order-service/src/orders/orders.service.ts');
const publisherSource = read('shared/rabbitmq/customer-journey-events.publisher.ts');

assert(schema.title === 'flipflop.customer_journey.events.v1', 'schema title must match contract name');
assert(schema.properties.contract.const === 'flipflop.customer_journey.events.v1', 'schema contract const missing');
assert(packageJson.scripts['verify:customer-journey-events-contract'] === 'node scripts/verify-customer-journey-events-contract.js', 'package script missing');
assert(contractDoc.includes('Intent Preservation Chain:'), 'contract doc must preserve Intent Preservation chain');
assert(contractDoc.includes('[MISSING: sandbox/test-mode payment contract for mutating end-to-end synthetic checkout]'), 'contract doc must keep sandbox/test-mode checkout blocker');
assert(orderServiceSource.includes('publishCustomerJourneyEvent'), 'order-service runtime emitter hooks missing');
assert(orderServiceSource.includes('hashJourneyReference'), 'order-service must hash runtime journey identifiers');
assert(!orderServiceSource.includes('order_id: order?.id'), 'order-service must not publish raw order id');
assert(!orderServiceSource.includes('payment_id: paymentId'), 'order-service must not publish raw payment id');
assert(publisherSource.includes('journey=present'), 'publisher logs must use presence-only journey logging');
assert(scriptSource.includes('forbidden_raw_sensitive_fields'), 'verifier must enforce sensitive field denylist');
assert(Array.isArray(fixture), 'fixture must be an array of events');

const rules = schema['x-contract-rules'];
const forbiddenNames = new Set(rules.forbidden_raw_sensitive_fields.map((field) => field.toLowerCase()));
const requiredEvents = new Set(rules.required_events);
const coveredEvents = new Set();
const seenEventIds = new Set();
const seenIdempotencyKeys = new Set();
const journeyIds = new Set();
const correlationIds = new Set();

fixture.forEach((event, index) => {
  const label = 'fixture[' + index + ']';
  validateValue(schema, event, label);
  coveredEvents.add(event.event_type);
  assert(!seenEventIds.has(event.event_id), label + ' event_id must be unique');
  seenEventIds.add(event.event_id);
  assert(!seenIdempotencyKeys.has(event.idempotency_key), label + ' idempotency_key must be unique');
  seenIdempotencyKeys.add(event.idempotency_key);
  journeyIds.add(event.journey_id);
  correlationIds.add(event.correlation_id);
  const expectedPhase = rules.event_phase[event.event_type];
  assert(event.phase === expectedPhase, label + ' phase must be ' + expectedPhase + ' for ' + event.event_type);
  for (const requiredField of rules.phase_required_data[event.phase] || []) {
    assert(Object.prototype.hasOwnProperty.call(event.data, requiredField), label + '.data.' + requiredField + ' is required for phase ' + event.phase);
  }
  const forbiddenFindings = walkForbidden(event, forbiddenNames);
  assert(forbiddenFindings.length === 0, label + ' contains forbidden raw sensitive field(s): ' + forbiddenFindings.join(', '));
});
for (const requiredEvent of requiredEvents) assert(coveredEvents.has(requiredEvent), 'fixture missing required event ' + requiredEvent);
assert(journeyIds.size === 1, 'fixture must use one stable journey_id for the synthetic journey');
assert(correlationIds.size === 1, 'fixture must use one stable correlation_id for the synthetic journey');

console.log(JSON.stringify({
  ok: true,
  verifier: 'flipflop.customer_journey.events.v1',
  schema: schemaPath,
  fixture: fixturePath,
  requiredEvents: Array.from(requiredEvents),
  coveredEvents: Array.from(coveredEvents),
  eventsValidated: fixture.length,
  journeyIdStable: true,
  correlationIdStable: true,
  idempotencyKeysUnique: true,
  sensitiveOutput: 'redacted-source-only',
  runtimeMutation: 'bounded-fire-and-forget-events-only'
}, null, 2));
