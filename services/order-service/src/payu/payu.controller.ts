/**
 * PayU Payment Controller
 */

import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PayuService } from './payu.service';
import { OrdersService } from '../orders/orders.service';
import { LoggerService } from '@shared/logger/logger.service';
import { ApiResponseUtil } from '@shared/utils/api-response.util';

@Controller('payu')
export class PayuController {
  constructor(
    private payuService: PayuService,
    private ordersService: OrdersService,
    private logger: LoggerService,
  ) {}

  @Post('create-payment/:orderId')
  @UseGuards(AuthGuard('jwt'))
  async createPayment(@Param('orderId') orderId: string, @Request() req) {
    const order = await this.ordersService.findOne(orderId, req.user.id);
    // Note: In production, fetch user and delivery address from User Service
    const payment = await this.payuService.createPayment(order, req.user, order.deliveryAddress);
    return ApiResponseUtil.success(payment);
  }

  @Get('verify/:orderId')
  async verifyPayment(@Param('orderId') orderId: string) {
    const payment = await this.payuService.verifyPayment(orderId);
    return ApiResponseUtil.success(payment);
  }

  @Post('notify')
  async handleNotification(@Body() notification: any) {
    // Handle PayU payment notification
    // Verify signature and update order payment status
    // This will be implemented with proper signature verification
    return { status: 'OK' };
  }
}

