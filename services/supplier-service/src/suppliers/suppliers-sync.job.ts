/**
 * Suppliers Sync Job
 * Scheduled job to automatically sync products from suppliers
 */

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SuppliersService } from './suppliers.service';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class SuppliersSyncJob {
  constructor(
    private suppliersService: SuppliersService,
    private logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async syncAllSuppliers() {
    this.logger.log('Starting scheduled supplier product sync');

    try {
      const suppliers = await this.suppliersService.findAll();

      for (const supplier of suppliers) {
        if (supplier.autoSyncProducts && supplier.isActive) {
          try {
            await this.suppliersService.syncProducts(supplier.id);
          } catch (error) {
            this.logger.error(`Failed to sync supplier: ${supplier.id}`, {
              error: error.message,
              supplierId: supplier.id,
            });
          }
        }
      }

      this.logger.log('Scheduled supplier product sync completed');
    } catch (error) {
      this.logger.error('Scheduled supplier sync failed', {
        error: error.message,
      });
    }
  }
}

