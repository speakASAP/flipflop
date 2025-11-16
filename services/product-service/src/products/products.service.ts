/**
 * Products Service
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Product } from '@shared/entities/product.entity';
import { Category } from '@shared/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private logger: LoggerService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({
      ...createProductDto,
      stockQuantity: createProductDto.stockQuantity || 0,
      trackInventory: createProductDto.trackInventory ?? false,
      isActive: true,
    });

    // Handle categories if provided
    if (createProductDto.categoryIds && createProductDto.categoryIds.length > 0) {
      const categories = await this.categoryRepository.findBy({
        id: createProductDto.categoryIds[0] as any,
      });
      // For multiple IDs, use In operator
      if (createProductDto.categoryIds.length > 1) {
        const allCategories = await this.categoryRepository
          .createQueryBuilder('category')
          .where('category.id IN (:...ids)', { ids: createProductDto.categoryIds })
          .getMany();
        product.categories = allCategories;
      } else {
        product.categories = categories;
      }
    }

    const savedProduct = await this.productRepository.save(product);

    this.logger.log(`Product created: ${savedProduct.id}`, {
      productId: savedProduct.id,
      sku: savedProduct.sku,
    });

    return savedProduct;
  }

  async findAll(query: ProductQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryIds,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      minPrice,
      maxPrice,
      brand,
    } = query;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categories', 'category')
      .where('product.isActive = :isActive', { isActive: true });

    // Search
    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product.sku ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Categories filter
    if (categoryIds && categoryIds.length > 0) {
      queryBuilder.andWhere('category.id IN (:...categoryIds)', {
        categoryIds,
      });
    }

    // Price range
    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    // Brand filter
    if (brand) {
      queryBuilder.andWhere('product.brand = :brand', { brand });
    }

    // Sorting
    queryBuilder.orderBy(`product.${sortBy}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['categories', 'variants'],
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return product;
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { sku },
      relations: ['categories'],
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    Object.assign(product, updateProductDto);

    // Handle categories update
    if (updateProductDto.categoryIds !== undefined) {
      if (updateProductDto.categoryIds.length > 0) {
        const categories = await this.categoryRepository
          .createQueryBuilder('category')
          .where('category.id IN (:...ids)', { ids: updateProductDto.categoryIds })
          .getMany();
        product.categories = categories;
      } else {
        product.categories = [];
      }
    }

    const updatedProduct = await this.productRepository.save(product);

    this.logger.log(`Product updated: ${id}`, {
      productId: id,
    });

    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);

    this.logger.log(`Product deleted: ${id}`, {
      productId: id,
    });
  }
}

