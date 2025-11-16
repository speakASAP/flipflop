/**
 * Cart Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { CartItem } from '@shared/entities/cart-item.entity';
import { Product } from '@shared/entities/product.entity';
import { ProductVariant } from '@shared/entities/product-variant.entity';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartItem, Product, ProductVariant]),
    PassportModule,
    HttpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [CartController],
  providers: [CartService, JwtStrategy],
  exports: [CartService],
})
export class CartModule {}

