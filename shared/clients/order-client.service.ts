import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

const CREATE_ORDER_CONTRACT_VERSION = 'orders.create.v1';
const DEFAULT_CHANNEL_ACCOUNT_ID = 'flipflop-storefront';
const ORDERS_LIFECYCLE_READ_MISSING = '[MISSING: Orders lifecycle read endpoint]';
export const ORDER_IDEMPOTENCY_CONFLICT = 'ORDER_IDEMPOTENCY_CONFLICT';

interface CreateCentralOrderRequest {
  externalOrderId: string;
  channel: string;
  channelAccountId?: string;
  orderedAt?: Date | string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  shippingAddress?: CentralOrderAddress;
  billingAddress?: CentralOrderAddress;
  items: Array<{
    productId: string;
    sku?: string;
    title: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    warehouseId?: string;
  }>;
  totals: {
    subtotal: number;
    shippingCost: number;
    taxAmount: number;
    total: number;
    currency: string;
  };
  payment?: {
    method?: string;
    status?: string;
  };
  shipping?: {
    method?: string;
  };
}

type CreateCentralOrderPayload = Omit<CreateCentralOrderRequest, 'orderedAt'> & {
  contractVersion: string;
  orderedAt?: string;
};

export interface CentralOrderAddress {
  name?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

export interface CentralOrderLineItem {
  id?: string;
  productId?: string;
  sku?: string;
  title?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface CentralOrderLifecycleRead {
  id?: string;
  externalOrderId?: string;
  source: 'orders-microservice' | 'placeholder';
  readStatus: 'available' | 'missing_endpoint' | 'not_found' | 'error';
  lifecycleStage?: string;
  status?: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  fulfillmentStatus?: string;
  exceptionStatus?: string;
  currency?: string;
  subtotal?: number;
  shippingCost?: number;
  tax?: number;
  total?: number;
  items?: CentralOrderLineItem[];
  deliveryAddress?: CentralOrderAddress | null;
  updatedAt?: string;
  stale: boolean;
  error?: string;
}

/**
 * API client for orders-microservice.
 * Sends the Orders create contract idempotency fields so callers can retry safely.
 */
@Injectable()
export class OrderClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl =
      process.env.ORDERS_SERVICE_URL ||
      process.env.ORDERS_MICROSERVICE_URL ||
      process.env.ORDER_HUB_SERVICE_URL ||
      'http://orders-microservice:3203';
  }

