#!/usr/bin/env node

const assert = require('assert');
const path = require('path');
const Module = require('module');

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

const { ProductsService } = require('../services/product-service/src/products/products.service');

const now = new Date('2026-07-02T12:00:00.000Z');

const logger = {
  log: async () => undefined,
  warn: async () => undefined,
  error: async () => undefined,
};

const catalogProducts = {
  'catalog-zero': {
    id: 'catalog-zero',
    sku: 'ZERO',
    title: 'Zero stock truth',
    isActive: true,
  },
  'catalog-inactive': {
    id: 'catalog-inactive',
    sku: 'INACTIVE',
    title: 'Inactive catalog truth',
    isActive: false,
  },
  'catalog-nonsellable': {
    id: 'catalog-nonsellable',
    sku: 'NONSELLABLE',
    title: 'Explicit non-sellable truth',
    isActive: true,
    sellable: false,
  },
  'catalog-good': {
    id: 'catalog-good',
    sku: 'GOOD',
    title: 'Sellable truth',
    isActive: true,
  },
};

function product(id, catalogProductId, sku, isActive, stockQuantity) {
  return {
    id,
    catalogProductId,
    sku,
    name: sku,
    isActive,
    stockQuantity,
    trackInventory: true,
    updatedAt: now,
  };
}

