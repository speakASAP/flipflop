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

const { ProductsService } = require('../services/product-service/src/products/products.service');
const { CartService } = require('../services/cart-service/src/cart/cart.service');

const now = new Date('2026-07-02T00:00:00.000Z');

const logger = {
  log: async () => undefined,
  warn: async () => undefined,
  error: async () => undefined,
};

const localProducts = [
  {
    id: 'local-stale',
    catalogProductId: null,
    name: 'Local stale seeded product',
    sku: 'LOCAL-STALE',
    description: 'Local only product must not become an offer.',
    shortDescription: 'Local only',
    price: 99,
    stockQuantity: 99,
    trackInventory: true,
    isActive: true,
    brand: 'FlipFlop',
    mainImageUrl: null,
    imageUrls: [],
    createdAt: now,
    updatedAt: now,
    product_categories: [],
    product_variants: [],
  },
  {
    id: 'local-zero',
    catalogProductId: 'catalog-zero',
    name: 'Zero stock local cache',
    sku: 'ZERO',
    description: 'Catalog-linked but unavailable.',
    shortDescription: 'Zero stock',
    price: 120,
    stockQuantity: 10,
    trackInventory: true,
    isActive: true,
    brand: 'FlipFlop',
    mainImageUrl: null,
    imageUrls: [],
    createdAt: now,
    updatedAt: now,
    product_categories: [],
    product_variants: [],
  },
  {
    id: 'local-inactive-catalog',
    catalogProductId: 'catalog-inactive',
    name: 'Inactive catalog cache',
    sku: 'INACTIVE',
    description: 'Catalog inactive product.',
    shortDescription: 'Inactive',
    price: 130,
    stockQuantity: 10,
    trackInventory: true,
    isActive: true,
    brand: 'FlipFlop',
    mainImageUrl: null,
    imageUrls: [],
    createdAt: now,
    updatedAt: now,
    product_categories: [],
    product_variants: [],
  },
  {
    id: 'local-good',
    catalogProductId: 'catalog-good',
    name: 'Good local cache',
    sku: 'GOOD-LOCAL',
    description: 'Catalog and Warehouse sellable.',
    shortDescription: 'Good',
    price: 150,
    stockQuantity: 1,
    trackInventory: true,
    isActive: true,
    brand: 'FlipFlop',
    mainImageUrl: null,
    imageUrls: [],
    createdAt: now,
    updatedAt: now,
    product_categories: [],
    product_variants: [],
  },
  {
    id: 'local-inactive-local',
    catalogProductId: 'catalog-good',
    name: 'Inactive local cache for a sellable Catalog product',
    sku: 'INACTIVE-LOCAL',
    description: 'Local inactive products must not be public offers even when Catalog and Warehouse are sellable.',
    shortDescription: 'Inactive local',
    price: 150,
    stockQuantity: 99,
    trackInventory: true,
    isActive: false,
    brand: 'FlipFlop',
    mainImageUrl: null,
    imageUrls: [],
    createdAt: now,
    updatedAt: now,
    product_categories: [],
    product_variants: [],
  },
];

