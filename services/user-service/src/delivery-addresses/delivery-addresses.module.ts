/**
 * Delivery Addresses Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryAddress } from '@shared/entities/delivery-address.entity';
import { DeliveryAddressesController } from './delivery-addresses.controller';
import { DeliveryAddressesService } from './delivery-addresses.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryAddress])],
  controllers: [DeliveryAddressesController],
  providers: [DeliveryAddressesService],
  exports: [DeliveryAddressesService],
})
export class DeliveryAddressesModule {}

