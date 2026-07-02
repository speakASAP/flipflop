/**
 * Cart Service
 * Handles shopping cart operations
 */

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService, LoggerService, WarehouseClientService, CatalogClientService } from '@flipflop/shared';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly warehouseClient: WarehouseClientService,
    private readonly catalogClient: CatalogClientService,
  ) {}

  /**
   * Get user's cart with product details
   */
  async getCart(userId: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        products: true,
        product_variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = [];

    for (const item of cartItems) {
      try {
        if (!item.products || !item.products.isActive) {
          throw new BadRequestException('Product is not available');
        }

        const availableStock = await this.getSellableStock(item.products.id, item.products.catalogProductId);
        if (availableStock <= 0) {
          throw new BadRequestException('Product is not available');
        }

        let currentItem = item;
        if (item.quantity > availableStock) {
          currentItem = await this.prisma.cartItem.update({
            where: { id: item.id },
            data: { quantity: availableStock },
            include: {
              products: true,
              product_variants: true,
            },
          });
          await this.logger.warn('OPERATIONAL_ALERT flipflop_cart_quantity_reduced_to_stock', {
            context: 'CartService',
            userId,
            cartItemId: item.id,
            productId: item.productId,
            requestedQuantity: item.quantity,
            availableStock,
          });
        }

        items.push(this.mapCartItem({
          ...currentItem,
          products: currentItem.products
            ? { ...currentItem.products, stockQuantity: availableStock }
            : currentItem.products,
        }));
      } catch (error: any) {
        await this.prisma.cartItem.delete({ where: { id: item.id } }).catch((deleteError: any) => {
          this.logger.error(
            `Failed to remove unavailable cart item ${item.id}: ${deleteError.message}`,
            deleteError.stack,
            'CartService',
          );
        });
        await this.logger.warn('OPERATIONAL_ALERT flipflop_cart_unavailable_item_removed', {
          context: 'CartService',
          userId,
          cartItemId: item.id,
          productId: item.productId,
          catalogProductId: item.products?.catalogProductId || null,
          reason: error?.message || 'Product is not available',
        });
      }
    }

    const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

    return {
      items,
      total: Number(total.toFixed(2)),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  /**
   * Add item to cart
   */
  async addToCart(userId: string, productId: string, variantId: string | undefined, quantity: number) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { product_variants: variantId ? { where: { id: variantId } } : false },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    // Verify variant if provided
    if (variantId) {
      const variant = product.product_variants?.find((v) => v.id === variantId);
      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }
      if (!variant.isActive) {
        throw new BadRequestException('Product variant is not available');
      }
    }

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
        variantId: variantId || null,
      },
    });

    if (existingItem) {
      throw new ConflictException('Product is already in your cart');
    }

    // Check stock availability from warehouse-microservice
    await this.checkStockAvailability(productId, product.catalogProductId, quantity);

    // Get price from variant or product
    let price: number;
    if (variantId && product.product_variants && product.product_variants.length > 0) {
      const variant = product.product_variants.find((v) => v.id === variantId);
      price = variant ? Number(variant.price) : Number(product.price);
    } else {
      price = Number(product.price);
    }

    // Create new cart item
    let cartItem;
    try {
      cartItem = await this.prisma.cartItem.create({
        data: {
          userId,
          productId,
          variantId: variantId || null,
          quantity,
          price,
        },
        include: {
          products: true,
          product_variants: true,
        },
      });
    } catch (error) {
      if (this.isUniqueCartItemConflict(error)) {
        throw new ConflictException('Product is already in your cart');
      }
      throw error;
    }

    this.logger.log('Item added to cart', { userId, cartItemId: cartItem.id });
    return this.mapCartItem(cartItem);
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(userId: string, cartItemId: string, quantity: number) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId,
      },
      include: {
        products: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Check stock availability from warehouse-microservice
    const product = cartItem.products;
    if (product) {
      if (!product.isActive) {
        throw new BadRequestException('Product is not available');
      }
      await this.checkStockAvailability(product.id, product.catalogProductId, quantity);
    }

    const updated = await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: {
        products: true,
        product_variants: true,
      },
    });

    this.logger.log('Cart item quantity updated', { userId, cartItemId: updated.id });
    return this.mapCartItem(updated);
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, cartItemId: string) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    this.logger.log('Item removed from cart', { userId, cartItemId });
    return { success: true };
  }

  /**
   * Clear user's cart
   */
  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    this.logger.log('Cart cleared', { userId });
    return { success: true };
  }

  /**
   * Check Catalog activity and Warehouse sellable stock.
   */
  private async checkStockAvailability(productId: string, catalogProductId: string | null, quantity: number): Promise<void> {
    const totalAvailable = await this.getSellableStock(productId, catalogProductId);
    if (totalAvailable < quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${totalAvailable}, Requested: ${quantity}`);
    }
  }

  private async getSellableStock(productId: string, catalogProductId: string | null): Promise<number> {
    if (!catalogProductId) {
      await this.logger.warn('OPERATIONAL_ALERT flipflop_cart_unlinked_product_blocked', {
        context: 'CartService',
        productId,
      });
      throw new BadRequestException('Product is not available');
    }

    let catalogProduct: any;
    try {
      catalogProduct = await this.catalogClient.getProductById(catalogProductId);
    } catch (error: any) {
      await this.logger.warn('OPERATIONAL_ALERT flipflop_cart_catalog_lookup_failed', {
        context: 'CartService',
        productId,
        catalogProductId,
        error: error?.message || 'unknown error',
      });
      throw new BadRequestException('Product is not available');
    }

    const blockedReason = this.catalogProductUnavailableReason(catalogProduct);
    if (blockedReason) {
      await this.logger.warn('OPERATIONAL_ALERT flipflop_cart_catalog_product_blocked', {
        context: 'CartService',
        productId,
        catalogProductId,
        blockedReason,
      });
      throw new BadRequestException('Product is not available');
    }

    try {
      return await this.warehouseClient.getTotalAvailable(catalogProductId);
    } catch (error: any) {
      this.logger.error(
        `Failed to verify Warehouse sellability for product ${productId}: ${error.message}`,
        error.stack,
        'CartService'
      );
      throw new BadRequestException('Stock verification failed. Please try again shortly.');
    }
  }

  private catalogProductUnavailableReason(catalogProduct: any): string | null {
    if (!catalogProduct?.id) {
      return 'catalog_product_missing';
    }
    if (catalogProduct.isActive === false) {
      return 'inactive_product';
    }
    if (catalogProduct.isArchived === true || catalogProduct.archived === true || catalogProduct.archivedAt) {
      return 'archived_product';
    }
    if (catalogProduct.isDeleted === true || catalogProduct.deleted === true || catalogProduct.deletedAt) {
      return 'deleted_product';
    }

    const status = String(
      catalogProduct.lifecycleStatus ?? catalogProduct.lifecycle ?? catalogProduct.status ?? '',
    ).trim().toLowerCase();
    if (['archived', 'deleted', 'inactive', 'disabled', 'retired'].includes(status)) {
      return `inactive_lifecycle:${status}`;
    }

    return null;
  }

  private isUniqueCartItemConflict(error: unknown): boolean {
    return Boolean(
      error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002',
    );
  }

  /**
   * Helper to map cart item to response format
   */
  private mapCartItem(item: any) {
    return {
      id: item.id,
      productId: item.productId,
      products: {
        id: item.products.id,
        name: item.products.name,
        sku: item.products.sku,
        description: item.products.description,
        price: Number(item.products.price),
        stockQuantity: item.products.stockQuantity,
        brand: item.products.brand,
        mainImageUrl: item.products.mainImageUrl,
        imageUrls: item.products.imageUrls as string[] | undefined,
      },
      variantId: item.variantId || undefined,
      variant: (item as any).product_variants
        ? {
            id: (item as any).product_variants.id,
            productId: (item as any).product_variants.productId,
            name: (item as any).product_variants.name,
            sku: (item as any).product_variants.sku,
            price: Number((item as any).product_variants.price),
            stockQuantity: (item as any).product_variants.stockQuantity,
            attributes: (item as any).product_variants.options as Record<string, string> | undefined,
          }
        : undefined,
      quantity: item.quantity,
      price: Number(item.price),
    };
  }
}
