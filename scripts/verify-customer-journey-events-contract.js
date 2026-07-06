#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const schemaPath = 'docs/contracts/flipflop.customer_journey.events.v1.schema.json';
const fixturePath = 'docs/contracts/fixtures/flipflop.customer_journey.events.v1.valid.json';
const contractDocPath = 'docs/contracts/flipflop.customer_journey.events.v1.md';
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
function readJson(p) { return JSON.parse(read(p)); }
function assert(c, m) { if (!c) throw new Error(m); }
function typeName(v) { if (Array.isArray(v)) return 'array'; if (v === null) return 'null'; if (typeof v === 'number' && Number.isInteger(v)) return 'integer'; return typeof v; }
function accepts(t, v) { const a = typeName(v); const acceptsOne = (expected) => expected === a || (expected === "number" && a === "integer"); return Array.isArray(t) ? t.some(acceptsOne) : acceptsOne(t); }
function validateScalar(s, v, label) {
  if (s.const !== undefined) assert(v === s.const, label + ' must equal ' + JSON.stringify(s.const));
  if (s.enum) assert(s.enum.includes(v), label + ' must be one of ' + s.enum.join(', '));
  if (s.type) assert(accepts(s.type, v), label + ' must be ' + JSON.stringify(s.type) + ', got ' + typeName(v));
  if (s.pattern && typeof v === 'string') assert(new RegExp(s.pattern).test(v), label + ' does not match ' + s.pattern);
  if (s.minimum !== undefined && typeof v === 'number') assert(v >= s.minimum, label + ' must be >= ' + s.minimum);
  if (s.maximum !== undefined && typeof v === 'number') assert(v <= s.maximum, label + ' must be <= ' + s.maximum);
  if (s.format === 'date-time' && typeof v === 'string') assert(Number.isFinite(Date.parse(v)) && v.includes('T'), label + ' must be RFC3339 date-time');
}
function validateValue(s, v, label) {
  if (Array.isArray(s.type) && s.type.includes('null') && v === null) return validateScalar(s, v, label);
  if (s.type === 'object') {
    validateScalar({ type: 'object' }, v, label);
    for (const k of s.required || []) assert(Object.prototype.hasOwnProperty.call(v, k), label + '.' + k + ' is required');
    if (s.additionalProperties === false) for (const k of Object.keys(v)) assert(s.properties && s.properties[k], label + '.' + k + ' is not allowed');
    for (const [k, ps] of Object.entries(s.properties || {})) if (Object.prototype.hasOwnProperty.call(v, k)) validateValue(ps, v[k], label + '.' + k);
    return;
  }
  if (s.type === 'array') {
    validateScalar({ type: 'array' }, v, label);
    v.forEach((item, i) => validateValue(s.items || {}, item, label + '[' + i + ']'));
    return;
  }
  validateScalar(s, v, label);
}
function walkForbidden(v, names, parts = []) {
  if (!v || typeof v !== 'object') return [];
  const out = [];
  if (Array.isArray(v)) { v.forEach((item, i) => out.push(...walkForbidden(item, names, parts.concat(String(i))))); return out; }
  for (const [k, nested] of Object.entries(v)) { if (names.has(k.toLowerCase())) out.push(parts.concat(k).join('.')); out.push(...walkForbidden(nested, names, parts.concat(k))); }
  return out;
}
const schema = readJson(schemaPath);
const fixture = readJson(fixturePath);
const doc = read(contractDocPath);
const pkg = readJson('package.json');
const source = read('scripts/verify-customer-journey-events-contract.js');
const ordersService = read('services/order-service/src/orders/orders.service.ts');
const guestOrderDto = read('services/order-service/src/orders/dto/create-guest-order.dto.ts');
const authOrderDto = read('services/order-service/src/orders/dto/create-order.dto.ts');
const frontendOrdersApi = read('services/frontend/lib/api/orders.ts');
const frontendCheckout = read('services/frontend/app/checkout/page.tsx');
const guestCart = read('services/frontend/lib/guest-cart.ts');
assert(schema.title === 'flipflop.customer_journey.events.v1', 'schema title must match contract name');
assert(schema.properties.version.const === '1.0.0', 'schema version const missing');
assert(pkg.scripts['verify:customer-journey-events-contract'] === 'node scripts/verify-customer-journey-events-contract.js', 'package script missing');
assert(doc.includes('Intent Preservation Chain'), 'contract doc must preserve Intent Preservation chain');
assert(doc.includes('[MISSING: no durable ingestion API inspected or implemented in this lane]'), 'contract doc must mark ingestion gap missing');
assert(source.includes('forbidden_raw_sensitive_fields'), 'verifier must enforce sensitive field denylist');
assert(ordersService.includes("correlationId: /^corr_[a-z0-9][a-z0-9_-]{8,127}$/"), 'order-service must validate corr_ correlation ids');
assert(!ordersService.includes("|| journeyId;"), 'order-service must not fall back from correlation_id to journey_id');
assert(ordersService.includes('const metadataValue: Record<string, unknown> = { customerJourney };'), 'authenticated checkout must persist customerJourney metadata');
assert(ordersService.includes('customerJourney: {') && ordersService.includes('centralOrdersSource'), 'payment metadata must include customerJourney context');
for (const dtoSource of [guestOrderDto, authOrderDto]) {
  for (const field of ['journeyId?: string', 'correlationId?: string', 'sessionId?: string']) {
    assert(dtoSource.includes(field), 'order DTOs must allow ' + field + ' under strict ValidationPipe');
  }
}
for (const field of ['journeyId?: string', 'correlationId?: string', 'sessionId?: string']) {
  assert(frontendOrdersApi.includes(field), 'frontend orders API type must include ' + field);
}
assert(guestCart.includes('getCustomerJourneyContext'), 'frontend must expose customer journey context helper');
assert(guestCart.includes('JOURNEY_CORRELATION_ID_KEY'), 'frontend must persist stable correlation id');
assert(frontendCheckout.includes('getCustomerJourneyContext()'), 'checkout submit must read customer journey context');
assert(frontendCheckout.includes('journeyId: journeyContext.journeyId'), 'checkout payload must send journeyId');
assert(frontendCheckout.includes('correlationId: journeyContext.correlationId'), 'checkout payload must send correlationId');
assert(Array.isArray(fixture), 'fixture must be an array of events');
const contractRules = schema['x-contract-rules'];
const forbidden = new Set(contractRules.forbidden_raw_sensitive_fields.map((f) => f.toLowerCase()));
const requiredEvents = new Set(contractRules.required_events_before_ai);
const covered = new Set();
const eventIds = new Set();
const idempotencyKeys = new Set();
const journeyIds = new Set();
const correlationIds = new Set();
let previous = null;
fixture.forEach((event, index) => {
  const label = 'fixture[' + index + ']';
  validateValue(schema, event, label);
  covered.add(event.event_name);
  assert(!eventIds.has(event.event_id), label + ' event_id must be unique');
  eventIds.add(event.event_id);
  assert(!idempotencyKeys.has(event.idempotency_key), label + ' idempotency_key must be unique');
  idempotencyKeys.add(event.idempotency_key);
  journeyIds.add(event.journey_id);
  correlationIds.add(event.correlation_id);
  assert(event.causation_id === previous, label + ' causation_id must chain to previous fixture event');
  previous = event.event_id;
  for (const id of contractRules.event_required_identifiers[event.event_name] || []) assert(event.identifiers[id], label + '.identifiers.' + id + ' is required for ' + event.event_name);
  const findings = walkForbidden(event, forbidden);
  assert(findings.length === 0, label + ' contains forbidden raw sensitive field(s): ' + findings.join(', '));
});
for (const required of requiredEvents) assert(covered.has(required), 'fixture missing required event ' + required);
assert(journeyIds.size === 1, 'fixture must use one stable journey_id for the synthetic journey');
assert(correlationIds.size === 1, 'fixture must use one stable correlation_id for the synthetic journey');
console.log(JSON.stringify({ ok: true, verifier: 'flipflop.customer_journey.events.v1', schema: schemaPath, fixture: fixturePath, requiredEvents: Array.from(requiredEvents), coveredEvents: Array.from(covered), eventsValidated: fixture.length, journeyIdStable: true, correlationIdStable: true, causationChainValid: true, idempotencyKeysUnique: true, sensitiveOutput: 'redacted-source-only', runtimeMutation: false }, null, 2));
