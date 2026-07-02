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

const { StockEventsSubscriber } = require('../shared/rabbitmq/stock-events.subscriber');
const { CatalogEventsSubscriber } = require('../shared/rabbitmq/catalog-events.subscriber');

const catalogIds = {
  stockOut: '11111111-1111-4111-8111-111111111111',
  zeroAvailable: '22222222-2222-4222-8222-222222222222',
  archived: '33333333-3333-4333-8333-333333333333',
  deleted: '44444444-4444-4444-8444-444444444444',
  sellabilityFalse: '55555555-5555-4555-8555-555555555555',
  sellableUpdate: '66666666-6666-4666-8666-666666666666',
};

const now = new Date('2026-07-02T10:00:00.000Z');

const logger = {
  log: async () => undefined,
  warn: async () => undefined,
  error: async () => undefined,
};

function createPrismaFixture() {
  const products = [
    product('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', catalogIds.stockOut, 'STOCK-OUT', true, 7),
    product('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', catalogIds.zeroAvailable, 'ZERO-AVAILABLE', true, 5),
    product('cccccccc-cccc-4ccc-8ccc-cccccccccccc', catalogIds.archived, 'ARCHIVED', true, 3),
    product('dddddddd-dddd-4ddd-8ddd-dddddddddddd', catalogIds.deleted, 'DELETED', true, 2),
    product('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', catalogIds.sellabilityFalse, 'SELLABILITY-FALSE', true, 4),
    product('ffffffff-ffff-4fff-8fff-ffffffffffff', catalogIds.sellableUpdate, 'SELLABLE-UPDATE', true, 8),
  ];
  const stockAttempts = new Map();
  const catalogAttempts = new Map();
  let updateCount = 0;

  function findProducts(where = {}) {
    return products.filter((row) => {
      const matchesCatalog = where.catalogProductId === undefined || row.catalogProductId === where.catalogProductId;
      const matchesTrackInventory = where.trackInventory === undefined || row.trackInventory === where.trackInventory;
      return matchesCatalog && matchesTrackInventory;
    });
  }

  function select(row, select) {
    if (!select) return { ...row };
    return Object.fromEntries(Object.keys(select).map((key) => [key, row[key]]));
  }

  const prisma = {
    product: {
      findMany: async ({ where = {}, select: projection } = {}) => findProducts(where).map((row) => select(row, projection)),
      update: async ({ where, data, select: projection }) => {
        const row = products.find((candidate) => candidate.id === where.id);
        if (!row) throw new Error(`Missing product ${where.id}`);
        Object.assign(row, data);
        updateCount += 1;
        return select(row, projection);
      },
    },
    flipflopStockSyncAttempt: {
      findUnique: async ({ where }) => stockAttempts.get(where.idempotencyKey) || null,
      create: async ({ data }) => {
        const row = { id: `stock-attempt-${stockAttempts.size + 1}`, ...data };
        stockAttempts.set(row.idempotencyKey, row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = Array.from(stockAttempts.values()).find((candidate) => candidate.id === where.id);
        if (!row) throw new Error(`Missing stock attempt ${where.id}`);
        Object.assign(row, data);
        return row;
      },
    },
    $queryRawUnsafe: async (sql, ...params) => {
      if (sql.includes('SELECT * FROM "flipflop_catalog_event_attempts" WHERE "idempotencyKey"')) {
        const row = catalogAttempts.get(params[0]);
        return row ? [row] : [];
      }
      if (sql.includes('INSERT INTO "flipflop_catalog_event_attempts"')) {
        const row = {
          id: `10000000-0000-4000-8000-${String(catalogAttempts.size + 1).padStart(12, '0')}`,
          status: params[0],
          idempotencyKey: params[1],
          eventType: params[2],
          eventId: params[3],
          catalogProductId: params[4],
          matchedProductCount: params[5],
          requestPayload: params[6],
          policySnapshot: params[7],
        };
        catalogAttempts.set(row.idempotencyKey, row);
        return [row];
      }
      throw new Error(`Unexpected raw query: ${sql}`);
    },
    $executeRawUnsafe: async (sql, ...params) => {
      if (sql.includes('CREATE TABLE') || sql.includes('CREATE UNIQUE INDEX') || sql.includes('CREATE INDEX')) {
        return undefined;
      }
      if (sql.includes('UPDATE "flipflop_catalog_event_attempts" SET')) {
        const id = params[8];
        const row = Array.from(catalogAttempts.values()).find((candidate) => candidate.id === id);
        if (!row) throw new Error(`Missing catalog attempt ${id}`);
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
    _state: {
      products,
      stockAttempts,
      catalogAttempts,
      updateCount: () => updateCount,
    },
  };

  return prisma;
}

function product(id, catalogProductId, sku, isActive, stockQuantity) {
  return {
    id,
    catalogProductId,
    sku,
    name: sku,
    trackInventory: true,
    isActive,
    stockQuantity,
    updatedAt: now,
  };
}

function productByCatalogId(prisma, catalogProductId) {
  return prisma._state.products.find((row) => row.catalogProductId === catalogProductId);
}

async function verifyWarehouseStockDisablesOffers() {
  const prisma = createPrismaFixture();
  const subscriber = new StockEventsSubscriber(logger, prisma);

  await subscriber.handleStockEvent({
    type: 'stock.out',
    eventId: 'stock-out-1',
    productId: catalogIds.stockOut,
    occurredAt: '2026-07-02T10:01:00.000Z',
  });
  const stockOutProduct = productByCatalogId(prisma, catalogIds.stockOut);
  assert.strictEqual(stockOutProduct.stockQuantity, 0);
  assert.strictEqual(stockOutProduct.isActive, false);

  await subscriber.handleStockEvent({
    type: 'stock.updated',
    eventId: 'stock-zero-1',
    productId: catalogIds.zeroAvailable,
    available: 0,
    occurredAt: '2026-07-02T10:02:00.000Z',
  });
  const zeroAvailableProduct = productByCatalogId(prisma, catalogIds.zeroAvailable);
  assert.strictEqual(zeroAvailableProduct.stockQuantity, 0);
  assert.strictEqual(zeroAvailableProduct.isActive, false);

  const updateCountAfterFirstStockOut = prisma._state.updateCount();
  await subscriber.handleStockEvent({
    type: 'stock.out',
    eventId: 'stock-out-1',
    productId: catalogIds.stockOut,
    occurredAt: '2026-07-02T10:01:00.000Z',
  });
  assert.strictEqual(prisma._state.updateCount(), updateCountAfterFirstStockOut);
}

async function verifyCatalogEventsDisableOffers() {
  const prisma = createPrismaFixture();
  const subscriber = new CatalogEventsSubscriber(logger, prisma);

  await subscriber.handleCatalogEvent({
    type: 'catalog.product.archived.v1',
    eventId: 'archived-1',
    catalogProductId: catalogIds.archived,
    occurredAt: '2026-07-02T10:03:00.000Z',
  });
  assert.strictEqual(productByCatalogId(prisma, catalogIds.archived).isActive, false);

  await subscriber.handleCatalogEvent({
    type: 'catalog.product.deleted.v1',
    eventId: 'deleted-1',
    productId: catalogIds.deleted,
    occurredAt: '2026-07-02T10:04:00.000Z',
  });
  assert.strictEqual(productByCatalogId(prisma, catalogIds.deleted).isActive, false);

  await subscriber.handleCatalogEvent({
    type: 'catalog.product.sellability_changed.v1',
    eventId: 'sellability-false-1',
    product: { id: catalogIds.sellabilityFalse, isSellable: false, updatedAt: '2026-07-02T10:05:00.000Z' },
  });
  assert.strictEqual(productByCatalogId(prisma, catalogIds.sellabilityFalse).isActive, false);

  const updateCountBeforeSellableEvent = prisma._state.updateCount();
  await subscriber.handleCatalogEvent({
    type: 'catalog.product.updated.v1',
    eventId: 'sellable-update-1',
    product: { id: catalogIds.sellableUpdate, isSellable: true, updatedAt: '2026-07-02T10:06:00.000Z' },
  });
  assert.strictEqual(productByCatalogId(prisma, catalogIds.sellableUpdate).isActive, true);
  assert.strictEqual(prisma._state.updateCount(), updateCountBeforeSellableEvent);

  const sellableAttempt = Array.from(prisma._state.catalogAttempts.values()).find((attempt) => attempt.eventId === 'sellable-update-1');
  assert(sellableAttempt, 'Expected safe-refresh blocker attempt');
  assert.strictEqual(sellableAttempt.status, 'BLOCKED');
  assert(String(sellableAttempt.blockedReasons).includes('[MISSING: safe FlipFlop catalog-event refresh policy]'));
}

(async () => {
  await verifyWarehouseStockDisablesOffers();
  await verifyCatalogEventsDisableOffers();
  console.log('flipflop proactive consumer verification ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
