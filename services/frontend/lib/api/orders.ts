/**
 * Orders API
 */

import { apiClient } from './client';
import { PaginatedResponse } from './products';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export type CentralOrderReadStatus =
  | 'available'
  | 'missing_endpoint'
  | 'not_found'
  | 'not_forwarded'
  | 'forward_failed'
  | 'error';

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DeliveryAddress {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface CentralOrderLifecycle {
  id?: string;
  externalOrderId?: string;
  source?: string;
  readStatus: CentralOrderReadStatus;
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
  items?: OrderItem[];
  deliveryAddress?: DeliveryAddress | null;
  updatedAt?: string;
  stale?: boolean;
  error?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus | string;
  paymentStatus: PaymentStatus | string;
  paymentMethod: string;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress | null;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  currency?: string;
  centralOrder?: CentralOrderLifecycle;
  notes?: string;
  paymentTransactionId?: string;
  createdAt: string;
  updatedAt: string;
  fulfilledAt?: string;
}

export interface CheckoutAddressData {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country?: string;
  phone?: string;
  companyName?: string;
  companyId?: string;
  taxId?: string;
  vatId?: string;
  email?: string;
}

export interface GuestOrderItemData {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface BundleIntentData {
  source: 'product_detail_buy_together';
  sourceProductId: string;
  productIds: string[];
}

export interface CreateGuestOrderData {
  email: string;
  phone?: string;
  wantsAccount?: boolean;
  marketingConsent?: boolean;
  billingAddress: CheckoutAddressData;
  deliveryAddress?: CheckoutAddressData;
  items: GuestOrderItemData[];
  paymentMethod?: string;
  deliveryMethod?: string;
  expeditionMethod?: string;
  wantsDifferentDeliveryDay?: boolean;
  requestedDeliveryDate?: string;
  operatorTip?: number;
  notes?: string;
  shippingCost?: number;
  discount?: number;
  discountCode?: string;
  bundleIntent?: BundleIntentData;
}

export interface CreateOrderResponse {
  order: Order;
  redirectUrl?: string | null;
}

export interface CreateOrderData {
  deliveryAddressId: string;
  paymentMethod?: string;
  notes?: string;
  shippingCost?: number;
  discount?: number;
  bundleIntent?: BundleIntentData;
}

export interface UpdateOrderStatusData {
  status?: OrderStatus | string;
  paymentStatus?: PaymentStatus | string;
  notes?: string;
}

export interface PaymentResponse {
  redirectUri: string;
  orderId: string;
  centralOrderId?: string;
}

export function isCentralLifecycleAvailable(order: Order): boolean {
  return order.centralOrder?.readStatus === 'available';
}

export function getOrderDisplayData(order: Order) {
  const centralAvailable = isCentralLifecycleAvailable(order);
  const central = order.centralOrder;
  const currency = (centralAvailable ? central?.currency : undefined) || order.currency || 'CZK';

  return {
    centralAvailable,
    central,
    status: (centralAvailable ? central?.status || central?.lifecycleStage : undefined) || order.status,
    lifecycleStage: (centralAvailable ? central?.lifecycleStage : undefined) || order.status,
    paymentStatus: (centralAvailable ? central?.paymentStatus : undefined) || order.paymentStatus,
    deliveryStatus: centralAvailable ? central?.deliveryStatus : undefined,
    fulfillmentStatus: centralAvailable ? central?.fulfillmentStatus : undefined,
    exceptionStatus: centralAvailable ? central?.exceptionStatus : undefined,
    currency,
    items:
      centralAvailable && central?.items && central.items.length > 0
        ? central.items.map((item, index) => ({
            id: item.id || `${order.id}-central-${index}`,
            productId: item.productId || '',
            productName: item.productName || (item as any).title || 'Položka objednávky',
            productSku: (item as any).sku || '',
            quantity: Number(item.quantity || 0),
            unitPrice: Number(item.unitPrice || 0),
            totalPrice: Number(item.totalPrice || 0),
          }))
        : order.items,
    deliveryAddress:
      centralAvailable && central?.deliveryAddress ? central.deliveryAddress : order.deliveryAddress,
    subtotal: centralAvailable && central?.subtotal !== undefined ? central.subtotal : order.subtotal,
    tax: centralAvailable && central?.tax !== undefined ? central.tax : order.tax,
    shippingCost:
      centralAvailable && central?.shippingCost !== undefined ? central.shippingCost : order.shippingCost,
    total: centralAvailable && central?.total !== undefined ? central.total : order.total,
  };
}

export function formatOrderMoney(amount: number | undefined, currency = 'CZK'): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
}

export const ordersApi = {
  async createOrder(data: CreateOrderData) {
    return apiClient.post<CreateOrderResponse>('/orders', data);
  },

  async createGuestOrder(data: CreateGuestOrderData) {
    return apiClient.post<CreateOrderResponse>('/orders/guest', data);
  },

  async getOrders() {
    return apiClient.get<Order[]>('/orders');
  },

  async getOrder(id: string) {
    return apiClient.get<Order>(`/orders/${id}`);
  },

  async createPayment(orderId: string) {
    return apiClient.post<PaymentResponse>(`/payu/create-payment/${orderId}`);
  },

  async getAdminOrders(filters?: {
    status?: OrderStatus | string;
    paymentStatus?: PaymentStatus | string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return apiClient.get<PaginatedResponse<Order>>(`/admin/orders${query ? `?${query}` : ''}`);
  },

  async getAdminOrder(id: string) {
    return apiClient.get<Order>(`/admin/orders/${id}`);
  },

  async updateAdminOrderStatus(id: string, data: UpdateOrderStatusData) {
    return apiClient.put<Order>(`/admin/orders/${id}/status`, data);
  },
};
