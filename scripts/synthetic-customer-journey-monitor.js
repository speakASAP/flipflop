#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const baseUrl = (process.env.FLIPFLOP_SYNTHETIC_BASE_URL || process.env.FRONTEND_URL || 'https://flipflop.alfares.cz').replace(/\/$/, '');
const apiBaseUrl = (process.env.FLIPFLOP_SYNTHETIC_API_BASE_URL || `${baseUrl}/api`).replace(/\/$/, '');
const evidenceDir = process.env.FLIPFLOP_SYNTHETIC_EVIDENCE_DIR || path.join('reports', 'validation', 'synthetic-journey-monitor');
const runId = process.env.FLIPFLOP_SYNTHETIC_RUN_ID || `synthetic-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const requireFullFlow = process.env.FLIPFLOP_SYNTHETIC_REQUIRE_FULL_FLOW === '1';

const requiredSandboxFacts = [
  ['SYNTHETIC_TEST_PRODUCT_ID', 'approved synthetic product/SKU'],
  ['SYNTHETIC_CUSTOMER_EMAIL', 'synthetic customer/contact'],
  ['SYNTHETIC_DELIVERY_CONTRACT_ID', 'approved delivery test contract'],
  ['PAYMENT_SANDBOX_CONTRACT_APPROVED', 'sandbox/test-mode payment approval flag'],
  ['TEST_MODE_PAYMENT_PROVIDER', 'documented sandbox/test-mode payment provider'],
  ['CHECKOUT_MUTATION_MODE', 'sandbox or test-only checkout mutation mode'],
  ['SYNTHETIC_EMAIL_ASSERTION_SOURCE', 'email queue/inbox assertion source'],
  ['SYNTHETIC_EVENT_TRACE_SOURCE', 'event trace assertion source'],
  ['SYNTHETIC_ORDER_CLEANUP_CONTRACT', 'order/payment cleanup or retention contract'],
];

const failureClasses = {
  P0_MUTATION_GUARD: 'Unapproved production checkout/payment/order/provider mutation attempted or implied.',
  P1_LANDING_DISCOVERY_DOWN: 'Landing, product discovery, product detail, cart, or checkout page is unavailable.',
  P1_PRODUCT_DETAIL_DOWN: 'Product detail page or product detail API is unavailable.',
  P1_CHECKOUT_BLOCKED: 'Cart, quote, checkout, or submit preflight fails before payment/provider mutation.',
  P1_PAYMENT_CONTRACT_BLOCKED: 'Payment/provider/order/email/event path lacks sandbox/test contract or cleanup evidence.',
  P2_ORDER_EMAIL_EVENT_DRIFT: 'Approved sandbox order, email, or event trace readback mismatches expected data.',
  P3_OBSERVABILITY_DEBT: 'Evidence, redaction, timestamps, or result JSON is incomplete.',
};

const journeyScenario = [
  'Open landing page and assert HTTP 2xx/3xx plus storefront availability.',
  'Open product discovery page and public products API.',
  'Select the approved synthetic product when configured, otherwise first sellable public product for read-only discovery only.',
  'Open product detail page and product detail API; assert id/SKU/name/price/availability fields.',
  'Open cart and checkout pages without submitting an order.',
  'Assert frontend journey-event source markers for product view, cart add, checkout start, shipping selection, and cart validation.',
  'POST empty body to /api/orders/guest and assert 4xx validation, proving the route is mounted without creating an order.',
  'Hard-stop before checkout/payment/order mutation unless every sandbox/test-mode fact is present.',
  'When sandbox facts exist, a separate owner-approved runner may assert payment success, order created, email queued/delivered, and event trace by correlation id.',
];

function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), 'utf8'); }
function readJson(relativePath) { return JSON.parse(read(relativePath)); }
function assert(condition, message, classification = 'P1_CHECKOUT_BLOCKED') {
  if (!condition) { const error = new Error(message); error.classification = classification; throw error; }
}
function hashValue(value) { return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 16); }
function redactProduct(product) {
  return {
    idHash: hashValue(product.id),
    skuHash: hashValue(product.sku),
    hasName: Boolean(product.name),
    priceClass: Number(product.price || 0) > 0 ? 'positive' : 'non-positive',
    stockClass: Number(product.stockQuantity || 0) > 0 ? 'available' : 'unavailable',
  };
}
async function request(url, options = {}) {
  const response = await fetch(url, { method: options.method || 'GET', redirect: options.redirect || 'manual', headers: { 'content-type': 'application/json', ...(options.headers || {}) }, body: options.body });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text ? { rawLength: text.length } : null; }
  return { status: response.status, ok: response.status >= 200 && response.status < 400, body };
}

function assertSourceContracts() {
  const packageJson = readJson('package.json');
  const monitorSource = read('scripts/synthetic-customer-journey-monitor.js');
  const smokeCheckout = read('scripts/smoke-checkout.js');
  const paidProviderGate = read('scripts/verify-paid-provider-bundle-checkout-gate.js');
  const guestCheckoutVerifier = read('scripts/verify-guest-checkout-ui.js');
  const authWalletSelectors = read('scripts/verify-auth-wallet-checkout-selectors.js');
  const ordersLifecycleVerifier = read('scripts/verify-orders-lifecycle-ui.js');
  const gatewayController = read('services/api-gateway/src/gateway/gateway.controller.ts');
  const checkoutPage = read('services/frontend/app/checkout/page.tsx');
  const productDetailPage = read('services/frontend/app/products/[id]/page.tsx');
  const guestCart = read('services/frontend/lib/guest-cart.ts');
  const orderService = read('services/order-service/src/orders/orders.service.ts');
  const monitorDoc = read('docs/orchestrator/2026-07-06-synthetic-customer-journey-monitor.md');

  assert(packageJson.scripts['verify:synthetic-journey-monitor'] === 'node scripts/synthetic-customer-journey-monitor.js', 'package script verify:synthetic-journey-monitor is missing', 'P3_OBSERVABILITY_DEBT');
  assert(monitorSource.includes('P0_MUTATION_GUARD') && monitorSource.includes('requiredSandboxFacts'), 'monitor source must preserve failure classes and sandbox gates', 'P3_OBSERVABILITY_DEBT');
  assert(smokeCheckout.includes("execFileSync('kubectl'") && smokeCheckout.includes("await request('/orders'"), 'legacy checkout smoke risk markers changed unexpectedly', 'P0_MUTATION_GUARD');
  for (const boundary of ['mutation: false', 'live_checkout_executed: false', 'provider_call: false', 'orders_mutation: false', 'warehouse_mutation: false', 'channel_cleanup_mutation: false', 'secret_output: false']) {
    assert(paidProviderGate.includes(boundary), `paid-provider gate missing boundary ${boundary}`, 'P0_MUTATION_GUARD');
  }
  assert(paidProviderGate.includes('[MISSING: final redacted evidence path for required provider, Orders, Warehouse, and channel cleanup proof]'), 'paid-provider gate must retain final evidence blocker', 'P1_PAYMENT_CONTRACT_BLOCKED');
  assert(guestCheckoutVerifier.includes('finalSubmitNotClickedToAvoidProductionOrderMutation'), 'guest checkout verifier must remain non-mutating by default', 'P0_MUTATION_GUARD');
  assert(authWalletSelectors.includes('/checkout') && authWalletSelectors.includes('profile'), 'auth wallet checkout selector verifier must remain wired', 'P1_CHECKOUT_BLOCKED');
  assert(gatewayController.includes("@Post('orders/guest/quote')") && gatewayController.includes('intentionally non-mutating'), 'guest quote preflight route contract missing', 'P1_CHECKOUT_BLOCKED');
  assert(gatewayController.includes("@Post('orders/guest')"), 'guest order route is not mounted in gateway source', 'P1_CHECKOUT_BLOCKED');
  assert(checkoutPage.includes('getGuestCart()') && checkoutPage.includes('Odeslat objednávku s povinností platby'), 'checkout page must expose guest cart and final submit flow', 'P1_CHECKOUT_BLOCKED');
  assert(productDetailPage.includes('product_viewed') && productDetailPage.includes('buildProductViewedPayload'), 'product detail must record sanitized product_viewed journey events', 'P2_ORDER_EMAIL_EVENT_DRIFT');
  for (const eventMarker of ['recordJourneyEvent', 'cart_item_added', 'checkout_started', 'shipping_option_selected', 'cart_validated']) {
    assert(guestCart.includes(eventMarker) || checkoutPage.includes(eventMarker), `journey event marker missing: ${eventMarker}`, 'P2_ORDER_EMAIL_EVENT_DRIFT');
  }
  assert(orderService.includes('centralOrdersForwarding') && orderService.includes('getPaymentSuccessUrl') && orderService.includes('getPaymentCancelUrl'), 'order service must preserve central Orders/payment-result contract', 'P2_ORDER_EMAIL_EVENT_DRIFT');
  assert(orderService.includes('handlePaymentResult') && orderService.includes('PaymentResultDto'), 'order service must keep payment result handling visible', 'P2_ORDER_EMAIL_EVENT_DRIFT');
  assert(ordersLifecycleVerifier.includes('CENTRAL_ORDER_LIFECYCLE_STAGES'), 'orders lifecycle verifier must cover central lifecycle states', 'P2_ORDER_EMAIL_EVENT_DRIFT');
  for (const marker of ['Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation', 'Failure classification', 'Schedule proposal', 'Production safety notes']) {
    assert(monitorDoc.includes(marker), `monitor doc missing ${marker}`, 'P3_OBSERVABILITY_DEBT');
  }
}

function getMissingSandboxFacts() {
  return requiredSandboxFacts.flatMap(([name, description]) => {
    const value = process.env[name];
    if (name === 'PAYMENT_SANDBOX_CONTRACT_APPROVED' && value !== '1' && value !== 'true') return [`[MISSING: ${description}]`];
    if (name === 'CHECKOUT_MUTATION_MODE' && !['sandbox', 'test-only'].includes(String(value || '').toLowerCase())) return [`[MISSING: ${description}]`];
    return value ? [] : [`[MISSING: ${description}]`];
  });
}

async function assertLiveReadOnlyJourney(result) {
  for (const [name, url] of [['landing', `${baseUrl}/`], ['productDiscovery', `${baseUrl}/products`], ['cart', `${baseUrl}/cart`], ['checkout', `${baseUrl}/checkout`]]) {
    const response = await request(url); result.steps.push({ name, url: new URL(url).pathname || '/', status: response.status });
    assert(response.ok, `${name} page returned HTTP ${response.status}`, 'P1_LANDING_DISCOVERY_DOWN');
  }
  const productsResponse = await request(`${apiBaseUrl}/products?limit=20`);
  result.steps.push({ name: 'productApiList', path: '/api/products?limit=20', status: productsResponse.status });
  assert(productsResponse.ok, `products API returned HTTP ${productsResponse.status}`, 'P1_LANDING_DISCOVERY_DOWN');
  const products = productsResponse.body?.data?.items || productsResponse.body?.items || [];
  assert(Array.isArray(products) && products.length > 0, 'products API returned no products', 'P1_LANDING_DISCOVERY_DOWN');
  const configuredProductId = process.env.SYNTHETIC_TEST_PRODUCT_ID;
  const product = configuredProductId ? products.find((item) => item.id === configuredProductId) || { id: configuredProductId } : products.find((item) => Number(item.stockQuantity || 0) > 0 && Number(item.price || 0) > 0) || products[0];
  assert(product && typeof product.id === 'string', 'no product id available for detail assertion', 'P1_PRODUCT_DETAIL_DOWN');
  result.selectedProduct = redactProduct(product); result.syntheticProductSource = configuredProductId ? 'configured' : 'read-only-first-sellable';
  const productPage = await request(`${baseUrl}/products/${encodeURIComponent(product.id)}`);
  result.steps.push({ name: 'productDetailPage', path: `/products/${hashValue(product.id)}`, status: productPage.status });
  assert(productPage.ok, `product detail page returned HTTP ${productPage.status}`, 'P1_PRODUCT_DETAIL_DOWN');
  const productApi = await request(`${apiBaseUrl}/products/${encodeURIComponent(product.id)}?includeWarehouse=true`);
  result.steps.push({ name: 'productDetailApi', path: `/api/products/${hashValue(product.id)}`, status: productApi.status });
  assert(productApi.ok, `product detail API returned HTTP ${productApi.status}`, 'P1_PRODUCT_DETAIL_DOWN');
  const detail = productApi.body?.data || productApi.body;
  assert(detail?.id, 'product detail API missing product id', 'P1_PRODUCT_DETAIL_DOWN');
  assert(detail?.sku || product.sku, 'product detail API missing SKU', 'P1_PRODUCT_DETAIL_DOWN');
  assert(Number(detail?.price ?? product.price ?? 0) >= 0, 'product detail API missing valid price', 'P1_PRODUCT_DETAIL_DOWN');
  const invalidGuestOrder = await request(`${apiBaseUrl}/orders/guest`, { method: 'POST', body: JSON.stringify({}) });
  result.steps.push({ name: 'invalidGuestOrderRejected', path: '/api/orders/guest', status: invalidGuestOrder.status });
  assert(invalidGuestOrder.status !== 404, 'guest order route returned 404; route is not mounted', 'P1_CHECKOUT_BLOCKED');
  assert(invalidGuestOrder.status >= 400 && invalidGuestOrder.status < 500, `invalid guest order must reject with 4xx, got ${invalidGuestOrder.status}`, 'P1_CHECKOUT_BLOCKED');
  result.assertions.landingProductDiscoveryProductDetailCartCheckoutReachable = true;
  result.assertions.productApiHasSyntheticCandidate = true;
  result.assertions.guestOrderRouteMountedAndValidationRejectsEmptyBody = true;
  result.assertions.checkoutSubmitNotClickedToAvoidProductionOrderMutation = true;
}

function classifySandboxGate(result) {
  const missing = getMissingSandboxFacts();
  result.paymentOrderEmailEventGate = { status: missing.length ? 'blocked_missing_contract' : 'ready_for_owner_approved_sandbox_runner', missing, assertions: { paymentSuccess: missing.length ? '[MISSING: sandbox/test-mode payment success evidence]' : '[READY: assert in sandbox runner]', orderCreated: missing.length ? '[MISSING: sandbox central Orders create/read evidence]' : '[READY: assert in sandbox runner]', emailQueuedOrDelivered: missing.length ? '[MISSING: synthetic email queue/delivery evidence]' : '[READY: assert in sandbox runner]', eventTrace: missing.length ? '[MISSING: journey correlation event trace evidence]' : '[READY: assert in sandbox runner]' } };
  result.classification = missing.length ? 'P1_PAYMENT_CONTRACT_BLOCKED' : 'P3_OBSERVABILITY_DEBT'; result.severity = missing.length ? 'medium' : 'low';
}

async function main() {
  const result = { ok: false, status: 'running', runId, generatedAt: new Date().toISOString(), timezone: 'Europe/Prague', baseUrl, apiBaseUrl, nonMutating: true, mutation: false, liveCheckoutExecuted: false, providerCall: false, ordersMutation: false, warehouseMutation: false, channelCleanupMutation: false, secretOutput: false, rawCustomerOrPaymentEvidence: false, intentChain: 'Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation', scenario: journeyScenario, failureClasses, steps: [], assertions: {} };
  try {
    assertSourceContracts(); result.assertions.sourceContractsPreserveFailClosedMonitor = true; result.assertions.frontendJourneyEventTraceSourceContract = true;
    await assertLiveReadOnlyJourney(result); classifySandboxGate(result);
    result.status = result.paymentOrderEmailEventGate.status === 'blocked_missing_contract' ? 'read_only_passed_full_flow_blocked_missing_contract' : 'read_only_passed_sandbox_contract_ready'; result.ok = true;
    if (requireFullFlow && result.paymentOrderEmailEventGate.status !== 'ready_for_owner_approved_sandbox_runner') { const error = new Error('full synthetic flow required but sandbox/payment/order/email/event facts are missing'); error.classification = 'P1_PAYMENT_CONTRACT_BLOCKED'; throw error; }
  } catch (error) { result.ok = false; result.status = 'failed'; result.classification = error.classification || 'P1_CHECKOUT_BLOCKED'; result.severity = result.classification === 'P0_MUTATION_GUARD' ? 'critical' : 'high'; result.error = error.message; }
  fs.mkdirSync(evidenceDir, { recursive: true }); fs.writeFileSync(path.join(evidenceDir, 'report-latest.json'), JSON.stringify(result, null, 2)); fs.writeFileSync(path.join(evidenceDir, `${runId}.json`), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2)); process.exit(result.ok ? 0 : 1);
}
main().catch((error) => { console.error(error.message); process.exit(1); });
