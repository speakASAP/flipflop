/**
 * Invoice Service
 * Handles invoice generation (proforma and final invoices)
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '@shared/entities/order.entity';
import { Invoice } from '@shared/entities/invoice.entity';
import { ProformaInvoice } from '@shared/entities/proforma-invoice.entity';
import { OrderItem } from '@shared/entities/order-item.entity';
import { CompanySettings } from '@shared/entities/company-settings.entity';
import { LoggerService } from '@shared/logger/logger.service';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InvoiceService {
  private readonly invoicesDir: string;

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(ProformaInvoice)
    private proformaInvoiceRepository: Repository<ProformaInvoice>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(CompanySettings)
    private companySettingsRepository: Repository<CompanySettings>,
    private dataSource: DataSource,
    private logger: LoggerService,
  ) {
    // Create invoices directory if it doesn't exist
    this.invoicesDir = path.join(process.cwd(), 'invoices');
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  /**
   * Generate proforma invoice for an order
   */
  async generateProformaInvoice(orderId: string): Promise<ProformaInvoice> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user', 'deliveryAddress', 'items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Check if proforma invoice already exists
    const existingProforma = await this.proformaInvoiceRepository.findOne({
      where: { orderId },
    });

    if (existingProforma) {
      return existingProforma;
    }

    // Generate proforma invoice number
    const proformaNumber = await this.generateProformaNumber();

    // Prepare invoice data
    const invoiceData = await this.prepareInvoiceData(order, 'proforma');

    // Generate PDF
    const fileUrl = await this.generatePDF(invoiceData, proformaNumber, 'proforma');

    // Create proforma invoice record
    const proformaInvoice = this.proformaInvoiceRepository.create({
      orderId: order.id,
      proformaNumber,
      fileUrl,
      invoiceData,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    const saved = await this.proformaInvoiceRepository.save(proformaInvoice);

    this.logger.log(`Proforma invoice generated: ${proformaNumber}`, {
      orderId: order.id,
      proformaNumber,
    });

    return saved;
  }

  /**
   * Generate final invoice for an order (after payment)
   */
  async generateFinalInvoice(orderId: string): Promise<Invoice> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user', 'deliveryAddress', 'items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.paymentStatus !== 'paid') {
      throw new Error('Cannot generate final invoice for unpaid order');
    }

    // Check if invoice already exists
    const existingInvoice = await this.invoiceRepository.findOne({
      where: { orderId },
    });

    if (existingInvoice) {
      return existingInvoice;
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Prepare invoice data
    const invoiceData = await this.prepareInvoiceData(order, 'final');

    // Generate PDF
    const fileUrl = await this.generatePDF(invoiceData, invoiceNumber, 'final');

    // Create invoice record
    const invoice = this.invoiceRepository.create({
      orderId: order.id,
      invoiceNumber,
      fileUrl,
      invoiceData,
      issuedAt: new Date(),
      paidAt: order.paymentStatus === 'paid' ? new Date() : null,
    });

    const saved = await this.invoiceRepository.save(invoice);

    this.logger.log(`Final invoice generated: ${invoiceNumber}`, {
      orderId: order.id,
      invoiceNumber,
    });

    return saved;
  }

  /**
   * Get invoice PDF file path
   */
  async getInvoiceFile(invoiceId: string, type: 'proforma' | 'final'): Promise<string> {
    let invoice: ProformaInvoice | Invoice | null;

    if (type === 'proforma') {
      invoice = await this.proformaInvoiceRepository.findOne({
        where: { id: invoiceId },
      });
    } else {
      invoice = await this.invoiceRepository.findOne({
        where: { id: invoiceId },
      });
    }

    if (!invoice || !invoice.fileUrl) {
      throw new NotFoundException('Invoice file not found');
    }

    const filePath = path.join(process.cwd(), invoice.fileUrl);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Invoice PDF file not found on disk');
    }

    return filePath;
  }

  /**
   * Prepare invoice data for PDF generation
   */
  private async prepareInvoiceData(order: Order, type: 'proforma' | 'final'): Promise<any> {
    // Get company settings
    const companySettings = await this.companySettingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    const company = companySettings || {
      name: 'flipflop.statex.cz',
      address: 'Czech Republic',
      city: null,
      postalCode: null,
      country: 'Česká republika',
      ico: '12345678',
      dic: 'CZ12345678',
      phone: '+420 123 456 789',
      email: 'info@flipflop.statex.cz',
      website: 'https://flipflop.statex.cz',
    };

    return {
      type,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      invoiceNumber: type === 'proforma' ? null : null, // Will be set during generation
      customer: {
        name: `${order.user.firstName} ${order.user.lastName}`,
        email: order.user.email,
        phone: order.user.phone,
      },
      deliveryAddress: {
        name: `${order.deliveryAddress.firstName} ${order.deliveryAddress.lastName}`,
        street: order.deliveryAddress.street,
        city: order.deliveryAddress.city,
        postalCode: order.deliveryAddress.postalCode,
        country: order.deliveryAddress.country || 'Česká republika',
        phone: order.deliveryAddress.phone,
      },
      items: order.items.map((item) => ({
        name: item.productName,
        sku: item.productSku,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
        totalPrice: parseFloat(item.totalPrice.toString()),
      })),
      totals: {
        subtotal: parseFloat(order.subtotal.toString()),
        tax: parseFloat(order.tax.toString()),
        shipping: parseFloat(order.shippingCost.toString()),
        discount: parseFloat(order.discount.toString()),
        total: parseFloat(order.total.toString()),
      },
      company: {
        name: company.name,
        address: company.address || company.city || 'Czech Republic',
        city: company.city,
        postalCode: company.postalCode,
        country: company.country || 'Česká republika',
        ico: company.ico,
        dic: company.dic,
        phone: company.phone,
        email: company.email,
        website: company.website,
      },
    };
  }

  /**
   * Generate PDF invoice
   */
  private async generatePDF(
    invoiceData: any,
    invoiceNumber: string,
    type: 'proforma' | 'final',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileName = `${type === 'proforma' ? 'PRO' : 'INV'}-${invoiceNumber}.pdf`;
      const filePath = path.join(this.invoicesDir, fileName);

      const PDFDoc = PDFDocument as any;
      const doc = new PDFDoc({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text(type === 'proforma' ? 'PROFORMA FAKTURA' : 'FAKTURA', 50, 50);
      doc.fontSize(12).text(`Číslo: ${invoiceNumber}`, 50, 80);
      doc.text(`Datum vystavení: ${new Date().toLocaleDateString('cs-CZ')}`, 50, 95);

      // Company info (right side)
      doc.fontSize(10);
      doc.text(invoiceData.company.name, 400, 50);
      if (invoiceData.company.address) {
        doc.text(invoiceData.company.address, 400, 65);
      }
      if (invoiceData.company.city && invoiceData.company.postalCode) {
        doc.text(
          `${invoiceData.company.postalCode} ${invoiceData.company.city}`,
          400,
          invoiceData.company.address ? 80 : 65,
        );
      }
      if (invoiceData.company.ico) {
        doc.text(`IČO: ${invoiceData.company.ico}`, 400, invoiceData.company.address ? 95 : 80);
      }
      if (invoiceData.company.dic) {
        doc.text(`DIČ: ${invoiceData.company.dic}`, 400, invoiceData.company.ico ? 110 : 95);
      }
      if (invoiceData.company.phone) {
        doc.text(`Tel: ${invoiceData.company.phone}`, 400, invoiceData.company.dic ? 125 : 110);
      }
      if (invoiceData.company.email) {
        doc.text(`Email: ${invoiceData.company.email}`, 400, invoiceData.company.phone ? 140 : 125);
      }

      // Customer info
      doc.fontSize(12).text('Odběratel:', 50, 150);
      doc.fontSize(10);
      doc.text(invoiceData.customer.name, 50, 170);
      doc.text(invoiceData.customer.email, 50, 185);
      if (invoiceData.customer.phone) {
        doc.text(invoiceData.customer.phone, 50, 200);
      }

      // Delivery address
      doc.fontSize(12).text('Doručovací adresa:', 50, 230);
      doc.fontSize(10);
      doc.text(invoiceData.deliveryAddress.name, 50, 250);
      doc.text(invoiceData.deliveryAddress.street, 50, 265);
      doc.text(
        `${invoiceData.deliveryAddress.postalCode} ${invoiceData.deliveryAddress.city}`,
        50,
        280,
      );
      doc.text(invoiceData.deliveryAddress.country, 50, 295);

      // Items table
      let y = 330;
      doc.fontSize(12).text('Položky:', 50, y);
      y += 20;

      // Table header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Název', 50, y);
      doc.text('SKU', 200, y);
      doc.text('Množství', 300, y);
      doc.text('Cena', 380, y);
      doc.text('Celkem', 450, y);
      y += 15;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;

      // Items
      doc.font('Helvetica');
      invoiceData.items.forEach((item: any) => {
        doc.text(item.name.substring(0, 30), 50, y);
        doc.text(item.sku, 200, y);
        doc.text(item.quantity.toString(), 300, y);
        doc.text(`${item.unitPrice.toFixed(2)} Kč`, 380, y);
        doc.text(`${item.totalPrice.toFixed(2)} Kč`, 450, y);
        y += 20;
      });

      // Totals
      y += 10;
      doc.moveTo(350, y).lineTo(550, y).stroke();
      y += 15;

      doc.fontSize(10);
      doc.text('Mezisoučet:', 350, y);
      doc.text(`${invoiceData.totals.subtotal.toFixed(2)} Kč`, 450, y);
      y += 15;

      if (invoiceData.totals.discount > 0) {
        doc.text('Sleva:', 350, y);
        doc.text(`-${invoiceData.totals.discount.toFixed(2)} Kč`, 450, y);
        y += 15;
      }

      if (invoiceData.totals.shipping > 0) {
        doc.text('Doprava:', 350, y);
        doc.text(`${invoiceData.totals.shipping.toFixed(2)} Kč`, 450, y);
        y += 15;
      }

      if (invoiceData.totals.tax > 0) {
        doc.text('DPH:', 350, y);
        doc.text(`${invoiceData.totals.tax.toFixed(2)} Kč`, 450, y);
        y += 15;
      }

      doc.moveTo(350, y).lineTo(550, y).stroke();
      y += 15;

      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Celkem:', 350, y);
      doc.text(`${invoiceData.totals.total.toFixed(2)} Kč`, 450, y);

      // Footer
      const pageHeight = doc.page.height;
      doc.fontSize(8).font('Helvetica');
      doc.text(
        'Děkujeme za váš nákup!',
        50,
        pageHeight - 50,
        { align: 'center', width: 500 },
      );

      doc.end();

      stream.on('finish', () => {
        resolve(`invoices/${fileName}`);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Generate proforma invoice number
   */
  private async generateProformaNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);
    
    const count = await this.proformaInvoiceRepository
      .createQueryBuilder('proforma')
      .where('proforma.issuedAt >= :start', { start: startOfYear })
      .andWhere('proforma.issuedAt < :end', { end: endOfYear })
      .getCount();
    
    const number = (count + 1).toString().padStart(6, '0');
    return `PRO-${year}-${number}`;
  }

  /**
   * Generate invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);
    
    const count = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.issuedAt >= :start', { start: startOfYear })
      .andWhere('invoice.issuedAt < :end', { end: endOfYear })
      .getCount();
    
    const number = (count + 1).toString().padStart(6, '0');
    return `INV-${year}-${number}`;
  }
}
