/**
 * Analytics Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { Order } from '@shared/entities/order.entity';
import { OrderItem } from '@shared/entities/order-item.entity';
import { Product } from '@shared/entities/product.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product]),
    PassportModule,
    HttpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, JwtStrategy],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

