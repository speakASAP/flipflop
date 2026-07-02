/**
 * Products Module
 */

import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ProductsController, CategoriesController, SellerCatalogController, AdminProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { WarehouseService } from './warehouse.service';
import {
  PrismaModule,
  AuthModule,
  LoggerModule,
  RedisModule,
  ClientsModule,
  RabbitMQModule,
} from '@flipflop/shared';
import { ProductJwtAuthGuard, ProductRolesGuard } from '../auth/product-auth.guards';
import * as https from 'https';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    LoggerModule,
    RedisModule,
    ClientsModule,
    RabbitMQModule,
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: 10000,
        maxRedirects: 5,
        httpsAgent:
          configService.get('NODE_ENV') === 'development'
            ? new https.Agent({ rejectUnauthorized: false })
            : undefined,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ProductsController, CategoriesController, SellerCatalogController, AdminProductsController],
  providers: [ProductsService, WarehouseService, ProductJwtAuthGuard, ProductRolesGuard, Reflector],
  exports: [ProductsService, WarehouseService],
})
export class ProductsModule {}

