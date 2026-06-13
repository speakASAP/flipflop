const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const orderClient = read('shared/clients/order-client.service.ts');
const ordersService = read('services/order-service/src/orders/orders.service.ts');
const configmap = read('k8s/configmap.yaml');
const payloadBuilder = ordersService.slice(
  ordersService.indexOf('private buildCentralOrdersPayload'),
  ordersService.indexOf('private getCentralOrdersChannelAccountId'),
);

assert(
  orderClient.includes("const CREATE_ORDER_CONTRACT_VERSION = 'orders.create.v1'"),
  'central Orders client must send orders.create.v1',
);
assert(
  orderClient.includes('process.env.ORDERS_SERVICE_URL') &&
    orderClient.includes('process.env.ORDERS_MICROSERVICE_URL') &&
    !orderClient.includes('process.env.ORDER_SERVICE_URL'),
  'central Orders client must use central Orders URL env vars, not local ORDER_SERVICE_URL',
);
assert(
  configmap.includes('ORDERS_SERVICE_URL: "http://orders-microservice:3203"'),
  'FlipFlop configmap must expose ORDERS_SERVICE_URL for the central Orders client',
);
assert(
  orderClient.includes("export const ORDER_IDEMPOTENCY_CONFLICT = 'ORDER_IDEMPOTENCY_CONFLICT'"),
  'central Orders client must export the idempotency conflict marker',
);
assert(
  orderClient.includes('status === HttpStatus.CONFLICT') &&
    orderClient.includes('ORDER_IDEMPOTENCY_CONFLICT'),
  'central Orders client must map HTTP 409 to ORDER_IDEMPOTENCY_CONFLICT',
);

assert(
  ordersService.includes('buildCentralOrdersPayload'),
  'order-service must build a bounded central Orders payload',
);
assert(
  ordersService.includes("channel: 'flipflop'") &&
    ordersService.includes('channelAccountId: this.getCentralOrdersChannelAccountId()') &&
    ordersService.includes('externalOrderId: order.orderNumber'),
  'central Orders payload must include stable idempotency fields',
);
assert(
  payloadBuilder.includes('totals:') &&
    payloadBuilder.includes('payment:') &&
    payloadBuilder.includes('shipping:'),
  'central Orders payload must use nested totals/payment/shipping contract fields',
);
assert(
  payloadBuilder.includes('shippingAddress: boundedAddress') &&
    payloadBuilder.includes('billingAddress: boundedAddress') &&
    !payloadBuilder.includes('shippingAddress: deliveryAddress') &&
    !payloadBuilder.includes('billingAddress: deliveryAddress'),
  'central Orders payload must forward bounded address fields, not the raw local address record',
);
assert(
  !payloadBuilder.includes('customerNote') &&
    !payloadBuilder.includes('notes: {') &&
    !payloadBuilder.includes('notes: dto.notes'),
  'central Orders payload must not forward customer free-text notes',
);
assert(
  ordersService.includes('recordCentralOrdersForwarding') &&
    ordersService.includes("'accepted'") &&
    ordersService.includes("'conflict'") &&
    ordersService.includes("'failed'"),
  'order-service must record accepted/conflict/failed central forwarding status',
);
assert(
  ordersService.includes('message.includes(ORDER_IDEMPOTENCY_CONFLICT)') &&
    ordersService.includes('Central Orders idempotency conflict for FlipFlop order'),
  'order-service must surface central Orders idempotency conflicts explicitly',
);

const forbiddenForwardingTerms = [
  'providerPayload',
  'providerResponse',
  'cardNumber',
  'cardToken',
  'accessToken',
  'clientSecret',
  'apiKey',
];

for (const term of forbiddenForwardingTerms) {
  assert(!ordersService.includes(term), `order-service must not forward or log forbidden term: ${term}`);
}

console.log('orders hub integration verification ok');
