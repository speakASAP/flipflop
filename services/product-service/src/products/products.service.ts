/**
 * Products Service
 * Handles product catalog operations
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, LoggerService, CatalogClientService, WarehouseClientService } from '@flipflop/shared';
import { WarehouseService } from './warehouse.service';

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
  attempt?: Record<string, any>;
  dependencyStatus?: number | null;
  dependencyMessage?: string | null;
};

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
  ) {}

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

  /**
   * Get products with pagination and filtering
   * Fetches from catalog-microservice and enriches with stock from warehouse-microservice
   */
  async getProducts(filters: any) {
    try {
      const resolvedCategoryId = await this.resolveCategoryId(filters.categoryId, filters.category);

      // Fetch products from catalog-microservice
      // Note: catalog client only supports: search, isActive, categoryId, page, limit
      const catalogResult = await this.catalogClient.searchProducts({
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        search: filters.search,
        categoryId: resolvedCategoryId,
        isActive: filters.isActive !== undefined ? filters.isActive : true,
      });
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

      // Always fetch stock from warehouse-microservice (unless explicitly disabled)
      // This ensures real stock quantities are displayed instead of 0
      let warehouseData: Map<string, any> = new Map();
      const shouldIncludeWarehouse = filters.includeWarehouse !== 'false' && filters.includeWarehouse !== false;
      if (shouldIncludeWarehouse) {
        const productIds = catalogResult.items.map((p: any) => p.id);
        if (productIds.length > 0) {
          this.logger.log(`Fetching warehouse stock for ${productIds.length} products`, 'ProductsService');
          // Get stock for all products
          const stockPromises = productIds.map(async (productId: string) => {
            try {
              // Use getTotalAvailable to get stock quantity
              const totalAvailable = await this.warehouseClient.getTotalAvailable(productId);
              return { productId, stock: { available: totalAvailable } };
            } catch (error: any) {
              // Log warning but don't fail the request - products will show 0 stock
              this.logger.warn(`Failed to fetch stock for product ${productId}: ${error.message}`, 'ProductsService');
              return { productId, stock: null };
            }
          });
          const stockResults = await Promise.all(stockPromises);
          const failedStockCount = stockResults.filter(({ stock }) => !stock).length;
          stockResults.forEach(({ productId, stock }) => {
            if (stock) {
              warehouseData.set(productId, stock);
            }
          });
          if (failedStockCount > 0) {
            await this.logger.warn('OPERATIONAL_ALERT warehouse_stock_enrichment_partial_failure', {
              context: 'ProductsService',
              requestedProductCount: productIds.length,
              failedStockCount,
            });
          }
          this.logger.log(`Successfully fetched warehouse stock for ${warehouseData.size} products`, 'ProductsService');
        }
      }

      // Map catalog products to response format
      const items = catalogResult.items.map((product: any) => {
        const stock = warehouseData.get(product.id);
        const price = this.getCatalogPrice(product);
        return {
          id: product.id,
          name: product.title,
          sku: product.sku,
          description: product.description,
          price,
          stockQuantity: stock?.available || 0,
          trackInventory: true,
          brand: product.brand,
          mainImageUrl: product.media?.find((m: any) => m.type === 'image' && m.isPrimary)?.url,
          imageUrls: product.media?.filter((m: any) => m.type === 'image').map((m: any) => m.url) || [],
          images: product.media?.filter((m: any) => m.type === 'image').map((m: any) => m.url) || [],
          categories: product.categories || [],
          seoData: product.seoData || null,
          tags: product.tags || [],
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          ...(stock && {
            warehouse: {
              stockQuantity: stock.available,
              trackInventory: true,
              availability: stock.available > 0 ? 'in_stock' : 'out_of_stock',
              updatedAt: stock.updatedAt,
              source: 'warehouse-microservice',
            },
          }),
        };
      });

      return {
        items,
        pagination: {
          page: catalogResult.page,
          limit: catalogResult.limit,
          total: catalogResult.total,
          totalPages: Math.ceil(catalogResult.total / catalogResult.limit),
          hasNext: catalogResult.page < Math.ceil(catalogResult.total / catalogResult.limit),
          hasPrev: catalogResult.page > 1,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch products: ${error.message}`, error.stack, 'ProductsService');
      throw error;
    }
  }

  /**
   * Get product by ID
   * Fetches from catalog-microservice and enriches with stock from warehouse-microservice
   */
  async getProduct(id: string, includeWarehouse: boolean = true) {
    try {
      // Fetch product from catalog-microservice
      const product = await this.catalogClient.getProductById(id);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Always fetch stock from warehouse-microservice by default (unless explicitly disabled)
      // This ensures real stock quantities are displayed
      let stock = null;
      if (includeWarehouse) {
        try {
          this.logger.log(`Fetching warehouse stock for product ${id}`, 'ProductsService');
          const totalAvailable = await this.warehouseClient.getTotalAvailable(id);
          stock = { available: totalAvailable };
          this.logger.log(`Successfully fetched warehouse stock for product ${id}: ${totalAvailable}`, 'ProductsService');
        } catch (error: any) {
          // Log warning but don't fail the request - product will show 0 stock
          this.logger.warn(`Failed to fetch stock for product ${id}: ${error.message}`, 'ProductsService');
          await this.logger.warn('OPERATIONAL_ALERT warehouse_stock_enrichment_failure', {
            context: 'ProductsService',
            productId: id,
          });
        }
      }

      // Map to response format
      const price = this.getCatalogPrice(product);
      return {
        id: product.id,
        name: product.title,
        sku: product.sku,
        description: product.description,
        price,
        stockQuantity: stock?.available || 0,
        trackInventory: true,
        brand: product.brand,
        mainImageUrl: product.media?.find((m: any) => m.type === 'image' && m.isPrimary)?.url,
        imageUrls: product.media?.filter((m: any) => m.type === 'image').map((m: any) => m.url) || [],
        images: product.media?.filter((m: any) => m.type === 'image').map((m: any) => m.url) || [],
        categories: product.categories || [],
        attributes: product.attributes || [],
        seoData: product.seoData || null,
        tags: product.tags || [],
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        ...(stock && {
          warehouse: {
            stockQuantity: stock.available,
            trackInventory: true,
            availability: stock.available > 0 ? 'in_stock' : 'out_of_stock',
            updatedAt: stock.updatedAt,
            source: 'warehouse-microservice',
          },
        }),
      };
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

  async getCatalogPublishStatus(catalogProductId: string) {
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
    const status = latest?.status || (localProduct?.isActive ? 'published' : 'not_published');

    return {
      success: true,
      action: 'read_flipflop_publish_status',
      authority: 'flipflop',
      catalogProductId,
      productId: catalogProductId,
      marketplace: 'flipflop',
      status,
      published: status === 'published' || Boolean(localProduct?.isActive && !latest),
      blocked: status === 'blocked' || status === 'failed',
      listingUrl: this.flipFlopListingUrl(catalogProductId),
      flipflopProductId: localProduct?.id || latest?.flipflopProductId || null,
      latestAttempt: latest,
      nextAction: status === 'published' ? 'view_flipflop_listing' : 'publish_flipflop_listing',
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
      const policySnapshot = await this.catalogProductPublishPolicy(catalogProduct);

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

  private async catalogProductPublishPolicy(catalogProduct: any) {
    const blockedReasons: Array<{ reason: string; message: string }> = [];
    const price = this.getCatalogPrice(catalogProduct);
    let availableStock = 0;

    if (!catalogProduct?.id) {
      blockedReasons.push({ reason: 'catalog_product_missing', message: 'Catalog product was not returned by catalog-microservice.' });
    }
    if (!catalogProduct?.sku) {
      blockedReasons.push({ reason: 'sku_required', message: 'Catalog product SKU is required before FlipFlop publication.' });
    }
    if (catalogProduct?.isActive === false) {
      blockedReasons.push({ reason: 'inactive_product', message: 'Only active Catalog products can be published to FlipFlop.' });
    }
    if (price <= 0) {
      blockedReasons.push({ reason: 'price_required', message: 'A positive Catalog price is required before FlipFlop publication.' });
    }

    try {
      availableStock = this.toPositiveInteger(await this.warehouseClient.getTotalAvailable(catalogProduct.id));
    } catch (error: any) {
      blockedReasons.push({
        reason: 'warehouse_stock_unavailable',
        message: `Warehouse stock preflight failed: ${error?.message || 'unknown error'}`,
      });
    }

    if (availableStock <= 0) {
      blockedReasons.push({ reason: 'warehouse_stock_unavailable', message: 'Warehouse has no sellable stock for this product.' });
    }

    return {
      publishable: blockedReasons.length === 0,
      blockedReasons,
      price,
      availableStock,
      source: 'catalog-microservice+warehouse-microservice',
      mutatesCatalog: false,
      mutatesPrices: false,
    };
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
      nextAction: 'resolve_flipflop_requirements',
      availableStock: policySnapshot.availableStock,
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
