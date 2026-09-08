import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@flipflop/shared';
import { OrdersService } from './orders.service';
import { PaymentResultDto } from './dto/payment-result.dto';
import { UpdateOrderPaymentStatusDto } from './dto/update-order-payment-status.dto';

@Controller('internal/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersInternalController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('payment-result')
  @Roles('internal:flipflop-service:service')
  async paymentResult(@Body() body: PaymentResultDto) {
    return this.ordersService.handlePaymentResult(body);
  }

  @Patch('by-id/:id/payment-status')
  @Roles('internal:flipflop-service:service')
  async patchPaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderPaymentStatusDto,
  ) {
    return this.ordersService.updateInternalPaymentStatus(id, dto);
  }

  @Get('order-affinity/replay-candidates')
  @Roles('internal:flipflop-service:order-affinity')
  async getOrderAffinityReplayCandidates(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('dryRun') dryRun?: string,
  ) {
    return this.ordersService.getOrderAffinityReplayCandidates({ from, to, limit, cursor, dryRun });
  }
}
