/**
 * Products Controller
 * Handles HTTP requests for product operations
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { Roles, ApiResponse } from '@flipflop/shared';
import { ProductJwtAuthGuard, ProductRolesGuard } from '../auth/product-auth.guards';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getProducts(@Query() query: any) {
    const result = await this.productsService.getProducts(query);
    return ApiResponse.success(result);
  }

  @Get(':id')
  async getProduct(
    @Param('id') id: string,
    @Query('includeWarehouse') includeWarehouse?: string,
  ) {
    // Default to true (include warehouse data) unless explicitly set to false
    const includeWarehouseData = includeWarehouse !== 'false' && includeWarehouse !== '0';
    const product = await this.productsService.getProduct(id, includeWarehouseData);
    return ApiResponse.success(product);
  }
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getCategories() {
    const categories = await this.productsService.getCategories();
    return ApiResponse.success(categories);
  }

  @Get(':id')
  async getCategory(@Param('id') id: string) {
    const category = await this.productsService.getCategory(id);
    return ApiResponse.success(category);
  }
}

@Controller('products')
@UseGuards(ProductJwtAuthGuard, ProductRolesGuard)
@Roles('global:superadmin', 'global:platform_admin', 'app:flipflop-service:admin', 'app:catalog-microservice:admin', 'catalog:write')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':id/catalog-content-preview')
  async getCatalogContentPreview(@Request() req: any, @Param('id') id: string) {
    const preview = await this.productsService.getCatalogContentPreview(
      id,
      req.headers.authorization,
    );
    return ApiResponse.success(preview);
  }

  @Post('publish/bulk')
  async publishCatalogProducts(@Request() req: any, @Body() dto: any) {
    const result = await this.productsService.publishCatalogProductsFromCatalog(dto, {
      id: req.user?.id || req.user?.sub,
      email: req.user?.email,
      roles: req.user?.roles,
    });
    return ApiResponse.success(result);
  }

  @Get('publish/:catalogProductId/status')
  async getCatalogPublishStatus(@Param('catalogProductId') catalogProductId: string) {
    const result = await this.productsService.getCatalogPublishStatus(catalogProductId);
    return ApiResponse.success(result);
  }

  @Post()
  async createProduct(@Request() req: any, @Body() dto: any) {
    const product = await this.productsService.createProduct(dto);
    return ApiResponse.success(product);
  }

  @Put(':id')
  async updateProduct(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    const product = await this.productsService.updateProduct(id, dto);
    return ApiResponse.success(product);
  }

  @Delete(':id')
  async deleteProduct(@Request() req: any, @Param('id') id: string) {
    const result = await this.productsService.deleteProduct(id);
    return ApiResponse.success(result);
  }
}

