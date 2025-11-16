/**
 * Delivery Addresses Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DeliveryAddressesService } from './delivery-addresses.service';
import { CreateDeliveryAddressDto } from './dto/create-delivery-address.dto';
import { UpdateDeliveryAddressDto } from './dto/update-delivery-address.dto';
import { ApiResponseUtil } from '@shared/utils/api-response.util';

@Controller('delivery-addresses')
@UseGuards(AuthGuard('jwt'))
export class DeliveryAddressesController {
  constructor(
    private deliveryAddressesService: DeliveryAddressesService,
  ) {}

  @Get()
  async getUserAddresses(@Request() req) {
    const addresses = await this.deliveryAddressesService.findByUserId(
      req.user.id,
    );
    return ApiResponseUtil.success(addresses);
  }

  @Post()
  async createAddress(
    @Request() req,
    @Body() createDto: CreateDeliveryAddressDto,
  ) {
    const address = await this.deliveryAddressesService.create(
      req.user.id,
      createDto,
    );
    return ApiResponseUtil.success(address);
  }

  @Put(':id')
  async updateAddress(
    @Param('id') id: string,
    @Body() updateDto: UpdateDeliveryAddressDto,
    @Request() req,
  ) {
    const address = await this.deliveryAddressesService.update(
      id,
      req.user.id,
      updateDto,
    );
    return ApiResponseUtil.success(address);
  }

  @Delete(':id')
  async deleteAddress(@Param('id') id: string, @Request() req) {
    await this.deliveryAddressesService.delete(id, req.user.id);
    return ApiResponseUtil.success({ message: 'Address deleted' });
  }
}

