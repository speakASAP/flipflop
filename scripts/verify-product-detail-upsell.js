const fs = require('fs');

const read = (path) => fs.readFileSync(path, 'utf8');

const checks = [];
const assert = (condition, message) => {
  checks.push({ ok: Boolean(condition), message });
};

const productController = read('services/product-service/src/products/products.controller.ts');
const productService = read('services/product-service/src/products/products.service.ts');
const productsApi = read('services/frontend/lib/api/products.ts');
const catalogClient = read('shared/clients/catalog-client.service.ts');
const productPage = read('services/frontend/app/products/[id]/page.tsx');
const bundleButton = read('services/frontend/components/AddBundleToCartButton.tsx');
const checkoutPage = read('services/frontend/app/checkout/page.tsx');
const orderService = read('services/order-service/src/orders/orders.service.ts');

assert(productController.includes("@Get(':id/recommendations')"), 'product-service exposes public recommendations route');
assert(productService.includes('getProductRecommendations'), 'product-service implements recommendation method');
assert(catalogClient.includes('getRelatedProducts'), 'Catalog client reads Catalog related-products endpoint');
assert(catalogClient.includes('/api/products/${encodeURIComponent(productId)}/related'), 'Catalog client targets Catalog related-products route');
assert(productService.includes('getCatalogRelatedProducts'), 'product-service prefers Catalog related-products when available');
assert(productService.includes('catalog_order_affinity_then_purchase_history_then_category_fallback'), 'recommendation policy records Catalog relation precedence');
assert(productService.includes('getFrequentlyBoughtTogetherProducts'), 'product-service reads aggregate purchase-history co-occurrence');
assert(productService.includes("status: 'confirmed'"), 'purchase-history source is limited to confirmed orders');
assert(productService.includes('getFallbackRelatedProducts'), 'product-service has deterministic fallback recommendations');
assert(productService.includes('FREE_SHIPPING_THRESHOLD_CZK = 1000'), 'bundle savings uses owner-requested free-shipping threshold');
assert(productService.includes('DEFAULT_SHIPPING_COST_CZK = 89'), 'bundle savings includes current default delivery cost assumption');
assert(productService.includes('usesAi: false'), 'recommendation policy states AI is not used');
assert(productService.includes('exposesCustomerData: false'), 'recommendation policy states customer data is not exposed');
assert(!productService.includes('customerEmail') && !productService.includes('deliveryAddress'), 'public recommendation code does not select obvious customer PII fields');

assert(productsApi.includes('ProductRecommendations'), 'frontend API has typed recommendations response');
assert(productsApi.includes('getProductRecommendations'), 'frontend API fetches recommendations endpoint');
assert(productPage.includes('Často kupované společně'), 'product page renders buy-together section');
assert(productPage.includes('Související produkty'), 'product page renders related-products section');
assert(productPage.includes('Ušetříte {formatMoney(bundle.totalSavings)}'), 'product page renders savings in CZK');
assert(!productPage.includes('5%') && !productPage.includes('0.05'), 'product page does not show percentage discount copy');
assert(bundleButton.includes('cartApi.addToCart'), 'bundle button uses existing authenticated cart add path');
assert(bundleButton.includes('addGuestCartItem'), 'bundle button uses existing guest cart add path');

if (checkoutPage.includes('bundleIntent') || orderService.includes('calculateBundleDiscount')) {
  assert(checkoutPage.includes('bundleIntent'), 'GOAL-13 checkout carries bundle intent identifiers only');
  assert(orderService.includes('calculateBundleDiscount'), 'GOAL-13 order service owns bundle discount totals');
} else {
  assert(!checkoutPage.includes('bundle') && !checkoutPage.includes('Bundle'), 'checkout page was not changed for bundle discount totals');
  assert(!orderService.includes('bundle') && !orderService.includes('Bundle'), 'order service was not changed for bundle discount totals');
}

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.message}`);
}

if (failed.length) {
  console.error(`verify-product-detail-upsell failed: ${failed.length} failed checks`);
  process.exit(1);
}

console.log(`verify-product-detail-upsell passed: ${checks.length} checks`);
