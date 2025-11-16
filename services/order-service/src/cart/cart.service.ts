/**
 * Cart Service
 */

import { Injectable, NotFoundError, ForbiddenError } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from '@shared/entities/cart-item.entity';
import { Product } from '@shared/entities/product.entity';
import { ProductVariant } from '@shared/entities/product-variant.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    private logger: LoggerService,
  ) {}

  async getUserCart(userId: string) {
    const cartItems = await this.cartItemRepository.find({
      where: { userId },
      relations: ['product', 'variant'],
    });

    const total = cartItems.reduce((sum, item) => {
      return sum + parseFloat(item.price.toString()) * item.quantity;
    }, 0);

    return {
      items: cartItems,
      total,
      itemCount: cartItems.length,
    };
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const { productId, variantId, quantity } = addToCartDto;

    // Get product
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product', productId);
    }

    // Get variant if provided
    let variant: ProductVariant | null = null;
    let price = product.price;

    if (variantId) {
      variant = await this.variantRepository.findOne({
        where: { id: variantId, productId },
      });

      if (!variant) {
        throw new NotFoundError('Product variant', variantId);
      }

      price = variant.price;
    }

    // Check if item already exists in cart
    const existingItem = await this.cartItemRepository.findOne({
      where: {
        userId,
        productId,
        variantId: variantId || null,
      },
    });

    if (existingItem) {
      // Update quantity
      existingItem.quantity += quantity;
      existingItem.price = price; // Update price in case it changed
      const updatedItem = await this.cartItemRepository.save(existingItem);

      this.logger.log(`Cart item updated: ${updatedItem.id}`, {
        userId,
        cartItemId: updatedItem.id,
      });

      return updatedItem;
    }

    // Create new cart item
    const cartItem = this.cartItemRepository.create({
      userId,
      productId,
      variantId: variantId || null,
      quantity,
      price,
    });

    const savedItem = await this.cartItemRepository.save(cartItem);

    this.logger.log(`Item added to cart: ${savedItem.id}`, {
      userId,
      cartItemId: savedItem.id,
      productId,
    });

    return savedItem;
  }

  async updateCartItem(
    id: string,
    userId: string,
    updateDto: UpdateCartItemDto,
  ) {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id },
    });

    if (!cartItem) {
      throw new NotFoundError('Cart item', id);
    }

    if (cartItem.userId !== userId) {
      throw new ForbiddenError('Not authorized to update this cart item');
    }

    cartItem.quantity = updateDto.quantity;
    const updatedItem = await this.cartItemRepository.save(cartItem);

    this.logger.log(`Cart item updated: ${id}`, {
      userId,
      cartItemId: id,
    });

    return updatedItem;
  }

  async removeFromCart(id: string, userId: string) {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id },
    });

    if (!cartItem) {
      throw new NotFoundError('Cart item', id);
    }

    if (cartItem.userId !== userId) {
      throw new ForbiddenError('Not authorized to remove this cart item');
    }

    await this.cartItemRepository.remove(cartItem);

    this.logger.log(`Item removed from cart: ${id}`, {
      userId,
      cartItemId: id,
    });
  }

  async clearCart(userId: string) {
    await this.cartItemRepository.delete({ userId });

    this.logger.log(`Cart cleared for user: ${userId}`, { userId });
  }
}

