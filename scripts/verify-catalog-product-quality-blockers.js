#!/usr/bin/env node

require('ts-node/register/transpile-only');
const assert = require('node:assert/strict');

const {
  catalogProductQualityBlockedReasons,
  isNonBlockingEanQualityIssue,
  normalizeCatalogProductQualityStatus,
} = require('../services/product-service/src/products/catalog-product-quality.policy');

const blocked = normalizeCatalogProductQualityStatus({
  policyId: 'catalog.product_quality.v1',
  item: {
    productId: 'product-blocked',
    canActivate: false,
    blockingIssues: [
      { code: 'missing_sku', field: 'sku', severity: 'blocking', message: 'SKU is missing.' },
      { code: 'missing_description', field: 'description', severity: 'blocking' },
      { code: 'missing_ean', field: 'ean', severity: 'warning' },
    ],
    optionalOpportunities: [
      { code: 'missing_brand', field: 'brand', severity: 'warning' },
    ],
    nextAction: 'resolve_blockers:sku,description',
  },
});

assert.equal(blocked.blocked, true);
assert.equal(blocked.failedClosed, false);
assert.deepEqual(
  blocked.mandatoryBlockers.map((issue) => issue.code).sort(),
  ['missing_description', 'missing_sku'],
);
assert.equal(catalogProductQualityBlockedReasons(blocked)[0].reason, 'missing_sku');

const readyWithOptionalEan = normalizeCatalogProductQualityStatus({
  item: {
    productId: 'product-ready-ean-optional',
    canActivate: true,
    blockingIssues: [
      { code: 'missing_ean', field: 'ean', severity: 'blocking' },
    ],
    optionalOpportunities: [
      { code: 'missing_ean', field: 'ean', severity: 'warning' },
    ],
  },
});

assert.equal(isNonBlockingEanQualityIssue({ code: 'missing_ean', field: 'ean' }), true);
assert.equal(readyWithOptionalEan.blocked, false);
assert.deepEqual(readyWithOptionalEan.mandatoryBlockers, []);
assert.deepEqual(catalogProductQualityBlockedReasons(readyWithOptionalEan), []);

const failedClosed = normalizeCatalogProductQualityStatus({
  productId: 'product-quality-missing',
  lookupError: 'Catalog quality review lookup failed: 503',
});

assert.equal(failedClosed.blocked, true);
assert.equal(failedClosed.failedClosed, true);
assert.equal(failedClosed.lookupFailed, true);
assert.equal(catalogProductQualityBlockedReasons(failedClosed)[0].reason, 'catalog_quality_review_unavailable');

console.log('PASS Catalog product quality blocker policy verification');
