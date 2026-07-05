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
  CatalogClientService,
} from '@flipflop/shared';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PaymentResultDto } from './dto/payment-result.dto';
import { UpdateOrderPaymentStatusDto } from './dto/update-order-payment-status.dto';
import { UpdateAdminOrderStatusDto } from './dto/update-admin-order-status.dto';
import { CreateSupplierDeliveryDto } from './dto/create-supplier-delivery.dto';
import {
  FLIPFLOP_AFFINITY_CHANNEL,
  FLIPFLOP_AFFINITY_CONSUMER_OWNER,
  FLIPFLOP_AFFINITY_REPLAY_CONTRACT,
  FLIPFLOP_AFFINITY_REPLAY_ELIGIBLE_ORDER_STATUSES,
  FLIPFLOP_AFFINITY_REPLAY_ELIGIBLE_PAYMENT_STATUSES,
  FLIPFLOP_AFFINITY_SOURCE_OWNER,
  FlipFlopAffinityReplayCandidate,
  getFlipFlopAffinityReplayEligibility,
} from './affinity-replay-eligibility';
import { DiscountService } from '../marketing/discount.service';

type CheckoutOrderItem = {
  productId: string;
  variantId?: string | null;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  catalogProductId?: string | null;
};

type OrderItemCreateInput = Omit<CheckoutOrderItem, "catalogProductId">;

type BundleDiscountIntent = {
  source: 'product_detail_buy_together';
  sourceProductId: string;
  productIds: string[];
  catalogCandidateId?: string;
  bundleId?: string;
};

type CatalogBundleEvidence = {
  contractVersion: 'catalog.bundle.v1';
  bundleId: string;
  productIds: string[];
  discountPolicyRef?: string;
  freeShippingPolicyRef?: string;
  serverTotalSource: 'checkout_authoritative';
};

type BundleDiscountApplication = {
  source: 'product_detail_buy_together';
  sourceProductId: string;
  productIds: string[];
  bundleId?: string;
  eligible: true;
  merchandiseSubtotal: number;
  merchandiseSavings: number;
  shippingSavings: number;
  totalSavings: number;
  currency: 'CZK';
  freeShippingThreshold: number;
  shippingPolicy: 'selected_delivery_cost_discounted_when_bundle_subtotal_reaches_threshold';
};

type HolidayDiscountLineApplication = {
  productId: string;
  catalogProductId: string;
  quantity: number;
  lineSubtotal: number;
  discountAmount: number;
  eligible: boolean;
  policyRefs: string[];
  reasonCodes: string[];
  blockers: string[];
  failClosedReason?: string;
};

type HolidayDiscountApplication = {
  source: 'catalog.discount-eligibility-facts.v1';
  processId: 'holiday-discount-2026';
  processVersion: number;
  policyRefs: string[];
  reasonCodes: string[];
  discountAmount: number;
  currency: 'CZK';
  applied: boolean;
  failClosedReason?: string;
  lines: HolidayDiscountLineApplication[];
};

type CheckoutDiscountApplication = {
  discount: number;
  pendingDiscountCode?: string;
  bundleDiscount?: BundleDiscountApplication;
  holidayDiscount?: HolidayDiscountApplication;
};

type AffinityReplayCursor = {
  createdAt: string;
  id: string;
};

type AffinityReplayQuery = {
  from?: string;
  to?: string;
  limit?: string;
  cursor?: string;
  dryRun?: string;
};

type AffinityReplayResponse = {
  success: true;
  data: {
    sourceOwner: typeof FLIPFLOP_AFFINITY_SOURCE_OWNER;
    consumerOwner: typeof FLIPFLOP_AFFINITY_CONSUMER_OWNER;
    contract: typeof FLIPFLOP_AFFINITY_REPLAY_CONTRACT;
    channel: typeof FLIPFLOP_AFFINITY_CHANNEL;
    filters: {
      from: string | null;
      to: string | null;
      limit: number;
      dryRun: boolean;
    };
    window: {
      from: string | null;
      to: string | null;
      completeness: 'bounded-page';
      complete: boolean;
    };
    cursorBefore: string | null;
    cursorAfter: string | null;
    count: number;
    events: FlipFlopAffinityReplayCandidate[];
    diagnostics: {
      scannedOrders: number;
      eligibleOrders: number;
      skippedOrders: number;
      skippedReasons: Record<string, number>;
      mappedCatalogProductCount: number;
      distinctCatalogProductCount: number;
      unmappedLineCount: number;
      emittedItemCount: number;
    };
  };
};

