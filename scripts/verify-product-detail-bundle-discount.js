#!/usr/bin/env node

const fs = require('fs');
const assert = require('assert');

const read = (path) => fs.readFileSync(path, 'utf8');

const orderService = read('services/order-service/src/orders/orders.service.ts');
const guestDto = read('services/order-service/src/orders/dto/create-guest-order.dto.ts');
const authDto = read('services/order-service/src/orders/dto/create-order.dto.ts');
const guestCart = read('services/frontend/lib/guest-cart.ts');
const bundleButton = read('services/frontend/components/AddBundleToCartButton.tsx');
const checkoutPage = read('services/frontend/app/checkout/page.tsx');
const productPage = read('services/frontend/app/products/[id]/page.tsx');
const ordersApi = read('services/frontend/lib/api/orders.ts');
const goal = read('implementation-goals/GOAL-13-product-detail-bundle-discount-contract.md');
const plan = read('implementation-goals/GOAL-13-product-detail-bundle-discount-contract.execution-plan.md');

assert(goal.includes('Product Detail Bundle Discount Contract'), 'GOAL-13 goal artifact exists');
assert(plan.includes('Parallel Execution') || goal.includes('Parallel Execution'), 'GOAL-13 includes parallel execution planning');
assert(plan.includes('Order-service must ignore browser bundle savings'), 'execution plan rejects browser savings authority');

assert(orderService.includes('type BundleDiscountIntent'), 'order-service defines bundle intent type');
assert(orderService.includes("source: 'product_detail_buy_together'"), 'bundle source is explicit');
assert(orderService.includes('normalizeBundleIntent'), 'bundle intent is normalized server-side');
assert(orderService.includes('getEligibleBundleTargetIds'), 'eligible products are recomputed server-side');
assert(orderService.includes('calculateBundleDiscount'), 'bundle discount is calculated server-side');
assert(orderService.includes('calculateCheckoutDiscount'), 'checkout discount calculation is centralized');
assert(orderService.includes('Discount code cannot be combined with a bundle discount'), 'discount code stacking is blocked');
assert(orderService.includes('Client-provided discount is not accepted'), 'raw client discount is rejected');
assert(orderService.includes('Client-provided shipping cost is not accepted'), 'raw client shipping cost is rejected');
assert(orderService.includes('merchandiseSubtotal * BUNDLE_DISCOUNT_RATE'), 'merchandise savings are recomputed from server prices');
assert(orderService.includes('BUNDLE_FREE_SHIPPING_THRESHOLD_CZK = 1000'), 'free-shipping threshold is explicit');
assert(orderService.includes('params.shippingCost'), 'shipping savings use selected server-side shipping cost');
assert(orderService.includes('amount: total'), 'payment amount uses final order total');
assert(orderService.includes('buildCentralOrdersPayload'), 'central Orders payload remains in order flow');
assert(orderService.includes('bundleDiscount'), 'bundle metadata is persisted');
assert(!orderService.includes('dto.discount || 0'), 'authenticated checkout no longer trusts raw dto.discount');
assert(!orderService.includes('Math.max(0, Number(dto.discount))'), 'guest checkout no longer trusts raw dto.discount');

assert(guestDto.includes('bundleIntent'), 'guest order DTO accepts bundle intent');
assert(authDto.includes('bundleIntent'), 'authenticated order DTO accepts bundle intent');
assert(guestCart.includes('BUNDLE_INTENT_KEY'), 'frontend stores bundle intent separately from cart item prices');
assert(guestCart.includes('getGuestBundleIntentForProductIds'), 'frontend validates bundle intent against cart product ids before submit');
assert(bundleButton.includes('setGuestBundleIntent'), 'bundle button stores bundle intent');
assert(bundleButton.includes('estimatedSavings'), 'bundle button stores display-only estimated savings');
assert(bundleButton.includes('catalogCandidateId'), 'bundle button stores Catalog candidate provenance when present');
assert(productPage.includes('sourceProductId={product.id}'), 'product detail passes source product id');
assert(checkoutPage.includes('bundleIntent: bundleIntent ?'), 'checkout submits bundle intent identifiers');
assert(checkoutPage.includes('catalogCandidateId: bundleIntent.catalogCandidateId'), 'checkout submits Catalog candidate id as identifier only');
assert(orderService.includes('getCatalogBundleCandidateTargetIds'), 'order-service revalidates Catalog candidate id server-side');
assert(orderService.includes('Catalog bundle candidate does not match checkout products'), 'order-service rejects mismatched Catalog candidate products');
assert(checkoutPage.includes('cartApi.getCart'), 'checkout preserves authenticated cart loading');
assert(checkoutPage.includes('clearGuestBundleIntent'), 'checkout clears bundle intent after successful order');
assert(checkoutPage.includes('Setová úspora'), 'checkout renders CZK savings copy');
assert(!checkoutPage.includes('5%'), 'checkout does not show percentage copy');
assert(ordersApi.includes('BundleIntentData'), 'frontend order API types include bundle intent');

console.log('GOAL-13 product-detail bundle discount verifier passed');