  async createOrder(orderData: CreateCentralOrderRequest): Promise<any> {
    const payload: CreateCentralOrderPayload = {
      contractVersion: CREATE_ORDER_CONTRACT_VERSION,
      ...orderData,
      channelAccountId: this.normalizeChannelAccountId(orderData.channelAccountId),
      orderedAt: this.normalizeOrderedAt(orderData.orderedAt),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.baseUrl + '/api/orders', payload, {
          headers: this.getAuthHeaders(),
        }),
      );
      this.logger.log('Order accepted by orders-microservice: ' + response.data.data?.id, 'OrderClient');
      return response.data.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const message = status === HttpStatus.CONFLICT
        ? ORDER_IDEMPOTENCY_CONFLICT
        : error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to create order in orders-microservice: ' + message, stack, 'OrderClient');
      throw new HttpException('Failed to create order: ' + message, status || HttpStatus.BAD_REQUEST);
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(this.baseUrl + '/api/orders/' + orderId + '/status', { status }, {
          headers: this.getAuthHeaders(),
        }),
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to update order status: ' + errorMessage, errorStack, 'OrderClient');
      throw new HttpException('Failed to update order status: ' + errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  async findByExternalId(externalOrderId: string, channel: string, channelAccountId?: string): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl + '/api/orders', {
          headers: this.getAuthHeaders(),
          params: {
            channel,
            externalOrderId,
            channelAccountId: channelAccountId ? this.normalizeChannelAccountId(channelAccountId) : undefined,
          },
        }),
      );
      const orders = this.extractList(response.data);
      return orders.find((order: any) => order.externalOrderId === externalOrderId) || null;
    } catch (error: unknown) {
      this.logger.warn('Order not found: ' + externalOrderId, 'OrderClient');
      return null;
    }
  }

  async getOrderLifecycle(params: {
    centralOrderId?: string;
    externalOrderId?: string;
    channel?: string;
    channelAccountId?: string;
  }): Promise<CentralOrderLifecycleRead> {
    const centralOrderId = params.centralOrderId?.trim();
    const externalOrderId = params.externalOrderId?.trim();
    let lastError: string | undefined;

    if (centralOrderId) {
      for (const path of [
        `/api/orders/${encodeURIComponent(centralOrderId)}/lifecycle`,
        `/api/orders/${encodeURIComponent(centralOrderId)}`,
      ]) {
        try {
          const response = await firstValueFrom(
            this.httpService.get(this.baseUrl + path, { headers: this.getAuthHeaders() }),
          );
          const normalized = this.normalizeLifecycleResponse(response.data, externalOrderId);
          if (normalized) {
            return normalized;
          }
        } catch (error: any) {
          const status = error?.response?.status;
          lastError = status ? `HTTP ${status}` : error instanceof Error ? error.message : String(error);
          if (status && status !== HttpStatus.NOT_FOUND && status !== HttpStatus.METHOD_NOT_ALLOWED) {
            this.logger.warn(`Central Orders lifecycle read failed for ${centralOrderId}: ${lastError}`, 'OrderClient');
          }
        }
      }
    }

    if (externalOrderId) {
      const found = await this.findByExternalId(
        externalOrderId,
        params.channel || 'flipflop',
        params.channelAccountId,
      );
      const normalized = this.normalizeLifecycleResponse(found, externalOrderId);
      if (normalized) {
        return normalized;
      }
    }

    return this.missingLifecyclePlaceholder(centralOrderId, externalOrderId, lastError);
  }

  private extractList(raw: any): any[] {
    const data = raw?.data ?? raw;
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.items)) {
      return data.items;
    }
    if (Array.isArray(data?.orders)) {
      return data.orders;
    }
    if (Array.isArray(raw?.items)) {
      return raw.items;
    }
    return [];
  }

  private normalizeLifecycleResponse(raw: any, fallbackExternalOrderId?: string): CentralOrderLifecycleRead | null {
    if (!raw) {
      return null;
    }
    const data = raw?.data?.order ?? raw?.data ?? raw?.order ?? raw;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }

    const lifecycle = data.lifecycle && typeof data.lifecycle === 'object' ? data.lifecycle : {};
    const totals = data.totals && typeof data.totals === 'object' ? data.totals : data;
    const payment = data.payment && typeof data.payment === 'object' ? data.payment : {};
    const delivery = data.delivery && typeof data.delivery === 'object' ? data.delivery : {};
    const shipping = data.shipping && typeof data.shipping === 'object' ? data.shipping : {};
    const exception = data.exception && typeof data.exception === 'object' ? data.exception : {};
    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.orderItems)
        ? data.orderItems
        : Array.isArray(data.lines)
          ? data.lines
          : [];

    return {
      id: this.stringValue(data.id ?? data.orderId),
      externalOrderId: this.stringValue(data.externalOrderId) || fallbackExternalOrderId,
      source: 'orders-microservice',
      readStatus: 'available',
      lifecycleStage: this.stringValue(lifecycle.stage ?? lifecycle.status ?? data.lifecycleStage ?? data.status),
      status: this.stringValue(data.status ?? lifecycle.status ?? lifecycle.stage),
      paymentStatus: this.stringValue(payment.status ?? data.paymentStatus),
      deliveryStatus: this.stringValue(delivery.status ?? shipping.status ?? data.deliveryStatus ?? data.shippingStatus),
      fulfillmentStatus: this.stringValue(data.fulfillmentStatus ?? lifecycle.fulfillmentStatus),
      exceptionStatus: this.stringValue(exception.status ?? data.exceptionStatus),
      currency: this.stringValue(totals.currency ?? data.currency) || 'CZK',
      subtotal: this.numberValue(totals.subtotal),
      shippingCost: this.numberValue(totals.shippingCost ?? totals.shipping ?? data.shippingCost),
      tax: this.numberValue(totals.taxAmount ?? totals.tax ?? data.tax),
      total: this.numberValue(totals.total ?? data.total),
      items: items.map((item: any) => ({
        id: this.stringValue(item.id),
        productId: this.stringValue(item.productId ?? item.catalogProductId),
        sku: this.stringValue(item.sku),
        title: this.stringValue(item.title ?? item.productName ?? item.name),
        productName: this.stringValue(item.productName ?? item.title ?? item.name),
        quantity: this.numberValue(item.quantity),
        unitPrice: this.numberValue(item.unitPrice ?? item.price),
        totalPrice: this.numberValue(item.totalPrice ?? item.lineTotal),
      })),
      deliveryAddress: this.normalizeAddress(data.shippingAddress ?? data.deliveryAddress ?? shipping.address),
      updatedAt: this.stringValue(data.updatedAt ?? lifecycle.updatedAt),
      stale: false,
    };
  }

  private normalizeAddress(raw: any): CentralOrderAddress | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }
    return {
      name: this.stringValue(raw.name),
      street: this.stringValue(raw.street ?? raw.addressLine1),
      city: this.stringValue(raw.city),
      postalCode: this.stringValue(raw.postalCode ?? raw.zip),
      country: this.stringValue(raw.country),
      phone: this.stringValue(raw.phone),
    };
  }

  private missingLifecyclePlaceholder(
    centralOrderId?: string,
    externalOrderId?: string,
    detail?: string,
  ): CentralOrderLifecycleRead {
    return {
      id: centralOrderId,
      externalOrderId,
      source: 'placeholder',
      readStatus: 'missing_endpoint',
      lifecycleStage: 'unknown',
      status: ORDERS_LIFECYCLE_READ_MISSING,
      stale: true,
      error: detail ? `${ORDERS_LIFECYCLE_READ_MISSING}: ${detail}` : ORDERS_LIFECYCLE_READ_MISSING,
    };
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private numberValue(value: unknown): number | undefined {
    const next = Number(value);
    return Number.isFinite(next) ? next : undefined;
  }

  private normalizeChannelAccountId(channelAccountId?: string): string {
    const normalized = channelAccountId?.trim();
    return normalized || DEFAULT_CHANNEL_ACCOUNT_ID;
  }

  private normalizeOrderedAt(orderedAt?: Date | string): string | undefined {
    if (!orderedAt) {
      return undefined;
    }
    return orderedAt instanceof Date ? orderedAt.toISOString() : orderedAt;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = process.env.ORDERS_SERVICE_TOKEN?.trim();
    if (!token) {
      return {};
    }
    return {
      'x-internal-service-token': token,
      'x-service-name': 'flipflop-service',
    };
  }
}
