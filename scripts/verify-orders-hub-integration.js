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
const packageJson = read('package.json');
const configmap = read('k8s/configmap.yaml');
const warehouseClient = read('shared/clients/warehouse-client.service.ts');
const adminDashboard = read('services/frontend/app/admin/page.tsx');
const authSubjectSmoke = read('scripts/smoke-orders-auth-subject.js');
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
  orderClient.includes("'x-internal-service-token': token") &&
    orderClient.includes("'x-service-name': 'flipflop-service'") &&
    !orderClient.includes('Authorization: token.startsWith'),
  'central Orders client must authenticate as the FlipFlop channel service through Orders internal service headers',
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
  orderClient.includes('authSubject?: string') &&
    payloadBuilder.includes('authSubject: this.isUuid(user?.id) ? user.id : undefined'),
  'authenticated FlipFlop checkout must forward the Auth-compatible user UUID as customer.authSubject for central Orders snapshots',
);
assert(
  packageJson.includes('smoke:orders-auth-subject') &&
    authSubjectSmoke.includes('RUN_LIVE_AUTH_SUBJECT_ORDERS_SMOKE') &&
    authSubjectSmoke.includes('AUTH_SUBJECT_SMOKE_CONFIRM=CREATE_READ_OPTIONAL_CANCEL') &&
    authSubjectSmoke.includes('AUTH_SUBJECT_SMOKE_CATALOG_PRODUCT_ID') &&
    authSubjectSmoke.includes('AUTH_SUBJECT_SMOKE_WAREHOUSE_ID') &&
    authSubjectSmoke.includes('authSubjectPersisted') &&
    authSubjectSmoke.includes('WRITE_AUTH_SUBJECT_SMOKE_REPORT'),
  'guarded auth-subject runtime smoke script must exist and require explicit approval before mutation',
);

assert(
  payloadBuilder.includes('const catalogProductId = this.requireCatalogProductId(') &&
    payloadBuilder.includes('item.catalogProductId ?? item.products?.catalogProductId') &&
    payloadBuilder.includes('productId: catalogProductId') &&
    !payloadBuilder.includes('productId: item.productId'),
  'central Orders payload item.productId must be the canonical Catalog product ID, not the local FlipFlop product ID',
);
assert(
  payloadBuilder.includes('warehouseId: string') &&
    payloadBuilder.includes('const { order, orderItems, deliveryAddress, user, warehouseId } = params') &&
    payloadBuilder.includes('warehouseId,'),
  'central Orders payload items must include the Warehouse reservation authority id',
);
assert(
  ordersService.includes('private async requireReservationWarehouseId') &&
    ordersService.includes("'[MISSING: warehouseId] Cannot create order without Warehouse reservation authority'") &&
    ordersService.includes('private requireReservationCatalogProductId') &&
    ordersService.includes('reservationWarehouseId = await this.reserveOrderLines') &&
    ordersService.includes('warehouseId: reservationWarehouseId') &&
    !ordersService.includes("Stock reserve skipped: no default warehouse"),
  'order-service must fail closed when Warehouse reservation authority data is missing',
);
assert(
  ordersService.includes('orderItems: order.order_items') &&
    ordersService.includes('products: true'),
  'central Orders forwarding must forward persisted order lines with Product relations',
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
  ordersService.includes('createCentralOrderBeforePayment') &&
    ordersService.includes('orderId: centralAcceptance.centralOrderId') &&
    ordersService.includes('centralOrderId: centralAcceptance.centralOrderId') &&
    ordersService.includes('metadata: this.buildPaymentMetadata(order, centralAcceptance.centralOrderId)') &&
    !ordersService.includes('orderId: order.orderNumber,'),
  'payment creation must use the central Orders UUID and local callback metadata, never the local order number',
);
assert(
  ordersService.indexOf('createCentralOrderBeforePayment') < ordersService.indexOf('this.paymentService.createPayment({'),
  'central Orders acceptance helper must be defined and used before payment creation paths',
);
assert(
  ordersService.includes('Skipped local warehouse mutation after payment for central-owned order') &&
    ordersService.includes('findOrderForPaymentResult(body)') &&
    ordersService.includes('paymentTransactionId: body.paymentId'),
  'central-owned payment callbacks must update local read state without local Warehouse decrement/unreserve side effects',
);
assert(
  orderClient.includes('getOrderLifecycle') &&
    orderClient.includes("'[MISSING: Orders lifecycle read endpoint]'") &&
    orderClient.includes('headers: this.getAuthHeaders()'),
  'Orders client must expose an authenticated lifecycle adapter with a missing-endpoint placeholder',
);
assert(
  adminDashboard.includes('ordersApi.getAdminOrders({ page: 1, limit: 5 })') &&
    adminDashboard.includes('setRecentOrders(recentAdminOrders.slice(0, 5))') &&
    !adminDashboard.includes('ordersApi.getOrders()'),
  'admin dashboard recent orders must use the admin-scoped orders API, not the customer order list',
);
assert(
  ordersService.includes("message.includes('[MISSING: catalogProductId]')") &&
    ordersService.includes('reason: forwardingReason'),
  'order-service must record [MISSING: catalogProductId] as a bounded central forwarding blocker',
);
assert(
  ordersService.includes('message.includes(ORDER_IDEMPOTENCY_CONFLICT)') &&
    ordersService.includes('Central Orders idempotency conflict resolved to existing order'),
  'order-service must surface and resolve central Orders idempotency conflicts explicitly before payment',
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

assert(
  !warehouseClient.includes("from 'pg'") &&
    !warehouseClient.includes('warehouseDbPool') &&
    !warehouseClient.includes('getTotalAvailableFromDatabase') &&
    !warehouseClient.includes('WAREHOUSE_DB_'),
  'Warehouse client must not use direct database fallback for sellable stock checks',
);
assert(
  warehouseClient.includes('HttpStatus.BAD_GATEWAY') &&
    warehouseClient.includes('Failed to get total stock from warehouse-microservice'),
  'Warehouse stock availability reads must fail closed when warehouse-microservice is unavailable',
);
assert(
  warehouseClient.includes('this.httpService.get(`${this.baseUrl}/api/warehouses`, this.requestOptions())'),
  'Warehouse default warehouse discovery must send the same auth headers as stock reservation calls',
);

for (const term of forbiddenForwardingTerms) {
  assert(!ordersService.includes(term), `order-service must not forward or log forbidden term: ${term}`);
}

console.log('orders hub integration verification ok');
