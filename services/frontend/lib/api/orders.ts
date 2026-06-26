/**
 * Orders API
 */

import { apiClient } from './client';
import { Product, ProductVariant } from './products';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

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
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  notes?: string;
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
}

export interface GuestOrderItemData {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CreateGuestOrderData {
  email: string;
  phone?: string;
  wantsAccount?: boolean;
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
}

export interface PaymentResponse {
  redirectUri: string;
  orderId: string;
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
};
