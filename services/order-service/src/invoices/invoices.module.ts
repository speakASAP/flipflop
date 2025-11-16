/**
 * Invoices Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '@shared/entities/invoice.entity';
import { ProformaInvoice } from '@shared/entities/proforma-invoice.entity';
import { Order } from '@shared/entities/order.entity';
import { OrderItem } from '@shared/entities/order-item.entity';
import { CompanySettings } from '@shared/entities/company-settings.entity';
import { InvoiceService } from './invoice.service';
import { InvoicesController } from './invoices.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, ProformaInvoice, Order, OrderItem, CompanySettings]),
  ],
  controllers: [InvoicesController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoicesModule {}
