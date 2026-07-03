import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PaymentResultDto } from './dto/payment-result.dto';
import { UpdateOrderPaymentStatusDto } from './dto/update-order-payment-status.dto';

@Controller('internal/orders')
export class OrdersInternalController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('payment-result')
  async paymentResult(
    @Headers('x-flipflop-internal-key') internalKey: string | undefined,
    @Body() body: PaymentResultDto,
  ) {
    this.ordersService.assertInternalServiceKey(internalKey);
    return this.ordersService.handlePaymentResult(body);
  }

  @Patch('by-id/:id/payment-status')
  async patchPaymentStatus(
    @Headers('x-flipflop-internal-key') internalKey: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateOrderPaymentStatusDto,
  ) {
    this.ordersService.assertInternalServiceKey(internalKey);
    return this.ordersService.updateInternalPaymentStatus(id, dto);
  }

  @Get('order-affinity/replay-candidates')
  async getOrderAffinityReplayCandidates(
    @Headers('x-flipflop-internal-key') internalKey: string | undefined,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('dryRun') dryRun?: string,
  ) {
    this.ordersService.assertAffinityReplayAccess(internalKey);
    return this.ordersService.getOrderAffinityReplayCandidates({ from, to, limit, cursor, dryRun });
  }
}
