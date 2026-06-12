/**
 * Products Service
 * Handles product catalog operations
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, LoggerService, CatalogClientService, WarehouseClientService } from '@flipflop/shared';
import { WarehouseService } from './warehouse.service';

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
    const rawPrice = activePrice?.salePrice ?? activePrice?.basePrice ?? 0;
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
