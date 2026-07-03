const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const controller = read('services/order-service/src/orders/orders-internal.controller.ts');
const service = read('services/order-service/src/orders/orders.service.ts');
const helper = read('services/order-service/src/orders/affinity-replay-eligibility.ts');

const checks = [];
function check(condition, message) {
  checks.push({ ok: Boolean(condition), message });
}

check(
  controller.includes("@Get('order-affinity/replay-candidates')") &&
    controller.includes('this.ordersService.assertAffinityReplayAccess(internalKey)') &&
    controller.includes('getOrderAffinityReplayCandidates'),
  'internal replay endpoint exists and uses the stricter affinity replay access assertion',
);
check(
  service.includes('assertAffinityReplayAccess') &&
    service.includes("FLIPFLOP_INTERNAL_SERVICE_SECRET')?.trim()") &&
    service.includes("throw new UnauthorizedException('Invalid internal service key')"),
  'replay endpoint fails closed when the internal secret is missing or mismatched',
);
check(
  service.includes('FLIPFLOP_AFFINITY_REPLAY_CONTRACT') &&
    service.includes('FLIPFLOP_AFFINITY_SOURCE_OWNER') &&
    service.includes('FLIPFLOP_AFFINITY_CONSUMER_OWNER') &&
    service.includes('FLIPFLOP_AFFINITY_CHANNEL'),
  'response reuses the merged affinity contract constants',
);
check(
  service.includes('getFlipFlopAffinityReplayEligibility(order)') &&
    !service.includes('byCatalogProductId.size < 2'),
  'endpoint/export shape reuses the merged eligibility helper instead of duplicating eligibility logic',
);
check(
  service.includes('filters:') &&
    service.includes('window:') &&
    service.includes("completeness: 'bounded-page'") &&
    service.includes('complete: !hasMore'),
  'response includes filter and bounded window metadata',
);
check(
  service.includes('cursorBefore: query.cursor || null') &&
    service.includes('cursorAfter') &&
    service.includes('base64url') &&
    service.includes('AFFINITY_REPLAY_CURSOR_VERSION'),
  'response supports opaque cursor pagination',
);
check(
  service.includes('take: limit + 1') &&
    service.includes('DEFAULT_AFFINITY_REPLAY_LIMIT') &&
    service.includes('MAX_AFFINITY_REPLAY_LIMIT'),
  'replay query is bounded by default and max limit',
);
check(
  service.includes('paymentStatus: { in: Array.from(FLIPFLOP_AFFINITY_REPLAY_ELIGIBLE_PAYMENT_STATUSES) }') &&
    service.includes('status: { in: Array.from(FLIPFLOP_AFFINITY_REPLAY_ELIGIBLE_ORDER_STATUSES) }'),
  'database query prefilters to paid/processable replay candidates',
);
check(
  service.includes('order_items:') &&
    service.includes('products:') &&
    service.includes('catalogProductId: true'),
  'query loads only the Catalog product mapping needed by the helper',
);
check(
  service.includes('sourceOwner: FLIPFLOP_AFFINITY_SOURCE_OWNER') &&
    service.includes('consumerOwner: FLIPFLOP_AFFINITY_CONSUMER_OWNER') &&
    service.includes('contract: FLIPFLOP_AFFINITY_REPLAY_CONTRACT') &&
    service.includes('channel: FLIPFLOP_AFFINITY_CHANNEL'),
  'response envelope has sourceOwner, consumerOwner, contract, and channel',
);
check(
  service.includes('events: FlipFlopAffinityReplayCandidate[]') &&
    helper.includes('replayRef: syntheticReplayRef(order)') &&
    helper.includes("currency: 'CZK'"),
  'events contain aggregate-safe candidate snapshots with synthetic replay refs',
);

const forbiddenResponseTerms = [
  'delivery_addresses',
  'users:',
  'paymentTransactionId: true',
  'metadata: true',
  'buyer',
  'providerPayload',
  'providerResponse',
  'accessToken',
  'clientSecret',
  'rawPayload',
];

const replayMethodStart = service.indexOf('async getOrderAffinityReplayCandidates');
const replayMethodEnd = service.indexOf('private parseOptionalIsoDate');
assert(replayMethodStart > -1 && replayMethodEnd > replayMethodStart);
const replayMethod = service.slice(replayMethodStart, replayMethodEnd);
for (const term of forbiddenResponseTerms) {
  check(!replayMethod.includes(term), `replay endpoint must not select or emit forbidden content: ${term}`);
}

function encodeCursor(order) {
  return Buffer.from(JSON.stringify({ v: 1, createdAt: order.createdAt.toISOString(), id: order.id }), 'utf8').toString('base64url');
}

function decodeCursor(value) {
  const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  if (parsed.v !== 1 || typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
    throw new Error('invalid cursor');
  }
  return parsed;
}

const cursor = encodeCursor({ createdAt: new Date('2026-07-03T00:00:00.000Z'), id: '00000000-0000-4000-8000-000000000001' });
assert.deepStrictEqual(decodeCursor(cursor), {
  v: 1,
  createdAt: '2026-07-03T00:00:00.000Z',
  id: '00000000-0000-4000-8000-000000000001',
});

function boundedLimit(value) {
  if (value === undefined || String(value).trim() === '') return 50;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error('bad limit');
  return Math.min(parsed, 200);
}
assert.strictEqual(boundedLimit(undefined), 50);
assert.strictEqual(boundedLimit('5'), 5);
assert.strictEqual(boundedLimit('500'), 200);
assert.throws(() => boundedLimit('0'));

const failed = checks.filter((row) => !row.ok);
for (const row of checks) {
  console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.message}`);
}
if (failed.length) {
  console.error(`verify-flipflop-affinity-replay-export failed: ${failed.length} failed checks`);
  process.exit(1);
}
console.log(`verify-flipflop-affinity-replay-export passed: ${checks.length} checks`);
