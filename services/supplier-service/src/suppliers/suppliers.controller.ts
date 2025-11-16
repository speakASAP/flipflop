/**
 * Suppliers Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ApiResponseUtil } from '@shared/utils/api-response.util';

@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSupplierDto: CreateSupplierDto) {
    const supplier = await this.suppliersService.create(createSupplierDto);
    return ApiResponseUtil.success(supplier);
  }

  @Get()
  async findAll() {
    const suppliers = await this.suppliersService.findAll();
    return ApiResponseUtil.success(suppliers);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const supplier = await this.suppliersService.findOne(id);
    return ApiResponseUtil.success(supplier);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    const supplier = await this.suppliersService.update(id, updateSupplierDto);
    return ApiResponseUtil.success(supplier);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.suppliersService.remove(id);
    return ApiResponseUtil.success({ message: 'Supplier deleted' });
  }

  @Post(':id/sync')
  async syncProducts(@Param('id') id: string) {
    await this.suppliersService.syncProducts(id);
    return ApiResponseUtil.success({ message: 'Product sync started' });
  }
}