const DEFAULT_AFFINITY_REPLAY_LIMIT = 50;
const MAX_AFFINITY_REPLAY_LIMIT = 200;
const AFFINITY_REPLAY_CURSOR_VERSION = 1;
const BUNDLE_DISCOUNT_RATE = 0.05;
const BUNDLE_FREE_SHIPPING_THRESHOLD_CZK = 1000;
const BUNDLE_ELIGIBILITY_LIMIT = 8;
const HOLIDAY_DISCOUNT_SCHEMA_VERSION = 'catalog.discount-eligibility-facts.v1';
const HOLIDAY_DISCOUNT_PROCESS_ID = 'holiday-discount-2026';
const DEFAULT_HOLIDAY_DISCOUNT_PROCESS_VERSION = 1;
const HOLIDAY_DISCOUNT_POLICY_REF = 'holiday-10-percent-selected-categories';
const HOLIDAY_DISCOUNT_RATE = 0.10;
const GOAL24_BUNDLE_FIXTURE_GOAL_ID = 'GOAL24-paid-provider-fixture-20260704';
const GOAL24_BUNDLE_FIXTURE_BUNDLE_ID = '919be990-1c76-4f9c-b100-829281c6a709';
const GOAL24_BUNDLE_FIXTURE_DISCOUNT_CZK = 2117.58;
const GOAL24_BUNDLE_FIXTURE_MAX_TOTAL_CZK = 300;
const GOAL24_BUNDLE_FIXTURE_CATALOG_PRODUCT_IDS = [
  'ce4a51aa-2d12-4ab7-a965-7a36609d01fc',
  'dbc51dde-fc66-4511-b178-f929183f4647',
];


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
    private readonly catalogClient: CatalogClientService,
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

  assertAffinityReplayAccess(internalKey: string | undefined): void {
    const expected = this.configService.get<string>('FLIPFLOP_INTERNAL_SERVICE_SECRET')?.trim();
    if (!expected || internalKey !== expected) {
      throw new UnauthorizedException('Invalid internal service key');
    }
  }

  async getOrderAffinityReplayCandidates(query: AffinityReplayQuery): Promise<AffinityReplayResponse> {
    const from = this.parseOptionalIsoDate(query.from, 'from');
    const to = this.parseOptionalIsoDate(query.to, 'to');
    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException('Replay from must be before or equal to to');
    }

    const limit = this.parseReplayLimit(query.limit);
    const cursor = this.decodeReplayCursor(query.cursor);
    const orders = await this.prisma.order.findMany({
      where: this.buildAffinityReplayWhere(from, to, cursor),
      include: {
        order_items: {
          include: {
            products: {
              select: {
                catalogProductId: true,
              },
            },
          },
        },
      },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      take: limit + 1,
    });

    const pageOrders = orders.slice(0, limit);
    const hasMore = orders.length > limit;
    const events: FlipFlopAffinityReplayCandidate[] = [];
    const skippedReasons: Record<string, number> = {};
    const diagnostics = {
      scannedOrders: pageOrders.length,
      eligibleOrders: 0,
      skippedOrders: 0,
      skippedReasons,
      mappedCatalogProductCount: 0,
      distinctCatalogProductCount: 0,
      unmappedLineCount: 0,
      emittedItemCount: 0,
    };

    for (const order of pageOrders) {
      const result = getFlipFlopAffinityReplayEligibility(order);
      diagnostics.mappedCatalogProductCount += result.diagnostics.mappedCatalogProductCount;
      diagnostics.distinctCatalogProductCount += result.diagnostics.distinctCatalogProductCount;
      diagnostics.unmappedLineCount += result.diagnostics.unmappedLineCount;
      diagnostics.emittedItemCount += result.diagnostics.emittedItemCount;

      if (result.eligible && result.candidate) {
        events.push(result.candidate);
        diagnostics.eligibleOrders += 1;
      } else {
        diagnostics.skippedOrders += 1;
        skippedReasons[result.reason] = (skippedReasons[result.reason] ?? 0) + 1;
      }
    }

    const cursorAfter = hasMore && pageOrders.length > 0
      ? this.encodeReplayCursor(pageOrders[pageOrders.length - 1])
      : null;
    const normalizedFrom = from ? from.toISOString() : null;
    const normalizedTo = to ? to.toISOString() : null;

    return {
      success: true,
      data: {
        sourceOwner: FLIPFLOP_AFFINITY_SOURCE_OWNER,
        consumerOwner: FLIPFLOP_AFFINITY_CONSUMER_OWNER,
        contract: FLIPFLOP_AFFINITY_REPLAY_CONTRACT,
        channel: FLIPFLOP_AFFINITY_CHANNEL,
        filters: {
          from: normalizedFrom,
          to: normalizedTo,
          limit,
          dryRun: this.parseReplayDryRun(query.dryRun),
        },
        window: {
          from: normalizedFrom,
          to: normalizedTo,
          completeness: 'bounded-page',
          complete: !hasMore,
        },
        cursorBefore: query.cursor || null,
        cursorAfter,
        count: events.length,
        events,
        diagnostics,
      },
    };
  }

  private parseOptionalIsoDate(value: string | undefined, field: string): Date | undefined {
    if (value === undefined || value.trim() === '') {
      return undefined;
    }
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      throw new BadRequestException(`Replay ${field} must be an ISO timestamp`);
    }
    return parsed;
  }

  private parseReplayLimit(value: string | undefined): number {
    if (value === undefined || value.trim() === '') {
      return DEFAULT_AFFINITY_REPLAY_LIMIT;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException('Replay limit must be a positive integer');
    }
    return Math.min(parsed, MAX_AFFINITY_REPLAY_LIMIT);
  }

  private parseReplayDryRun(value: string | undefined): boolean {
    return typeof value === 'string' && value.trim().toLowerCase() === 'true';
  }

  private buildAffinityReplayWhere(
    from: Date | undefined,
    to: Date | undefined,
    cursor: AffinityReplayCursor | null,
  ): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {
      status: { in: Array.from(FLIPFLOP_AFFINITY_REPLAY_ELIGIBLE_ORDER_STATUSES) },
      paymentStatus: { in: Array.from(FLIPFLOP_AFFINITY_REPLAY_ELIGIBLE_PAYMENT_STATUSES) },
    };

    const createdAt: Prisma.DateTimeFilter = {};
    if (from) {
      createdAt.gte = from;
    }
    if (to) {
      createdAt.lte = to;
    }
    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }

    if (cursor) {
      const cursorDate = new Date(cursor.createdAt);
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { createdAt: { gt: cursorDate } },
            { createdAt: cursorDate, id: { gt: cursor.id } },
          ],
        },
      ];
    }

    return where;
  }

  private decodeReplayCursor(value: string | undefined): AffinityReplayCursor | null {
    if (value === undefined || value.trim() === '') {
      return null;
    }
    try {
      const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
        v?: unknown;
        createdAt?: unknown;
        id?: unknown;
      };
      if (
        parsed.v !== AFFINITY_REPLAY_CURSOR_VERSION ||
        typeof parsed.createdAt !== 'string' ||
        typeof parsed.id !== 'string' ||
        !Number.isFinite(new Date(parsed.createdAt).getTime()) ||
        parsed.id.trim() === ''
      ) {
        throw new Error('invalid replay cursor payload');
      }
      return { createdAt: parsed.createdAt, id: parsed.id };
    } catch {
      throw new BadRequestException('Replay cursor is invalid');
    }
  }

  private encodeReplayCursor(order: { createdAt: Date; id: string }): string {
    const payload = {
      v: AFFINITY_REPLAY_CURSOR_VERSION,
      createdAt: order.createdAt.toISOString(),
      id: order.id,
    };
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  /**
   * Reserve catalog stock in warehouse-microservice for each line (orderNumber = reservation key).
   */
  private async reserveOrderLines(orderNumber: string, orderItems: any[]): Promise<string> {
    const completed: Array<{ catalogProductId: string; warehouseId: string; quantity: number }> = [];
    for (const item of orderItems) {
      const product =
        item.products ||
        (await this.prisma.product.findUnique({
          where: { id: item.productId },
        }));
      const catalogProductId = this.requireReservationCatalogProductId(product, item.productId);
      try {
        const warehouseId = await this.resolveReservationWarehouseId(
          catalogProductId,
          item.quantity,
          orderNumber,
          'reserve',
        );
        await this.warehouseClient.reserveStock(
          catalogProductId,
          warehouseId,
          item.quantity,
          orderNumber,
        );
        completed.push({ catalogProductId, warehouseId, quantity: item.quantity });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        for (const row of completed.slice().reverse()) {
          try {
            await this.warehouseClient.unreserveStock(
              row.catalogProductId,
              row.warehouseId,
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
    return completed[0]?.warehouseId || (await this.requireReservationWarehouseId(orderNumber));
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

  private async resolveReservationWarehouseId(
    catalogProductId: string,
    quantity: number,
    orderNumber: string,
    purpose: 'reserve' | 'release' | 'decrement',
  ): Promise<string> {
    const stockRows = await this.warehouseClient.getStockByProduct(catalogProductId);
    const activeRows = Array.isArray(stockRows)
      ? stockRows.filter((row: any) => row?.warehouseId && row?.warehouse?.isActive !== false)
      : [];
    const rowsWithEnoughAvailable = activeRows.filter(
      (row: any) => Number(row.available ?? 0) >= quantity,
    );
    const rowsWithEnoughReserved = activeRows.filter(
      (row: any) => Number(row.reserved ?? 0) >= quantity,
    );
    const candidateRows =
      purpose === 'reserve'
        ? rowsWithEnoughAvailable
        : rowsWithEnoughReserved.length > 0
          ? rowsWithEnoughReserved
          : activeRows;
    const selected = this.pickWarehouseStockRow(candidateRows, purpose);

    if (selected?.warehouseId) {
      return selected.warehouseId;
    }

    this.logger.error('Stock reservation failed: no usable warehouse stock row', {
      orderNumber,
      catalogProductId,
      quantity,
      purpose,
      stockRowCount: activeRows.length,
    });
    throw new BadRequestException(
      `[MISSING: warehouseStock] Product ${catalogProductId} has no warehouse stock row for ${purpose}`,
    );
  }

  private pickWarehouseStockRow(rows: any[], purpose: 'reserve' | 'release' | 'decrement'): any | null {
    if (!rows.length) {
      return null;
    }

    return rows.slice().sort((a: any, b: any) => {
      const reservedDiff =
        purpose === 'reserve' ? 0 : Number(b.reserved ?? 0) - Number(a.reserved ?? 0);
      if (reservedDiff !== 0) {
        return reservedDiff;
      }
      const availableDiff = Number(b.available ?? 0) - Number(a.available ?? 0);
      if (availableDiff !== 0) {
        return availableDiff;
      }
      const aPriority = Number(a.warehouse?.priority ?? Number.MAX_SAFE_INTEGER);
      const bPriority = Number(b.warehouse?.priority ?? Number.MAX_SAFE_INTEGER);
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return String(a.warehouseId).localeCompare(String(b.warehouseId));
    })[0];
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
        const warehouseId = await this.resolveReservationWarehouseId(
          catalogProductId,
          item.quantity,
          orderNumber,
          'release',
        );
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

  private async releaseLocalReservationAfterCentralForward(order: {
    orderNumber: string;
    order_items: any[];
  }): Promise<void> {
    try {
      await this.unreserveOrderLines(order.orderNumber, order.order_items);
      this.logger.log('Released local warehouse reservation after central Orders accepted order', {
        orderNumber: order.orderNumber,
      });
    } catch (err: unknown) {
      this.logger.warn('Local reservation release after central Orders acceptance failed', {
        orderNumber: order.orderNumber,
        error: err instanceof Error ? err.message : String(err),
      });
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
      if (this.isCentralOrdersOwnedOrder(o)) {
        this.logger.log('Skipped local warehouse release for stale central-owned order', {
          orderNumber: o.orderNumber,
          centralOrderId: this.getAcceptedCentralOrderId(o),
        });
      } else {
        await this.unreserveOrderLines(o.orderNumber, o.order_items);
      }
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
    const order = await this.findOrderForPaymentResult(body);

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

      if (this.isCentralOrdersOwnedOrder(order)) {
        this.logger.log('Skipped local warehouse mutation after payment for central-owned order', {
          orderNumber: order.orderNumber,
          centralOrderId: this.getAcceptedCentralOrderId(order),
          paymentId: body.paymentId,
        });
      } else {
        for (const item of order.order_items) {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });
          const catalogProductId = product?.catalogProductId;
          if (!catalogProductId) {
            continue;
          }
          let warehouseId: string;
          try {
            warehouseId = await this.resolveReservationWarehouseId(
              catalogProductId,
              item.quantity,
              order.orderNumber,
              'release',
            );
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
            try {
              warehouseId = await this.resolveReservationWarehouseId(
                catalogProductId,
                item.quantity,
                order.orderNumber,
                'decrement',
              );
            } catch (inner: unknown) {
              this.logger.error('Stock decrement skipped after payment: no warehouse stock row', {
                orderNumber: order.orderNumber,
                productId: item.productId,
                error: inner instanceof Error ? inner.message : String(inner),
              });
              continue;
            }
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

      if (this.isCentralOrdersOwnedOrder(order)) {
        this.logger.log('Skipped local warehouse release after failed payment for central-owned order', {
          orderNumber: order.orderNumber,
          centralOrderId: this.getAcceptedCentralOrderId(order),
          paymentId: body.paymentId,
        });
      } else {
        await this.unreserveOrderLines(order.orderNumber, order.order_items);
      }

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
    const centralOrdersOwned = this.isCentralOrdersOwnedOrder(order);
    const localLifecycleMutationRequested =
      dto.status !== undefined || dto.paymentStatus !== undefined;
    if (centralOrdersOwned && localLifecycleMutationRequested) {
      throw new BadRequestException(
        '[MISSING: FlipFlop route-to-Orders admin action implementation] Central Orders owns this order lifecycle; local admin status or payment status changes are disabled. Notes-only updates remain allowed.',
      );
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
    return this.mapOrderWithCentralLifecycle(updated);
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

  private toOrderItemCreateInput(item: CheckoutOrderItem): OrderItemCreateInput {
    const { catalogProductId: _catalogProductId, ...createInput } = item;
    return createInput;
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
    billingAddress?: any;
    user?: { id?: string | null; email?: string | null } | null;
    warehouseId: string;
    bundleEvidence?: CatalogBundleEvidence[];
  }) {
    const { order, orderItems, deliveryAddress, billingAddress, user, warehouseId } = params;
    const customerName = [deliveryAddress.firstName, deliveryAddress.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const boundedDeliveryAddress = {
      name: customerName || undefined,
      street: deliveryAddress.street,
      city: deliveryAddress.city,
      postalCode: deliveryAddress.postalCode,
      country: deliveryAddress.country || 'CZ',
    };
    const rawBillingAddress = billingAddress || deliveryAddress;
    const billingName = [rawBillingAddress.firstName, rawBillingAddress.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || customerName;
    const boundedBillingAddress = {
      name: billingName || undefined,
      street: rawBillingAddress.street,
      city: rawBillingAddress.city,
      postalCode: rawBillingAddress.postalCode,
      country: rawBillingAddress.country || deliveryAddress.country || 'CZ',
      companyName: this.normalizeGuestText(rawBillingAddress.companyName, '') || undefined,
      companyId: this.normalizeGuestText(rawBillingAddress.companyId, '') || undefined,
      taxId: this.normalizeGuestText(rawBillingAddress.taxId, '') || undefined,
      vatId: this.normalizeGuestText(rawBillingAddress.vatId, '') || undefined,
      email: this.normalizeGuestText(rawBillingAddress.email, '') || user?.email || undefined,
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

    const bundleEvidence = params.bundleEvidence ?? this.getCatalogBundleEvidenceFromMetadata(order.metadata);

    return {
      externalOrderId: order.orderNumber,
      channel: 'flipflop',
      channelAccountId: this.getCentralOrdersChannelAccountId(),
      orderedAt: order.createdAt,
      customer: {
        name: customerName || undefined,
        email: user?.email || undefined,
        phone: deliveryAddress.phone || undefined,
        authSubject: this.isUuid(user?.id) ? user.id : undefined,
      },
      shippingAddress: boundedDeliveryAddress,
      billingAddress: boundedBillingAddress,
      items,
      ...(bundleEvidence.length ? { bundleEvidence } : {}),
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

  private async createCheckoutAddress(userId: string, rawAddress: any, phone?: string, label = 'billing'): Promise<any> {
    const address = rawAddress || {};
    const firstName = this.normalizeGuestText(address.firstName);
    const lastName = this.normalizeGuestText(address.lastName);
    const street = this.normalizeGuestText(address.street);
    const city = this.normalizeGuestText(address.city);
    const postalCode = this.normalizeGuestText(address.postalCode);

    if (!firstName || !lastName || !street || !city || !postalCode) {
      throw new BadRequestException(`Complete ${label} address is required`);
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
    catalogProductId?: string | null;
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
        catalogProductId: product.catalogProductId,
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

  private roundMoney(value: number): number {
    return Math.max(0, Math.round((Number.isFinite(value) ? value : 0) * 100) / 100);
  }

  private roundCzk(value: number): number {
    return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
  }

  private hasPositiveMoneyInput(value: unknown): boolean {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0;
  }

  private rejectUnsafeClientMoneyInputs(dto: any, options: { rejectShippingCost: boolean }): void {
    if (this.hasPositiveMoneyInput(dto?.discount)) {
      throw new BadRequestException('Client-provided discount is not accepted without a server-validated contract');
    }
    if (options.rejectShippingCost && this.hasPositiveMoneyInput(dto?.shippingCost)) {
      throw new BadRequestException('Client-provided shipping cost is not accepted without a server-side delivery contract');
    }
  }

  private normalizeBundleIntent(raw: unknown): BundleDiscountIntent | null {
    if (raw === undefined || raw === null || raw === '') return null;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new BadRequestException('Invalid bundle discount request');
    }
    const row = raw as Record<string, unknown>;
    const sourceProductId = this.normalizeGuestText(row.sourceProductId);
    const rawProductIds = Array.isArray(row.productIds) ? row.productIds : [];
    const productIds = Array.from(new Set(rawProductIds.map((value) => this.normalizeGuestText(value)).filter(Boolean)));
    if (!sourceProductId || productIds.length < 2 || productIds.length > BUNDLE_ELIGIBILITY_LIMIT) {
      throw new BadRequestException('Invalid bundle discount request');
    }
    if (!productIds.includes(sourceProductId)) {
      throw new BadRequestException('Bundle discount source product must be included in the set');
    }
    const catalogCandidateId = this.normalizeGuestText(row.catalogCandidateId);
    const bundleId = this.normalizeGuestText(row.bundleId);
    return {
      source: 'product_detail_buy_together',
      sourceProductId,
      productIds,
      ...(catalogCandidateId ? { catalogCandidateId } : {}),
      ...(bundleId ? { bundleId } : {}),
    };
  }

  private buildCatalogBundleEvidence(raw: unknown, orderItems: CheckoutOrderItem[]): CatalogBundleEvidence[] {
    const bundleIntent = this.normalizeBundleIntent(raw);
    if (!bundleIntent?.bundleId) return [];

    const productIds = Array.from(new Set(orderItems
      .map((item) => item.catalogProductId)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)))
      .sort();
    if (productIds.length !== orderItems.length || productIds.length < 2) {
      throw new BadRequestException('Catalog bundle evidence requires every submitted component line to have a Catalog product id');
    }

    return [{
      contractVersion: 'catalog.bundle.v1',
      bundleId: bundleIntent.bundleId,
      productIds,
      ...(bundleIntent.catalogCandidateId ? { discountPolicyRef: `catalog-candidate:${bundleIntent.catalogCandidateId}` } : {}),
      serverTotalSource: 'checkout_authoritative',
    }];
  }

  private getCatalogBundleEvidenceFromMetadata(metadata: unknown): CatalogBundleEvidence[] {
    const value = this.getMetadataObject(metadata).catalogBundleEvidence;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is CatalogBundleEvidence => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      const row = item as Record<string, unknown>;
      return row.contractVersion === 'catalog.bundle.v1'
        && typeof row.bundleId === 'string'
        && Array.isArray(row.productIds)
        && row.productIds.every((id) => typeof id === 'string')
        && row.serverTotalSource === 'checkout_authoritative';
    });
  }

  private async getCatalogBundleCandidateTargetIds(bundleIntent: BundleDiscountIntent): Promise<Set<string> | null> {
    if (!bundleIntent.catalogCandidateId) return null;

    const products = await this.prisma.product.findMany({
      where: { id: { in: bundleIntent.productIds }, isActive: true },
      select: { id: true, catalogProductId: true },
    });
    const byProductId = new Map(products.map((product: any) => [product.id, product]));
    const sourceProduct = byProductId.get(bundleIntent.sourceProductId);
    if (!sourceProduct?.catalogProductId || products.length !== bundleIntent.productIds.length) {
      throw new BadRequestException('Catalog bundle candidate products are not available');
    }

    const localCatalogIds = new Set<string>();
    for (const productId of bundleIntent.productIds) {
      const catalogProductId = byProductId.get(productId)?.catalogProductId;
      if (!catalogProductId) {
        throw new BadRequestException('Catalog bundle candidate products are not mapped');
      }
      localCatalogIds.add(catalogProductId);
    }

    const response = await this.catalogClient.getProductBundleCandidates(sourceProduct.catalogProductId, {
      limit: 10,
      freeShippingThreshold: BUNDLE_FREE_SHIPPING_THRESHOLD_CZK,
      currency: 'CZK',
    });
    const candidate = response?.candidates?.find((item: any) => item?.candidateId === bundleIntent.catalogCandidateId);
    if (!candidate || !Array.isArray(candidate.productIds)) {
      throw new BadRequestException('Catalog bundle candidate is not available');
    }

    const candidateCatalogIds = new Set(candidate.productIds.filter((id: unknown): id is string => typeof id === 'string' && Boolean(id)));
    for (const catalogProductId of localCatalogIds) {
      if (!candidateCatalogIds.has(catalogProductId)) {
        throw new BadRequestException('Catalog bundle candidate does not match checkout products');
      }
    }

    const blockers = [
      ...(Array.isArray(response?.blockers) ? response.blockers : []),
      ...(Array.isArray(candidate?.pricing?.blockers) ? candidate.pricing.blockers : []),
    ];
    if (blockers.length > 0) {
      throw new BadRequestException('Catalog bundle candidate is blocked for checkout');
    }

    return new Set(bundleIntent.productIds.filter((productId) => productId !== bundleIntent.sourceProductId));
  }

  private async getEligibleBundleTargetIds(sourceProductId: string): Promise<string[]> {
    const sourceProduct = await this.prisma.product.findFirst({
      where: { id: sourceProductId, isActive: true, catalogProductId: { not: null } },
      include: { product_categories: true },
    });
    if (!sourceProduct) {
      throw new BadRequestException('Bundle source product is not available');
    }
    const historyRows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: sourceProductId },
        orders: { status: OrderStatus.confirmed, order_items: { some: { productId: sourceProductId } } },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: BUNDLE_ELIGIBILITY_LIMIT,
    });
    const historyIds = historyRows.map((row: any) => row.productId).filter(Boolean);
    const categoryIds = Array.isArray((sourceProduct as any).product_categories)
      ? (sourceProduct as any).product_categories.map((row: any) => row.categoryId).filter(Boolean)
      : [];
    const sameCategoryRows = categoryIds.length > 0
      ? await this.prisma.product.findMany({
          where: {
            id: { not: sourceProductId },
            isActive: true,
            catalogProductId: { not: null },
            product_categories: { some: { categoryId: { in: categoryIds } } },
          },
          orderBy: [{ stockQuantity: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
          take: BUNDLE_ELIGIBILITY_LIMIT,
          select: { id: true },
        })
      : [];
    const used = new Set([sourceProductId, ...historyIds, ...sameCategoryRows.map((row: any) => row.id)]);
    const otherRows = await this.prisma.product.findMany({
      where: { id: { notIn: Array.from(used) }, isActive: true, catalogProductId: { not: null } },
      orderBy: [{ stockQuantity: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      take: BUNDLE_ELIGIBILITY_LIMIT,
      select: { id: true },
    });
    const eligible = new Set<string>();
    for (const id of [...historyIds, ...sameCategoryRows.map((row: any) => row.id), ...otherRows.map((row: any) => row.id)]) {
      if (id && eligible.size < BUNDLE_ELIGIBILITY_LIMIT) eligible.add(id);
    }
    return Array.from(eligible);
  }

  private async calculateBundleDiscount(params: {
    orderItems: CheckoutOrderItem[];
    orderTotalBeforeDiscount: number;
    shippingCost: number;
    bundleIntent: BundleDiscountIntent;
  }): Promise<BundleDiscountApplication> {
    const byProductId = new Map(params.orderItems.map((item) => [item.productId, item]));
    if (!byProductId.has(params.bundleIntent.sourceProductId)) {
      throw new BadRequestException('Bundle discount source product is not in the order');
    }
    for (const productId of params.bundleIntent.productIds) {
      if (!byProductId.has(productId)) {
        throw new BadRequestException('Bundle discount products must all be present in the order');
      }
    }
    const eligibleTargets = await this.getCatalogBundleCandidateTargetIds(params.bundleIntent)
      ?? new Set(await this.getEligibleBundleTargetIds(params.bundleIntent.sourceProductId));
    const invalidTargets = params.bundleIntent.productIds
      .filter((productId) => productId !== params.bundleIntent.sourceProductId)
      .filter((productId) => !eligibleTargets.has(productId));
    if (invalidTargets.length > 0) {
      throw new BadRequestException('Bundle discount products are not eligible for this source product');
    }
    const bundleItems = params.bundleIntent.productIds.map((productId) => byProductId.get(productId)!);
    const merchandiseSubtotal = this.roundCzk(bundleItems.reduce((sum, item) => sum + Number(item.unitPrice || 0), 0));
    if (merchandiseSubtotal <= 0) {
      throw new BadRequestException('Bundle discount cannot be applied to zero-price products');
    }
    const merchandiseSavings = Math.max(1, this.roundCzk(merchandiseSubtotal * BUNDLE_DISCOUNT_RATE));
    const shippingSavings = merchandiseSubtotal >= BUNDLE_FREE_SHIPPING_THRESHOLD_CZK ? this.roundCzk(params.shippingCost) : 0;
    const totalSavings = Math.min(this.roundCzk(params.orderTotalBeforeDiscount), merchandiseSavings + shippingSavings);
    return {
      source: 'product_detail_buy_together',
      sourceProductId: params.bundleIntent.sourceProductId,
      productIds: params.bundleIntent.productIds,
      ...(params.bundleIntent.catalogCandidateId ? { catalogCandidateId: params.bundleIntent.catalogCandidateId } : {}),
      ...(params.bundleIntent.bundleId ? { bundleId: params.bundleIntent.bundleId } : {}),
      eligible: true,
      merchandiseSubtotal,
      merchandiseSavings,
      shippingSavings,
      totalSavings,
      currency: 'CZK',
      freeShippingThreshold: BUNDLE_FREE_SHIPPING_THRESHOLD_CZK,
      shippingPolicy: 'selected_delivery_cost_discounted_when_bundle_subtotal_reaches_threshold',
    };
  }


  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  }

  private holidayFailClosedReason(facts: Record<string, unknown> | null): string | undefined {
    if (!facts) {
      return 'catalog_facts_unavailable';
    }
    if (facts.schemaVersion !== HOLIDAY_DISCOUNT_SCHEMA_VERSION) {
      return 'unsupported_schema_version';
    }
    if (facts.processId !== HOLIDAY_DISCOUNT_PROCESS_ID || Number(facts.processVersion) !== this.holidayDiscountProcessVersion()) {
      return 'unsupported_process_version';
    }
    const blockers = this.stringArray(facts.blockers);
    if (blockers.length > 0) {
      return 'catalog_blockers_present';
    }
    const reasonCodes = this.stringArray(facts.reasonCodes);
    if (reasonCodes.some((code) => code.includes('inactive') || code.includes('window'))) {
      return 'inactive_or_closed_window';
    }
    const policyRefs = this.stringArray(facts.policyRefs);
    if (!policyRefs.includes(HOLIDAY_DISCOUNT_POLICY_REF)) {
      return 'missing_policy_ref';
    }
    if (facts.eligible !== true) {
      return 'catalog_ineligible';
    }
    return undefined;
  }

  private uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean)));
  }


  private holidayDiscountProcessVersion(): number {
    const configured = Number(
      this.configService.get<string>('FLIPFLOP_HOLIDAY_DISCOUNT_PROCESS_VERSION') ||
      process.env.FLIPFLOP_HOLIDAY_DISCOUNT_PROCESS_VERSION ||
      DEFAULT_HOLIDAY_DISCOUNT_PROCESS_VERSION,
    );
    return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_HOLIDAY_DISCOUNT_PROCESS_VERSION;
  }

  private async calculateHolidayDiscount(params: {
    orderItems: CheckoutOrderItem[];
  }): Promise<HolidayDiscountApplication> {
    const lines: HolidayDiscountLineApplication[] = [];
    const catalogItems = params.orderItems.filter((item) => Boolean(item.catalogProductId?.trim()));

    for (const item of catalogItems) {
      const catalogProductId = item.catalogProductId!.trim();
      const facts = await this.catalogClient.getProductDiscountEligibility(catalogProductId);
      const row = facts && typeof facts === 'object' && !Array.isArray(facts)
        ? (facts as Record<string, unknown>)
        : null;
      const policyRefs = this.stringArray(row?.policyRefs);
      const reasonCodes = this.stringArray(row?.reasonCodes);
      const blockers = this.stringArray(row?.blockers);
      const failClosedReason = this.holidayFailClosedReason(row);
      const lineSubtotal = this.roundMoney(Number(item.totalPrice || 0));
      const discountAmount = failClosedReason
        ? 0
        : Math.min(lineSubtotal, this.roundMoney(lineSubtotal * HOLIDAY_DISCOUNT_RATE));

      lines.push({
        productId: item.productId,
        catalogProductId,
        quantity: item.quantity,
        lineSubtotal,
        discountAmount,
        eligible: !failClosedReason,
        policyRefs,
        reasonCodes,
        blockers,
        ...(failClosedReason ? { failClosedReason } : {}),
      });
    }

    const discountAmount = this.roundMoney(lines.reduce((sum, line) => sum + line.discountAmount, 0));
    const failClosedReason =
      discountAmount > 0
        ? undefined
        : catalogItems.length === 0
          ? 'no_catalog_product_lines'
          : 'no_eligible_catalog_lines';

    return {
      source: HOLIDAY_DISCOUNT_SCHEMA_VERSION,
      processId: HOLIDAY_DISCOUNT_PROCESS_ID,
      processVersion: this.holidayDiscountProcessVersion(),
      policyRefs: this.uniqueStrings(lines.flatMap((line) => line.policyRefs)),
      reasonCodes: this.uniqueStrings(lines.flatMap((line) => line.reasonCodes)),
      discountAmount,
      currency: 'CZK',
      applied: discountAmount > 0,
      ...(failClosedReason ? { failClosedReason } : {}),
      lines,
    };
  }


  private isGoal24BundleFixtureDiscount(params: {
    validation: { valid: boolean; discountValue: number; type: string; goalId?: string | null; maxUses?: number; usedCount?: number };
    bundleIntent: BundleDiscountIntent;
    orderItems: CheckoutOrderItem[];
    orderTotalBeforeDiscount: number;
  }): boolean {
    if (params.validation.goalId !== GOAL24_BUNDLE_FIXTURE_GOAL_ID) return false;
    if (params.validation.type !== 'fixed') return false;
    if (this.roundMoney(Number(params.validation.discountValue)) !== GOAL24_BUNDLE_FIXTURE_DISCOUNT_CZK) return false;
    if (params.validation.maxUses !== 1) return false;
    if (typeof params.validation.usedCount === 'number' && params.validation.usedCount > 0) return false;
    if (params.bundleIntent.bundleId !== GOAL24_BUNDLE_FIXTURE_BUNDLE_ID) return false;

    const submittedCatalogIds = params.orderItems
      .map((item) => item.catalogProductId)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .sort();
    const expectedCatalogIds = [...GOAL24_BUNDLE_FIXTURE_CATALOG_PRODUCT_IDS].sort();
    if (submittedCatalogIds.length !== expectedCatalogIds.length) return false;
    for (let index = 0; index < expectedCatalogIds.length; index += 1) {
      if (submittedCatalogIds[index] !== expectedCatalogIds[index]) return false;
    }

    const finalTotal = this.roundMoney(params.orderTotalBeforeDiscount - Number(params.validation.discountValue));
    return finalTotal > 0 && finalTotal <= GOAL24_BUNDLE_FIXTURE_MAX_TOTAL_CZK;
  }

  private async calculateCheckoutDiscount(params: {
    orderItems: CheckoutOrderItem[];
    orderTotalBeforeDiscount: number;
    shippingCost: number;
    discountCode?: unknown;
    bundleIntent?: unknown;
  }): Promise<CheckoutDiscountApplication> {
    const trimmedDiscountCode = typeof params.discountCode === 'string' && params.discountCode.trim() ? params.discountCode.trim() : '';
    const bundleIntent = this.normalizeBundleIntent(params.bundleIntent);
    if (trimmedDiscountCode && bundleIntent) {
      const validation = await this.discountService.validateCode(trimmedDiscountCode);
      if (!validation.valid) {
        throw new BadRequestException('Invalid or expired discount code');
      }
      if (!this.isGoal24BundleFixtureDiscount({
        validation,
        bundleIntent,
        orderItems: params.orderItems,
        orderTotalBeforeDiscount: params.orderTotalBeforeDiscount,
      })) {
        throw new BadRequestException('Discount code cannot be combined with a bundle discount');
      }
      const holidayDiscount: HolidayDiscountApplication = {
        source: HOLIDAY_DISCOUNT_SCHEMA_VERSION,
        processId: HOLIDAY_DISCOUNT_PROCESS_ID,
        processVersion: this.holidayDiscountProcessVersion(),
        policyRefs: [],
        reasonCodes: ['goal24_bundle_fixture_exclusive'],
        discountAmount: 0,
        currency: 'CZK',
        applied: false,
        failClosedReason: 'goal24_bundle_fixture_exclusive',
        lines: [],
      };
      const bundleDiscount = await this.calculateBundleDiscount({
        orderItems: params.orderItems,
        orderTotalBeforeDiscount: params.orderTotalBeforeDiscount,
        shippingCost: params.shippingCost,
        bundleIntent,
      });
      const discount = this.roundMoney(Number(validation.discountValue));
      return {
        discount,
        pendingDiscountCode: this.discountService.normalizeCode(trimmedDiscountCode),
        bundleDiscount,
        holidayDiscount,
      };
    }
    if (trimmedDiscountCode || bundleIntent) {
      const holidayDiscount: HolidayDiscountApplication = {
        source: HOLIDAY_DISCOUNT_SCHEMA_VERSION,
        processId: HOLIDAY_DISCOUNT_PROCESS_ID,
        processVersion: this.holidayDiscountProcessVersion(),
        policyRefs: [],
        reasonCodes: ['existing_discount_exclusive'],
        discountAmount: 0,
        currency: 'CZK',
        applied: false,
        failClosedReason: 'existing_discount_exclusive',
        lines: [],
      };
      if (trimmedDiscountCode) {
        const validation = await this.discountService.validateCode(trimmedDiscountCode);
        if (!validation.valid) {
          throw new BadRequestException('Invalid or expired discount code');
        }
        const after = await this.discountService.applyDiscount(params.orderTotalBeforeDiscount, trimmedDiscountCode);
        return {
          discount: this.roundMoney(params.orderTotalBeforeDiscount - after),
          pendingDiscountCode: this.discountService.normalizeCode(trimmedDiscountCode),
          holidayDiscount,
        };
      }
      if (bundleIntent) {
        const bundleDiscount = await this.calculateBundleDiscount({
          orderItems: params.orderItems,
          orderTotalBeforeDiscount: params.orderTotalBeforeDiscount,
          shippingCost: params.shippingCost,
          bundleIntent,
        });
        return { discount: bundleDiscount.totalSavings, bundleDiscount, holidayDiscount };
      }
    }
    const holidayDiscount = await this.calculateHolidayDiscount({
      orderItems: params.orderItems,
    });
    return { discount: holidayDiscount.discountAmount, holidayDiscount };
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

  private getMetadataObject(metadata: unknown): Record<string, unknown> {
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  }

  private getCentralOrdersForwardingMetadata(orderOrMetadata: any): Record<string, unknown> | null {
    const metadata = this.getMetadataObject(orderOrMetadata?.metadata ?? orderOrMetadata);
    const forwarding = metadata.centralOrdersForwarding;
    return forwarding && typeof forwarding === 'object' && !Array.isArray(forwarding)
      ? (forwarding as Record<string, unknown>)
      : null;
  }

  private extractCentralOrderId(centralOrder: unknown): string | undefined {
    if (!centralOrder || typeof centralOrder !== 'object' || Array.isArray(centralOrder)) {
      return undefined;
    }
    const row = centralOrder as Record<string, unknown>;
    for (const key of ['id', 'orderId', 'uuid']) {
      const value = row[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  }

  private requireCentralOrderId(centralOrder: unknown, localOrderNumber: string): string {
    const centralOrderId = this.extractCentralOrderId(centralOrder);
    if (!centralOrderId) {
      throw new BadRequestException(
        `[MISSING: centralOrderId] Orders accepted ${localOrderNumber} without a readable UUID`,
      );
    }
    return centralOrderId;
  }

  private getAcceptedCentralOrderId(order: any): string | undefined {
    const forwarding = this.getCentralOrdersForwardingMetadata(order);
    const status = typeof forwarding?.status === 'string' ? forwarding.status : '';
    const centralOrderId = typeof forwarding?.centralOrderId === 'string'
      ? forwarding.centralOrderId.trim()
      : '';
    return (status === 'accepted' || status === 'conflict') && centralOrderId
      ? centralOrderId
      : undefined;
  }

  private isCentralOrdersOwnedOrder(order: any): boolean {
    return Boolean(this.getAcceptedCentralOrderId(order));
  }

  private buildPaymentMetadata(order: any, centralOrderId: string): Record<string, unknown> {
    return {
      centralOrderId,
      flipflopOrderId: order.id,
      flipflopOrderNumber: order.orderNumber,
      centralOrdersSource: 'orders-microservice',
    };
  }

  private async recordCentralOrdersForwarding(
    order: any,
    status: 'accepted' | 'conflict' | 'failed',
    details: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      const latest = await this.prisma.order.findUnique({
        where: { id: order.id },
        select: { metadata: true },
      });
      const existingMetadata = this.getMetadataObject(latest?.metadata ?? order.metadata);

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

  private async createCentralOrderBeforePayment(params: {
    order: any;
    orderItems: any[];
    deliveryAddress: any;
    billingAddress?: any;
    user?: { email?: string | null } | null;
    warehouseId: string;
    bundleEvidence?: CatalogBundleEvidence[];
  }): Promise<{ centralOrderId: string; status: 'accepted' | 'conflict' }> {
    const orderData = this.buildCentralOrdersPayload(params);

    try {
      const centralOrder = await this.orderClient.createOrder(orderData);
      const centralOrderId = this.requireCentralOrderId(centralOrder, params.order.orderNumber);
      await this.recordCentralOrdersForwarding(params.order, 'accepted', { centralOrderId });
      await this.releaseLocalReservationAfterCentralForward(params.order);
      this.logger.log('Order accepted by central Orders before payment', {
        orderId: params.order.id,
        orderNumber: params.order.orderNumber,
        centralOrderId,
        channelAccountId: orderData.channelAccountId,
      });
      return { centralOrderId, status: 'accepted' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const isIdempotencyConflict = message.includes(ORDER_IDEMPOTENCY_CONFLICT);
      const isMissingCatalogProductId = message.includes('[MISSING: catalogProductId]');
      let forwardingReason = isIdempotencyConflict
        ? ORDER_IDEMPOTENCY_CONFLICT
        : isMissingCatalogProductId
          ? '[MISSING: catalogProductId]'
          : 'CENTRAL_ORDERS_FORWARD_FAILED';

      if (isIdempotencyConflict) {
        const existing = await this.orderClient.findByExternalId(
          params.order.orderNumber,
          'flipflop',
          orderData.channelAccountId,
        );
        const centralOrderId = this.extractCentralOrderId(existing);
        if (centralOrderId) {
          await this.recordCentralOrdersForwarding(params.order, 'conflict', {
            centralOrderId,
            reason: ORDER_IDEMPOTENCY_CONFLICT,
          });
          await this.releaseLocalReservationAfterCentralForward(params.order);
          this.logger.warn('Central Orders idempotency conflict resolved to existing order', {
            orderId: params.order.id,
            orderNumber: params.order.orderNumber,
            centralOrderId,
            channel: 'flipflop',
            channelAccountId: orderData.channelAccountId,
          });
          return { centralOrderId, status: 'conflict' };
        }
        forwardingReason = '[MISSING: centralOrderId]';
      }

      await this.recordCentralOrdersForwarding(params.order, isIdempotencyConflict ? 'conflict' : 'failed', {
        reason: forwardingReason,
        error: message,
      });
      this.logger.error('Central Orders rejected order before payment creation', {
        orderId: params.order.id,
        orderNumber: params.order.orderNumber,
        reason: forwardingReason,
      });
      throw new BadRequestException(
        `Central Orders did not accept order; payment was not created (${forwardingReason})`,
      );
    }
  }

  private async recordPaymentInitiation(orderId: string, patch: Record<string, unknown>): Promise<void> {
    await this.mergeOrderMetadata(orderId, {
      paymentInitiation: {
        updatedAt: new Date().toISOString(),
        ...patch,
      },
    });
  }

  private isUuid(value: unknown): value is string {
    return typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private async findOrderForPaymentResult(body: PaymentResultDto): Promise<any | null> {
    const metadata = this.getMetadataObject(body.metadata);
    const candidates: Prisma.OrderWhereInput[] = [];
    const localOrderId = metadata.flipflopOrderId;
    const localOrderNumber = metadata.flipflopOrderNumber;

    if (this.isUuid(localOrderId)) {
      candidates.push({ id: localOrderId });
    }
    if (typeof localOrderNumber === 'string' && localOrderNumber.trim()) {
      candidates.push({ orderNumber: localOrderNumber.trim() });
    }
    if (typeof body.orderId === 'string' && body.orderId.trim()) {
      candidates.push({ orderNumber: body.orderId.trim() });
    }
    if (typeof body.paymentId === 'string' && body.paymentId.trim()) {
      candidates.push({ paymentTransactionId: body.paymentId.trim() });
    }

    if (candidates.length === 0) {
      return null;
    }

    return this.prisma.order.findFirst({
      where: { OR: candidates },
      include: {
        order_items: true,
      },
    });
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
        catalogProductId: product.catalogProductId,
        quantity: cartItem.quantity,
        unitPrice: price,
        totalPrice: itemTotal,
      });
    }

    this.rejectUnsafeClientMoneyInputs(dto, { rejectShippingCost: true });
    const subtotalRounded = this.roundMoney(subtotal);
    const tax = this.roundMoney(subtotalRounded * 0.21);
    const shippingCost = 0;
    const orderTotalBeforeDiscount = subtotalRounded + tax + shippingCost;
    const discountApplication = await this.calculateCheckoutDiscount({
      orderItems,
      orderTotalBeforeDiscount,
      shippingCost,
      discountCode: dto.discountCode,
      bundleIntent: dto.bundleIntent,
    });
    const discount = discountApplication.discount;
    const total = this.roundMoney(orderTotalBeforeDiscount - discount);
    const catalogBundleEvidence = this.buildCatalogBundleEvidence(dto.bundleIntent, orderItems);

    const metadataValue: Record<string, unknown> = {};
    if (discountApplication.pendingDiscountCode) {
      metadataValue.pendingDiscountCode = discountApplication.pendingDiscountCode;
    }
    if (discountApplication.bundleDiscount) {
      metadataValue.bundleDiscount = discountApplication.bundleDiscount;
    }
    if (catalogBundleEvidence.length > 0) {
      metadataValue.catalogBundleEvidence = catalogBundleEvidence;
    }
    if (discountApplication.holidayDiscount) {
      metadataValue.holidayDiscount = discountApplication.holidayDiscount;
    }
    const metadata: Prisma.InputJsonValue | undefined = Object.keys(metadataValue).length > 0
      ? (metadataValue as Prisma.InputJsonValue)
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
          create: orderItems.map((item) => this.toOrderItemCreateInput(item)),
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

    let centralAcceptance: { centralOrderId: string; status: 'accepted' | 'conflict' };
    try {
      centralAcceptance = await this.createCentralOrderBeforePayment({
        order,
        orderItems: order.order_items,
        deliveryAddress,
        user,
        warehouseId: reservationWarehouseId,
        bundleEvidence: catalogBundleEvidence,
      });
    } catch (error: unknown) {
      await this.unreserveOrderLines(order.orderNumber, order.order_items);
      throw error;
    }

    let paymentResult;
    try {
      paymentResult = await this.paymentService.createPayment({
        orderId: centralAcceptance.centralOrderId,
        centralOrderId: centralAcceptance.centralOrderId,
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
        metadata: this.buildPaymentMetadata(order, centralAcceptance.centralOrderId),
      });
    } catch (error: unknown) {
      await this.recordPaymentInitiation(order.id, {
        status: 'failed',
        centralOrderId: centralAcceptance.centralOrderId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    if (!paymentResult.success || !paymentResult.data?.id) {
      await this.recordPaymentInitiation(order.id, {
        status: 'failed',
        centralOrderId: centralAcceptance.centralOrderId,
        error: 'Payment initiation failed',
      });
      throw new BadRequestException('Payment initiation failed');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentTransactionId: paymentResult.data.id },
    });
    await this.recordPaymentInitiation(order.id, {
      status: 'created',
      centralOrderId: centralAcceptance.centralOrderId,
      paymentId: paymentResult.data.id,
    });

    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    this.logger.log('Order created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      centralOrderId: centralAcceptance.centralOrderId,
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

    return {
      order: await this.mapOrderWithCentralLifecycle(orderWithPayment),
      redirectUrl: paymentResult.data.redirectUri || null,
    };
  }



  async quoteGuestOrder(dto: any) {
    const orderItems = await this.buildGuestOrderItems(dto.items);
    const subtotal = this.roundMoney(orderItems.reduce((sum, item) => sum + item.totalPrice, 0));
    const tax = this.roundMoney(subtotal * 0.21);
    const paymentMethod = this.normalizeGuestPaymentMethod(dto.paymentMethod);
    const deliveryMethod = this.normalizeGuestText(dto.deliveryMethod, 'zasilkovna-address');
    const shippingCost = this.calculateGuestDeliveryCost(deliveryMethod);
    const operatorTip = this.normalizeGuestOperatorTip(dto.operatorTip);
    this.rejectUnsafeClientMoneyInputs(dto, { rejectShippingCost: true });
    const orderTotalBeforeDiscount = this.roundMoney(subtotal + tax + shippingCost + operatorTip);
    const discountApplication = await this.calculateCheckoutDiscount({
      orderItems,
      orderTotalBeforeDiscount,
      shippingCost,
      discountCode: dto.discountCode,
      bundleIntent: dto.bundleIntent,
    });
    const discount = discountApplication.discount;
    const total = this.roundMoney(orderTotalBeforeDiscount - discount);

    return {
      schemaVersion: 'flipflop.checkout-quote.v1',
      mode: 'guest',
      sideEffects: [],
      paymentMethod,
      deliveryMethod,
      currency: 'CZK',
      subtotal,
      tax,
      shippingCost,
      operatorTip,
      orderTotalBeforeDiscount,
      discount,
      total,
      items: orderItems,
      discountApplication,
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
      dto.deliveryAddress ? 'delivery' : 'billing',
    );
    const orderItems = await this.buildGuestOrderItems(dto.items);
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = Math.round(subtotal * 0.21 * 100) / 100;
    const paymentMethod = this.normalizeGuestPaymentMethod(dto.paymentMethod);
    const deliveryMethod = this.normalizeGuestText(dto.deliveryMethod, 'zasilkovna-address');
    const shippingCost = this.calculateGuestDeliveryCost(deliveryMethod);
    const operatorTip = this.normalizeGuestOperatorTip(dto.operatorTip);
    this.rejectUnsafeClientMoneyInputs(dto, { rejectShippingCost: true });
    const orderTotalBeforeDiscount = this.roundMoney(subtotal + tax + shippingCost + operatorTip);
    const discountApplication = await this.calculateCheckoutDiscount({
      orderItems,
      orderTotalBeforeDiscount,
      shippingCost,
      discountCode: dto.discountCode,
      bundleIntent: dto.bundleIntent,
    });
    const discount = discountApplication.discount;
    const total = this.roundMoney(orderTotalBeforeDiscount - discount);
    const catalogBundleEvidence = this.buildCatalogBundleEvidence(dto.bundleIntent, orderItems);
    const metadataValue: Record<string, unknown> = {
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
    };
    if (discountApplication.pendingDiscountCode) {
      metadataValue.pendingDiscountCode = discountApplication.pendingDiscountCode;
    }
    if (discountApplication.bundleDiscount) {
      metadataValue.bundleDiscount = discountApplication.bundleDiscount;
    }
    if (discountApplication.holidayDiscount) {
      metadataValue.holidayDiscount = discountApplication.holidayDiscount;
    }
    const metadata = metadataValue as Prisma.InputJsonValue;

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
          create: orderItems.map((item) => this.toOrderItemCreateInput(item)),
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

    let centralAcceptance: { centralOrderId: string; status: 'accepted' | 'conflict' };
    try {
      centralAcceptance = await this.createCentralOrderBeforePayment({
        order,
        orderItems: order.order_items,
        deliveryAddress,
        billingAddress: dto.billingAddress,
        user: { email: guestEmail },
        warehouseId: reservationWarehouseId,
        bundleEvidence: catalogBundleEvidence,
      });
    } catch (error: unknown) {
      await this.unreserveOrderLines(order.orderNumber, order.order_items);
      throw error;
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
          orderId: centralAcceptance.centralOrderId,
          centralOrderId: centralAcceptance.centralOrderId,
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
          metadata: this.buildPaymentMetadata(order, centralAcceptance.centralOrderId),
        });
      } catch (error: unknown) {
        await this.recordPaymentInitiation(order.id, {
          status: 'failed',
          centralOrderId: centralAcceptance.centralOrderId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      if (!paymentResult.success || !paymentResult.data?.id) {
        await this.recordPaymentInitiation(order.id, {
          status: 'failed',
          centralOrderId: centralAcceptance.centralOrderId,
          error: 'Payment initiation failed',
        });
        throw new BadRequestException('Payment initiation failed');
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentTransactionId: paymentResult.data.id },
      });
      await this.recordPaymentInitiation(order.id, {
        status: 'created',
        centralOrderId: centralAcceptance.centralOrderId,
        paymentId: paymentResult.data.id,
      });
      redirectUrl = paymentResult.data.redirectUri || null;
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
      order: await this.mapOrderWithCentralLifecycle(orderWithPayment),
      redirectUrl,
    };
  }

  private async mapOrderWithCentralLifecycle(order: any) {
    const mapped: any = this.mapOrder(order);
    mapped.centralOrder = await this.resolveCentralOrderLifecycle(order, mapped);
    return mapped;
  }

  private async resolveCentralOrderLifecycle(order: any, mapped: any) {
    const forwarding = this.getCentralOrdersForwardingMetadata(order);
    const base = {
      currency: 'CZK',
      subtotal: mapped.subtotal,
      shippingCost: mapped.shippingCost,
      tax: mapped.tax,
      total: mapped.total,
      items: mapped.items,
      deliveryAddress: mapped.deliveryAddress,
    };

    if (!forwarding) {
      return {
        source: 'local',
        readStatus: 'not_forwarded',
        lifecycleStage: mapped.status,
        status: 'local_read_model',
        paymentStatus: mapped.paymentStatus,
        stale: true,
        error: '[MISSING: central Orders acceptance metadata]',
        ...base,
      };
    }

    const forwardingStatus = typeof forwarding.status === 'string' ? forwarding.status : 'unknown';
    const centralOrderId = this.getAcceptedCentralOrderId(order);
    if (!centralOrderId) {
      return {
        source: 'local-metadata',
        readStatus: forwardingStatus === 'failed' ? 'forward_failed' : 'error',
        lifecycleStage: forwardingStatus === 'failed' ? 'central_orders_failed' : 'central_orders_unknown',
        status: forwardingStatus,
        paymentStatus: mapped.paymentStatus,
        stale: true,
        error: typeof forwarding.reason === 'string'
          ? forwarding.reason
          : '[MISSING: centralOrderId]',
        ...base,
      };
    }

    const lifecycle = await this.orderClient.getOrderLifecycle({
      centralOrderId,
      externalOrderId: order.orderNumber,
      channel: 'flipflop',
      channelAccountId: this.getCentralOrdersChannelAccountId(),
    });

    return {
      ...lifecycle,
      id: lifecycle.id || centralOrderId,
      lifecycleStage: lifecycle.lifecycleStage || mapped.status,
      status: lifecycle.status || forwardingStatus,
      paymentStatus: lifecycle.paymentStatus || mapped.paymentStatus,
      currency: lifecycle.currency || 'CZK',
      subtotal: lifecycle.subtotal ?? mapped.subtotal,
      shippingCost: lifecycle.shippingCost ?? mapped.shippingCost,
      tax: lifecycle.tax ?? mapped.tax,
      total: lifecycle.total ?? mapped.total,
      items: lifecycle.items && lifecycle.items.length > 0 ? lifecycle.items : mapped.items,
      deliveryAddress: lifecycle.deliveryAddress || mapped.deliveryAddress,
      stale: lifecycle.stale,
    };
  }

  private normalizeOrderStatusFilter(value: unknown): OrderStatus | undefined {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const allowed = new Set(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']);
    return allowed.has(normalized) ? (normalized as OrderStatus) : undefined;
  }

  private normalizePaymentStatusFilter(value: unknown): PaymentStatus | undefined {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const allowed = new Set(['pending', 'paid', 'failed', 'refunded']);
    return allowed.has(normalized) ? (normalized as PaymentStatus) : undefined;
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

    return Promise.all(orders.map((o) => this.mapOrderWithCentralLifecycle(o)));
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

    return this.mapOrderWithCentralLifecycle(order);
  }

  async getAdminOrders(filters: {
    status?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    limit?: string;
  }) {
    const pageRaw = filters.page !== undefined ? parseInt(String(filters.page), 10) : NaN;
    const limitRaw = filters.limit !== undefined ? parseInt(String(filters.limit), 10) : NaN;
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const where: Prisma.OrderWhereInput = {};
    const status = this.normalizeOrderStatusFilter(filters.status);
    const paymentStatus = this.normalizePaymentStatusFilter(filters.paymentStatus);
    if (status) {
      where.status = status;
    }
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      if (!Number.isNaN(start.getTime())) {
        createdAt.gte = start;
      }
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      if (!Number.isNaN(end.getTime())) {
        createdAt.lte = end;
      }
    }
    if (createdAt.gte || createdAt.lte) {
      where.createdAt = createdAt;
    }

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    const items = await Promise.all(rows.map((row) => this.mapOrderWithCentralLifecycle(row)));
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getAdminOrder(orderId: string) {
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
        order_status_history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrderWithCentralLifecycle(order);
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

    if (order.paymentStatus === PaymentStatus.paid) {
      throw new BadRequestException('Order is already paid');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    let centralOrderId = this.getAcceptedCentralOrderId(order);

    if (!centralOrderId) {
      let reservationWarehouseId: string;
      try {
        reservationWarehouseId = await this.reserveOrderLines(order.orderNumber, order.order_items);
      } catch (err: unknown) {
        throw err;
      }

      try {
        const centralAcceptance = await this.createCentralOrderBeforePayment({
          order,
          orderItems: order.order_items,
          deliveryAddress: order.delivery_addresses,
          user,
          warehouseId: reservationWarehouseId,
          bundleEvidence: this.getCatalogBundleEvidenceFromMetadata(order.metadata),
        });
        centralOrderId = centralAcceptance.centralOrderId;
      } catch (error: unknown) {
        await this.unreserveOrderLines(order.orderNumber, order.order_items);
        throw error;
      }
    }

    const callbackUrlBase =
      this.configService.get<string>('API_GATEWAY_URL') || 'https://flipflop.alfares.cz';
    const callbackUrl = `${callbackUrlBase.replace(/\/$/, '')}/api/webhooks/payment-result`;

    const paymentResponse = await this.paymentService.createPayment({
      orderId: centralOrderId,
      centralOrderId,
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
      metadata: this.buildPaymentMetadata(order, centralOrderId),
    });

    if (!paymentResponse.success || !paymentResponse.data) {
      await this.recordPaymentInitiation(order.id, {
        status: 'failed',
        centralOrderId,
        error: 'Failed to create payment',
      });
      throw new BadRequestException('Failed to create payment');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentTransactionId:
          paymentResponse.data.transactionId || paymentResponse.data.id,
      },
    });
    await this.recordPaymentInitiation(order.id, {
      status: 'created',
      centralOrderId,
      paymentId: paymentResponse.data.id,
    });

    return {
      redirectUri: paymentResponse.data.redirectUri,
      orderId: order.id,
      centralOrderId,
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
