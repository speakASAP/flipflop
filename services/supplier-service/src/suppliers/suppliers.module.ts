/**
 * Suppliers Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Supplier } from '@shared/entities/supplier.entity';
import { SupplierProduct } from '@shared/entities/supplier-product.entity';
import { Product } from '@shared/entities/product.entity';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SuppliersSyncJob } from './suppliers-sync.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, SupplierProduct, Product]),
    HttpModule,
  ],
  controllers: [SuppliersController],
  providers: [SuppliersService, SuppliersSyncJob],
  exports: [SuppliersService],
})
export class SuppliersModule {}

