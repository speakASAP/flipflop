/**
 * Delivery Addresses Service
 */

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryAddress } from '@shared/entities/delivery-address.entity';
import { CreateDeliveryAddressDto } from './dto/create-delivery-address.dto';
import { UpdateDeliveryAddressDto } from './dto/update-delivery-address.dto';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class DeliveryAddressesService {
  constructor(
    @InjectRepository(DeliveryAddress)
    private addressRepository: Repository<DeliveryAddress>,
    private logger: LoggerService,
  ) {}

  async findByUserId(userId: string): Promise<DeliveryAddress[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async create(
    userId: string,
    createDto: CreateDeliveryAddressDto,
  ): Promise<DeliveryAddress> {
    // If this is set as default, unset other defaults
    if (createDto.isDefault) {
      await this.addressRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    const address = this.addressRepository.create({
      ...createDto,
      userId,
    });

    const savedAddress = await this.addressRepository.save(address);

    this.logger.log(`Delivery address created: ${savedAddress.id}`, {
      userId,
      addressId: savedAddress.id,
    });

    return savedAddress;
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateDeliveryAddressDto,
  ): Promise<DeliveryAddress> {
    const address = await this.addressRepository.findOne({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException(`Delivery address with id ${id} not found`);
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this address');
    }

    // If setting as default, unset other defaults
    if (updateDto.isDefault) {
      await this.addressRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(address, updateDto);
    const updatedAddress = await this.addressRepository.save(address);

    this.logger.log(`Delivery address updated: ${id}`, {
      userId,
      addressId: id,
    });

    return updatedAddress;
  }

  async delete(id: string, userId: string): Promise<void> {
    const address = await this.addressRepository.findOne({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException(`Delivery address with id ${id} not found`);
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this address');
    }

    await this.addressRepository.remove(address);

    this.logger.log(`Delivery address deleted: ${id}`, {
      userId,
      addressId: id,
    });
  }
}

