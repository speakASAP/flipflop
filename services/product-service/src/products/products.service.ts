/**
 * Products Service
 * Handles product catalog operations
 */

import { HttpService } from '@nestjs/axios';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService, LoggerService, CatalogClientService, WarehouseClientService } from '@flipflop/shared';
import { WarehouseService } from './warehouse.service';
import {
  type CatalogProductQualityStatus,
  catalogProductQualityBlockedReasons,
  normalizeCatalogProductQualityStatus,
} from './catalog-product-quality.policy';

type FlipFlopBulkPublishRequest = {
  productIds?: string[];
  requestedBy?: string;
  requestId?: string;
  dryRun?: boolean;
};

type FlipFlopPublishActor = {
  id?: string | null;
  email?: string | null;
  roles?: string[];
  authorizationHeader?: string | null;
};

type FlipFlopPublishResult = {
  catalogProductId: string;
  productId: string;
  marketplace: 'flipflop';
  success: boolean;
  blocked: boolean;
  status: 'published' | 'blocked' | 'failed' | 'dry_run';
  action: 'publish_flipflop_listing';
  authority: 'flipflop';
  listingUrl: string;
  flipflopProductId?: string | null;
  reason?: string | null;
  message: string;
  nextAction: string;
  availableStock?: number;
  quality?: CatalogProductQualityStatus;
  blockedReasons?: Array<Record<string, any>>;
  attempt?: Record<string, any>;
  dependencyStatus?: number | null;
  dependencyMessage?: string | null;
};

type FlipFlopOfferReconciliationRequest = {
  productIds?: string[];
  requestedBy?: string;
  requestId?: string;
  dryRun?: boolean;
  limit?: number;
};

type FlipFlopOfferReconciliationAttemptRow = {
  id: string;
  status: string;
  idempotencyKey: string;
};

type FlipFlopOfferReconciliationProduct = {
  id: string;
  catalogProductId: string | null;
  sku?: string | null;
  name?: string | null;
  isActive: boolean;
  stockQuantity?: number | null;
  trackInventory?: boolean | null;
  updatedAt?: Date | string | null;
};

type ProductRecommendationSource = 'catalog_order_affinity' | 'purchase_history' | 'related_fallback';

type ProductRecommendationBundle = {
  source: ProductRecommendationSource;
  products: any[];
  subtotal: number;
  bundlePrice: number;
  merchandiseSavings: number;
  shippingSavings: number;
  totalSavings: number;
  freeShippingThreshold: number;
  assumedShippingCost: number;
};

const FREE_SHIPPING_THRESHOLD_CZK = 1000;
const DEFAULT_SHIPPING_COST_CZK = 89;

