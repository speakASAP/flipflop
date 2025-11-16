/**
 * PayU Module
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LoggerModule } from '@shared/logger/logger.module';
import { NotificationModule } from '@shared/notifications/notification.module';
import { PayuController } from './payu.controller';
import { PayuService } from './payu.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [HttpModule, LoggerModule, NotificationModule, OrdersModule],
  controllers: [PayuController],
  providers: [PayuService],
  exports: [PayuService],
})
export class PayuModule {}

