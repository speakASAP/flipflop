/**
 * Invoices Controller
 * Handles invoice generation and retrieval
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { InvoiceService } from './invoice.service';
import { ApiResponseUtil } from '@shared/utils/api-response.util';
import * as fs from 'fs';
import * as path from 'path';

@Controller('invoices')
@UseGuards(AuthGuard('jwt'))
export class InvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * Generate proforma invoice for an order
   */
  @Post('proforma/:orderId')
  async generateProforma(@Param('orderId') orderId: string) {
    try {
      const proformaInvoice = await this.invoiceService.generateProformaInvoice(orderId);
      return ApiResponseUtil.success(proformaInvoice);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to generate proforma invoice: ${error.message}`);
    }
  }

  /**
   * Generate final invoice for an order
   */
  @Post('final/:orderId')
  async generateFinal(@Param('orderId') orderId: string) {
    try {
      const invoice = await this.invoiceService.generateFinalInvoice(orderId);
      return ApiResponseUtil.success(invoice);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to generate final invoice: ${error.message}`);
    }
  }

  /**
   * Download proforma invoice PDF
   */
  @Get('proforma/:invoiceId/download')
  async downloadProforma(
    @Param('invoiceId') invoiceId: string,
    @Res() res: Response,
  ) {
    try {
      const filePath = await this.invoiceService.getInvoiceFile(invoiceId, 'proforma');
      const fileName = path.basename(filePath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to download proforma invoice: ${error.message}`);
    }
  }

  /**
   * Download final invoice PDF
   */
  @Get('final/:invoiceId/download')
  async downloadFinal(@Param('invoiceId') invoiceId: string, @Res() res: Response) {
    try {
      const filePath = await this.invoiceService.getInvoiceFile(invoiceId, 'final');
      const fileName = path.basename(filePath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to download final invoice: ${error.message}`);
    }
  }
}
