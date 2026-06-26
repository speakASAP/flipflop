/**
 * Delivery Addresses API
 */

import { apiClient } from './client';

export interface DeliveryAddress {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressData {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

export const addressesApi = {
  async getAddresses() {
    return apiClient.get<DeliveryAddress[]>('/users/addresses');
  },

  async createAddress(data: CreateAddressData) {
    return apiClient.post<DeliveryAddress>('/users/addresses', data);
  },

  async updateAddress(id: string, data: Partial<CreateAddressData>) {
    return apiClient.put<DeliveryAddress>(`/users/addresses/${id}`, data);
  },

  async deleteAddress(id: string) {
    return apiClient.delete(`/users/addresses/${id}`);
  },
};
