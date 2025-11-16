/**
 * Cart Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApiResponseUtil } from '@shared/utils/api-response.util';

@Controller('cart')
@UseGuards(AuthGuard('jwt'))
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  async getCart(@Request() req) {
    const cart = await this.cartService.getUserCart(req.user.id);
    return ApiResponseUtil.success(cart);
  }

  @Post('items')
  async addToCart(@Request() req, @Body() addToCartDto: AddToCartDto) {
    const cartItem = await this.cartService.addToCart(
      req.user.id,
      addToCartDto,
    );
    return ApiResponseUtil.success(cartItem);
  }

  @Put('items/:id')
  async updateCartItem(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateCartItemDto,
  ) {
    const cartItem = await this.cartService.updateCartItem(
      id,
      req.user.id,
      updateDto,
    );
    return ApiResponseUtil.success(cartItem);
  }

  @Delete('items/:id')
  async removeFromCart(@Param('id') id: string, @Request() req) {
    await this.cartService.removeFromCart(id, req.user.id);
    return ApiResponseUtil.success({ message: 'Item removed from cart' });
  }

  @Delete()
  async clearCart(@Request() req) {
    await this.cartService.clearCart(req.user.id);
    return ApiResponseUtil.success({ message: 'Cart cleared' });
  }
}

