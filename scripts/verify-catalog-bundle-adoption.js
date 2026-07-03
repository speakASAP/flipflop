#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const read = (path) => fs.readFileSync(path, 'utf8');

const catalogClient = read('shared/clients/catalog-client.service.ts');
const productService = read('services/product-service/src/products/products.service.ts');
const productsApi = read('services/frontend/lib/api/products.ts');
const productPage = read('services/frontend/app/products/[id]/page.tsx');
const bundleButton = read('services/frontend/components/AddBundleToCartButton.tsx');
const checkoutPage = read('services/frontend/app/checkout/page.tsx');
const orderService = read('services/order-service/src/orders/orders.service.ts');
const goal = read('implementation-goals/GOAL-24-catalog-bundle-adoption.md');

assert(catalogClient.includes('CatalogBundleAggregate'), 'Catalog client declares catalog.bundle.v1 aggregate types');
assert(catalogClient.includes('/api/bundles'), 'Catalog client reads Catalog bundle aggregate list endpoint');
assert(catalogClient.includes("status', query.status"), 'Catalog aggregate read supports status filter');
assert(catalogClient.includes("channel', query.channel"), 'Catalog aggregate read supports channel filter');
assert(catalogClient.includes("productId', query.productId"), 'Catalog aggregate read supports productId filter');

assert(productService.includes('getCatalogBundleAggregateForDisplay'), 'product-service attempts Catalog aggregate display read');
assert(productService.includes("status: 'active'"), 'product-service reads active bundles only');
assert(productService.includes("channel: 'flipflop'"), 'product-service scopes aggregate reads to FlipFlop channel');
assert(productService.includes("contractVersion === 'catalog.bundle.v1'"), 'product-service validates catalog.bundle.v1');
assert(productService.includes("pricePolicy === 'checkout_authoritative'"), 'product-service requires checkout_authoritative price policy');
assert(productService.includes('Catalog bundle aggregate contains a component that is not a current FlipFlop sellable offer'), 'product-service fails closed when aggregate components are not sellable FlipFlop offers');
assert(productService.includes('[MISSING: owner-approved Catalog bundle aggregate runtime read for FlipFlop]'), 'product-service records dependency-gated runtime blocker');
assert(productService.includes('checkout: {\n        enabled: false'), 'product-service marks aggregate checkout disabled');
assert(productService.includes('catalog_bundle_aggregate_display_then_order_affinity_candidate_then_purchase_history_then_category_fallback'), 'recommendation policy records aggregate-first display precedence');

assert(productsApi.includes('ProductRecommendationCatalogBundle'), 'frontend API types expose display-only Catalog bundle');
assert(productPage.includes('Bundle ID: {catalogBundle.bundleId}'), 'product detail can display durable Catalog bundleId');
assert(productPage.includes('pouze pro zobrazeni'), 'product detail states Catalog bundleId is display-only');
assert(bundleButton.includes('catalogCandidateId?: string'), 'bundle button still accepts only legacy candidate provenance');
assert(!bundleButton.includes('catalogBundle') && !bundleButton.includes('bundleId'), 'bundle button does not accept durable Catalog bundleId');
assert(checkoutPage.includes('catalogCandidateId: bundleIntent.catalogCandidateId'), 'checkout remains on local bundle intent plus legacy candidate id');
assert(!checkoutPage.includes('bundleId'), 'checkout does not submit durable Catalog bundleId');
assert(!orderService.includes('bundleId'), 'order-service local bundle discount path does not consume durable Catalog bundleId');

assert(goal.includes('Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update'), 'GOAL-24 adoption doc preserves IPS chain');
assert(goal.includes('[RESOLVED: FlipFlop adoption contract for catalog.bundle.v1 read/display before ecosystem checkout]'), 'GOAL-24 doc resolves requested missing contract');
assert(goal.includes('[MISSING: owner-approved Catalog bundle aggregate runtime read for FlipFlop]'), 'GOAL-24 doc keeps runtime blocker explicit');

console.log('verify-catalog-bundle-adoption passed');