function createPrismaFixture() {
  const products = [
    product('local-zero', 'catalog-zero', 'ZERO', true, 8),
    product('local-inactive-catalog', 'catalog-inactive', 'INACTIVE', true, 5),
    product('local-nonsellable', 'catalog-nonsellable', 'NONSELLABLE', true, 4),
    product('local-missing-catalog', 'catalog-missing', 'MISSING', true, 3),
    product('local-good', 'catalog-good', 'GOOD', true, 1),
    product('local-good-disabled', 'catalog-good', 'GOOD-DISABLED', false, 0),
  ];
  const attempts = new Map();
  let updateCount = 0;

  function matchesWhere(row, where = {}) {
    if (where.AND) return where.AND.every((part) => matchesWhere(row, part));
    if (where.OR) return where.OR.some((part) => matchesWhere(row, part));
    if (where.id !== undefined && row.id !== where.id) return false;
    if (where.catalogProductId !== undefined) {
      if (where.catalogProductId && typeof where.catalogProductId === 'object' && 'not' in where.catalogProductId) {
        if (row.catalogProductId === where.catalogProductId.not) return false;
      } else if (row.catalogProductId !== where.catalogProductId) {
        return false;
      }
    }
    if (where.isActive !== undefined && row.isActive !== where.isActive) return false;
    if (where.stockQuantity?.gt !== undefined && !(row.stockQuantity > where.stockQuantity.gt)) return false;
    return true;
  }

  function select(row, projection) {
    if (!projection) return { ...row };
    return Object.fromEntries(Object.keys(projection).map((key) => [key, row[key]]));
  }

  const prisma = {
    product: {
      findMany: async ({ where = {}, select: projection, take } = {}) => {
        const rows = products.filter((row) => matchesWhere(row, where)).sort((a, b) => a.id.localeCompare(b.id));
        return rows.slice(0, take || rows.length).map((row) => select(row, projection));
      },
      update: async ({ where, data, select: projection }) => {
        const row = products.find((candidate) => candidate.id === where.id);
        if (!row) throw new Error(`Missing product ${where.id}`);
        Object.assign(row, data);
        updateCount += 1;
        return select(row, projection);
      },
    },
    $executeRawUnsafe: async (sql, ...params) => {
      if (sql.includes('CREATE TABLE') || sql.includes('CREATE UNIQUE INDEX') || sql.includes('CREATE INDEX')) {
        return undefined;
      }
      if (sql.includes('UPDATE "flipflop_offer_reconciliation_attempts" SET')) {
        const id = params[8];
        const row = Array.from(attempts.values()).find((candidate) => candidate.id === id);
        if (!row) throw new Error(`Missing reconciliation attempt ${id}`);
        Object.assign(row, {
          status: params[0],
          startedAt: params[1] || row.startedAt,
          completedAt: params[2] || row.completedAt,
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
      if (sql.includes('INSERT INTO "flipflop_offer_reconciliation_attempts"')) {
        const existing = attempts.get(params[1]);
        if (existing) {
          Object.assign(existing, {
            status: params[0],
            matchedProductCount: params[4],
            requestPayload: params[5],
            policySnapshot: params[6],
          });
          return [existing];
        }
        const row = {
          id: `10000000-0000-4000-8000-${String(attempts.size + 1).padStart(12, '0')}`,
          status: params[0],
          idempotencyKey: params[1],
          requestedBy: params[2],
          requestId: params[3],
          matchedProductCount: params[4],
          requestPayload: params[5],
          policySnapshot: params[6],
        };
        attempts.set(row.idempotencyKey, row);
        return [row];
      }
      throw new Error(`Unexpected raw query: ${sql}`);
    },
    _state: {
      products,
      attempts,
      updateCount: () => updateCount,
    },
  };

  return prisma;
}

const catalogClient = {
  getProductById: async (id) => {
    if (!catalogProducts[id]) {
      throw new Error(`Catalog product not found: ${id}`);
    }
    return catalogProducts[id];
  },
  searchProducts: async () => ({ items: [], total: 0, page: 1, limit: 20 }),
  getCategories: async () => [],
};

const warehouseClient = {
  getTotalAvailable: async (id) => {
    if (id === 'catalog-zero') return 0;
    if (id === 'catalog-inactive') return 6;
    if (id === 'catalog-nonsellable') return 5;
    if (id === 'catalog-good') return 9;
    throw new Error(`Warehouse product not found: ${id}`);
  },
};

function byId(prisma, id) {
  return prisma._state.products.find((product) => product.id === id);
}

async function verifyReconciliationDisablesAndIsIdempotent() {
  const prisma = createPrismaFixture();
  const service = new ProductsService(prisma, logger, {}, catalogClient, warehouseClient);

  const first = await service.reconcileCatalogLinkedOffers({ requestId: 'reconciliation-test-1', requestedBy: 'verification' });
  assert.strictEqual(first.success, true);
  assert.strictEqual(first.totals.checked, 6);
  assert.strictEqual(first.totals.sellable, 2);
  assert.strictEqual(first.totals.nonSellable, 4);
  assert.strictEqual(first.totals.updated, 4);
  assert(first.blockers.includes('[MISSING: safe FlipFlop catalog-event refresh policy]'));

  assert.strictEqual(byId(prisma, 'local-zero').isActive, false);
  assert.strictEqual(byId(prisma, 'local-zero').stockQuantity, 0);
  assert.strictEqual(byId(prisma, 'local-inactive-catalog').isActive, false);
  assert.strictEqual(byId(prisma, 'local-inactive-catalog').stockQuantity, 5);
  assert.strictEqual(byId(prisma, 'local-nonsellable').isActive, false);
  assert.strictEqual(byId(prisma, 'local-missing-catalog').isActive, false);
  assert.strictEqual(byId(prisma, 'local-good').isActive, true);
  assert.strictEqual(byId(prisma, 'local-good').stockQuantity, 1, 'safe refresh policy must not update positive Warehouse stock');
  assert.strictEqual(byId(prisma, 'local-good-disabled').isActive, false, 'reconciliation must not reactivate products');

  const updateCountAfterFirstRun = prisma._state.updateCount();
  const second = await service.reconcileCatalogLinkedOffers({ requestId: 'reconciliation-test-2', requestedBy: 'verification' });
  assert.strictEqual(second.success, true);
  assert.strictEqual(second.totals.checked, first.totals.checked);
  assert.strictEqual(second.totals.nonSellable, first.totals.nonSellable);
  assert.strictEqual(second.totals.updated, 0);
  assert.strictEqual(prisma._state.updateCount(), updateCountAfterFirstRun);
  assert.strictEqual(byId(prisma, 'local-good-disabled').isActive, false, 'repeat run must not reactivate products');
}

(async () => {
  await verifyReconciliationDisablesAndIsIdempotent();
  console.log('flipflop reconciliation verification ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
