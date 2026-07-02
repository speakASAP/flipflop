#!/usr/bin/env node

const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const repoRoot = path.resolve(__dirname, '..');

process.env.TS_NODE_TRANSPILE_ONLY = 'true';
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
});

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFlipFlopShared(request, parent, isMain, options) {
  if (request === '@flipflop/shared') {
    return path.join(repoRoot, 'shared', 'index.ts');
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require('ts-node/register/transpile-only');
require('reflect-metadata');

const {
  catalogProductQualityBlockedReasons,
  isNonBlockingEanQualityIssue,
  normalizeCatalogProductQualityStatus,
} = require('../services/product-service/src/products/catalog-product-quality.policy');
const { ProductsService } = require('../services/product-service/src/products/products.service');

const now = new Date('2026-07-03T00:00:00.000Z');
const catalogIds = {
  ready: '10000000-0000-4000-8000-000000000001',
  blocked: '10000000-0000-4000-8000-000000000002',
  qualityUnavailable: '10000000-0000-4000-8000-000000000003',
  eanOptional: '10000000-0000-4000-8000-000000000004',
};

function verifyPolicyNormalizer() {
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
}

function catalogProduct(id, sku, extra = {}) {
  return {
    id,
    sku,
    title: `${sku} Catalog product`,
    description: `${sku} product description`,
    price: 199,
    isActive: true,
    lifecycle: 'active',
    media: [{ type: 'image', url: `https://img.example/${sku}.jpg` }],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...extra,
  };
}

function localProduct(id, catalogProductId, sku, isActive = true) {
  return {
    id,
    catalogProductId,
    sku,
    name: `${sku} Local product`,
    description: `${sku} local description`,
    price: 199,
    stockQuantity: 8,
    trackInventory: true,
    isActive,
    createdAt: now,
    updatedAt: now,
    product_categories: [],
    product_variants: [],
  };
}

const catalogProducts = {
  [catalogIds.ready]: catalogProduct(catalogIds.ready, 'READY'),
  [catalogIds.blocked]: catalogProduct(catalogIds.blocked, 'BLOCKED'),
  [catalogIds.qualityUnavailable]: catalogProduct(catalogIds.qualityUnavailable, 'QUALITY-UNAVAILABLE'),
  [catalogIds.eanOptional]: catalogProduct(catalogIds.eanOptional, 'EAN-OPTIONAL'),
};

const qualityItems = {
  [catalogIds.ready]: {
    productId: catalogIds.ready,
    canActivate: true,
    blockingIssues: [],
    optionalOpportunities: [],
    nextAction: 'ready_for_activation',
  },
  [catalogIds.blocked]: {
    productId: catalogIds.blocked,
    canActivate: false,
    blockingIssues: [
      { code: 'missing_sku', field: 'sku', severity: 'blocking', message: 'SKU is required.' },
      { code: 'missing_description', field: 'description', severity: 'blocking' },
    ],
    optionalOpportunities: [],
    nextAction: 'resolve_catalog_quality_blockers',
  },
  [catalogIds.eanOptional]: {
    productId: catalogIds.eanOptional,
    canActivate: true,
    blockingIssues: [
      { code: 'missing_ean', field: 'ean', severity: 'blocking' },
    ],
    optionalOpportunities: [
      { code: 'missing_brand', field: 'brand', severity: 'warning' },
    ],
    nextAction: 'ready_for_activation',
  },
};

function matchesWhere(row, where = {}) {
  if (where.AND) return where.AND.every((part) => matchesWhere(row, part));
  if (where.OR) return where.OR.some((part) => matchesWhere(row, part));
  if (where.id !== undefined) {
    if (typeof where.id === 'object' && where.id.in && !where.id.in.includes(row.id)) return false;
    if (typeof where.id === 'object' && where.id.notIn && where.id.notIn.includes(row.id)) return false;
    if (typeof where.id !== 'object' && row.id !== where.id) return false;
  }
  if (where.catalogProductId !== undefined) {
    if (where.catalogProductId && typeof where.catalogProductId === 'object') {
      if ('not' in where.catalogProductId && row.catalogProductId === where.catalogProductId.not) return false;
      if (where.catalogProductId.in && !where.catalogProductId.in.includes(row.catalogProductId)) return false;
    } else if (row.catalogProductId !== where.catalogProductId) {
      return false;
    }
  }
  if (where.isActive !== undefined && row.isActive !== where.isActive) return false;
  if (where.stockQuantity?.gt !== undefined && !(Number(row.stockQuantity || 0) > where.stockQuantity.gt)) return false;
  return true;
}

function project(row, select) {
  if (!select) return { ...row };
  return Object.fromEntries(Object.keys(select).map((key) => [key, row[key]]));
}

function createPrismaFixture() {
  const products = [
    localProduct('local-ready', catalogIds.ready, 'READY'),
    localProduct('local-blocked', catalogIds.blocked, 'BLOCKED'),
    localProduct('local-quality-unavailable', catalogIds.qualityUnavailable, 'QUALITY-UNAVAILABLE'),
    localProduct('local-ean-optional', catalogIds.eanOptional, 'EAN-OPTIONAL'),
  ];
  const publishAttempts = [];
  const reconciliationAttempts = new Map();
  const createdProducts = [];
  let productUpdateCount = 0;

  const prisma = {
    product: {
      findMany: async ({ where = {}, select, take } = {}) => {
        const rows = products.filter((row) => matchesWhere(row, where)).sort((a, b) => a.id.localeCompare(b.id));
        return rows.slice(0, take || rows.length).map((row) => project(row, select));
      },
      findFirst: async ({ where = {}, select } = {}) => {
        const row = products.find((candidate) => matchesWhere(candidate, where));
        return row ? project(row, select) : null;
      },
      create: async ({ data }) => {
        createdProducts.push(data);
        const row = { id: `created-${createdProducts.length}`, ...data };
        products.push(row);
        return row;
      },
      update: async ({ where, data, select }) => {
        const row = products.find((candidate) => candidate.id === where.id);
        if (!row) throw new Error(`Missing product ${where.id}`);
        Object.assign(row, data);
        productUpdateCount += 1;
        return project(row, select);
      },
    },
    $executeRawUnsafe: async (sql, ...params) => {
      if (sql.includes('CREATE TABLE') || sql.includes('CREATE UNIQUE INDEX') || sql.includes('CREATE INDEX')) {
        return undefined;
      }
      if (sql.includes('INSERT INTO "flipflop_catalog_publish_attempts"')) {
        publishAttempts.push({
          status: params[0],
          catalogProductId: params[1],
          flipflopProductId: params[2],
          idempotencyKey: params[3],
          requestPayload: params[4],
          policySnapshot: params[5],
          blockedReasons: params[6],
          resultSnapshot: params[7],
          actorSnapshot: params[8],
          createdAt: new Date(publishAttempts.length + 1).toISOString(),
        });
        return undefined;
      }
      if (sql.includes('UPDATE "flipflop_offer_reconciliation_attempts" SET')) {
        const id = params[8];
        const row = Array.from(reconciliationAttempts.values()).find((candidate) => candidate.id === id);
        if (!row) throw new Error(`Missing reconciliation attempt ${id}`);
        Object.assign(row, {
          status: params[0],
          matchedProductCount: params[3] ?? row.matchedProductCount,
          blockedReasons: params[4] ?? row.blockedReasons,
          resultSnapshot: params[5] ?? row.resultSnapshot,
          failureContext: params[6] ?? row.failureContext,
          remediationContext: params[7] ?? row.remediationContext,
        });
        return undefined;
      }
      throw new Error(`Unexpected raw execute: ${sql}`);
    },
    $queryRawUnsafe: async (sql, ...params) => {
      if (sql.includes('SELECT * FROM "flipflop_catalog_publish_attempts"')) {
        return publishAttempts
          .filter((attempt) => attempt.catalogProductId === params[0])
          .slice()
          .reverse()
          .slice(0, 1);
      }
      if (sql.includes('INSERT INTO "flipflop_offer_reconciliation_attempts"')) {
        const existing = reconciliationAttempts.get(params[1]);
        if (existing) return [existing];
        const row = {
          id: `20000000-0000-4000-8000-${String(reconciliationAttempts.size + 1).padStart(12, '0')}`,
          status: params[0],
          idempotencyKey: params[1],
          requestedBy: params[2],
          requestId: params[3],
          matchedProductCount: params[4],
          requestPayload: params[5],
          policySnapshot: params[6],
        };
        reconciliationAttempts.set(row.idempotencyKey, row);
        return [row];
      }
      throw new Error(`Unexpected raw query: ${sql}`);
    },
    _state: {
      products,
      publishAttempts,
      reconciliationAttempts,
      createdProducts,
      productUpdateCount: () => productUpdateCount,
    },
  };

  return prisma;
}

function createCatalogClient() {
  return {
    getProductById: async (id) => {
      const product = catalogProducts[id];
      if (!product) throw new Error(`Catalog product not found: ${id}`);
      return product;
    },
    getProductQualityReview: async (query = {}) => {
      const search = String(query.search || '').trim().toLowerCase();
      if (search.includes('quality-unavailable')) {
        throw new Error('Catalog quality review unavailable: 503');
      }
      const items = Object.values(qualityItems).filter((item) => {
        if (!search) return true;
        const product = catalogProducts[item.productId];
        return [product?.id, product?.sku, product?.title]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      });
      return {
        policyId: 'catalog.product_quality.v1',
        blockers: [],
        items,
        total: items.length,
        page: 1,
        limit: query.limit || items.length,
      };
    },
    getCategories: async () => [],
  };
}

function createService() {
  const prisma = createPrismaFixture();
  const logger = {
    log: async () => undefined,
    warn: async () => undefined,
    error: async () => undefined,
  };
  const catalogClient = createCatalogClient();
  const warehouseClient = {
    getTotalAvailable: async (id) => {
      if (id in catalogProducts) return 5;
      throw new Error(`Warehouse product not found: ${id}`);
    },
  };
  const httpService = {
    axiosRef: {
      get: async () => ({
        data: {
          data: Object.values(catalogProducts),
          pagination: { total: Object.keys(catalogProducts).length, page: 1, limit: 20 },
        },
      }),
    },
  };

  return {
    service: new ProductsService(prisma, logger, {}, catalogClient, warehouseClient, httpService),
    prisma,
  };
}

async function verifySelectionSurfacesQuality() {
  const { service } = createService();
  const selection = await service.getProducts({
    source: 'catalog',
    catalogScope: 'effective',
    authorizationHeader: 'Bearer verification-token',
    limit: 20,
  });
  const byId = new Map(selection.items.map((item) => [item.catalogProductId, item]));

  assert.equal(byId.get(catalogIds.ready).quality.blocked, false);
  assert.equal(byId.get(catalogIds.eanOptional).quality.blocked, false, 'EAN-only issues must stay non-blocking');
  assert.equal(byId.get(catalogIds.blocked).quality.blocked, true);
  assert.deepEqual(
    byId.get(catalogIds.blocked).quality.mandatoryBlockers.map((issue) => issue.code).sort(),
    ['missing_description', 'missing_sku'],
  );
  assert.equal(byId.get(catalogIds.qualityUnavailable).quality.failedClosed, true);
  assert.equal(byId.get(catalogIds.qualityUnavailable).quality.lookupFailed, true);
}

async function verifyOfferListingFailsClosed() {
  const { service } = createService();
  const offers = await service.getProducts({ limit: 20 });
  assert.deepEqual(
    offers.items.map((item) => item.catalogProductId).sort(),
    [catalogIds.eanOptional, catalogIds.ready].sort(),
  );
}

async function verifyPublishAndStatusFailClosed() {
  const { service, prisma } = createService();
  const result = await service.publishCatalogProductsFromCatalog({
    productIds: [catalogIds.blocked, catalogIds.qualityUnavailable, catalogIds.eanOptional],
    dryRun: true,
    requestedBy: 'verification',
    requestId: 'quality-blocker-verification',
  });
  const byId = new Map(result.results.map((item) => [item.catalogProductId, item]));

  assert.equal(byId.get(catalogIds.blocked).blocked, true);
  assert.equal(byId.get(catalogIds.blocked).reason, 'missing_sku');
  assert.equal(byId.get(catalogIds.qualityUnavailable).blocked, true);
  assert.equal(byId.get(catalogIds.qualityUnavailable).reason, 'catalog_quality_review_unavailable');
  assert.equal(byId.get(catalogIds.eanOptional).success, true);
  assert.equal(byId.get(catalogIds.eanOptional).status, 'dry_run');
  assert.equal(prisma._state.createdProducts.length, 0, 'blocked/dry-run publish must not mutate storefront products');

  const blockedStatus = await service.getCatalogPublishStatus(catalogIds.blocked);
  assert.equal(blockedStatus.blocked, true);
  assert(blockedStatus.blockedReasons.some((reason) => reason.reason === 'missing_sku'));

  const unavailableStatus = await service.getCatalogPublishStatus(catalogIds.qualityUnavailable);
  assert.equal(unavailableStatus.blocked, true);
  assert(unavailableStatus.blockedReasons.some((reason) => reason.reason === 'catalog_quality_review_unavailable'));
}

async function verifyReconciliationDisablesQualityBlockedOffers() {
  const { service, prisma } = createService();
  const result = await service.reconcileCatalogLinkedOffers({ requestedBy: 'verification', requestId: 'quality-reconciliation' });

  assert.equal(result.success, true);
  assert(result.results.some((item) => item.catalogProductId === catalogIds.blocked && item.action === 'disable_local_offer'));
  assert(result.results.some((item) => item.catalogProductId === catalogIds.qualityUnavailable && item.action === 'disable_local_offer'));
  assert.equal(prisma._state.products.find((item) => item.catalogProductId === catalogIds.blocked).isActive, false);
  assert.equal(prisma._state.products.find((item) => item.catalogProductId === catalogIds.qualityUnavailable).isActive, false);
  assert.equal(prisma._state.products.find((item) => item.catalogProductId === catalogIds.eanOptional).isActive, true);
}

(async () => {
  verifyPolicyNormalizer();
  await verifySelectionSurfacesQuality();
  await verifyOfferListingFailsClosed();
  await verifyPublishAndStatusFailClosed();
  await verifyReconciliationDisablesQualityBlockedOffers();
  console.log('PASS Catalog product quality blocker policy and product-service fail-closed verification');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