@Injectable()
export class ProductsService {
  private normalizeCategoryToken(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private getCatalogPrice(product: any): number {
    const pricingRows = Array.isArray(product.pricing)
      ? product.pricing
      : product.pricing
        ? [product.pricing]
        : [];
    const activePrice = pricingRows.find((row: any) => row?.isActive !== false) || pricingRows[0];
    const rawPrice =
      product.currentPrice?.salePrice ??
      product.currentPrice?.basePrice ??
      activePrice?.salePrice ??
      activePrice?.basePrice ??
      product.salePrice ??
      product.price ??
      0;
    const price = Number(rawPrice);

    return Number.isFinite(price) ? price : 0;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly warehouseService: WarehouseService,
    private readonly catalogClient: CatalogClientService,
    private readonly warehouseClient: WarehouseClientService,
    private readonly httpService: HttpService,
  ) {}

  private async getLocalStorefrontProducts(filters: any) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(filters.limit) || 20));
    const search = typeof filters.search === 'string' ? filters.search.trim().toLowerCase() : '';
    const isActive =
      filters.isActive === undefined
        ? true
        : !['false', '0'].includes(String(filters.isActive).toLowerCase());

    const rows = await this.prisma.product.findMany({
      where: { isActive },
      include: {
        product_categories: {
          include: {
            categories: true,
          },
        },
        product_variants: true,
      },
      orderBy: [
        { stockQuantity: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    const searched = search
      ? rows.filter((product: any) =>
          [
            product.name,
            product.sku,
            product.description,
            product.shortDescription,
            product.brand,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(search),
        )
      : rows;

    const items = searched
      .map((product: any) => this.mapProduct(product))
      .sort((a: any, b: any) => {
        const aStock = Number(a.stockQuantity || a.warehouse?.stockQuantity || 0);
        const bStock = Number(b.stockQuantity || b.warehouse?.stockQuantity || 0);
        return bStock - aStock;
      });
    const start = (page - 1) * limit;
    const pagedItems = items.slice(start, start + limit);
    const totalPages = Math.ceil(items.length / limit);

    return {
      items: pagedItems,
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  private async getCatalogLinkedStorefrontProducts(filters: any) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(filters.limit) || 20));
    const search = typeof filters.search === 'string' ? filters.search.trim().toLowerCase() : '';
    const rows = await this.prisma.product.findMany({
      where: {
        isActive: true,
        catalogProductId: { not: null },
      },
      include: {
        product_categories: {
          include: {
            categories: true,
          },
        },
        product_variants: true,
      },
      orderBy: [
        { stockQuantity: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    const searched = search
      ? rows.filter((product: any) =>
          [
            product.name,
            product.sku,
            product.description,
            product.shortDescription,
            product.brand,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(search),
        )
      : rows;

    const offerItems = await Promise.all(
      searched.map((product: any) => this.catalogLinkedProductToOffer(product)),
    );
    const items = offerItems
      .filter(Boolean)
      .sort((a: any, b: any) => Number(b.stockQuantity || 0) - Number(a.stockQuantity || 0));
    const start = (page - 1) * limit;
    const pagedItems = items.slice(start, start + limit);
    const totalPages = Math.ceil(items.length / limit);

    return {
      items: pagedItems,
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async reconcileCatalogLinkedOffers(input: FlipFlopOfferReconciliationRequest = {}) {
    await this.ensureOfferReconciliationAttemptTable();

    const requestedProductIds = this.normalizePublishProductIds(input.productIds || []);
    const limit = Math.max(
      1,
      Math.min(
        1000,
        Number(input.limit) || Number(process.env.FLIPFLOP_OFFER_RECONCILIATION_LIMIT) || 500,
      ),
    );
    const where: any = { catalogProductId: { not: null } };
    if (requestedProductIds.length > 0) {
      where.OR = requestedProductIds.flatMap((id) => ([
        { id },
        { catalogProductId: id },
      ]));
    }

    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        catalogProductId: true,
        sku: true,
        name: true,
        isActive: true,
        stockQuantity: true,
        trackInventory: true,
        updatedAt: true,
      },
      orderBy: { id: 'asc' },
      take: limit,
    }) as FlipFlopOfferReconciliationProduct[];

    const attempt = await this.createOfferReconciliationAttempt(input, products);
    await this.updateOfferReconciliationAttempt(attempt.id, { status: 'RUNNING', startedAt: new Date() });

    const dryRun = Boolean(input.dryRun);
    const results: any[] = [];
    const blockers = ['[MISSING: safe FlipFlop catalog-event refresh policy]'];

    for (const product of products) {
      const localBefore = this.localOfferStateSnapshot(product);
      const item: any = {
        productId: product.id,
        catalogProductId: product.catalogProductId,
        sku: product.sku || null,
        localBefore,
        catalogState: { found: false },
        warehouseAvailable: null,
        blockedReasons: [],
        action: 'kept_sellable',
        updated: false,
      };

      try {
        if (!product.catalogProductId) {
          item.action = 'skipped_unlinked';
          results.push(item);
          continue;
        }

        let catalogProduct: any = null;
        try {
          catalogProduct = await this.catalogClient.getProductById(product.catalogProductId);
          item.catalogState = this.catalogStateSnapshot(catalogProduct);
          item.blockedReasons.push(...this.catalogLifecycleBlockedReasons(catalogProduct));
          item.blockedReasons.push(...this.catalogSellabilityBlockedReasons(catalogProduct));
          item.catalogQuality = await this.catalogProductQualityStatus(catalogProduct);
          item.blockedReasons.push(...this.catalogQualityBlockedReasons(item.catalogQuality));
        } catch (error: any) {
          item.blockedReasons.push({
            reason: 'catalog_product_missing',
            message: `Catalog product lookup failed or returned missing for ${product.catalogProductId}: ${error?.message || 'unknown error'}`,
          });
          item.catalogState = {
            found: false,
            lookupError: error?.message || 'unknown error',
          };
        }

        if (catalogProduct?.id) {
          try {
            const availableStock = this.toNonNegativeInteger(await this.warehouseClient.getTotalAvailable(catalogProduct.id));
            item.warehouseAvailable = availableStock;
            if (availableStock <= 0) {
              item.blockedReasons.push({
                reason: 'warehouse_stock_unavailable',
                message: 'Warehouse total available is zero for this Catalog product.',
              });
            }
          } catch (error: any) {
            item.warehouseLookupError = error?.message || 'unknown error';
          }
        }

        const shouldDisable = item.blockedReasons.length > 0;
        if (!shouldDisable) {
          if (item.warehouseLookupError) {
            item.action = 'failed_dependency_lookup';
            item.failed = true;
            item.blockedReasons.push({
              reason: 'warehouse_stock_lookup_failed',
              message: `Warehouse total available lookup failed: ${item.warehouseLookupError}`,
            });
          }
          results.push(item);
          continue;
        }

        const disableData: Record<string, any> = {};
        const warehouseZero = item.blockedReasons.some((reason: any) => reason.reason === 'warehouse_stock_unavailable');
        if (product.isActive !== false) {
          disableData.isActive = false;
        }
        if (warehouseZero && Number(product.stockQuantity || 0) !== 0) {
          disableData.stockQuantity = 0;
        }

        if (Object.keys(disableData).length === 0) {
          item.action = 'already_disabled';
          item.localAfter = localBefore;
          results.push(item);
          continue;
        }

        item.localAfter = {
          ...localBefore,
          ...disableData,
        };

        if (dryRun) {
          item.action = 'dry_run_disable_local_offer';
          results.push(item);
          continue;
        }

        const updated = await this.prisma.product.update({
          where: { id: product.id },
          data: {
            ...disableData,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            catalogProductId: true,
            sku: true,
            isActive: true,
            stockQuantity: true,
            updatedAt: true,
          },
        });
        item.action = 'disable_local_offer';
        item.updated = true;
        item.localAfter = this.localOfferStateSnapshot(updated);
        results.push(item);
      } catch (error: any) {
        results.push({
          ...item,
          action: 'failed',
          failed: true,
          failureMessage: error?.message || 'unknown error',
        });
      }
    }

    const totals = {
      checked: products.length,
      sellable: results.filter((item) => item.action === 'kept_sellable').length,
      nonSellable: results.filter((item) => item.blockedReasons?.length > 0 && !item.failed).length,
      updated: results.filter((item) => item.updated).length,
      alreadyDisabled: results.filter((item) => item.action === 'already_disabled').length,
      dryRun: results.filter((item) => item.action === 'dry_run_disable_local_offer').length,
      failed: results.filter((item) => item.failed).length,
      skipped: results.filter((item) => String(item.action || '').startsWith('skipped')).length,
    };
    const status = totals.failed > 0 ? (totals.updated > 0 ? 'PARTIAL' : 'FAILED') : 'SUCCEEDED';
    const response = {
      success: totals.failed === 0,
      action: 'reconcile_flipflop_catalog_linked_offers',
      authority: 'catalog-microservice+warehouse-microservice',
      dryRun,
      requestId: input.requestId || null,
      requestedBy: input.requestedBy || 'manual-reconciliation',
      limit,
      totals,
      blockers,
      attempt: {
        id: attempt.id,
        status,
        idempotencyKey: attempt.idempotencyKey,
      },
      policy: {
        mutatesCatalog: false,
        mutatesWarehouse: false,
        mutatesExternalMarketplace: false,
        mutatesFlipFlopProductCache: true,
        reactivationPolicy: '[MISSING: safe FlipFlop catalog-event refresh policy]',
      },
      results,
    };

    await this.updateOfferReconciliationAttempt(attempt.id, {
      status,
      completedAt: new Date(),
      matchedProductCount: products.length,
      blockedReasons: blockers,
      resultSnapshot: response,
      remediationContext: totals.failed > 0
        ? { nextAction: 'Review failed dependency lookups or product-cache writes, then rerun reconciliation.' }
        : { nextAction: 'No action for disabled offers. Define safe refresh policy before any reactivation path.' },
    });

    await this.logger.log('FlipFlop offer reconciliation completed', {
      context: 'ProductsService',
      requestId: response.requestId,
      totals,
      dryRun,
    });

    return response;
  }

  async getCatalogContentPreview(productId: string, authorizationHeader?: string) {
    const catalogClient = this.catalogClient as unknown as {
      getProductContentPreview: (
        productId: string,
        marketplace: string,
        authorizationHeader?: string,
      ) => Promise<unknown>;
    };

    return catalogClient.getProductContentPreview(productId, 'flipflop', authorizationHeader);
  }

  async getProducts(filters: any) {
    const source = String(filters.source || '').toLowerCase();
    const catalogScope = String(filters.catalogScope || '').toLowerCase();

    if (source === 'catalog' || catalogScope === 'effective') {
      return this.getCatalogProducts(filters);
    }

    return this.getCatalogLinkedStorefrontProducts(filters);
  }

  async getSellerCatalogProducts(query: any, actor: FlipFlopPublishActor) {
    this.requireSellerAuthorization(actor);
    return this.getProducts({
      ...query,
      source: 'catalog',
      catalogScope: 'effective',
      authorizationHeader: actor.authorizationHeader,
    });
  }

  async publishCatalogProductsForSeller(dto: FlipFlopBulkPublishRequest, actor: FlipFlopPublishActor = {}) {
    this.requireSellerAuthorization(actor);
    const productIds = this.normalizePublishProductIds(dto?.productIds || []);
    if (productIds.length === 0) {
      throw new BadRequestException('At least one Catalog product ID is required.');
    }

    for (const catalogProductId of productIds) {
      await this.getSellerEffectiveCatalogProduct(catalogProductId, actor.authorizationHeader || '');
    }

    const result = await this.publishCatalogProductsFromCatalog({
      ...dto,
      productIds,
      requestedBy: dto?.requestedBy || actor.email || actor.id || 'flipflop-seller',
    }, actor);

    return {
      ...result,
      sellerCatalogScope: 'effective',
      sellerSourceOptions: ['own', 'alfares', 'community'],
      sellerOwnershipContract: '[MISSING: per-seller payout/order ownership contract]',
    };
  }

  async updateCatalogProductResaleForSeller(productId: string, resaleEnabled: unknown, actor: FlipFlopPublishActor = {}) {
    this.requireSellerAuthorization(actor);
    if (typeof resaleEnabled !== 'boolean') {
      throw new BadRequestException('resaleEnabled must be a boolean.');
    }

    const product = await this.getSellerEffectiveCatalogProduct(productId, actor.authorizationHeader || '');
    if (!this.isCurrentUsersCatalogProduct(product, actor)) {
      throw new ForbiddenException('Only the Catalog product owner can change resale sharing from FlipFlop.');
    }

    const updated = await this.catalogClient.updateProduct(productId, { resaleEnabled }, {
      authorizationHeader: actor.authorizationHeader || undefined,
    });

    return {
      success: true,
      product: this.mapCatalogSelectionProduct(
        { ...product, ...(updated || {}), resaleEnabled },
        await this.catalogProductQualityStatus({ ...product, ...(updated || {}), resaleEnabled }, actor.authorizationHeader),
      ),
    };
  }

  /**
   * Get products with pagination and filtering
   * Fetches from catalog-microservice and enriches with stock from warehouse-microservice
   */
  private async getCatalogProducts(filters: any) {
    try {
      const resolvedCategoryId = await this.resolveCategoryId(filters.categoryId, filters.category);

      const catalogScope = String(filters.catalogScope || '').toLowerCase();
      const catalogResult = await this.searchCatalogProducts(filters, resolvedCategoryId);
      if (!catalogResult.items.length) {
        await this.logger.warn('OPERATIONAL_ALERT catalog_empty_or_unavailable', {
          context: 'ProductsService',
          search: filters.search,
          category: filters.category,
          categoryId: resolvedCategoryId,
          page: Number(filters.page) || 1,
          limit: Number(filters.limit) || 20,
        });
      }

      if (catalogScope === 'effective') {
        const items = await Promise.all(
          catalogResult.items.map(async (product: any) => this.mapCatalogSelectionProduct(
            product,
            await this.catalogProductQualityStatus(product, filters.authorizationHeader),
          )),
        );
        const total = Number(catalogResult.total || items.length);
        const totalPages = Math.ceil(total / catalogResult.limit);

        return {
          items,
          pagination: {
            page: catalogResult.page,
            limit: catalogResult.limit,
            total,
            totalPages,
            hasNext: catalogResult.page < totalPages,
            hasPrev: catalogResult.page > 1,
          },
        };
      }

      const offerItems = await Promise.all(
        catalogResult.items.map(async (product: any) => {
          const policy = await this.catalogProductOfferPolicy(product);
          if (!policy.sellable) {
            await this.logger.warn('OPERATIONAL_ALERT flipflop_catalog_offer_blocked', {
              context: 'ProductsService',
              catalogProductId: product?.id || null,
              sku: product?.sku || null,
              blockedReasons: policy.blockedReasons,
            });
            return null;
          }

          return this.mapCatalogOfferProduct(product, policy.availableStock);
        }),
      );
      const items = offerItems.filter(Boolean);
      const totalPages = Math.ceil(items.length / catalogResult.limit);

      return {
        items,
        pagination: {
          page: catalogResult.page,
          limit: catalogResult.limit,
          total: items.length,
          totalPages,
          hasNext: catalogResult.page < totalPages,
          hasPrev: catalogResult.page > 1,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch products: ${error.message}`, error.stack, 'ProductsService');
      throw error;
    }
  }

  private async searchCatalogProducts(filters: any, resolvedCategoryId?: string) {
    const catalogScope = String(filters.catalogScope || '').toLowerCase();
    const authorizationHeader = typeof filters.authorizationHeader === 'string'
      ? filters.authorizationHeader.trim()
      : '';

    if (catalogScope === 'effective' && !authorizationHeader) {
      throw new BadRequestException('Catalog effective scope requires human authorization.');
    }

    const params = new URLSearchParams();
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filters.search) params.append('search', String(filters.search));
    if (resolvedCategoryId) params.append('categoryId', resolvedCategoryId);
    if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (catalogScope) params.append('catalogScope', catalogScope);
    const catalogSources = this.catalogSourcesParam(filters.catalogSources);
    if (catalogSources) params.append('catalogSources', catalogSources);

    const baseUrl = process.env.CATALOG_SERVICE_URL || 'http://catalog-microservice:3200';
    const internalServiceToken = (
      process.env.CATALOG_INTERNAL_SERVICE_TOKEN ||
      process.env.CATALOG_SERVICE_TOKEN ||
      process.env.INTERNAL_SERVICE_TOKEN ||
      ''
    ).trim();
    const headers: Record<string, string> = {};
    if (authorizationHeader) {
      headers.Authorization = authorizationHeader;
    }
    if (internalServiceToken) {
      headers['x-internal-service-token'] = internalServiceToken;
      headers['x-service-name'] = process.env.SERVICE_NAME || 'flipflop-service';
    }

    const response = await this.httpService.axiosRef.get(`${baseUrl}/api/products?${params.toString()}`, {
      headers: Object.keys(headers).length ? headers : undefined,
    });

    return {
      items: response.data?.data || [],
      total: response.data?.pagination?.total || 0,
      page: response.data?.pagination?.page || page,
      limit: response.data?.pagination?.limit || limit,
    };
  }

  /**
   * Get product by ID
   * Fetches from catalog-microservice and enriches with stock from warehouse-microservice
   */
  async getProductRecommendations(id: string) {
    const currentProduct = await this.getLocalRecommendationProduct(id);
    const catalogRelatedProducts = await this.getCatalogRelatedProducts(currentProduct, 8);
    const catalogBundleProducts = await this.getCatalogBundleCandidateProducts(currentProduct, 3);
    const historyProducts = await this.getFrequentlyBoughtTogetherProducts(currentProduct.id, 8);
    const fallbackProducts = await this.getFallbackRelatedProducts(currentProduct, 8);
    const relatedProducts = this.uniqueProducts([
      ...catalogRelatedProducts,
      ...historyProducts,
      ...fallbackProducts,
    ], currentProduct.id).slice(0, 8);
    const bundleCandidates = catalogBundleProducts.length > 1
      ? catalogBundleProducts
      : catalogRelatedProducts.length > 0
        ? catalogRelatedProducts
        : historyProducts.length > 0
          ? historyProducts
          : fallbackProducts;
    const recommendationSource: ProductRecommendationSource = catalogRelatedProducts.length > 0
      ? 'catalog_order_affinity'
      : historyProducts.length > 0
        ? 'purchase_history'
        : 'related_fallback';
    const bundleProducts = this.uniqueProducts(
      catalogBundleProducts.length > 1 ? bundleCandidates : [currentProduct, ...bundleCandidates],
      currentProduct.id,
      true,
    ).slice(0, 3);
    const bundle = this.buildRecommendationBundle(
      bundleProducts.length > 1 ? bundleProducts : [currentProduct, ...relatedProducts.slice(0, 1)],
      recommendationSource,
    );

    return {
      productId: currentProduct.id,
      catalogProductId: currentProduct.catalogProductId || null,
      relatedProducts,
      bundle,
      policy: {
        source: catalogRelatedProducts.length > 0
          ? 'catalog_order_affinity_then_purchase_history_then_category_fallback'
          : historyProducts.length > 0
            ? 'purchase_history_then_category_fallback'
            : 'category_fallback',
        usesAi: false,
        mutatesPrices: false,
        mutatesOrders: false,
        exposesCustomerData: false,
      },
    };
  }

  private async getLocalRecommendationProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [
          { id },
          { catalogProductId: id },
        ],
        isActive: true,
        catalogProductId: { not: null },
      },
      include: {
        product_categories: {
          include: { categories: true },
        },
        product_variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const offer = await this.catalogLinkedProductToOffer(product);
    if (!offer) {
      throw new NotFoundException('Product not found');
    }

    return offer;
  }

  private async getCatalogBundleCandidateProducts(product: any, limit: number) {
    if (!product?.catalogProductId) {
      return [];
    }

    try {
      const response = await this.catalogClient.getProductBundleCandidates(product.catalogProductId, {
        limit,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD_CZK,
        currency: 'CZK',
      });
      const candidate = response?.candidates?.find((item: any) => (
        Array.isArray(item?.productIds) &&
        item.productIds.includes(product.catalogProductId) &&
        item.productIds.length > 1
      ));
      const catalogProductIds = Array.from(new Set(
        (candidate?.productIds || [])
          .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0),
      )).slice(0, limit);

      if (catalogProductIds.length < 2) {
        return [];
      }

      const targetCatalogIds: string[] = catalogProductIds.filter((catalogProductId): catalogProductId is string => (
        typeof catalogProductId === 'string' && catalogProductId !== product.catalogProductId
      ));
      const rows = targetCatalogIds.length > 0
        ? await this.prisma.product.findMany({
          where: {
            catalogProductId: { in: targetCatalogIds },
            isActive: true,
          },
          include: {
            product_categories: {
              include: { categories: true },
            },
            product_variants: true,
          },
        })
        : [];
      const offers = await Promise.all(rows.map((row: any) => this.catalogLinkedProductToOffer(row)));
      const offerByCatalogId = new Map(
        offers
          .filter(Boolean)
          .map((offer: any) => [offer.catalogProductId, offer]),
      );
      offerByCatalogId.set(product.catalogProductId, product);

      return catalogProductIds
        .map((catalogProductId) => offerByCatalogId.get(catalogProductId))
        .filter(Boolean)
        .slice(0, limit);
    } catch (error: any) {
      await this.logger.warn('Catalog bundle-candidates lookup failed; using recommendation fallback', {
        context: 'ProductsService',
        productId: product.id,
        catalogProductId: product.catalogProductId,
        reason: error?.message || 'unknown error',
      });
      return [];
    }
  }

  private async getCatalogRelatedProducts(product: any, limit: number) {
    if (!product?.catalogProductId) {
      return [];
    }

    try {
      const relations = await this.catalogClient.getRelatedProducts(product.catalogProductId, {
        relationType: 'order_affinity',
      });
      const targetCatalogIds = Array.from(new Set(
        relations
          .map((relation: any) => relation?.targetProductId)
          .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0),
      )).slice(0, limit);

      if (targetCatalogIds.length === 0) {
        return [];
      }

      const rows = await this.prisma.product.findMany({
        where: {
          catalogProductId: { in: targetCatalogIds },
          isActive: true,
        },
        include: {
          product_categories: {
            include: { categories: true },
          },
          product_variants: true,
        },
      });
      const offers = await Promise.all(rows.map((row: any) => this.catalogLinkedProductToOffer(row)));
      const offerByCatalogId = new Map(
        offers
          .filter(Boolean)
          .map((offer: any) => [offer.catalogProductId, offer]),
      );

      return targetCatalogIds
        .map((catalogProductId) => offerByCatalogId.get(catalogProductId))
        .filter(Boolean)
        .slice(0, limit);
    } catch (error: any) {
      await this.logger.warn('Catalog related-products lookup failed; using local recommendation fallback', {
        context: 'ProductsService',
        productId: product.id,
        catalogProductId: product.catalogProductId,
        reason: error?.message || 'unknown error',
      });
      return [];
    }
  }

  private async getFrequentlyBoughtTogetherProducts(productId: string, limit: number) {
    try {
      const rows = await this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          productId: { not: productId },
          orders: {
            status: 'confirmed',
            order_items: {
              some: { productId },
            },
          },
        },
        _count: { productId: true },
        orderBy: { _count: { productId: 'desc' } },
        take: limit,
      });
      const ids = rows.map((row: any) => row.productId).filter(Boolean);
      return this.getSellableProductsByIds(ids);
    } catch (error: any) {
      await this.logger.warn('OPERATIONAL_ALERT flipflop_recommendation_history_lookup_failed', {
        context: 'ProductsService',
        productId,
        error: error?.message || 'unknown error',
      });
      return [];
    }
  }

  private async getFallbackRelatedProducts(product: any, limit: number) {
    const categoryIds = Array.isArray(product.categories)
      ? product.categories.map((category: any) => category.id).filter(Boolean)
      : [];
    const sameCategoryRows = categoryIds.length
      ? await this.prisma.product.findMany({
          where: {
            id: { not: product.id },
            isActive: true,
            catalogProductId: { not: null },
            product_categories: { some: { categoryId: { in: categoryIds } } },
          },
          include: {
            product_categories: { include: { categories: true } },
            product_variants: true,
          },
          orderBy: [
            { stockQuantity: 'desc' },
            { updatedAt: 'desc' },
            { id: 'asc' },
          ],
          take: limit,
        })
      : [];

    const sameCategoryOffers = await this.mapSellableLocalProducts(sameCategoryRows);
    if (sameCategoryOffers.length >= limit) {
      return sameCategoryOffers.slice(0, limit);
    }

    const excludeIds = new Set([product.id, ...sameCategoryOffers.map((item: any) => item.id)]);
    const otherRows = await this.prisma.product.findMany({
      where: {
        id: { notIn: Array.from(excludeIds) },
        isActive: true,
        catalogProductId: { not: null },
      },
      include: {
        product_categories: { include: { categories: true } },
        product_variants: true,
      },
      orderBy: [
        { stockQuantity: 'desc' },
        { updatedAt: 'desc' },
        { id: 'asc' },
      ],
      take: limit,
    });

    return this.uniqueProducts([...sameCategoryOffers, ...(await this.mapSellableLocalProducts(otherRows))], product.id).slice(0, limit);
  }

  private async getSellableProductsByIds(productIds: string[]) {
    if (!productIds.length) return [];
    const rows = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
        catalogProductId: { not: null },
      },
      include: {
        product_categories: { include: { categories: true } },
        product_variants: true,
      },
    });
    const byId = new Map(rows.map((row: any) => [row.id, row]));
    const orderedRows = productIds.map((id) => byId.get(id)).filter(Boolean);
    return this.mapSellableLocalProducts(orderedRows);
  }

  private async mapSellableLocalProducts(products: any[]) {
    const offers = await Promise.all(products.map((row) => this.catalogLinkedProductToOffer(row)));
    return offers.filter(Boolean);
  }

  private uniqueProducts(products: any[], currentProductId: string, includeCurrent = false) {
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const product of products) {
      if (!product?.id) continue;
      if (!includeCurrent && product.id === currentProductId) continue;
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      unique.push(product);
    }
    return unique;
  }

  private buildRecommendationBundle(products: any[], source: ProductRecommendationSource): ProductRecommendationBundle | null {
    const bundleProducts = products.filter((product) => product?.id && Number(product.price) > 0);
    if (bundleProducts.length < 2) {
      return null;
    }

    const subtotal = this.roundCzk(bundleProducts.reduce((sum, product) => sum + Number(product.price || 0), 0));
    const merchandiseSavings = Math.max(1, this.roundCzk(subtotal * 0.05));
    const shippingSavings = subtotal >= FREE_SHIPPING_THRESHOLD_CZK ? DEFAULT_SHIPPING_COST_CZK : 0;
    const bundlePrice = Math.max(0, this.roundCzk(subtotal - merchandiseSavings));

    return {
      source,
      products: bundleProducts,
      subtotal,
      bundlePrice,
      merchandiseSavings,
      shippingSavings,
      totalSavings: merchandiseSavings + shippingSavings,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD_CZK,
      assumedShippingCost: DEFAULT_SHIPPING_COST_CZK,
    };
  }

  private roundCzk(value: number) {
    return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
  }

  async getProduct(id: string, includeWarehouse: boolean = true) {
    try {
      void includeWarehouse;

      const localProduct = await this.prisma.product.findFirst({
        where: {
          OR: [
            { id },
            { catalogProductId: id },
          ],
        },
        include: {
          product_categories: {
            include: { categories: true },
          },
          product_variants: true,
        },
      });

      if (!localProduct || !localProduct.isActive || !localProduct.catalogProductId) {
        throw new NotFoundException('Product not found');
      }

      let catalogProduct: any;
      try {
        catalogProduct = await this.catalogClient.getProductById(localProduct.catalogProductId);
      } catch (error: any) {
        await this.logger.warn('OPERATIONAL_ALERT flipflop_product_catalog_missing', {
          context: 'ProductsService',
          productId: localProduct.id,
          catalogProductId: localProduct.catalogProductId,
          error: error?.message || 'unknown error',
        });
        throw new NotFoundException('Product not found');
      }

      const policy = await this.catalogProductOfferPolicy(catalogProduct);
      if (!policy.sellable) {
        await this.logger.warn('OPERATIONAL_ALERT flipflop_product_offer_blocked', {
          context: 'ProductsService',
          productId: localProduct.id,
          catalogProductId: localProduct.catalogProductId,
          sku: localProduct.sku,
          blockedReasons: policy.blockedReasons,
        });
        throw new NotFoundException('Product not found');
      }

      return this.mapCatalogOfferProduct(catalogProduct, policy.availableStock, localProduct);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch product ${id}: ${error.message}`, error.stack, 'ProductsService');
      throw error;
    }
  }

  /**
   * Get categories
   */
  async getCategories() {
    const categories = await this.catalogClient.getCategories();

    return categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      path: cat.path,
      sortOrder: cat.sortOrder,
      parentId: cat.parentId || undefined,
    }));
  }

  /**
   * Get category by ID
   */
  async getCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parentId || undefined,
    };
  }

  /**
   * Create product (admin)
   */
  async createProduct(dto: any) {
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        sku: dto.sku,
        description: dto.description,
        shortDescription: dto.shortDescription,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        mainImageUrl: dto.mainImageUrl,
        imageUrls: dto.imageUrls,
        stockQuantity: dto.stockQuantity || 0,
        trackInventory: dto.trackInventory || false,
        brand: dto.brand,
        manufacturer: dto.manufacturer,
        product_categories: dto.categoryIds
          ? {
              create: dto.categoryIds.map((catId: string) => ({
                categories: { connect: { id: catId } },
              })),
            }
          : undefined,
      },
      include: {
        product_categories: {
          include: {
            categories: true,
          },
        },
      },
    });

    this.logger.log('Product created', { productId: product.id });
    return this.mapProduct(product);
  }

  /**
   * Update product (admin)
   */
  async updateProduct(id: string, dto: any) {
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        sku: dto.sku,
        description: dto.description,
        shortDescription: dto.shortDescription,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        mainImageUrl: dto.mainImageUrl,
        imageUrls: dto.imageUrls,
        stockQuantity: dto.stockQuantity,
        trackInventory: dto.trackInventory,
        isActive: dto.isActive,
        brand: dto.brand,
        manufacturer: dto.manufacturer,
        product_categories: dto.categoryIds
          ? {
              deleteMany: {},
              create: dto.categoryIds.map((catId: string) => ({
                categories: { connect: { id: catId } },
              })),
            }
          : undefined,
      },
      include: {
        product_categories: {
          include: {
            categories: true,
          },
        },
      },
    });

    this.logger.log('Product updated', { productId: product.id });
    return this.mapProduct(product);
  }

  /**
   * Delete product (admin)
   */
  async deleteProduct(id: string) {
    await this.prisma.product.delete({
      where: { id },
    });

    this.logger.log('Product deleted', { productId: id });
    return { success: true };
  }


  async publishCatalogProductsFromCatalog(dto: FlipFlopBulkPublishRequest, actor: FlipFlopPublishActor = {}) {
    const productIds = this.normalizePublishProductIds(dto?.productIds || []);
    if (productIds.length === 0) {
      throw new BadRequestException('At least one Catalog product ID is required.');
    }

    await this.ensureCatalogPublishAttemptTable();

    const results: FlipFlopPublishResult[] = [];
    for (const catalogProductId of productIds) {
      results.push(await this.publishSingleCatalogProduct(catalogProductId, dto || {}, actor));
    }

    const succeeded = results.filter((result) => result.success).length;
    const blocked = results.filter((result) => result.blocked).length;

    return {
      success: results.length > 0 && results.every((result) => result.success),
      action: 'flipflop_bulk_publish',
      authority: 'flipflop',
      requestedProductIds: productIds,
      totals: {
        requested: results.length,
        succeeded,
        failed: results.length - succeeded,
        blocked,
      },
      results,
    };
  }

  async getCatalogPublishStatus(catalogProductId: string, authorizationHeader?: string) {
    await this.ensureCatalogPublishAttemptTable();
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM "flipflop_catalog_publish_attempts" WHERE "catalogProductId" = $1::uuid ORDER BY "createdAt" DESC LIMIT 1',
      catalogProductId,
    );
    const localProduct = await this.prisma.product.findFirst({
      where: { catalogProductId },
      select: { id: true, catalogProductId: true, sku: true, name: true, isActive: true, stockQuantity: true, updatedAt: true },
    });
    const latest = rows[0] || null;
    const blockedReasons: Array<{ reason: string; message: string }> = [];
    let policySnapshot: any = null;
    let status = latest?.status || 'not_published';

    if (!localProduct) {
      status = status === 'blocked' || status === 'failed' ? status : 'not_published';
    } else if (!localProduct.isActive) {
      status = 'not_published';
      blockedReasons.push({
        reason: 'flipflop_product_inactive',
        message: 'FlipFlop product cache row is inactive or disabled.',
      });
    } else {
      try {
        const catalogProduct = await this.catalogClient.getProductById(catalogProductId);
        policySnapshot = await this.catalogProductPublishPolicy(catalogProduct, { authorizationHeader });
        blockedReasons.push(...(policySnapshot.blockedReasons || []));
        status = policySnapshot.publishable ? 'published' : 'blocked';
      } catch (error: any) {
        status = 'blocked';
        blockedReasons.push({
          reason: 'catalog_product_missing',
          message: `Catalog product lookup failed or returned missing for ${catalogProductId}: ${error?.message || 'unknown error'}`,
        });
      }
    }

    const published = status === 'published';
    const blocked = status === 'blocked' || status === 'failed';

    return {
      success: true,
      action: 'read_flipflop_publish_status',
      authority: 'flipflop',
      catalogProductId,
      productId: catalogProductId,
      marketplace: 'flipflop',
      status,
      published,
      blocked,
      listingUrl: this.flipFlopListingUrl(catalogProductId),
      flipflopProductId: localProduct?.id || latest?.flipflopProductId || null,
      latestAttempt: latest,
      policySnapshot,
      blockedReasons,
      availableStock: policySnapshot?.availableStock ?? null,
      nextAction: published ? 'view_flipflop_listing' : 'publish_flipflop_listing',
    };
  }

  private async publishSingleCatalogProduct(
    catalogProductId: string,
    request: FlipFlopBulkPublishRequest,
    actor: FlipFlopPublishActor,
  ): Promise<FlipFlopPublishResult> {
    const listingUrl = this.flipFlopListingUrl(catalogProductId);
    const attemptBase = {
      catalogProductId,
      idempotencyKey: this.catalogPublishIdempotencyKey(request, catalogProductId),
      requestPayload: {
        productIds: request.productIds || [],
        requestedBy: request.requestedBy || 'catalog-bulk-publication',
        dryRun: Boolean(request.dryRun),
      },
      actorSnapshot: this.redactActor(actor),
    };

    try {
      const catalogProduct = await this.catalogClient.getProductById(catalogProductId);
      const policySnapshot = await this.catalogProductPublishPolicy(catalogProduct, {
        authorizationHeader: actor.authorizationHeader || undefined,
      });

      if (!policySnapshot.publishable) {
        const result = this.blockedFlipFlopPublishResult(catalogProductId, listingUrl, policySnapshot);
        await this.recordCatalogPublishAttempt({
          ...attemptBase,
          status: 'blocked',
          policySnapshot,
          blockedReasons: policySnapshot.blockedReasons,
          resultSnapshot: result,
        });
        return result;
      }

      if (request.dryRun) {
        const result: FlipFlopPublishResult = {
          catalogProductId,
          productId: catalogProductId,
          marketplace: 'flipflop',
          success: true,
          blocked: false,
          status: 'dry_run',
          action: 'publish_flipflop_listing',
          authority: 'flipflop',
          listingUrl,
          message: 'FlipFlop publish preflight passed. Dry run did not update storefront product state.',
          nextAction: 'publish_flipflop_listing',
          availableStock: policySnapshot.availableStock,
          quality: policySnapshot.quality,
        };
        await this.recordCatalogPublishAttempt({
          ...attemptBase,
          status: 'dry_run',
          policySnapshot,
          resultSnapshot: result,
        });
        return result;
      }

      const flipflopProduct = await this.upsertFlipFlopProductFromCatalog(catalogProduct, policySnapshot.availableStock);
      const result: FlipFlopPublishResult = {
        catalogProductId,
        productId: catalogProductId,
        marketplace: 'flipflop',
        success: true,
        blocked: false,
        status: 'published',
        action: 'publish_flipflop_listing',
        authority: 'flipflop',
        listingUrl,
        flipflopProductId: flipflopProduct.id,
        message: 'Product published to FlipFlop storefront lifecycle.',
        nextAction: 'view_flipflop_listing',
        availableStock: policySnapshot.availableStock,
        quality: policySnapshot.quality,
      };
      await this.recordCatalogPublishAttempt({
        ...attemptBase,
        status: 'published',
        flipflopProductId: flipflopProduct.id,
        policySnapshot,
        resultSnapshot: result,
      });
      return result;
    } catch (error: any) {
      const result: FlipFlopPublishResult = {
        catalogProductId,
        productId: catalogProductId,
        marketplace: 'flipflop',
        success: false,
        blocked: true,
        status: 'failed',
        action: 'publish_flipflop_listing',
        authority: 'flipflop',
        listingUrl,
        reason: 'flipflop_publish_failed',
        message: error?.message || 'FlipFlop publish failed.',
        nextAction: 'retry_flipflop_publish',
        dependencyStatus: error?.response?.status ?? error?.status ?? null,
        dependencyMessage: error?.response?.data?.message ?? null,
      };
      await this.recordCatalogPublishAttempt({
        ...attemptBase,
        status: 'failed',
        policySnapshot: { publishable: false, blockedReasons: [{ reason: 'flipflop_publish_failed' }] },
        blockedReasons: [{ reason: 'flipflop_publish_failed', message: result.message }],
        resultSnapshot: result,
      }).catch((recordError: any) => {
        this.logger.warn(`Failed to record FlipFlop publish failure for ${catalogProductId}: ${recordError.message}`, 'ProductsService');
      });
      return result;
    }
  }

  private async catalogLinkedProductToOffer(localProduct: any) {
    if (!localProduct?.catalogProductId) {
      return null;
    }

    try {
      const catalogProduct = await this.catalogClient.getProductById(localProduct.catalogProductId);
      const policy = await this.catalogProductOfferPolicy(catalogProduct);

      if (!policy.sellable) {
        await this.logger.warn('OPERATIONAL_ALERT flipflop_local_offer_blocked', {
          context: 'ProductsService',
          productId: localProduct.id,
          catalogProductId: localProduct.catalogProductId,
          sku: localProduct.sku,
          blockedReasons: policy.blockedReasons,
        });
        return null;
      }

      return this.mapCatalogOfferProduct(catalogProduct, policy.availableStock, localProduct);
    } catch (error: any) {
      await this.logger.warn('OPERATIONAL_ALERT flipflop_local_offer_catalog_lookup_failed', {
        context: 'ProductsService',
        productId: localProduct.id,
        catalogProductId: localProduct.catalogProductId,
        sku: localProduct.sku,
        error: error?.message || 'unknown error',
      });
      return null;
    }
  }

  private requireSellerAuthorization(actor: FlipFlopPublishActor) {
    if (!actor.authorizationHeader) {
      throw new BadRequestException('FlipFlop seller Catalog actions require authenticated user authorization.');
    }
  }

  private async getSellerEffectiveCatalogProduct(productId: string, authorizationHeader: string) {
    return this.catalogClient.getProductById(productId, {
      authorizationHeader,
      catalogScope: 'effective',
    });
  }

  private catalogSourcesParam(value: unknown): string | null {
    const allowed = new Set(['own', 'alfares', 'community']);
    const rawItems = Array.isArray(value) ? value : String(value || '').split(',');
    const sources = rawItems
      .flatMap((item) => String(item || '').split(','))
      .map((item) => item.trim().toLowerCase())
      .filter((item) => allowed.has(item));
    return Array.from(new Set(sources)).join(',') || null;
  }

  private catalogSourceType(catalogProduct: any) {
    if (catalogProduct?.ownerUserId === null) return 'alfares';
    if (catalogProduct?.resaleEnabled === true) return 'community';
    if (catalogProduct?.ownerUserId) return 'own';
    return 'unknown';
  }

  private isCurrentUsersCatalogProduct(product: any, actor: FlipFlopPublishActor) {
    const actorValues = [actor.id, actor.email].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
    if (!actorValues.length) return false;
    const ownerValues = [
      product?.ownerUserId,
      product?.owner_user_id,
      product?.userId,
      product?.createdByUserId,
      product?.owner?.id,
      product?.owner?.userId,
      product?.owner?.email,
      product?.seller?.userId,
      product?.seller?.email,
      product?.source?.ownerUserId,
      product?.source?.email,
    ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
    return ownerValues.some((value) => actorValues.includes(value));
  }

  private async catalogProductOfferPolicy(
    catalogProduct: any,
    options: { authorizationHeader?: string | null } = {},
  ) {
    const blockedReasons: Array<{ reason: string; message: string }> = [];
    const price = this.getCatalogPrice(catalogProduct);
    let availableStock = 0;

    if (!catalogProduct?.id) {
      blockedReasons.push({ reason: 'catalog_product_missing', message: 'Catalog product was not returned by catalog-microservice.' });
    } else if (!catalogProduct?.sku) {
      blockedReasons.push({ reason: 'sku_required', message: 'Catalog product SKU is required before FlipFlop publication.' });
    }
    blockedReasons.push(...this.catalogLifecycleBlockedReasons(catalogProduct));
    if (price <= 0) {
      blockedReasons.push({ reason: 'price_required', message: 'A positive Catalog price is required before FlipFlop publication.' });
    }

    const quality = await this.catalogProductQualityStatus(catalogProduct, options.authorizationHeader);
    blockedReasons.push(...this.catalogQualityBlockedReasons(quality));

    if (catalogProduct?.id) {
      try {
        availableStock = this.toPositiveInteger(await this.warehouseClient.getTotalAvailable(catalogProduct.id));
      } catch (error: any) {
        blockedReasons.push({
          reason: 'warehouse_stock_unavailable',
          message: `Warehouse stock preflight failed: ${error?.message || 'unknown error'}`,
        });
      }
    }

    if (availableStock <= 0) {
      blockedReasons.push({ reason: 'warehouse_stock_unavailable', message: 'Warehouse has no sellable stock for this product.' });
    }

    return {
      sellable: blockedReasons.length === 0,
      blockedReasons,
      price,
      availableStock,
      quality,
      source: 'catalog-microservice+warehouse-microservice',
      mutatesCatalog: false,
      mutatesPrices: false,
    };
  }

  private async catalogProductPublishPolicy(
    catalogProduct: any,
    options: { authorizationHeader?: string | null } = {},
  ) {
    const policy = await this.catalogProductOfferPolicy(catalogProduct, options);

    return {
      ...policy,
      publishable: policy.sellable,
    };
  }

  private async catalogProductQualityStatus(
    catalogProduct: any,
    authorizationHeader?: string | null,
  ): Promise<CatalogProductQualityStatus> {
    const productId = String(catalogProduct?.id || '').trim();
    if (!productId) {
      return normalizeCatalogProductQualityStatus({
        productId: null,
        lookupError: 'Catalog product is missing an ID for quality review.',
      });
    }

    const search = this.catalogQualitySearchTerm(catalogProduct);
    const lookup = async (searchTerm?: string) => this.catalogClient.getProductQualityReview({
      page: 1,
      limit: searchTerm ? 50 : 200,
      search: searchTerm,
      catalogScope: authorizationHeader ? 'effective' : undefined,
    }, {
      authorizationHeader: authorizationHeader || undefined,
    });

    try {
      let review = await lookup(search);
      let item = this.findCatalogQualityItem(review.items, productId);

      if (!item && search) {
        review = await lookup(undefined);
        item = this.findCatalogQualityItem(review.items, productId);
      }

      return normalizeCatalogProductQualityStatus({
        item,
        policyId: review.policyId,
        productId,
        lookupError: item ? null : `Catalog quality review did not return product ${productId}.`,
      });
    } catch (error: any) {
      return normalizeCatalogProductQualityStatus({
        productId,
        lookupError: `Catalog quality review lookup failed: ${error?.message || 'unknown error'}`,
      });
    }
  }

  private findCatalogQualityItem(items: any[], productId: string) {
    return (items || []).find((item: any) => String(item?.productId || item?.id || '').trim() === productId) || null;
  }

  private catalogQualitySearchTerm(catalogProduct: any): string | undefined {
    const candidates = [catalogProduct?.sku, catalogProduct?.title, catalogProduct?.name]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    return candidates[0];
  }

  private catalogQualityBlockedReasons(quality: CatalogProductQualityStatus) {
    return catalogProductQualityBlockedReasons(quality);
  }

  private catalogLifecycleBlockedReasons(catalogProduct: any): Array<{ reason: string; message: string }> {
    if (!catalogProduct) {
      return [];
    }

    const blockedReasons: Array<{ reason: string; message: string }> = [];
    const status = String(
      catalogProduct.lifecycleStatus ?? catalogProduct.lifecycle ?? catalogProduct.status ?? '',
    ).trim().toLowerCase();

    if (catalogProduct.isActive === false) {
      blockedReasons.push({ reason: 'inactive_product', message: 'Only active Catalog products can be offered on FlipFlop.' });
    }
    if (catalogProduct.isArchived === true || catalogProduct.archived === true || catalogProduct.archivedAt) {
      blockedReasons.push({ reason: 'archived_product', message: 'Archived Catalog products cannot be offered on FlipFlop.' });
    }
    if (catalogProduct.isDeleted === true || catalogProduct.deleted === true || catalogProduct.deletedAt) {
      blockedReasons.push({ reason: 'deleted_product', message: 'Deleted Catalog products cannot be offered on FlipFlop.' });
    }
    if (['archived', 'deleted', 'inactive', 'disabled', 'retired'].includes(status)) {
      blockedReasons.push({ reason: 'inactive_lifecycle', message: `Catalog lifecycle status ${status} is not offerable on FlipFlop.` });
    }

    return blockedReasons;
  }

  private catalogSellabilityBlockedReasons(catalogProduct: any): Array<{ reason: string; message: string }> {
    if (!catalogProduct) {
      return [];
    }

    const blockedReasons: Array<{ reason: string; message: string }> = [];
    const booleanCandidates = [
      catalogProduct.isSellable,
      catalogProduct.sellable,
      catalogProduct.availableForSale,
      catalogProduct.canSell,
      catalogProduct.offerable,
      catalogProduct.product?.isSellable,
      catalogProduct.product?.sellable,
    ];
    if (booleanCandidates.some((candidate) => candidate === false)) {
      blockedReasons.push({ reason: 'catalog_non_sellable', message: 'Catalog product is explicitly marked non-sellable.' });
    }

    const sellabilityStatus = String(
      catalogProduct.sellabilityStatus ?? catalogProduct.salesStatus ?? catalogProduct.offerStatus ?? '',
    ).trim().toLowerCase();
    if (['non_sellable', 'not_sellable', 'unsellable', 'blocked', 'disabled'].includes(sellabilityStatus)) {
      blockedReasons.push({ reason: 'catalog_non_sellable_status', message: `Catalog sellability status ${sellabilityStatus} is not offerable on FlipFlop.` });
    }

    return blockedReasons;
  }

  private async upsertFlipFlopProductFromCatalog(catalogProduct: any, availableStock: number) {
    const now = new Date();
    const imageUrls = this.catalogImageUrls(catalogProduct);
    const data = {
      catalogProductId: catalogProduct.id,
      name: catalogProduct.title || catalogProduct.name || catalogProduct.sku,
      sku: catalogProduct.sku,
      description: catalogProduct.description || null,
      shortDescription: catalogProduct.shortDescription || this.summarizeDescription(catalogProduct.description),
      price: this.getCatalogPrice(catalogProduct),
      compareAtPrice: catalogProduct.compareAtPrice || null,
      mainImageUrl: catalogProduct.mainImageUrl || imageUrls[0] || null,
      imageUrls,
      stockQuantity: availableStock,
      trackInventory: true,
      isActive: true,
      brand: catalogProduct.brand || null,
      manufacturer: catalogProduct.manufacturer || catalogProduct.brand || null,
      attributes: catalogProduct.attributes || null,
      seoTitle: catalogProduct.seoTitle || catalogProduct.seoData?.title || catalogProduct.title || null,
      seoDescription: catalogProduct.seoDescription || catalogProduct.seoData?.description || null,
      seoKeywords: this.catalogSeoKeywords(catalogProduct),
      updatedAt: now,
    };

    const existing = await this.prisma.product.findFirst({
      where: {
        OR: [
          { catalogProductId: catalogProduct.id },
          { sku: catalogProduct.sku },
        ],
      },
    });

    if (existing) {
      return this.prisma.product.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.product.create({
      data: {
        ...data,
        createdAt: now,
      },
    });
  }

  private blockedFlipFlopPublishResult(catalogProductId: string, listingUrl: string, policySnapshot: any): FlipFlopPublishResult {
    const firstReason = policySnapshot.blockedReasons?.[0];
    return {
      catalogProductId,
      productId: catalogProductId,
      marketplace: 'flipflop',
      success: false,
      blocked: true,
      status: 'blocked',
      action: 'publish_flipflop_listing',
      authority: 'flipflop',
      listingUrl,
      reason: firstReason?.reason || 'flipflop_publish_blocked',
      message: firstReason?.message || 'FlipFlop publication is blocked by product readiness policy.',
      nextAction: policySnapshot.quality?.nextAction || 'resolve_flipflop_requirements',
      availableStock: policySnapshot.availableStock,
      quality: policySnapshot.quality,
      blockedReasons: policySnapshot.blockedReasons || [],
    };
  }

  private async recordCatalogPublishAttempt(input: {
    status: string;
    catalogProductId: string;
    flipflopProductId?: string | null;
    idempotencyKey: string;
    requestPayload: Record<string, any>;
    policySnapshot: Record<string, any>;
    blockedReasons?: any;
    resultSnapshot?: any;
    actorSnapshot?: any;
  }) {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "flipflop_catalog_publish_attempts" (
        "status", "catalogProductId", "flipflopProductId", "idempotencyKey", "requestPayload",
        "policySnapshot", "blockedReasons", "resultSnapshot", "actorSnapshot", "updatedAt"
      ) VALUES ($1, $2::uuid, $3::uuid, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, now())
      ON CONFLICT ("idempotencyKey") DO UPDATE SET
        "status" = EXCLUDED."status",
        "flipflopProductId" = EXCLUDED."flipflopProductId",
        "requestPayload" = EXCLUDED."requestPayload",
        "policySnapshot" = EXCLUDED."policySnapshot",
        "blockedReasons" = EXCLUDED."blockedReasons",
        "resultSnapshot" = EXCLUDED."resultSnapshot",
        "actorSnapshot" = EXCLUDED."actorSnapshot",
        "updatedAt" = now()`,
      input.status,
      input.catalogProductId,
      input.flipflopProductId || null,
      input.idempotencyKey,
      JSON.stringify(input.requestPayload || {}),
      JSON.stringify(input.policySnapshot || {}),
      JSON.stringify(input.blockedReasons || null),
      JSON.stringify(input.resultSnapshot || null),
      JSON.stringify(input.actorSnapshot || null),
    );
  }

  private async ensureCatalogPublishAttemptTable() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "flipflop_catalog_publish_attempts" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "status" varchar(50) NOT NULL,
        "idempotencyKey" varchar(180) NOT NULL,
        "catalogProductId" uuid NOT NULL,
        "flipflopProductId" uuid NULL,
        "requestPayload" jsonb NULL,
        "policySnapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "blockedReasons" jsonb NULL,
        "resultSnapshot" jsonb NULL,
        "actorSnapshot" jsonb NULL,
        "createdAt" timestamp(6) NOT NULL DEFAULT now(),
        "updatedAt" timestamp(6) NOT NULL DEFAULT now(),
        CONSTRAINT "flipflop_catalog_publish_attempts_pkey" PRIMARY KEY ("id")
      )
    `);
    await this.prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "flipflop_catalog_publish_attempts_idempotencyKey_key" ON "flipflop_catalog_publish_attempts"("idempotencyKey")');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_catalog_publish_attempts_catalogProductId" ON "flipflop_catalog_publish_attempts"("catalogProductId")');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_catalog_publish_attempts_status" ON "flipflop_catalog_publish_attempts"("status")');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_catalog_publish_attempts_createdAt" ON "flipflop_catalog_publish_attempts"("createdAt")');
  }

  private async createOfferReconciliationAttempt(
    input: FlipFlopOfferReconciliationRequest,
    products: FlipFlopOfferReconciliationProduct[],
  ): Promise<FlipFlopOfferReconciliationAttemptRow> {
    const idempotencyKey = this.offerReconciliationIdempotencyKey(input, products.map((product) => product.id));
    const rows = await this.prisma.$queryRawUnsafe<FlipFlopOfferReconciliationAttemptRow[]>(
      `INSERT INTO "flipflop_offer_reconciliation_attempts" (
        "status", "idempotencyKey", "requestedBy", "requestId", "matchedProductCount",
        "requestPayload", "policySnapshot", "queuedAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, now(), now())
      ON CONFLICT ("idempotencyKey") DO UPDATE SET
        "status" = EXCLUDED."status",
        "matchedProductCount" = EXCLUDED."matchedProductCount",
        "requestPayload" = EXCLUDED."requestPayload",
        "policySnapshot" = EXCLUDED."policySnapshot",
        "queuedAt" = now(),
        "startedAt" = NULL,
        "completedAt" = NULL,
        "blockedReasons" = NULL,
        "resultSnapshot" = NULL,
        "failureContext" = NULL,
        "remediationContext" = NULL,
        "updatedAt" = now()
      RETURNING "id", "status", "idempotencyKey"`,
      'QUEUED',
      idempotencyKey,
      input.requestedBy || 'manual-reconciliation',
      input.requestId || null,
      products.length,
      JSON.stringify(this.redactReconciliationInput(input)),
      JSON.stringify({
        contractVersion: 'flipflop.offer-reconciliation.v1',
        sourceOfTruth: 'catalog+warehouse',
        action: 'reconcile_catalog_linked_offers',
        targetScope: 'catalog-linked FlipFlop product cache rows',
        approvalRequired: false,
        approvalMode: 'automatic_disable_only',
        mutatesCatalog: false,
        mutatesWarehouse: false,
        mutatesExternalMarketplace: false,
        mutatesFlipFlopProductCache: !input.dryRun,
        disablePolicy: 'Catalog missing/inactive/archived/deleted/non-sellable disables local offer; Warehouse totalAvailable<=0 sets stockQuantity=0 and disables local offer.',
        reactivationPolicy: '[MISSING: safe FlipFlop catalog-event refresh policy]',
      }),
    );
    return rows[0];
  }

  private async updateOfferReconciliationAttempt(id: string, data: {
    status: string;
    startedAt?: Date;
    completedAt?: Date;
    matchedProductCount?: number;
    blockedReasons?: unknown;
    resultSnapshot?: unknown;
    failureContext?: unknown;
    remediationContext?: unknown;
  }): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `UPDATE "flipflop_offer_reconciliation_attempts" SET
        "status" = $1,
        "startedAt" = COALESCE($2, "startedAt"),
        "completedAt" = COALESCE($3, "completedAt"),
        "matchedProductCount" = COALESCE($4, "matchedProductCount"),
        "blockedReasons" = COALESCE($5::jsonb, "blockedReasons"),
        "resultSnapshot" = COALESCE($6::jsonb, "resultSnapshot"),
        "failureContext" = COALESCE($7::jsonb, "failureContext"),
        "remediationContext" = COALESCE($8::jsonb, "remediationContext"),
        "updatedAt" = now()
      WHERE "id" = $9::uuid`,
      data.status,
      data.startedAt || null,
      data.completedAt || null,
      data.matchedProductCount ?? null,
      data.blockedReasons === undefined ? null : JSON.stringify(data.blockedReasons),
      data.resultSnapshot === undefined ? null : JSON.stringify(data.resultSnapshot),
      data.failureContext === undefined ? null : JSON.stringify(data.failureContext),
      data.remediationContext === undefined ? null : JSON.stringify(data.remediationContext),
      id,
    );
  }

  private async ensureOfferReconciliationAttemptTable() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "flipflop_offer_reconciliation_attempts" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "status" varchar(50) NOT NULL,
        "idempotencyKey" varchar(180) NOT NULL,
        "requestedBy" varchar(255),
        "requestId" varchar(255),
        "matchedProductCount" integer NOT NULL DEFAULT 0,
        "requestPayload" jsonb,
        "policySnapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "blockedReasons" jsonb,
        "resultSnapshot" jsonb,
        "failureContext" jsonb,
        "remediationContext" jsonb,
        "queuedAt" timestamp(6),
        "startedAt" timestamp(6),
        "completedAt" timestamp(6),
        "createdAt" timestamp(6) NOT NULL DEFAULT now(),
        "updatedAt" timestamp(6) NOT NULL DEFAULT now(),
        CONSTRAINT "flipflop_offer_reconciliation_attempts_pkey" PRIMARY KEY ("id")
      )
    `);
    await this.prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "flipflop_offer_reconciliation_attempts_idempotencyKey_key" ON "flipflop_offer_reconciliation_attempts"("idempotencyKey")');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_offer_reconciliation_attempts_status" ON "flipflop_offer_reconciliation_attempts"("status")');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_offer_reconciliation_attempts_createdAt" ON "flipflop_offer_reconciliation_attempts"("createdAt")');
  }

  private normalizePublishProductIds(productIds: string[]): string[] {
    return Array.from(new Set(productIds.map((id) => String(id || '').trim()).filter(Boolean)));
  }

  private catalogImageUrls(catalogProduct: any): string[] {
    if (Array.isArray(catalogProduct.imageUrls)) {
      return catalogProduct.imageUrls.filter(Boolean).map(String);
    }
    if (Array.isArray(catalogProduct.media)) {
      return catalogProduct.media
        .filter((media: any) => !media?.type || media.type === 'image')
        .map((media: any) => media?.url)
        .filter(Boolean)
        .map(String);
    }
    return catalogProduct.mainImageUrl ? [String(catalogProduct.mainImageUrl)] : [];
  }

  private catalogPublishIdempotencyKey(request: FlipFlopBulkPublishRequest, catalogProductId: string): string {
    const defaultRequestId = `${request.requestedBy || 'catalog-bulk-publication'}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const requestId = String(request.requestId || defaultRequestId).replace(/[^a-zA-Z0-9:_-]+/g, '-');
    return `${requestId}:${catalogProductId}`.slice(0, 180);
  }

  private catalogSeoKeywords(catalogProduct: any): string | null {
    const keywords = catalogProduct.seoKeywords || catalogProduct.seoData?.keywords;
    if (Array.isArray(keywords)) {
      return keywords.filter(Boolean).map(String).join(', ').slice(0, 255) || null;
    }
    return keywords ? String(keywords).slice(0, 255) : null;
  }

  private summarizeDescription(description?: string | null): string | null {
    if (!description) {
      return null;
    }
    const clean = String(description).replace(/\s+/g, ' ').trim();
    return clean.length > 240 ? `${clean.slice(0, 237)}...` : clean;
  }

  private offerReconciliationIdempotencyKey(input: FlipFlopOfferReconciliationRequest, productIds: string[]): string {
    const requestId = String(
      input.requestId || `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    ).replace(/[^a-zA-Z0-9:_-]+/g, '-');
    return `ff-offer-rec-${createHash('sha256').update(JSON.stringify({ requestId, productIds })).digest('hex').slice(0, 48)}`;
  }

  private redactReconciliationInput(input: FlipFlopOfferReconciliationRequest) {
    return {
      productIds: (input.productIds || []).slice(0, 100),
      productIdCount: input.productIds?.length || 0,
      requestedBy: input.requestedBy || null,
      requestId: input.requestId || null,
      dryRun: Boolean(input.dryRun),
      limit: input.limit || null,
    };
  }

  private localOfferStateSnapshot(product: any) {
    return {
      isActive: product?.isActive ?? null,
      stockQuantity: Number(product?.stockQuantity || 0),
      trackInventory: product?.trackInventory ?? null,
      updatedAt: this.dateToResponseValue(product?.updatedAt) || null,
    };
  }

  private catalogStateSnapshot(catalogProduct: any) {
    return {
      found: Boolean(catalogProduct?.id),
      id: catalogProduct?.id || null,
      sku: catalogProduct?.sku || null,
      isActive: catalogProduct?.isActive ?? null,
      isArchived: catalogProduct?.isArchived ?? catalogProduct?.archived ?? null,
      archivedAt: catalogProduct?.archivedAt || null,
      isDeleted: catalogProduct?.isDeleted ?? catalogProduct?.deleted ?? null,
      deletedAt: catalogProduct?.deletedAt || null,
      isSellable: catalogProduct?.isSellable ?? null,
      sellable: catalogProduct?.sellable ?? null,
      lifecycleStatus: catalogProduct?.lifecycleStatus ?? catalogProduct?.lifecycle ?? catalogProduct?.status ?? null,
      sellabilityStatus: catalogProduct?.sellabilityStatus ?? catalogProduct?.salesStatus ?? catalogProduct?.offerStatus ?? null,
    };
  }

  private toNonNegativeInteger(value: any): number {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return 0;
    }
    return Math.floor(numberValue);
  }

  private toPositiveInteger(value: any): number {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return 0;
    }
    return Math.floor(numberValue);
  }

  private flipFlopListingUrl(catalogProductId: string): string {
    return `${(process.env.FRONTEND_URL || 'https://flipflop.alfares.cz').replace(/\/$/, '')}/products/${encodeURIComponent(catalogProductId)}`;
  }

  private redactActor(actor: FlipFlopPublishActor) {
    return {
      id: actor?.id || null,
      email: actor?.email || null,
      roles: Array.isArray(actor?.roles) ? actor.roles.slice(0, 20) : [],
    };
  }

  private async resolveCategoryId(categoryId?: string, category?: string): Promise<string | undefined> {
    if (categoryId) {
      return categoryId;
    }

    if (!category) {
      return undefined;
    }

    const requested = this.normalizeCategoryToken(category);
    if (!requested) {
      return undefined;
    }

    const categories = await this.catalogClient.getCategories();
    const match = categories.find((cat: any) => {
      const candidates = [
        cat.id,
        cat.slug,
        cat.name,
        cat.path,
      ]
        .filter(Boolean)
        .map((value: string) => this.normalizeCategoryToken(String(value).replace(/^\//, '')));

      return candidates.includes(requested);
    });

    return match?.id;
  }

  private mapCatalogSelectionProduct(catalogProduct: any, quality?: CatalogProductQualityStatus) {
    const imageUrls = this.catalogImageUrls(catalogProduct);
    const stockQuantity = this.toNonNegativeInteger(
      catalogProduct.stockQuantity ??
      catalogProduct.warehouse?.stockQuantity ??
      catalogProduct.availableStock ??
      0,
    );

    return {
      id: catalogProduct.id,
      catalogProductId: catalogProduct.id,
      name: catalogProduct.title || catalogProduct.name || catalogProduct.sku,
      sku: catalogProduct.sku,
      description: catalogProduct.description,
      price: this.getCatalogPrice(catalogProduct),
      stockQuantity,
      trackInventory: catalogProduct.trackInventory ?? true,
      brand: catalogProduct.brand,
      mainImageUrl: catalogProduct.mainImageUrl || imageUrls[0] || null,
      imageUrls,
      images: imageUrls,
      categories: Array.isArray(catalogProduct.categories) ? catalogProduct.categories : [],
      attributes: catalogProduct.attributes || [],
      seoData: catalogProduct.seoData || null,
      tags: catalogProduct.tags || [],
      variants: [],
      ownerUserId: catalogProduct.ownerUserId ?? null,
      resaleEnabled: catalogProduct.resaleEnabled ?? null,
      source: {
        authority: 'catalog-microservice',
        catalogScope: 'effective',
        type: this.catalogSourceType(catalogProduct),
        ownerUserId: catalogProduct.ownerUserId ?? null,
        resaleEnabled: catalogProduct.resaleEnabled ?? null,
      },
      quality,
      createdAt: this.dateToResponseValue(catalogProduct.createdAt),
      updatedAt: this.dateToResponseValue(catalogProduct.updatedAt),
    };
  }

  private mapCatalogOfferProduct(catalogProduct: any, availableStock: number, localProduct?: any) {
    const imageUrls = this.catalogImageUrls(catalogProduct);
    const mainImageUrl =
      catalogProduct.mainImageUrl ||
      catalogProduct.media?.find((media: any) => media?.type === 'image' && media?.isPrimary)?.url ||
      imageUrls[0] ||
      localProduct?.mainImageUrl ||
      null;
    const categories = Array.isArray(catalogProduct.categories) && catalogProduct.categories.length
      ? catalogProduct.categories
      : localProduct?.product_categories?.map((pc: any) => ({
          id: pc.categories.id,
          name: pc.categories.name,
          slug: pc.categories.slug,
          description: pc.categories.description,
          parentId: pc.categories.parentId || undefined,
        })) || [];

    return {
      id: localProduct?.id || catalogProduct.id,
      catalogProductId: catalogProduct.id,
      name: catalogProduct.title || catalogProduct.name || localProduct?.name || catalogProduct.sku,
      sku: catalogProduct.sku || localProduct?.sku,
      description: catalogProduct.description || localProduct?.description,
      price: this.getCatalogPrice(catalogProduct),
      stockQuantity: availableStock,
      trackInventory: true,
      brand: catalogProduct.brand || localProduct?.brand,
      mainImageUrl,
      imageUrls,
      images: imageUrls,
      categories,
      attributes: catalogProduct.attributes || localProduct?.attributes || [],
      seoData: catalogProduct.seoData || null,
      tags: catalogProduct.tags || [],
      variants: localProduct?.product_variants?.map((variant: any) => ({
        id: variant.id,
        productId: variant.productId,
        name: variant.name,
        sku: variant.sku,
        price: Number(variant.price),
        stockQuantity: variant.stockQuantity,
        attributes: variant.options as Record<string, string> | undefined,
      })) || [],
      createdAt: this.dateToResponseValue(localProduct?.createdAt || catalogProduct.createdAt),
      updatedAt: this.dateToResponseValue(catalogProduct.updatedAt || localProduct?.updatedAt),
      warehouse: {
        stockQuantity: availableStock,
        trackInventory: true,
        availability: 'in_stock',
        source: 'warehouse-microservice',
      },
    };
  }

  private dateToResponseValue(value: any) {
    if (!value) {
      return undefined;
    }
    if (typeof value.toISOString === 'function') {
      return value.toISOString();
    }
    return value;
  }

  /**
   * Map product to response format
   */
  private mapProduct(product: any, warehouseData?: Map<string, any>) {
    const sku = product.sku;
    const warehouse = warehouseData?.get(sku);

    // Use warehouse data from Allegro if available, otherwise use local stockQuantity
    const stockQuantity = warehouse?.stockQuantity ?? product.stockQuantity ?? 0;
    const trackInventory = warehouse?.trackInventory ?? product.trackInventory ?? false;

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: Number(product.price),
      stockQuantity,
      trackInventory,
      // Include warehouse data if available
      ...(warehouse && {
        warehouse: {
          stockQuantity: warehouse.stockQuantity,
          trackInventory: warehouse.trackInventory,
          availability: warehouse.availability,
          minimumRequiredStockQuantity: warehouse.minimumRequiredStockQuantity,
          updatedAt: warehouse.updatedAt,
          source: 'allegro',
        },
      }),
      brand: product.brand,
      mainImageUrl: product.mainImageUrl,
      imageUrls: (product.imageUrls as string[]) || [],
      images: (product.imageUrls as string[]) || [],
      categories: product.product_categories?.map((pc: any) => ({
        id: pc.categories.id,
        name: pc.categories.name,
        description: pc.categories.description,
        parentId: pc.categories.parentId || undefined,
      })),
      variants: product.product_variants?.map((v: any) => ({
        id: v.id,
        productId: v.productId,
        name: v.name,
        sku: v.sku,
        price: Number(v.price),
        stockQuantity: v.stockQuantity,
        attributes: v.options as Record<string, string> | undefined,
      })),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
