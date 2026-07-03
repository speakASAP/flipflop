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
  title?: string;
  sku?: string;
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
  catalogCandidateId?: string;
  bundleId?: string;
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


export const CENTRAL_ORDER_LIFECYCLE_STAGES = [
  'ordered_unpaid',
  'payment_failed',
  'paid_not_delivered',
  'warehouse_fulfillment_requested',
  'warehouse_collecting',
  'warehouse_forming',
  'warehouse_formed',
  'handed_to_delivery',
  'in_delivery',
  'received',
  'not_received',
  'returned',
  'cancelled',
] as const;

export type CentralOrderLifecycleStage = (typeof CENTRAL_ORDER_LIFECYCLE_STAGES)[number];

export const CENTRAL_ORDER_LIFECYCLE_LABELS: Record<string, string> = {
  ordered_unpaid: 'Čeká na platbu',
  payment_failed: 'Platba selhala',
  paid_not_delivered: 'Zaplaceno, čeká na doručení',
  warehouse_fulfillment_requested: 'Předáno skladu',
  warehouse_collecting: 'Sklad připravuje položky',
  warehouse_forming: 'Sklad kompletuje zásilku',
  warehouse_formed: 'Zásilka připravena',
  handed_to_delivery: 'Předáno dopravci',
  in_delivery: 'Na cestě',
  received: 'Doručeno',
  not_received: 'Nedoručeno',
  returned: 'Vráceno',
  cancelled: 'Zrušeno',
  pending: 'Čeká na potvrzení',
  confirmed: 'Potvrzeno',
  accepted: 'Přijato v Orders',
  processing: 'Zpracovává se',
  shipped: 'Odesláno',
  delivered: 'Doručeno',
  refunded: 'Vráceno',
  paid: 'Zaplaceno',
  failed: 'Selhalo',
  central_orders_failed: 'Nepřijato v Orders',
  unknown: 'Stav není dostupný',
};

export function normalizeOrderStatus(status?: string) {
  return (status || '').toLowerCase();
}

export function getOrderLifecycleLabel(status?: string, fallback = 'Stav není dostupný') {
  const normalized = normalizeOrderStatus(status);
  return CENTRAL_ORDER_LIFECYCLE_LABELS[normalized] || status || fallback;
}

export function getOrderLifecycleColor(status?: string) {
  switch (normalizeOrderStatus(status)) {
    case 'ordered_unpaid':
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'payment_failed':
    case 'not_received':
    case 'cancelled':
    case 'failed':
    case 'central_orders_failed':
      return 'bg-red-100 text-red-800';
    case 'paid_not_delivered':
    case 'warehouse_fulfillment_requested':
    case 'handed_to_delivery':
    case 'confirmed':
    case 'accepted':
      return 'bg-blue-100 text-blue-800';
    case 'warehouse_collecting':
    case 'warehouse_forming':
    case 'processing':
      return 'bg-purple-100 text-purple-800';
    case 'warehouse_formed':
    case 'in_delivery':
    case 'shipped':
      return 'bg-indigo-100 text-indigo-800';
    case 'received':
    case 'delivered':
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'returned':
    case 'refunded':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
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
            productName: item.productName || item.title || 'Položka objednávky',
            productSku: item.productSku || item.sku || '',
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
