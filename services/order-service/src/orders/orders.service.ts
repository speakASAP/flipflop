/**
 * Orders Service
 * Handles order creation and management
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '@flipflop/shared';
import { LoggerService } from '@flipflop/shared';
import { PaymentService } from '@flipflop/shared';
import { NotificationService } from '@flipflop/shared';
import {
  OrderStatus,
  PaymentStatus,
  OrderClientService,
  ORDER_IDEMPOTENCY_CONFLICT,
  WarehouseClientService,
  InventoryEventsPublisher,
  CustomerEventsPublisher,
  AuthService,
  LeadsClientService,
} from '@flipflop/shared';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PaymentResultDto } from './dto/payment-result.dto';
import { UpdateOrderPaymentStatusDto } from './dto/update-order-payment-status.dto';
import { UpdateAdminOrderStatusDto } from './dto/update-admin-order-status.dto';
import { CreateSupplierDeliveryDto } from './dto/create-supplier-delivery.dto';
import { DiscountService } from '../marketing/discount.service';

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private staleOrderInterval?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly leadsClient: LeadsClientService,
    private readonly orderClient: OrderClientService,
    private readonly warehouseClient: WarehouseClientService,
    private readonly discountService: DiscountService,
    private readonly inventoryEventsPublisher: InventoryEventsPublisher,
    private readonly customerEventsPublisher: CustomerEventsPublisher,
  ) {}

  private static readonly DEFAULT_LOW_STOCK_THRESHOLD = 10;

  /**
   * Admin: products tracked in inventory with stock below threshold (local DB mirror).
   */
  async getLowStockItems(thresholdParam?: string): Promise<{
    items: Array<{
      productId: string;
      productName: string;
      stock: number;
      threshold: number;
    }>;
    total: number;
  }> {
    const parsed =
      thresholdParam !== undefined && thresholdParam !== ''
        ? parseInt(thresholdParam, 10)
        : NaN;
    const threshold =
      Number.isFinite(parsed) && parsed > 0
        ? parsed
        : OrdersService.DEFAULT_LOW_STOCK_THRESHOLD;
    const products = await this.prisma.product.findMany({
      where: {
        trackInventory: true,
        stockQuantity: { lt: threshold },
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
      },
      orderBy: { stockQuantity: 'asc' },
    });
    return {
      items: products.map((p) => ({
        productId: p.id,
        productName: p.name,
        stock: p.stockQuantity,
        threshold,
      })),
      total: products.length,
    };
  }

  onModuleInit(): void {
    const hourMs = 60 * 60 * 1000;
    this.staleOrderInterval = setInterval(() => {
      void this.cancelStaleUnpaidOrders();
    }, hourMs);
  }

  onModuleDestroy(): void {
    if (this.staleOrderInterval) {
      clearInterval(this.staleOrderInterval);
    }
  }

  assertInternalServiceKey(internalKey: string | undefined): void {
    const expected = this.configService.get<string>('FLIPFLOP_INTERNAL_SERVICE_SECRET');
    if (expected && internalKey !== expected) {
      throw new UnauthorizedException('Invalid internal service key');
    }
  }

  /**
   * Reserve catalog stock in warehouse-microservice for each line (orderNumber = reservation key).
   */
  private async reserveOrderLines(orderNumber: string, orderItems: any[]): Promise<string> {
    const warehouseId = await this.requireReservationWarehouseId(orderNumber);
    const completed: Array<{ catalogProductId: string; quantity: number }> = [];
    for (const item of orderItems) {
      const product =
        item.products ||
        (await this.prisma.product.findUnique({
          where: { id: item.productId },
        }));
      const catalogProductId = this.requireReservationCatalogProductId(product, item.productId);
      try {
        await this.warehouseClient.reserveStock(
          catalogProductId,
          warehouseId,
          item.quantity,
          orderNumber,
        );
        completed.push({ catalogProductId, quantity: item.quantity });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        for (const row of completed.slice().reverse()) {
          try {
            await this.warehouseClient.unreserveStock(
              row.catalogProductId,
              warehouseId,
              row.quantity,
              orderNumber,
            );
          } catch (inner: unknown) {
            this.logger.warn('Stock reserve rollback: unreserve failed', {
              orderNumber,
              catalogProductId: row.catalogProductId,
              error: inner instanceof Error ? inner.message : String(inner),
            });
          }
        }
        this.logger.error('Stock reservation failed', { orderNumber, message });
        throw new BadRequestException(`Stock reservation failed: ${message}`);
      }
    }
    return warehouseId;
  }

  /**
   * Release reservations for order lines (best-effort; logs on failure).
   */
  private async requireReservationWarehouseId(orderNumber: string): Promise<string> {
    const warehouseId = await this.warehouseClient.getDefaultWarehouseId();
    if (!warehouseId) {
      this.logger.error('Stock reservation failed: no default warehouse', { orderNumber });
      throw new BadRequestException('[MISSING: warehouseId] Cannot create order without Warehouse reservation authority');
    }
    return warehouseId;
  }

  private requireReservationCatalogProductId(
    product: { catalogProductId?: string | null; sku?: string | null } | null | undefined,
    localProductId: string,
  ): string {
    const catalogProductId = product?.catalogProductId?.trim();
    if (!catalogProductId) {
      const productLabel = product?.sku ? `${product.sku} (${localProductId})` : localProductId;
      throw new BadRequestException(`[MISSING: catalogProductId] Product ${productLabel} cannot be reserved in Warehouse`);
    }
    return catalogProductId;
  }

  private async unreserveOrderLines(orderNumber: string, orderItems: any[]): Promise<void> {
    const warehouseId = await this.warehouseClient.getDefaultWarehouseId();
    if (!warehouseId) {
      this.logger.warn('Stock unreserve skipped: no default warehouse', { orderNumber });
      return;
    }
    for (const item of orderItems) {
      const product =
        item.products ||
        (await this.prisma.product.findUnique({
          where: { id: item.productId },
        }));
      const catalogProductId = product?.catalogProductId;
      if (!catalogProductId) {
        continue;
      }
      try {
        await this.warehouseClient.unreserveStock(
          catalogProductId,
          warehouseId,
          item.quantity,
          orderNumber,
        );
      } catch (err: unknown) {
        this.logger.warn('Stock unreserve failed', {
          orderNumber,
          productId: item.productId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Hourly: cancel stale unpaid orders and release reserved stock.
   */
  async cancelStaleUnpaidOrders(): Promise<void> {
    const hours = Number(process.env.STALE_UNPAID_ORDER_HOURS || 24);
    const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 24;
    const cutoff = new Date(Date.now() - safeHours * 60 * 60 * 1000);
    const stale = await this.prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.pending,
        status: OrderStatus.pending,
        createdAt: { lt: cutoff },
      },
      include: {
        order_items: {
          include: {
            products: true,
          },
        },
      },
    });
    for (const o of stale) {
      await this.unreserveOrderLines(o.orderNumber, o.order_items);
      await this.prisma.order.update({
        where: { id: o.id },
        data: {
          paymentStatus: PaymentStatus.failed,
          status: OrderStatus.cancelled,
        },
      });
      this.logger.log('Stale unpaid order cancelled', {
        orderNumber: o.orderNumber,
        orderId: o.id,
      });
    }
  }

  /**
   * Apply payment callback from payments-microservice (via api-gateway).
   */
  async handlePaymentResult(body: PaymentResultDto): Promise<{ ok: boolean }> {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber: body.orderId },
      include: {
        order_items: true,
      },
    });

    if (!order) {
      this.logger.warn('Payment webhook: order not found', { orderNumber: body.orderId });
      return { ok: true };
    }

    const buyer = await this.prisma.user.findUnique({
      where: { id: order.userId },
    });

    if (body.status === 'completed') {
      if (order.paymentStatus === PaymentStatus.paid) {
        return { ok: true };
      }

      const meta = order.metadata as Record<string, unknown> | null;
      let pendingCode: string | undefined;
      if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
        const raw = meta.pendingDiscountCode;
        if (typeof raw === 'string' && raw.trim()) {
          pendingCode = this.discountService.normalizeCode(raw);
        }
      }

      const orderUpdate: Prisma.OrderUpdateInput = {
        paymentStatus: PaymentStatus.paid,
        status: OrderStatus.confirmed,
        paymentTransactionId: body.paymentId,
      };

      if (pendingCode) {
        const redeemed = await this.discountService.redeemCode(pendingCode, order.id);
        if (redeemed && meta && typeof meta === 'object' && !Array.isArray(meta)) {
          const nextMeta = { ...meta };
          delete nextMeta.pendingDiscountCode;
          orderUpdate.metadata =
            Object.keys(nextMeta).length > 0 ? (nextMeta as Prisma.InputJsonValue) : Prisma.DbNull;
        }
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          ...orderUpdate,
          order_status_history: {
            create: {
              status: OrderStatus.confirmed,
              notes: 'Payment completed',
            },
          },
        },
      });

      await this.tryAccrueLoyaltyPointsForOrder(order.id);

      const warehouseId = await this.warehouseClient.getDefaultWarehouseId();
      if (warehouseId) {
        for (const item of order.order_items) {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });
          const catalogProductId = product?.catalogProductId;
          if (!catalogProductId) {
            continue;
          }
          try {
            await this.warehouseClient.unreserveStock(
              catalogProductId,
              warehouseId,
              item.quantity,
              order.orderNumber,
            );
          } catch (err: unknown) {
            this.logger.warn('Stock unreserve after payment (non-fatal)', {
              orderNumber: order.orderNumber,
              productId: item.productId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
          try {
            await this.warehouseClient.decrementStock(
              catalogProductId,
              warehouseId,
              item.quantity,
              `flipflop_order:${order.orderNumber}`,
            );
            const totalAvailable = await this.warehouseClient.getTotalAvailable(catalogProductId);
            const lowTh = OrdersService.DEFAULT_LOW_STOCK_THRESHOLD;
            if (totalAvailable < lowTh) {
              void this.inventoryEventsPublisher.publishLowStock({
                productId: item.productId,
                productName: item.productName,
                currentStock: totalAvailable,
                threshold: lowTh,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error('Stock decrement failed after payment', {
              message,
              orderNumber: order.orderNumber,
              productId: item.productId,
            });
          }
        }
      }

      const paymentMeta = order.metadata as Record<string, unknown> | null;
      const guestEmail = paymentMeta && typeof paymentMeta.guestEmail === 'string'
        ? paymentMeta.guestEmail
        : undefined;
      const recipient = guestEmail || buyer?.email;
      if (recipient) {
        try {
          await this.notificationService.sendOrderConfirmation({
            to: recipient,
            orderId: order.id,
            orderNumber: order.orderNumber,
            items: order.order_items.map((item) => ({
              productName: item.productName,
              productSku: item.productSku,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice).toFixed(2),
              totalPrice: Number(item.totalPrice).toFixed(2),
            })),
            total: Number(order.total),
            currency: 'CZK',
          });
        } catch (err: unknown) {
          this.logger.error('Order confirmation email failed after payment', {
            orderId: order.id,
            email: recipient,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return { ok: true };
    }

    if (body.status === 'failed') {
      if (
        order.paymentStatus === PaymentStatus.failed &&
        order.status === OrderStatus.cancelled
      ) {
        return { ok: true };
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.failed,
          status: OrderStatus.cancelled,
        },
      });

      await this.unreserveOrderLines(order.orderNumber, order.order_items);

      return { ok: true };
    }

    return { ok: true };
  }

  /**
   * Internal PATCH for payment-related order fields.
   */
  async updateInternalPaymentStatus(
    orderId: string,
    dto: UpdateOrderPaymentStatusDto,
  ): Promise<{ ok: boolean }> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const nextStatus = dto.status !== undefined ? dto.status : order.status;
    const setFulfilledAt =
      !order.fulfilledAt &&
      (nextStatus === OrderStatus.shipped || nextStatus === OrderStatus.delivered);
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: dto.paymentStatus,
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.paymentTransactionId !== undefined
          ? { paymentTransactionId: dto.paymentTransactionId }
          : {}),
        ...(setFulfilledAt ? { fulfilledAt: new Date() } : {}),
      },
    });
    return { ok: true };
  }

  /**
   * Admin: update order status / payment / notes (any authenticated user with JWT; gateway is admin-only).
   */
  async updateAdminOrderStatus(orderId: string, dto: UpdateAdminOrderStatusDto) {
    if (dto.status === undefined && dto.paymentStatus === undefined && dto.notes === undefined) {
      throw new BadRequestException('At least one of status, paymentStatus, or notes is required');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true,
          },
        },
        delivery_addresses: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const nextStatus = dto.status !== undefined ? dto.status : order.status;
    const setFulfilledAt =
      !order.fulfilledAt &&
      (nextStatus === OrderStatus.shipped || nextStatus === OrderStatus.delivered);
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.paymentStatus !== undefined ? { paymentStatus: dto.paymentStatus } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(setFulfilledAt ? { fulfilledAt: new Date() } : {}),
      },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true,
          },
        },
        delivery_addresses: true,
      },
    });
    if (
      dto.status !== undefined &&
      dto.status === OrderStatus.confirmed &&
      order.status !== OrderStatus.confirmed
    ) {
      await this.tryAccrueLoyaltyPointsForOrder(orderId);
    }
    return this.mapOrder(updated);
  }

  private isLoyaltyPointsAwardedMetadata(metadata: unknown): boolean {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return false;
    }
    return (metadata as Record<string, unknown>).loyaltyPointsAwarded === true;
  }

  private mergeMetadataWithLoyaltyAwarded(metadata: Prisma.JsonValue | null): Prisma.InputJsonValue {
    const prev =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? { ...(metadata as Record<string, unknown>) }
        : {};
    prev.loyaltyPointsAwarded = true;
    return prev as Prisma.InputJsonValue;
  }

  /**
   * Loyalty: 1 point per 10 CZK on confirmed orders; accrues at most once per order.
   * (Schema has no `fulfilled` status; confirmation is the earning event.)
   */
  private async tryAccrueLoyaltyPointsForOrder(orderId: string): Promise<void> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    try {
      await this.prisma.$transaction(async (tx) => {
        const row = await tx.order.findUnique({
          where: { id: orderId },
          include: { users: true },
        });
        if (!row || row.status !== OrderStatus.confirmed) {
          return;
        }
        if (this.isLoyaltyPointsAwardedMetadata(row.metadata)) {
          return;
        }
        const points = Math.floor(Number(row.total) / 10);
        const customerEmail = row.users?.email ?? '';
        if (points > 0) {
          await tx.loyaltyAccount.upsert({
            where: { customerId: row.userId },
            create: {
              customerId: row.userId,
              customerEmail,
              totalPoints: points,
            },
            update: {
              totalPoints: { increment: points },
              customerEmail,
            },
          });
        }
        await tx.order.update({
          where: { id: orderId },
          data: { metadata: this.mergeMetadataWithLoyaltyAwarded(row.metadata) },
        });
      });
    } catch (err: unknown) {
      this.logger.error('Loyalty accrual failed', {
        timestamp,
        duration_ms: Date.now() - startedAt,
        orderId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async getAdminLoyaltyAccounts(limitParam?: string): Promise<{
    items: Array<{
      customerId: string;
      customerEmail: string;
      totalPoints: number;
      lastUpdated: string;
    }>;
    total: number;
  }> {
    const parsed =
      limitParam !== undefined && limitParam !== '' ? parseInt(limitParam, 10) : NaN;
    const raw = Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
    const limit = Math.min(Math.max(raw, 1), 200);
    const [rows, total] = await Promise.all([
      this.prisma.loyaltyAccount.findMany({
        orderBy: { totalPoints: 'desc' },
        take: limit,
        select: {
          customerId: true,
          customerEmail: true,
          totalPoints: true,
          updatedAt: true,
        },
      }),
      this.prisma.loyaltyAccount.count(),
    ]);
    return {
      items: rows.map((r) => ({
        customerId: r.customerId,
        customerEmail: r.customerEmail,
        totalPoints: r.totalPoints,
        lastUpdated: r.updatedAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * Get cart items from database
   */
  private async getCartItems(userId: string): Promise<any[]> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        products: true,
        product_variants: true,
      },
    });
    return cartItems;
  }

  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  private buildCentralOrdersPayload(params: {
    order: any;
    orderItems: Array<{
      productId: string;
      productSku?: string;
      productName: string;
      quantity: number;
      unitPrice: number | Prisma.Decimal;
      totalPrice: number | Prisma.Decimal;
      catalogProductId?: string | null;
      products?: { catalogProductId?: string | null } | null;
    }>;
    deliveryAddress: any;
    user?: { email?: string | null } | null;
    warehouseId: string;
  }) {
    const { order, orderItems, deliveryAddress, user, warehouseId } = params;
    const customerName = [deliveryAddress.firstName, deliveryAddress.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const boundedAddress = {
      name: customerName || undefined,
      street: deliveryAddress.street,
      city: deliveryAddress.city,
      postalCode: deliveryAddress.postalCode,
      country: deliveryAddress.country || 'CZ',
    };
    const items = orderItems.map((item) => {
      const catalogProductId = this.requireCatalogProductId(
        {
          catalogProductId: item.catalogProductId ?? item.products?.catalogProductId,
          sku: item.productSku,
        },
        item.productId,
      );
      return {
        productId: catalogProductId,
        sku: item.productSku,
        title: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        warehouseId,
      };
    });

    return {
      externalOrderId: order.orderNumber,
      channel: 'flipflop',
      channelAccountId: this.getCentralOrdersChannelAccountId(),
      orderedAt: order.createdAt,
      customer: {
        name: customerName || undefined,
        email: user?.email || undefined,
        phone: deliveryAddress.phone || undefined,
      },
      shippingAddress: boundedAddress,
      billingAddress: boundedAddress,
      items,
      totals: {
        subtotal: Number(order.subtotal),
        shippingCost: Number(order.shippingCost),
        taxAmount: Number(order.tax),
        total: Number(order.total),
        currency: 'CZK',
      },
      payment: {
        method: order.paymentMethod || 'webpay',
        status: order.paymentStatus || PaymentStatus.pending,
      },
      shipping: {
        method: order.shippingProvider || 'standard',
      },
    };
  }

  private requireCatalogProductId(
    product: { catalogProductId?: string | null; sku?: string | null },
    localProductId: string,
  ): string {
    const catalogProductId = product.catalogProductId?.trim();
    if (!catalogProductId) {
      const productLabel = product.sku ? `${product.sku} (${localProductId})` : localProductId;
      throw new BadRequestException(`[MISSING: catalogProductId] Product ${productLabel} cannot be forwarded to central Orders`);
    }
    return catalogProductId;
  }

  private getCentralOrdersChannelAccountId(): string {
    const configured = process.env.ORDERS_CHANNEL_ACCOUNT_ID?.trim();
    return configured || 'flipflop-storefront';
  }

  private getPaymentApplicationId(): string {
    const configured = process.env.PAYMENT_APPLICATION_ID?.trim();
    return configured || 'flipflop-service';
  }

  private getPaymentResultUrl(status: 'completed' | 'cancelled', orderId?: string): string {
    const envKey = status === 'completed' ? 'PAYMENT_SUCCESS_URL' : 'PAYMENT_CANCEL_URL';
    const configured = this.configService.get<string>(envKey)?.trim() || process.env[envKey]?.trim();
    if (configured) {
      return configured;
    }
    const publicBase = (
      this.configService.get<string>('PUBLIC_BASE_URL') ||
      this.configService.get<string>('API_GATEWAY_URL') ||
      'https://flipflop.alfares.cz'
    ).replace(/\/$/, '');
    const params = new URLSearchParams({ status });
    if (orderId) {
      params.set('orderId', orderId);
    }
    return `${publicBase}/payment-result?${params.toString()}`;
  }

  private getPaymentSuccessUrl(orderId?: string): string {
    return this.getPaymentResultUrl('completed', orderId);
  }

  private getPaymentCancelUrl(orderId?: string): string {
    return this.getPaymentResultUrl('cancelled', orderId);
  }


  private normalizeGuestEmail(email: unknown): string {
    if (typeof email !== 'string' || !email.includes('@')) {
      throw new BadRequestException('Valid email is required');
    }
    return email.trim().toLowerCase().slice(0, 255);
  }

  private normalizeGuestText(value: unknown, fallback = ''): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private guestPreferencesPatch(dto: any): Record<string, unknown> {
    return {
      checkoutMode: 'guest-or-account',
      accountLoginDisabled: false,
      lastGuestCheckoutAt: new Date().toISOString(),
      lastGuestCheckoutWantsAccount: dto.wantsAccount === true,
      lastGuestCheckoutMarketingConsent: dto.marketingConsent === true,
    };
  }

  private async createOrUpdateCheckoutCustomer(dto: any, guestEmail: string): Promise<any> {
    const address = dto.billingAddress || dto.deliveryAddress || {};
    const firstName = this.normalizeGuestText(address.firstName, 'Guest');
    const lastName = this.normalizeGuestText(address.lastName, 'Customer');
    const phone = this.normalizeGuestText(dto.phone || address.phone, '');
    const existing = await this.prisma.user.findUnique({ where: { email: guestEmail } });
    const preferences = {
      ...(existing?.preferences && typeof existing.preferences === 'object' && !Array.isArray(existing.preferences)
        ? (existing.preferences as Record<string, unknown>)
        : {}),
      ...this.guestPreferencesPatch(dto),
    } as Prisma.InputJsonValue;

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: existing.firstName || firstName,
          lastName: existing.lastName || lastName,
          phone: existing.phone || phone || null,
          preferences,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.user.create({
      data: {
        email: guestEmail,
        password: `magic-link-pending:${randomUUID()}`,
        firstName,
        lastName,
        phone,
        isEmailVerified: false,
        isAdmin: false,
        preferences,
      },
    });
  }

  private async createCheckoutAddress(userId: string, rawAddress: any, phone?: string): Promise<any> {
    const address = rawAddress || {};
    const firstName = this.normalizeGuestText(address.firstName);
    const lastName = this.normalizeGuestText(address.lastName);
    const street = this.normalizeGuestText(address.street);
    const city = this.normalizeGuestText(address.city);
    const postalCode = this.normalizeGuestText(address.postalCode);

    if (!firstName || !lastName || !street || !city || !postalCode) {
      throw new BadRequestException('Complete billing address is required');
    }

    return this.prisma.deliveryAddress.create({
      data: {
        userId,
        firstName,
        lastName,
        street,
        city,
        postalCode,
        country: this.normalizeGuestText(address.country, 'Česká republika'),
        phone: this.normalizeGuestText(address.phone || phone, ''),
        isDefault: false,
      },
    });
  }

  private async buildGuestOrderItems(items: any[]): Promise<Array<{
    productId: string;
    variantId: string | null;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const orderItems = [];
    for (const item of items) {
      const productId = this.normalizeGuestText(item?.productId);
      const quantity = Number.isFinite(Number(item?.quantity)) ? Math.floor(Number(item.quantity)) : 0;
      if (!productId || quantity < 1) {
        throw new BadRequestException('Invalid cart item');
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { product_variants: true },
      });
      if (!product || !product.isActive) {
        throw new BadRequestException(`Product ${productId} is not available`);
      }

      const variantId = this.normalizeGuestText(item?.variantId) || null;
      const variant = variantId
        ? product.product_variants.find((row: any) => row.id === variantId && row.isActive)
        : null;
      if (variantId && !variant) {
        throw new BadRequestException(`Product variant ${variantId} is not available`);
      }

      const availableStock = variant ? variant.stockQuantity : product.stockQuantity;
      if (typeof availableStock === 'number' && availableStock >= 0 && quantity > availableStock) {
        throw new BadRequestException(`Only ${availableStock} pcs available for ${product.name}`);
      }

      const unitPrice = variant ? Number(variant.price) : Number(product.price);
      orderItems.push({
        productId: product.id,
        variantId,
        productName: product.name,
        productSku: variant?.sku || product.sku,
        quantity,
        unitPrice,
        totalPrice: Math.round(unitPrice * quantity * 100) / 100,
      });
    }

    return orderItems;
  }

  private calculateGuestDeliveryCost(deliveryMethod: string): number {
    const method = this.normalizeGuestText(deliveryMethod, 'zasilkovna-address');
    const prices: Record<string, number> = {
      store: 0,
      'pickup-box': 59,
      'prague-time': 89,
      'zasilkovna-address': 89,
      dpd: 89,
    };
    if (!(method in prices)) {
      throw new BadRequestException('Unsupported delivery method');
    }
    return prices[method];
  }

  private normalizeGuestPaymentMethod(paymentMethod: string): string {
    const method = this.normalizeGuestText(paymentMethod, 'invoice');
    const allowed = new Set(['invoice', 'webpay', 'stripe', 'paypal', 'payu', 'fiobanka']);
    if (!allowed.has(method)) {
      throw new BadRequestException('Unsupported payment method');
    }
    return method;
  }

  private normalizeGuestOperatorTip(operatorTip: unknown): number {
    const tip = Number.isFinite(Number(operatorTip)) ? Number(operatorTip) : 0;
    const allowed = new Set([0, 10, 20, 30]);
    if (!allowed.has(tip)) {
      throw new BadRequestException('Unsupported operator tip');
    }
    return tip;
  }

  private buildBankTransferRedirect(order: any, total: number): string {
    const bankAccountNumber = process.env.BANK_TRANSFER_ACCOUNT_NUMBER?.trim() || '';
    const bankAccountIban = process.env.BANK_TRANSFER_ACCOUNT_IBAN?.trim() || '';
    const params = new URLSearchParams({
      status: 'bank-transfer',
      orderId: order.id,
      orderNumber: order.orderNumber,
      variableSymbol: order.orderNumber.replace(/\D/g, '').slice(-10) || order.id.replace(/\D/g, '').slice(-10),
      amount: String(total),
    });
    if (bankAccountNumber) params.set('bankAccountNumber', bankAccountNumber);
    if (bankAccountIban) params.set('bankAccountIban', bankAccountIban);
    return `/payment-result?${params.toString()}`;
  }

  private getFrontendBaseUrl(): string {
    return (
      this.configService.get<string>('NEXT_PUBLIC_FRONTEND_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('API_GATEWAY_URL') ||
      'https://flipflop.alfares.cz'
    ).replace(/\/$/, '');
  }

  private buildGuestAccountReturnUrl(orderId: string): string {
    const next = `/orders?activatedOrderId=${encodeURIComponent(orderId)}`;
    return `${this.getFrontendBaseUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  private async mergeOrderMetadata(orderId: string, patch: Record<string, unknown>): Promise<void> {
    const existing = await this.prisma.order.findUnique({ where: { id: orderId }, select: { metadata: true } });
    const metadata = existing?.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
      ? { ...(existing.metadata as Record<string, unknown>) }
      : {};
    await this.prisma.order.update({
      where: { id: orderId },
      data: { metadata: { ...metadata, ...patch } as Prisma.InputJsonValue },
    });
  }

  private async finalizeGuestCheckoutIntegrations(params: {
    order: any;
    dto: any;
    guestEmail: string;
    guestUser: any;
    deliveryAddress: any;
  }): Promise<void> {
    const { order, dto, guestEmail, guestUser, deliveryAddress } = params;
    const metadataPatch: Record<string, unknown> = {};

    if (dto.wantsAccount === true) {
      try {
        await this.authService.requestMagicLink({
          email: guestEmail,
          return_url: this.buildGuestAccountReturnUrl(order.id),
          client_id: 'flipflop',
          state: `guest-checkout:${order.id}`,
          app_domain: 'flipflop.alfares.cz',
        });
        metadataPatch.accountActivation = 'magic-link-sent';
        metadataPatch.accountActivationRequestedAt = new Date().toISOString();
      } catch (error: unknown) {
        metadataPatch.accountActivation = 'magic-link-failed';
        metadataPatch.accountActivationError = error instanceof Error ? error.message : String(error);
        this.logger.warn('Guest checkout magic-link request failed', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          error: metadataPatch.accountActivationError,
        });
      }
    }

    try {
      const lead = await this.leadsClient.submitFlipFlopCheckoutLead({
        email: guestEmail,
        phone: this.normalizeGuestText(dto.phone || deliveryAddress.phone, ''),
        firstName: deliveryAddress.firstName,
        lastName: deliveryAddress.lastName,
        orderId: order.id,
        orderNumber: order.orderNumber,
        sourceUrl: `${this.getFrontendBaseUrl()}/checkout`,
        marketingConsent: dto.marketingConsent === true,
      });
      metadataPatch.leadsSync = {
        status: 'accepted',
        leadId: lead.leadId,
        leadStatus: lead.status,
        confirmationSent: lead.confirmationSent ?? null,
        syncedAt: new Date().toISOString(),
      };
      metadataPatch.leadId = lead.leadId;
    } catch (error: unknown) {
      metadataPatch.leadsSync = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        syncedAt: new Date().toISOString(),
      };
      this.logger.warn('Guest checkout lead sync failed', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        error: (metadataPatch.leadsSync as Record<string, unknown>).error,
      });
    }

    metadataPatch.customerSync = {
      status: 'local-customer-linked',
      userId: guestUser.id,
      email: guestEmail,
      syncedAt: new Date().toISOString(),
    };

    await this.mergeOrderMetadata(order.id, metadataPatch);
  }

  private async recordCentralOrdersForwarding(
    order: any,
    status: 'accepted' | 'conflict' | 'failed',
    details: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      const existingMetadata =
        order.metadata && typeof order.metadata === 'object' && !Array.isArray(order.metadata)
          ? { ...(order.metadata as Record<string, unknown>) }
          : {};

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          metadata: {
            ...existingMetadata,
            centralOrdersForwarding: {
              status,
              contractVersion: 'orders.create.v1',
              channel: 'flipflop',
              channelAccountId: this.getCentralOrdersChannelAccountId(),
              externalOrderId: order.orderNumber,
              updatedAt: new Date().toISOString(),
              ...details,
            },
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to record central Orders forwarding metadata', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status,
        error: message,
      });
    }
  }

  /**
   * Create order from cart
   */
  async createOrder(userId: string, dto: any) {
    const cartItems = await this.getCartItems(userId);

    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const deliveryAddress = await this.prisma.deliveryAddress.findFirst({
      where: {
        id: dto.deliveryAddressId,
        userId,
      },
    });

    if (!deliveryAddress) {
      throw new NotFoundException('Delivery address not found');
    }

    let subtotal = 0;
    const orderItems = [];

    for (const cartItem of cartItems) {
      const product =
        cartItem.products ||
        (await this.prisma.product.findUnique({
          where: { id: cartItem.productId },
        }));

      if (!product || !product.isActive) {
        throw new BadRequestException(`Product ${cartItem.productId} is not available`);
      }

      const price = cartItem.product_variants
        ? Number(cartItem.product_variants.price)
        : Number(product.price);
      const itemTotal = price * cartItem.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product.id,
        variantId: cartItem.variantId || null,
        productName: product.name,
        productSku: product.sku,
        quantity: cartItem.quantity,
        unitPrice: price,
        totalPrice: itemTotal,
      });
    }

    const tax = subtotal * 0.21;
    const shippingCost = dto.shippingCost || 0;
    const orderTotalBeforeDiscount = subtotal + tax + shippingCost;
    const trimmedDiscountCode =
      typeof dto.discountCode === 'string' && dto.discountCode.trim()
        ? dto.discountCode.trim()
        : '';
    let discount = dto.discount || 0;
    if (trimmedDiscountCode) {
      const validation = await this.discountService.validateCode(trimmedDiscountCode);
      if (!validation.valid) {
        throw new BadRequestException('Invalid or expired discount code');
      }
      const after = await this.discountService.applyDiscount(
        orderTotalBeforeDiscount,
        trimmedDiscountCode,
      );
      discount = Math.round((orderTotalBeforeDiscount - after) * 100) / 100;
    }
    const total = Math.max(0, Math.round((orderTotalBeforeDiscount - discount) * 100) / 100);

    const metadata: Prisma.InputJsonValue | undefined = trimmedDiscountCode
      ? ({
          pendingDiscountCode: this.discountService.normalizeCode(trimmedDiscountCode),
        } as Prisma.InputJsonValue)
      : undefined;

    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        userId,
        deliveryAddressId: dto.deliveryAddressId,
        status: OrderStatus.pending,
        paymentStatus: PaymentStatus.pending,
        paymentMethod: dto.paymentMethod || 'webpay',
        subtotal,
        tax,
        shippingCost,
        discount,
        total,
        notes: dto.notes,
        ...(metadata !== undefined ? { metadata } : {}),
        order_items: {
          create: orderItems,
        },
        order_status_history: {
          create: {
            status: OrderStatus.pending,
            notes: 'Order created',
          },
        },
      },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true,
          },
        },
        delivery_addresses: true,
      },
    });

    let reservationWarehouseId: string;
    try {
      reservationWarehouseId = await this.reserveOrderLines(order.orderNumber, order.order_items);
    } catch (err: unknown) {
      await this.prisma.order.delete({ where: { id: order.id } });
      throw err;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const callbackUrlBase =
      this.configService.get<string>('API_GATEWAY_URL') || 'https://flipflop.alfares.cz';
    const callbackUrl = `${callbackUrlBase.replace(/\/$/, '')}/api/webhooks/payment-result`;

    let paymentResult;
    try {
      paymentResult = await this.paymentService.createPayment({
        orderId: order.orderNumber,
        applicationId: this.getPaymentApplicationId(),
        amount: total,
        currency: 'CZK',
        paymentMethod: dto.paymentMethod || 'webpay',
        callbackUrl,
        successUrl: this.getPaymentSuccessUrl(order.id),
        cancelUrl: this.getPaymentCancelUrl(order.id),
        customer: {
          email: user?.email || '',
          name: `${deliveryAddress.firstName} ${deliveryAddress.lastName}`.trim(),
        },
        description: 'FLIPFLOP',
      });
    } catch (error: unknown) {
      await this.unreserveOrderLines(order.orderNumber, order.order_items);
      await this.prisma.order.delete({ where: { id: order.id } });
      throw error;
    }

    if (!paymentResult.success || !paymentResult.data?.id) {
      await this.unreserveOrderLines(order.orderNumber, order.order_items);
      await this.prisma.order.delete({ where: { id: order.id } });
      throw new BadRequestException('Payment initiation failed');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentTransactionId: paymentResult.data.id },
    });

    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    this.logger.log('Order created', { orderId: order.id, orderNumber: order.orderNumber });

    const orderWithPayment = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true,
          },
        },
        delivery_addresses: true,
      },
    });

    try {
      const orderData = this.buildCentralOrdersPayload({
        order,
        orderItems: order.order_items,
        deliveryAddress,
        user,
        warehouseId: reservationWarehouseId,
      });

      const centralOrder = await this.orderClient.createOrder(orderData);
      await this.recordCentralOrdersForwarding(order, 'accepted', {
        centralOrderId: centralOrder?.id,
      });
      this.logger.log('Order forwarded to orders-microservice', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        channelAccountId: orderData.channelAccountId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const isIdempotencyConflict = message.includes(ORDER_IDEMPOTENCY_CONFLICT);
      const isMissingCatalogProductId = message.includes('[MISSING: catalogProductId]');
      const forwardingReason = isIdempotencyConflict
        ? ORDER_IDEMPOTENCY_CONFLICT
        : isMissingCatalogProductId
          ? '[MISSING: catalogProductId]'
          : 'CENTRAL_ORDERS_FORWARD_FAILED';
      await this.recordCentralOrdersForwarding(order, isIdempotencyConflict ? 'conflict' : 'failed', {
        reason: forwardingReason,
      });
      if (isIdempotencyConflict) {
        this.logger.warn('Central Orders idempotency conflict for FlipFlop order', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          channel: 'flipflop',
          channelAccountId: this.getCentralOrdersChannelAccountId(),
        });
        return {
          order: this.mapOrder(orderWithPayment),
          redirectUrl: paymentResult.data.redirectUri || null,
        };
      }
      this.logger.error('Failed to forward order to orders-microservice', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        error: 'CENTRAL_ORDERS_FORWARD_FAILED',
      });
    }

    return {
      order: this.mapOrder(orderWithPayment),
      redirectUrl: paymentResult.data.redirectUri || null,
    };
  }


  /**
   * Create order from guest checkout payload. It never marks payment as paid;
   * provider/webhook evidence or manual bank transfer reconciliation remains required.
   */
  async createGuestOrder(dto: any) {
    const guestEmail = this.normalizeGuestEmail(dto.email);
    const guestUser = await this.createOrUpdateCheckoutCustomer(dto, guestEmail);
    const deliveryAddress = await this.createCheckoutAddress(
      guestUser.id,
      dto.deliveryAddress || dto.billingAddress,
      dto.phone,
    );
    const orderItems = await this.buildGuestOrderItems(dto.items);
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = Math.round(subtotal * 0.21 * 100) / 100;
    const paymentMethod = this.normalizeGuestPaymentMethod(dto.paymentMethod);
    const deliveryMethod = this.normalizeGuestText(dto.deliveryMethod, 'zasilkovna-address');
    const shippingCost = this.calculateGuestDeliveryCost(deliveryMethod);
    const operatorTip = this.normalizeGuestOperatorTip(dto.operatorTip);
    const orderTotalBeforeDiscount = subtotal + tax + shippingCost + operatorTip;
    const trimmedDiscountCode =
      typeof dto.discountCode === 'string' && dto.discountCode.trim()
        ? dto.discountCode.trim()
        : '';
    let discount = Number.isFinite(Number(dto.discount)) ? Math.max(0, Number(dto.discount)) : 0;
    if (trimmedDiscountCode) {
      const validation = await this.discountService.validateCode(trimmedDiscountCode);
      if (!validation.valid) {
        throw new BadRequestException('Invalid or expired discount code');
      }
      const after = await this.discountService.applyDiscount(
        orderTotalBeforeDiscount,
        trimmedDiscountCode,
      );
      discount = Math.round((orderTotalBeforeDiscount - after) * 100) / 100;
    }
    const total = Math.max(0, Math.round((orderTotalBeforeDiscount - discount) * 100) / 100);
    const metadata: Prisma.InputJsonValue = {
      checkoutMode: 'guest',
      guestEmail,
      wantsAccount: dto.wantsAccount === true,
      marketingConsent: dto.marketingConsent === true,
      accountActivation: dto.wantsAccount === true ? 'magic-link-pending' : 'not-requested',
      deliveryMethod,
      expeditionMethod: this.normalizeGuestText(dto.expeditionMethod, 'standard'),
      wantsDifferentDeliveryDay: dto.wantsDifferentDeliveryDay === true,
      requestedDeliveryDate: this.normalizeGuestText(dto.requestedDeliveryDate, ''),
      operatorTip,
      pendingDiscountCode: trimmedDiscountCode
        ? this.discountService.normalizeCode(trimmedDiscountCode)
        : undefined,
    } as Prisma.InputJsonValue;

    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        userId: guestUser.id,
        deliveryAddressId: deliveryAddress.id,
        status: OrderStatus.pending,
        paymentStatus: PaymentStatus.pending,
        paymentMethod,
        subtotal,
        tax,
        shippingCost: shippingCost + operatorTip,
        discount,
        total,
        notes: this.normalizeGuestText(dto.notes, ''),
        metadata,
        order_items: {
          create: orderItems,
        },
        order_status_history: {
          create: {
            status: OrderStatus.pending,
            notes: 'Guest order created',
          },
        },
      },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true,
          },
        },
        delivery_addresses: true,
      },
    });

    let reservationWarehouseId: string;
    try {
      reservationWarehouseId = await this.reserveOrderLines(order.orderNumber, order.order_items);
    } catch (err: unknown) {
      await this.prisma.order.delete({ where: { id: order.id } });
      throw err;
    }

    let redirectUrl: string | null = null;
    if (paymentMethod === 'invoice') {
      redirectUrl = this.buildBankTransferRedirect(order, total);
    } else {
      const callbackUrlBase =
        this.configService.get<string>('API_GATEWAY_URL') || 'https://flipflop.alfares.cz';
      const callbackUrl = `${callbackUrlBase.replace(/\/$/, '')}/api/webhooks/payment-result`;
      let paymentResult;
      try {
        paymentResult = await this.paymentService.createPayment({
          orderId: order.orderNumber,
          applicationId: this.getPaymentApplicationId(),
          amount: total,
          currency: 'CZK',
          paymentMethod,
          callbackUrl,
          successUrl: this.getPaymentSuccessUrl(order.id),
          cancelUrl: this.getPaymentCancelUrl(order.id),
          customer: {
            email: guestEmail,
            name: `${deliveryAddress.firstName} ${deliveryAddress.lastName}`.trim(),
          },
          description: 'FLIPFLOP',
        });
      } catch (error: unknown) {
        await this.unreserveOrderLines(order.orderNumber, order.order_items);
        await this.prisma.order.delete({ where: { id: order.id } });
        throw error;
      }

      if (!paymentResult.success || !paymentResult.data?.id) {
        await this.unreserveOrderLines(order.orderNumber, order.order_items);
        await this.prisma.order.delete({ where: { id: order.id } });
        throw new BadRequestException('Payment initiation failed');
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentTransactionId: paymentResult.data.id },
      });
      redirectUrl = paymentResult.data.redirectUri || null;
    }

    try {
      const orderData = this.buildCentralOrdersPayload({
        order,
        orderItems: order.order_items,
        deliveryAddress,
        user: { email: guestEmail },
        warehouseId: reservationWarehouseId,
      });
      const centralOrder = await this.orderClient.createOrder(orderData);
      await this.recordCentralOrdersForwarding(order, 'accepted', {
        centralOrderId: centralOrder?.id,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const isIdempotencyConflict = message.includes(ORDER_IDEMPOTENCY_CONFLICT);
      const isMissingCatalogProductId = message.includes('[MISSING: catalogProductId]');
      const forwardingReason = isIdempotencyConflict
        ? ORDER_IDEMPOTENCY_CONFLICT
        : isMissingCatalogProductId
          ? '[MISSING: catalogProductId]'
          : 'CENTRAL_ORDERS_FORWARD_FAILED';
      await this.recordCentralOrdersForwarding(order, isIdempotencyConflict ? 'conflict' : 'failed', {
        reason: forwardingReason,
      });
    }

    await this.finalizeGuestCheckoutIntegrations({
      order,
      dto,
      guestEmail,
      guestUser,
      deliveryAddress,
    });

    const orderWithPayment = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true,
          },
        },
        delivery_addresses: true,
      },
    });

    this.logger.log('Guest order created', { orderId: order.id, orderNumber: order.orderNumber });
    return {
      order: this.mapOrder(orderWithPayment),
      redirectUrl,
    };
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true,
          },
        },
        delivery_addresses: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => this.mapOrder(o));
  }

  /**
   * Get order by ID
   */
  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true,
          },
        },
        delivery_addresses: true,
        order_status_history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrder(order);
  }

  /**
   * Create payment for order (legacy PayU route — same payments-microservice contract)
   */
  async createPayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentStatus === PaymentStatus.paid) {
      throw new BadRequestException('Order is already paid');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const callbackUrlBase =
      this.configService.get<string>('API_GATEWAY_URL') || 'https://flipflop.alfares.cz';
    const callbackUrl = `${callbackUrlBase.replace(/\/$/, '')}/api/webhooks/payment-result`;

    const paymentResponse = await this.paymentService.createPayment({
      orderId: order.orderNumber,
      applicationId: this.getPaymentApplicationId(),
      amount: Number(order.total),
      currency: 'CZK',
      paymentMethod: order.paymentMethod || 'webpay',
      callbackUrl,
      successUrl: this.getPaymentSuccessUrl(order.id),
      cancelUrl: this.getPaymentCancelUrl(order.id),
      customer: {
        email: user?.email || '',
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
      },
      description: 'FLIPFLOP',
    });

    if (!paymentResponse.success || !paymentResponse.data) {
      throw new BadRequestException('Failed to create payment');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentTransactionId:
          paymentResponse.data.transactionId || paymentResponse.data.id,
      },
    });

    return {
      redirectUri: paymentResponse.data.redirectUri,
      orderId: order.id,
    };
  }

  async getCompetitorAnalysis(): Promise<{
    generatedAt: string;
    commentary: string;
    products: Array<{ name: string; price: number }>;
  }> {
    const methodStartedAt = Date.now();
    const methodTimestamp = new Date().toISOString();

    let products: Array<{ name: string; price: number }> = [];
    try {
      const productServiceUrl =
        this.configService.get<string>('PRODUCT_SERVICE_URL') ?? 'http://flipflop-product-service:3002';
      const requestStartedAt = Date.now();
      const productsRes = await this.httpService.axiosRef.get(
        `${productServiceUrl}/products?limit=10&sortBy=price&sortOrder=desc`,
      );
      const items: any[] =
        productsRes.data?.data?.items ?? productsRes.data?.items ?? productsRes.data?.data ?? [];
      products = items
        .map((item: any) => ({ name: item.name, price: Number(item.price) }))
        .filter((item) => item.name && Number.isFinite(item.price));

      this.logger.log('Competitor analysis products loaded', {
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - requestStartedAt,
        products_count: products.length,
      });
    } catch (error: unknown) {
      this.logger.error('Competitor analysis product fetch failed', {
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - methodStartedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    let commentary = 'Analýza není dostupná — AI služba nedosažitelná.';
    try {
      const aiUrl = this.configService.get<string>('AI_SERVICE_URL') ?? 'http://e-commerce-ai-service:3007';
      const prompt =
        products.length > 0
          ? `Jako e-commerce analytik ohodnoť cenovou konkurenceschopnost těchto produktů pro český trh. Produkty: ${products.map((item) => `${item.name} (${item.price} Kč)`).join(', ')}. Napiš krátkou analýzu (max 150 slov) v češtině s doporučením.`
          : 'Napiš krátkou obecnou analýzu cenové konkurenceschopnosti pro český e-commerce trh (max 100 slov, česky).';

      const requestStartedAt = Date.now();
      const aiRes = await this.httpService.axiosRef.post(`${aiUrl}/ai/complete`, {
        model_tier: 'free',
        user_prompt: prompt,
        max_tokens: 400,
        correlation_id: `competitor-analysis-${Date.now()}`,
      });
      commentary = aiRes.data?.text ?? aiRes.data?.content ?? aiRes.data?.result ?? commentary;

      this.logger.log('Competitor analysis AI commentary generated', {
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - requestStartedAt,
        used_products_count: products.length,
      });
    } catch (error: unknown) {
      this.logger.error('Competitor analysis AI request failed', {
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - methodStartedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.logger.log('Competitor analysis completed', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - methodStartedAt,
      generated_at: methodTimestamp,
    });

    return { generatedAt: methodTimestamp, commentary, products };
  }

  async getCheckoutFunnel(since?: Date): Promise<{
    orders_created: number;
    payments_initiated: number;
    payments_completed: number;
    payments_failed: number;
    completion_rate_pct: number;
    abandonment_rate_pct: number;
  }> {
    const where: { createdAt?: { gte: Date } } = since ? { createdAt: { gte: since } } : {};

    const [orders_created, payments_initiated, payments_completed, payments_failed] =
      await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.count({
          where: { ...where, paymentTransactionId: { not: null } },
        }),
        this.prisma.order.count({
          where: { ...where, paymentStatus: PaymentStatus.paid },
        }),
        this.prisma.order.count({
          where: { ...where, paymentStatus: PaymentStatus.failed },
        }),
      ]);

    const completion_rate_pct =
      orders_created > 0 ? Math.round((payments_completed / orders_created) * 100) : 0;

    return {
      orders_created,
      payments_initiated,
      payments_completed,
      payments_failed,
      completion_rate_pct,
      abandonment_rate_pct: 100 - completion_rate_pct,
    };
  }

  /**
   * Confirmed orders only: sum `total` by calendar month (UTC YYYY-MM) for the last N months.
   */
  async getRevenueMonthOverMonth(monthsParam?: string): Promise<
    Array<{ month: string; revenue: number }>
  > {
    const methodStartedAt = Date.now();
    const methodTimestamp = new Date().toISOString();

    const parsed =
      monthsParam !== undefined && monthsParam !== '' ? parseInt(monthsParam, 10) : NaN;
    const nRaw = Number.isFinite(parsed) && parsed > 0 ? parsed : 6;
    const n = Math.min(Math.max(nRaw, 1), 36);

    const now = new Date();
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();

    const labels: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const y = utcYear;
      const m = utcMonth - i;
      const d = new Date(Date.UTC(y, m, 1));
      const yy = d.getUTCFullYear();
      const mm = d.getUTCMonth() + 1;
      labels.push(`${yy}-${String(mm).padStart(2, '0')}`);
    }

    const oldest = labels[0];
    const [oy, om] = oldest.split('-').map((x) => parseInt(x, 10));
    const rangeStart = new Date(Date.UTC(oy, om - 1, 1, 0, 0, 0, 0));
    const rangeEnd = new Date(Date.UTC(utcYear, utcMonth + 1, 1, 0, 0, 0, 0));

    const queryStartedAt = Date.now();
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.confirmed,
        createdAt: { gte: rangeStart, lt: rangeEnd },
      },
      select: { createdAt: true, total: true },
    });

    this.logger.log('Revenue MoM query completed', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - queryStartedAt,
      orders_scanned: orders.length,
      months: n,
    });

    const sums = new Map<string, number>();
    for (const label of labels) {
      sums.set(label, 0);
    }
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 7);
      if (!sums.has(key)) {
        continue;
      }
      sums.set(key, (sums.get(key) ?? 0) + Number(o.total));
    }

    const result = labels.map((month) => ({ month, revenue: sums.get(month) ?? 0 }));

    this.logger.log('Revenue MoM aggregation completed', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - methodStartedAt,
      started_at: methodTimestamp,
    });

    return result;
  }

  /**
   * Rolling window: confirmed (status confirmed only) / all orders by createdAt.
   */
  async getConversionRate(daysParam?: string): Promise<{
    conversionRate: number;
    confirmedOrders: number;
    totalOrders: number;
    targetPct: number;
  }> {
    const parsed =
      daysParam !== undefined && daysParam !== '' ? parseInt(daysParam, 10) : NaN;
    const days = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 365) : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const whereWindow = { createdAt: { gte: since } };

    const [confirmedOrders, totalOrders] = await Promise.all([
      this.prisma.order.count({
        where: { ...whereWindow, status: OrderStatus.confirmed },
      }),
      this.prisma.order.count({ where: whereWindow }),
    ]);

    const conversionRate =
      totalOrders > 0
        ? Math.round((confirmedOrders / totalOrders) * 10000) / 100
        : 0;

    return {
      conversionRate,
      confirmedOrders,
      totalOrders,
      targetPct: 2,
    };
  }

  /**
   * Fulfilment SLA: time from first recorded "confirmed" status (or order creation) to fulfilledAt.
   */
  async getFulfillmentSla(daysParam?: string): Promise<{
    slaTargetHours: number;
    avgFulfilmentHours: number;
    pctMeetingSla: number;
    totalFulfilled: number;
  }> {
    const methodStartedAt = Date.now();
    const methodTimestamp = new Date().toISOString();
    const parsed =
      daysParam !== undefined && daysParam !== '' ? parseInt(daysParam, 10) : NaN;
    const days = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 365) : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const queryStartedAt = Date.now();
    const orders = await this.prisma.order.findMany({
      where: {
        fulfilledAt: { not: null, gte: since },
      },
      select: {
        id: true,
        createdAt: true,
        fulfilledAt: true,
        order_status_history: {
          where: { status: OrderStatus.confirmed },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    this.logger.log('SLA analytics query completed', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - queryStartedAt,
      orders_scanned: orders.length,
      days,
    });

    const slaTargetHours = 48;
    let totalFulfilled = 0;
    let sumHours = 0;
    let meeting = 0;

    for (const o of orders) {
      const end = o.fulfilledAt;
      if (!end) {
        continue;
      }
      const start =
        o.order_status_history[0]?.createdAt != null
          ? o.order_status_history[0].createdAt
          : o.createdAt;
      const hours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
      if (!Number.isFinite(hours) || hours < 0) {
        continue;
      }
      totalFulfilled += 1;
      sumHours += hours;
      if (hours <= slaTargetHours) {
        meeting += 1;
      }
    }

    const avgFulfilmentHours =
      totalFulfilled > 0 ? Math.round((sumHours / totalFulfilled) * 100) / 100 : 0;
    const pctMeetingSla =
      totalFulfilled > 0 ? Math.round((meeting / totalFulfilled) * 10000) / 100 : 0;

    this.logger.log('SLA analytics aggregation completed', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - methodStartedAt,
      started_at: methodTimestamp,
      totalFulfilled,
    });

    return {
      slaTargetHours,
      avgFulfilmentHours,
      pctMeetingSla,
      totalFulfilled,
    };
  }

  /**
   * Admin: products with stock > 0 and no confirmed order including the SKU in the last N days.
   * Optional `suggestedMarkdown` is 0–50 (% discount) from ai-microservice `/ai/complete` (cheap tier).
   */
  async getDeadStockItems(
    daysParam?: string,
    authorizationHeader?: string,
  ): Promise<{
    items: Array<{
      productId: string;
      productName: string;
      stock: number;
      lastSoldAt: string | null;
      currentPrice: number;
      suggestedMarkdown: number | null;
    }>;
    total: number;
  }> {
    const methodStartedAt = Date.now();
    const methodTimestamp = new Date().toISOString();
    const parsed =
      daysParam !== undefined && daysParam !== '' ? parseInt(daysParam, 10) : NaN;
    const daysRaw = Number.isFinite(parsed) && parsed > 0 ? parsed : 90;
    const days = Math.min(Math.max(daysRaw, 1), 3650);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const queryDbStartedAt = Date.now();
    const [recentItems, candidates] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: {
          orders: {
            status: OrderStatus.confirmed,
            createdAt: { gte: since },
          },
        },
        select: { productId: true },
      }),
      this.prisma.product.findMany({
        where: { stockQuantity: { gt: 0 } },
        select: { id: true, name: true, stockQuantity: true, price: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const recentlySoldIds = new Set(recentItems.map((i) => i.productId));
    const dead = candidates.filter((p) => !recentlySoldIds.has(p.id));

    this.logger.log('Dead stock DB query completed', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - queryDbStartedAt,
      days,
      dead_count: dead.length,
    });

    const lastSoldMap = new Map<string, Date>();
    if (dead.length > 0) {
      const ids = dead.map((p) => p.id);
      const pastSales = await this.prisma.orderItem.findMany({
        where: {
          productId: { in: ids },
          orders: { status: OrderStatus.confirmed },
        },
        select: { productId: true, orders: { select: { createdAt: true } } },
      });
      for (const row of pastSales) {
        const d = row.orders.createdAt;
        const prev = lastSoldMap.get(row.productId);
        if (!prev || d > prev) {
          lastSoldMap.set(row.productId, d);
        }
      }
    }

    const aiBase =
      this.configService.get<string>('AI_SERVICE_URL') ?? 'http://ai-microservice:3380';
    const aiUrl = `${aiBase.replace(/\/$/, '')}/ai/complete`;
    const aiCache = new Map<string, number | null>();

    const resolveMarkdownPct = (data: Record<string, unknown> | null | undefined): number | null => {
      if (!data || typeof data !== 'object') {
        return null;
      }
      const direct = (data as { markdownPct?: unknown }).markdownPct;
      if (typeof direct === 'number' && Number.isFinite(direct)) {
        return Math.min(50, Math.max(0, Math.round(direct)));
      }
      const text = (data as { text?: unknown }).text;
      if (typeof text === 'string') {
        try {
          const inner = JSON.parse(text) as { markdownPct?: unknown };
          if (typeof inner.markdownPct === 'number' && Number.isFinite(inner.markdownPct)) {
            return Math.min(50, Math.max(0, Math.round(inner.markdownPct)));
          }
        } catch {
          return null;
        }
      }
      return null;
    };

    const items: Array<{
      productId: string;
      productName: string;
      stock: number;
      lastSoldAt: string | null;
      currentPrice: number;
      suggestedMarkdown: number | null;
    }> = [];

    for (const p of dead) {
      let suggestedMarkdown: number | null = null;
      if (aiCache.has(p.id)) {
        suggestedMarkdown = aiCache.get(p.id) ?? null;
      } else {
        const aiStartedAt = Date.now();
        try {
          const lastSold = lastSoldMap.get(p.id);
          const unsoldDays = lastSold
            ? Math.max(0, Math.floor((Date.now() - lastSold.getTime()) / (24 * 60 * 60 * 1000)))
            : days;
          const userPrompt = `Product: ${p.name}, price: ${Number(p.price)} CZK, stock: ${p.stockQuantity} units, unsold for ${unsoldDays} days. Suggest a markdown percentage (0-50%) to clear stock. Reply with JSON: { "markdownPct": number, "reason": string }`;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (authorizationHeader) {
            headers.Authorization = authorizationHeader;
          }
          const aiRes = await this.httpService.axiosRef.post(
            aiUrl,
            {
              model_tier: 'cheap',
              system_prompt:
                'Reply only with one JSON object, no markdown. Keys: markdownPct (integer 0-50), reason (short string, Czech).',
              user_prompt: userPrompt,
              max_tokens: 256,
              correlation_id: `dead-stock-${p.id}-${Date.now()}`,
            },
            { headers, timeout: 25000 },
          );
          suggestedMarkdown = resolveMarkdownPct(aiRes.data as Record<string, unknown>);
          this.logger.log('Dead stock AI suggestion', {
            timestamp: new Date().toISOString(),
            duration_ms: Date.now() - aiStartedAt,
            product_id: p.id,
            suggested_markdown: suggestedMarkdown,
          });
        } catch (error: unknown) {
          this.logger.error('Dead stock AI request failed', {
            timestamp: new Date().toISOString(),
            duration_ms: Date.now() - aiStartedAt,
            product_id: p.id,
            error: error instanceof Error ? error.message : String(error),
          });
          suggestedMarkdown = null;
        }
        aiCache.set(p.id, suggestedMarkdown);
      }

      const last = lastSoldMap.get(p.id);
      items.push({
        productId: p.id,
        productName: p.name,
        stock: p.stockQuantity,
        lastSoldAt: last ? last.toISOString() : null,
        currentPrice: Number(p.price),
        suggestedMarkdown,
      });
    }

    this.logger.log('Dead stock completed', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - methodStartedAt,
      started_at: methodTimestamp,
      total: items.length,
    });

    return { items, total: items.length };
  }

  /**
   * Admin: customers with ≥ minOrders confirmed orders in the last N days; AI next-purchase hint (cheap tier).
   */
  async getRepeatBuyers(
    minOrdersParam?: string,
    daysParam?: string,
    authorizationHeader?: string,
  ): Promise<{
    items: Array<{
      customerId: string;
      customerEmail: string;
      orderCount: number;
      totalSpent: number;
      lastOrderAt: string;
      recommendedProduct: string | null;
    }>;
    total: number;
  }> {
    const methodStartedAt = Date.now();
    const methodTimestamp = new Date().toISOString();
    const minParsed =
      minOrdersParam !== undefined && minOrdersParam !== ''
        ? parseInt(minOrdersParam, 10)
        : NaN;
    const minOrders = Number.isFinite(minParsed) && minParsed > 0 ? Math.min(minParsed, 1000) : 2;
    const daysParsed =
      daysParam !== undefined && daysParam !== '' ? parseInt(daysParam, 10) : NaN;
    const daysRaw = Number.isFinite(daysParsed) && daysParsed > 0 ? daysParsed : 90;
    const days = Math.min(Math.max(daysRaw, 1), 3650);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const countStartedAt = Date.now();
    const countRows = await this.prisma.$queryRaw<Array<{ n: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS n
        FROM (
          SELECT o."userId"
          FROM orders o
          WHERE o.status = ${OrderStatus.confirmed}::order_status_enum
            AND o."createdAt" >= ${since}
          GROUP BY o."userId"
          HAVING COUNT(o.id) >= ${minOrders}
        ) t
      `,
    );
    const total = Number(countRows[0]?.n ?? 0);

    this.logger.log('Repeat buyers count query completed', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - countStartedAt,
      total,
      minOrders,
      days,
    });

    const topGroups = await this.prisma.$queryRaw<
      Array<{
        userId: string;
        orderCount: number;
        totalSpent: unknown;
        lastOrderAt: Date;
      }>
    >(
      Prisma.sql`
        SELECT o."userId",
               COUNT(o.id)::int AS "orderCount",
               COALESCE(SUM(o.total), 0) AS "totalSpent",
               MAX(o."createdAt") AS "lastOrderAt"
        FROM orders o
        WHERE o.status = ${OrderStatus.confirmed}::order_status_enum
          AND o."createdAt" >= ${since}
        GROUP BY o."userId"
        HAVING COUNT(o.id) >= ${minOrders}
        ORDER BY COUNT(o.id) DESC
        LIMIT 20
      `,
    );

    if (topGroups.length === 0) {
      this.logger.log('Repeat buyers completed (empty)', {
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - methodStartedAt,
        started_at: methodTimestamp,
        total,
      });
      return { items: [], total };
    }

    const userIds = topGroups.map((g) => g.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const emailById = new Map(users.map((u) => [u.id, u.email ?? '']));

    const productLinesByUser = new Map<string, string[]>();
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        orders: {
          userId: { in: userIds },
          status: OrderStatus.confirmed,
          createdAt: { gte: since },
        },
      },
      select: {
        productName: true,
        orders: { select: { userId: true } },
      },
    });
    for (const row of orderItems) {
      const uid = row.orders.userId;
      const arr = productLinesByUser.get(uid) ?? [];
      if (!arr.includes(row.productName)) {
        arr.push(row.productName);
      }
      productLinesByUser.set(uid, arr);
    }

    const aiBase =
      this.configService.get<string>('AI_SERVICE_URL') ?? 'http://ai-microservice:3380';
    const aiUrl = `${aiBase.replace(/\/$/, '')}/ai/complete`;

    const resolveProduct = (data: Record<string, unknown> | null | undefined): string | null => {
      if (!data || typeof data !== 'object') {
        return null;
      }
      const product = (data as { product?: unknown }).product;
      if (typeof product === 'string' && product.trim()) {
        return product.trim();
      }
      const text = (data as { text?: unknown }).text;
      if (typeof text === 'string') {
        try {
          const inner = JSON.parse(text) as { product?: unknown };
          if (typeof inner.product === 'string' && inner.product.trim()) {
            return inner.product.trim();
          }
        } catch {
          return null;
        }
      }
      return null;
    };

    const items: Array<{
      customerId: string;
      customerEmail: string;
      orderCount: number;
      totalSpent: number;
      lastOrderAt: string;
      recommendedProduct: string | null;
    }> = [];

    for (const g of topGroups) {
      const customerId = g.userId;
      const customerEmail = emailById.get(customerId) ?? '';
      const orderCount = g.orderCount;
      const totalSpent = Number(g.totalSpent ?? 0);
      const lastAt = g.lastOrderAt ?? since;
      const names = productLinesByUser.get(customerId) ?? [];
      const productNamesStr = names.slice(0, 20).join(', ') || 'žádné názvy produktů';
      const amount = Math.round(totalSpent);
      const userPrompt =
        `Customer has placed ${orderCount} orders totaling ${amount} CZK. ` +
        `Their recent purchases: ${productNamesStr}. ` +
        `Suggest one product or category they are most likely to buy next. ` +
        `Reply with JSON: { "product": string, "reason": string }`;

      let recommendedProduct: string | null = null;
      const aiStartedAt = Date.now();
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authorizationHeader) {
          headers.Authorization = authorizationHeader;
        }
        const aiRes = await this.httpService.axiosRef.post(
          aiUrl,
          {
            model_tier: 'cheap',
            system_prompt:
              'Reply only with one JSON object, no markdown. Keys: product (short string, Czech), reason (short string, Czech).',
            user_prompt: userPrompt,
            max_tokens: 256,
            correlation_id: `repeat-buyer-${customerId}-${Date.now()}`,
          },
          { headers, timeout: 25000 },
        );
        recommendedProduct = resolveProduct(aiRes.data as Record<string, unknown>);
        this.logger.log('Repeat buyer AI suggestion', {
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - aiStartedAt,
          customer_id: customerId,
        });
      } catch (error: unknown) {
        this.logger.error('Repeat buyer AI request failed', {
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - aiStartedAt,
          customer_id: customerId,
          error: error instanceof Error ? error.message : String(error),
        });
        recommendedProduct = null;
      }

      items.push({
        customerId,
        customerEmail,
        orderCount,
        totalSpent,
        lastOrderAt: lastAt.toISOString(),
        recommendedProduct,
      });
    }

    this.logger.log('Repeat buyers completed', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - methodStartedAt,
      started_at: methodTimestamp,
      returned: items.length,
      total,
    });

    return { items, total };
  }

  /**
   * Admin: aggregate supplier_delivery rows — avg lead time (days), counts, flag if avg > 7 days.
   */
  async getSupplierPerformance(): Promise<{
    suppliers: Array<{
      supplierId: string;
      supplierName: string;
      avgLeadTimeDays: number | null;
      totalOrders: number;
      pendingOrders: number;
      flagged: boolean;
    }>;
  }> {
    const methodStartedAt = Date.now();
    const methodTimestamp = new Date().toISOString();
    const rows = await this.prisma.$queryRaw<
      Array<{
        supplier_id: string;
        supplier_name: string;
        avg_lead_days: number | null;
        total_orders: number;
        pending_orders: number;
      }>
    >`
SELECT
  sd.supplier_id,
  MAX(sd.supplier_name)::text AS supplier_name,
  AVG(
    CASE WHEN sd.received_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (sd.received_at - sd.ordered_at)) / 86400.0
    END
  )::double precision AS avg_lead_days,
  COUNT(*)::int AS total_orders,
  COALESCE(
    SUM(CASE WHEN sd.received_at IS NULL THEN 1 ELSE 0 END),
    0
  )::int AS pending_orders
FROM supplier_delivery sd
GROUP BY sd.supplier_id
ORDER BY MAX(sd.supplier_name)
`;
    this.logger.log('Supplier performance aggregation completed', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - methodStartedAt,
      started_at: methodTimestamp,
      supplier_count: rows.length,
    });
    const suppliers = rows.map((r) => {
      const rawAvg = r.avg_lead_days;
      const avgLeadTimeDays =
        rawAvg === null || rawAvg === undefined || Number.isNaN(Number(rawAvg))
          ? null
          : Math.round(Number(rawAvg) * 100) / 100;
      const flagged = avgLeadTimeDays !== null && avgLeadTimeDays > 7;
      return {
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        avgLeadTimeDays,
        totalOrders: r.total_orders,
        pendingOrders: r.pending_orders,
        flagged,
      };
    });
    return { suppliers };
  }

  async createSupplierDelivery(dto: CreateSupplierDeliveryDto) {
    const row = await this.prisma.supplierDelivery.create({
      data: {
        supplierId: dto.supplierId,
        supplierName: dto.supplierName,
        productId: dto.productId,
        quantity: dto.quantity,
        orderedAt: new Date(dto.orderedAt),
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : null,
      },
    });
    return {
      id: row.id,
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      productId: row.productId,
      quantity: row.quantity,
      orderedAt: row.orderedAt.toISOString(),
      receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Daily job: delivered orders fulfilled 3+ days ago → RabbitMQ customer.review_request, then mark sent.
   * Uses status delivered (schema has no fulfilled); fulfilledAt is set on ship/deliver transitions.
   */
  async runReviewSolicitationJob(): Promise<void> {
    const started = Date.now();
    const isoStart = new Date().toISOString();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.delivered,
        fulfilledAt: { not: null, lt: threeDaysAgo },
        reviewRequestedAt: null,
      } as Prisma.OrderWhereInput,
      include: {
        users: { select: { email: true } },
        order_items: { select: { productName: true } },
      },
      take: 150,
    });

    this.logger.log(
      `review_solicitation: at=${isoStart} candidates=${orders.length}`,
      'OrdersService',
    );

    for (const order of orders) {
      if (!order.fulfilledAt) {
        continue;
      }
      const productNames = order.order_items.map((i) => i.productName);
      const published = await this.customerEventsPublisher.publishReviewRequest({
        orderId: order.id,
        customerId: order.userId,
        customerEmail: order.users.email,
        productNames,
        fulfilledAt: order.fulfilledAt.toISOString(),
      });
      if (!published) {
        this.logger.warn(
          `review_solicitation: publish_failed orderId=${order.id}`,
          'OrdersService',
        );
        continue;
      }
      await this.prisma.order.update({
        where: { id: order.id },
        data: { reviewRequestedAt: new Date() } as Prisma.OrderUpdateInput,
      });
    }

    this.logger.log(
      `review_solicitation: done duration_ms=${Date.now() - started}`,
      'OrdersService',
    );
  }

  async getAdminReviewRequests(days: number): Promise<{
    total: number;
    items: Array<{
      orderId: string;
      customerEmail: string;
      sentAt: string;
      productCount: number;
    }>;
  }> {
    const d = Number.isFinite(days) && days > 0 ? Math.min(days, 366) : 30;
    const since = new Date();
    since.setDate(since.getDate() - d);

    const where = {
      reviewRequestedAt: {
        not: null,
        gte: since,
      },
    } as Prisma.OrderWhereInput;

    const total = await this.prisma.order.count({ where });
    const rows = await this.prisma.order.findMany({
      where,
      orderBy: { reviewRequestedAt: 'desc' } as Prisma.OrderOrderByWithRelationInput,
      take: 10,
      include: {
        users: { select: { email: true } },
        order_items: { select: { id: true } },
      },
    });

    return {
      total,
      items: rows.map((r) => {
        const row = r as typeof r & {
          users: { email: string };
          order_items: { id: string }[];
          reviewRequestedAt: Date | null;
        };
        return {
          orderId: row.id,
          customerEmail: row.users.email,
          sentAt: row.reviewRequestedAt!.toISOString(),
          productCount: row.order_items.length,
        };
      }),
    };
  }

  /**
   * Map order to response format
   */
  private mapOrder(order: any) {
    const lines = order.order_items || order.items || [];
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      items: lines.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId || undefined,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      deliveryAddress: order.delivery_addresses
        ? {
            id: order.delivery_addresses.id,
            firstName: order.delivery_addresses.firstName,
            lastName: order.delivery_addresses.lastName,
            street: order.delivery_addresses.street,
            city: order.delivery_addresses.city,
            postalCode: order.delivery_addresses.postalCode,
            country: order.delivery_addresses.country,
            phone: order.delivery_addresses.phone || undefined,
            isDefault: order.delivery_addresses.isDefault,
          }
        : null,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      shippingCost: Number(order.shippingCost),
      discount: Number(order.discount),
      total: Number(order.total),
      notes: order.notes || undefined,
      paymentTransactionId: order.paymentTransactionId || undefined,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      fulfilledAt: order.fulfilledAt ? order.fulfilledAt.toISOString() : undefined,
    };
  }
}
