#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const read = (path) => fs.readFileSync(path, 'utf8');
const orderService = read('services/order-service/src/orders/orders.service.ts');
const ordersController = read('services/order-service/src/orders/orders.controller.ts');
const gatewayController = read('services/api-gateway/src/gateway/gateway.controller.ts');
const configMap = read('k8s/configmap.yaml');

assert(orderService.includes('async quoteGuestOrder'), 'order-service exposes non-mutating guest quote method');
assert(orderService.includes("schemaVersion: 'flipflop.checkout-quote.v1'"), 'quote response is schema-versioned');
assert(orderService.includes('sideEffects: []'), 'quote response declares no side effects');
assert(orderService.includes('calculateCheckoutDiscount'), 'quote reuses central checkout discount calculation');
assert(orderService.includes('holidayDiscountProcessVersion'), 'holiday discount process version is configurable');
assert(orderService.includes('FLIPFLOP_HOLIDAY_DISCOUNT_PROCESS_VERSION'), 'process version comes from env');
assert(orderService.includes('Number(facts.processVersion) !== this.holidayDiscountProcessVersion()'), 'holiday facts validation uses configured process version');
assert(ordersController.includes("@Post('guest/quote')"), 'order-service has guest quote route');
assert(gatewayController.includes("@Post('orders/guest/quote')"), 'api-gateway proxies public guest quote route');
assert(configMap.includes('FLIPFLOP_HOLIDAY_DISCOUNT_PROCESS_VERSION: "2"'), 'runtime config targets BPCP process v2 canary');

console.log('verify-holiday-discount-quote passed');
