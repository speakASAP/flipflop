/**
 * Suppliers Service
 */

import { Injectable, NotFoundError } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Supplier } from '@shared/entities/supplier.entity';
import { SupplierProduct } from '@shared/entities/supplier-product.entity';
import { Product } from '@shared/entities/product.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(SupplierProduct)
    private supplierProductRepository: Repository<SupplierProduct>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private httpService: HttpService,
    private logger: LoggerService,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.supplierRepository.create({
      ...createSupplierDto,
      isActive: createSupplierDto.isActive ?? true,
    });

    const savedSupplier = await this.supplierRepository.save(supplier);

    this.logger.log(`Supplier created: ${savedSupplier.id}`, {
      supplierId: savedSupplier.id,
      name: savedSupplier.name,
    });

    return savedSupplier;
  }

  async findAll(): Promise<Supplier[]> {
    return this.supplierRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: ['supplierProducts'],
    });

    if (!supplier) {
      throw new NotFoundError('Supplier', id);
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);

    Object.assign(supplier, updateSupplierDto);
    const updatedSupplier = await this.supplierRepository.save(supplier);

    this.logger.log(`Supplier updated: ${id}`, {
      supplierId: id,
    });

    return updatedSupplier;
  }

  async remove(id: string): Promise<void> {
    const supplier = await this.findOne(id);
    await this.supplierRepository.remove(supplier);

    this.logger.log(`Supplier deleted: ${id}`, {
      supplierId: id,
    });
  }

  async syncProducts(supplierId: string): Promise<void> {
    const supplier = await this.findOne(supplierId);

    if (!supplier.apiUrl || !supplier.apiKey) {
      throw new Error('Supplier API configuration is missing');
    }

    try {
      // Fetch products from supplier API
      const response = await firstValueFrom(
        this.httpService.get(`${supplier.apiUrl}/products`, {
          headers: {
            'Authorization': `Bearer ${supplier.apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const supplierProducts = response.data.products || response.data || [];

      // Process and sync products
      for (const supplierProduct of supplierProducts) {
        await this.syncProduct(supplier, supplierProduct);
      }

      // Update last sync timestamp
      supplier.supplierProducts.forEach((sp) => {
        sp.lastSyncedAt = new Date();
      });
      await this.supplierRepository.save(supplier);

      this.logger.log(`Products synced for supplier: ${supplierId}`, {
        supplierId,
        productCount: supplierProducts.length,
      });
    } catch (error) {
      this.logger.error('Product sync failed', {
        error: error.message,
        supplierId,
      });
      throw error;
    }
  }

  private async syncProduct(supplier: Supplier, supplierProductData: any): Promise<void> {
    // Find or create product
    let product = await this.productRepository.findOne({
      where: { sku: supplierProductData.sku },
    });

    if (!product) {
      // Create new product from supplier data
      product = this.productRepository.create({
        name: supplierProductData.name || 'Unknown Product',
        sku: supplierProductData.sku,
        description: supplierProductData.description,
        price: supplierProductData.price,
        stockQuantity: supplierProductData.stock || 0,
        isActive: true,
      });
      product = await this.productRepository.save(product);
    }

    // Create or update supplier product mapping
    let supplierProduct = await this.supplierProductRepository.findOne({
      where: {
        supplierId: supplier.id,
        supplierSku: supplierProductData.sku,
      },
    });

    if (!supplierProduct) {
      supplierProduct = this.supplierProductRepository.create({
        supplierId: supplier.id,
        productId: product.id,
        supplierSku: supplierProductData.sku,
        supplierPrice: supplierProductData.price,
        supplierStock: supplierProductData.stock,
        supplierData: supplierProductData,
      });
    } else {
      supplierProduct.supplierPrice = supplierProductData.price;
      supplierProduct.supplierStock = supplierProductData.stock;
      supplierProduct.supplierData = supplierProductData;
      supplierProduct.lastSyncedAt = new Date();
    }

    await this.supplierProductRepository.save(supplierProduct);
  }
}

