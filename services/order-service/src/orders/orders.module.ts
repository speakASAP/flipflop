/**
 * Orders Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { Order } from '@shared/entities/order.entity';
import { OrderItem } from '@shared/entities/order-item.entity';
import { OrderStatusHistory } from '@shared/entities/order-status-history.entity';
import { CartItem } from '@shared/entities/cart-item.entity';
import { Product } from '@shared/entities/product.entity';
import { DeliveryAddress } from '@shared/entities/delivery-address.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { NotificationModule } from '@shared/notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderStatusHistory,
      CartItem,
      Product,
      DeliveryAddress,
    ]),
    PassportModule,
    HttpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    NotificationModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, JwtStrategy],
  exports: [OrdersService],
})
export class OrdersModule {}

