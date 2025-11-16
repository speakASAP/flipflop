/**
 * Orders Controller
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiResponseUtil } from '@shared/utils/api-response.util';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async createOrder(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.createOrder(
      req.user.id,
      createOrderDto,
    );
    return ApiResponseUtil.success(order);
  }

  @Get()
  async getUserOrders(@Request() req) {
    const orders = await this.ordersService.findAll(req.user.id);
    return ApiResponseUtil.success(orders);
  }

  @Get(':id')
  async getOrder(@Param('id') id: string, @Request() req) {
    const order = await this.ordersService.findOne(id, req.user.id);
    return ApiResponseUtil.success(order);
  }
}