const catalogProducts = {
  'catalog-zero': {
    id: 'catalog-zero',
    title: 'Zero stock catalog truth',
    sku: 'ZERO',
    description: 'Available in Catalog but not Warehouse.',
    price: 120,
    isActive: true,
    media: [],
    categories: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  'catalog-inactive': {
    id: 'catalog-inactive',
    title: 'Inactive catalog truth',
    sku: 'INACTIVE',
    description: 'Inactive in Catalog.',
    price: 130,
    isActive: false,
    media: [],
    categories: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  'catalog-good': {
    id: 'catalog-good',
    title: 'Good catalog truth',
    sku: 'GOOD',
    description: 'Active and sellable.',
    price: 150,
    isActive: true,
    media: [],
    categories: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
};

const catalogClient = {
  getProductById: async (id) => {
    if (!catalogProducts[id]) {
      throw new Error(`Catalog product not found: ${id}`);
    }
    return catalogProducts[id];
  },
  searchProducts: async () => ({
    items: Object.values(catalogProducts),
    total: Object.values(catalogProducts).length,
    page: 1,
    limit: 20,
  }),
  getCategories: async () => [],
};

const warehouseClient = {
  getTotalAvailable: async (id) => {
    if (id === 'catalog-good') return 4;
    if (id === 'catalog-zero') return 0;
    if (id === 'catalog-inactive') return 7;
    throw new Error(`Warehouse stock not found: ${id}`);
  },
};

const findLocalProduct = (id) => localProducts.find(
  (product) => product.id === id || product.catalogProductId === id,
);

async function rejectsWithMessage(promise, expectedText) {
  let thrown;
  try {
    await promise;
  } catch (error) {
    thrown = error;
  }

  assert(thrown, `Expected rejection containing: ${expectedText}`);
  assert(
    String(thrown.message || '').includes(expectedText),
    `Expected "${thrown.message}" to include "${expectedText}"`,
  );
}

async function verifyProductOfferGate() {
  const prisma = {
    product: {
      findMany: async ({ where = {} } = {}) => localProducts.filter((product) => {
        const matchesIsActive = where.isActive === undefined || product.isActive === where.isActive;
        const matchesCatalogLink = where.catalogProductId?.not === null ? product.catalogProductId !== null : true;
        return matchesIsActive && matchesCatalogLink;
      }),
      findFirst: async ({ where }) => {
        if (where.catalogProductId !== undefined) {
          return localProducts.find((product) => product.catalogProductId === where.catalogProductId) || null;
        }
        const requested = where.OR.map((candidate) => candidate.id || candidate.catalogProductId);
        return localProducts.find((product) => requested.includes(product.id) || requested.includes(product.catalogProductId));
      },
    },
    $executeRawUnsafe: async () => undefined,
    $queryRawUnsafe: async () => [],
  };

  const service = new ProductsService(prisma, logger, {}, catalogClient, warehouseClient);
  const list = await service.getProducts({ limit: 20 });
  assert.deepStrictEqual(list.items.map((product) => product.id), ['local-good']);
  assert.strictEqual(list.items[0].catalogProductId, 'catalog-good');
  assert.strictEqual(list.items[0].stockQuantity, 4);

  const attemptedLocalList = await service.getProducts({ source: 'local', limit: 20 });
  assert.deepStrictEqual(attemptedLocalList.items.map((product) => product.id), ['local-good']);

  const attemptedInactiveList = await service.getProducts({ isActive: false, limit: 20 });
  assert.deepStrictEqual(attemptedInactiveList.items.map((product) => product.id), ['local-good']);

  const detail = await service.getProduct('local-good');
  assert.strictEqual(detail.id, 'local-good');
  assert.strictEqual(detail.catalogProductId, 'catalog-good');
  assert.strictEqual(detail.stockQuantity, 4);

  const goodStatus = await service.getCatalogPublishStatus('catalog-good');
  assert.strictEqual(goodStatus.status, 'published');
  assert.strictEqual(goodStatus.published, true);
  assert.strictEqual(goodStatus.blocked, false);
  assert.strictEqual(goodStatus.availableStock, 4);

  const zeroStatus = await service.getCatalogPublishStatus('catalog-zero');
  assert.strictEqual(zeroStatus.status, 'blocked');
  assert.strictEqual(zeroStatus.published, false);
  assert.strictEqual(zeroStatus.blocked, true);
  assert(zeroStatus.blockedReasons.some((reason) => reason.reason === 'warehouse_stock_unavailable'));

  const inactiveStatus = await service.getCatalogPublishStatus('catalog-inactive');
  assert.strictEqual(inactiveStatus.status, 'blocked');
  assert.strictEqual(inactiveStatus.published, false);
  assert.strictEqual(inactiveStatus.blocked, true);
  assert(inactiveStatus.blockedReasons.some((reason) => reason.reason === 'inactive_product'));

  await rejectsWithMessage(service.getProduct('local-stale'), 'Product not found');
  await rejectsWithMessage(service.getProduct('local-zero'), 'Product not found');
  await rejectsWithMessage(service.getProduct('local-inactive-catalog'), 'Product not found');
}

async function verifyCartGate() {
  const deletedCartItemIds = [];
  const updatedCartItems = [];
  const cartRows = [
    { id: 'cart-stale', userId: 'user-1', productId: 'local-stale', products: findLocalProduct('local-stale'), quantity: 1, price: 99 },
    { id: 'cart-zero', userId: 'user-1', productId: 'local-zero', products: findLocalProduct('local-zero'), quantity: 1, price: 120 },
    { id: 'cart-overstock', userId: 'user-1', productId: 'local-good', products: findLocalProduct('local-good'), quantity: 9, price: 150 },
    { id: 'cart-good', userId: 'user-1', productId: 'local-good', products: findLocalProduct('local-good'), quantity: 2, price: 150 },
  ];
  const prisma = {
    product: {
      findUnique: async ({ where }) => findLocalProduct(where.id) || null,
    },
    cartItem: {
      findMany: async () => cartRows,
      findFirst: async ({ where }) => {
        if (where.id === 'cart-zero') {
          return { id: 'cart-zero', userId: where.userId, products: findLocalProduct('local-zero') };
        }
        return null;
      },
      create: async () => {
        throw new Error('Cart create should not run in rejection cases');
      },
      update: async ({ where, data }) => {
        const row = cartRows.find((item) => item.id === where.id);
        if (!row) throw new Error(`Unexpected cart update: ${where.id}`);
        const updated = { ...row, quantity: data.quantity };
        updatedCartItems.push(updated);
        return updated;
      },
      delete: async ({ where }) => {
        deletedCartItemIds.push(where.id);
        return { id: where.id };
      },
    },
  };

  const service = new CartService(prisma, logger, warehouseClient, catalogClient);

  await rejectsWithMessage(service.addToCart('user-1', 'local-stale', undefined, 1), 'Product is not available');
  await rejectsWithMessage(service.addToCart('user-1', 'local-zero', undefined, 1), 'Insufficient stock');
  await rejectsWithMessage(service.addToCart('user-1', 'local-inactive-catalog', undefined, 1), 'Product is not available');
  await rejectsWithMessage(service.updateCartItem('user-1', 'cart-zero', 1), 'Insufficient stock');

  const cart = await service.getCart('user-1');
  assert.deepStrictEqual(deletedCartItemIds.sort(), ['cart-stale', 'cart-zero']);
  assert.strictEqual(updatedCartItems.length, 1);
  assert.strictEqual(updatedCartItems[0].id, 'cart-overstock');
  assert.strictEqual(updatedCartItems[0].quantity, 4);
  assert.deepStrictEqual(cart.items.map((item) => [item.id, item.quantity, item.products.stockQuantity]), [
    ['cart-overstock', 4, 4],
    ['cart-good', 2, 4],
  ]);
}

(async () => {
  await verifyProductOfferGate();
  await verifyCartGate();
  console.log('flipflop offer gate verification ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
