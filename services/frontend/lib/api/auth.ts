/**
 * Authentication API
 */

import { apiClient, ApiResponse } from './client';

const AUTH_CHECKOUT_DATA_PATH = '/auth/profile/checkout-data';
const AUTH_DELIVERY_ADDRESSES_PATH = '/auth/profile/delivery-addresses';
const AUTH_INVOICE_PROFILES_PATH = '/auth/profile/invoice-profiles';

export interface ProfileAddress {
  firstName?: string;
  lastName?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileAddress?: ProfileAddress;
  isAdmin?: boolean;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: ProfileAddress;
}


export interface AuthDeliveryAddress {
  id: string;
  userId?: string;
  label?: string;
  firstName?: string;
  lastName?: string;
  recipientName?: string;
  companyName?: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAuthDeliveryAddressData {
  label?: string;
  firstName?: string;
  lastName?: string;
  recipientName?: string;
  companyName?: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
  metadata?: Record<string, unknown>;
}

export type UpdateAuthDeliveryAddressData = Partial<CreateAuthDeliveryAddressData>;

export type AuthInvoiceProfileType = 'person' | 'company';

export interface AuthInvoiceProfile {
  id: string;
  userId?: string;
  label?: string;
  type?: AuthInvoiceProfileType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyId?: string;
  taxId?: string;
  vatId?: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
  isDefault: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAuthInvoiceProfileData {
  label?: string;
  type?: AuthInvoiceProfileType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyId?: string;
  taxId?: string;
  vatId?: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
  isDefault?: boolean;
  metadata?: Record<string, unknown>;
}

export type UpdateAuthInvoiceProfileData = Partial<CreateAuthInvoiceProfileData>;

export interface AuthCheckoutData {
  user?: User;
  deliveryAddresses: AuthDeliveryAddress[];
  invoiceProfiles: AuthInvoiceProfile[];
  defaultDeliveryAddress?: AuthDeliveryAddress | null;
  defaultInvoiceProfile?: AuthInvoiceProfile | null;
}

export interface AuthWalletDeleteResponse {
  success: boolean;
  id?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

type LegacyWrappedAuthResponse = ApiResponse<AuthResponse & { token?: string }>;
type RawAuthResponse = AuthResponse & { token?: string };

function isWrappedAuthResponse(response: LegacyWrappedAuthResponse | RawAuthResponse): response is LegacyWrappedAuthResponse {
  return Object.prototype.hasOwnProperty.call(response, 'success');
}

function normalizeAuthResponse(response: LegacyWrappedAuthResponse | RawAuthResponse): ApiResponse<AuthResponse> {
  if (isWrappedAuthResponse(response)) {
    const token = response.data?.accessToken || response.data?.token;
    if (response.success && response.data && token) {
      apiClient.setToken(token);
      return { success: true, data: { ...response.data, accessToken: token } };
    }
    return response as ApiResponse<AuthResponse>;
  }

  const token = response.accessToken || response.token;
  if (response.user && token) {
    apiClient.setToken(token);
    return { success: true, data: { user: response.user, accessToken: token, refreshToken: response.refreshToken } };
  }

  return {
    success: false,
    error: {
      code: 'AUTH_RESPONSE_ERROR',
      message: 'Authentication service returned an unexpected response.',
    },
  };
}


type AuthApiDataResponse<T> = ApiResponse<T> | T;

function isApiResponseShape<T>(response: AuthApiDataResponse<T>): response is ApiResponse<T> {
  return Boolean(response && typeof response === 'object' && 'success' in response);
}

function readObjectKey<T>(response: unknown, dataKey?: string): T | undefined {
  if (!response || typeof response !== 'object' || !dataKey) {
    return undefined;
  }

  const record = response as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, dataKey)) {
    return record[dataKey] as T;
  }

  return undefined;
}

function normalizeAuthApiData<T>(response: AuthApiDataResponse<T>, dataKey?: string): ApiResponse<T> {
  if (isApiResponseShape(response)) {
    const keyedData = readObjectKey<T>(response, dataKey);
    if (response.success && response.data === undefined && keyedData !== undefined) {
      return { ...response, data: keyedData };
    }

    return response;
  }

  const keyedData = readObjectKey<T>(response, dataKey);
  return { success: true, data: keyedData ?? response as T };
}

export const authApi = {
  async login(credentials: LoginCredentials) {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials) as LegacyWrappedAuthResponse | RawAuthResponse;
    return normalizeAuthResponse(response);
  },

  async register(data: RegisterData) {
    const response = await apiClient.post<AuthResponse>('/auth/register', data) as LegacyWrappedAuthResponse | RawAuthResponse;
    return normalizeAuthResponse(response);
  },

  async getProfile() {
    return apiClient.get<User>('/users/profile');
  },

  async updateProfile(data: UpdateProfileData) {
    return apiClient.put<User>('/users/profile', data);
  },

  async getCheckoutData() {
    const response = await apiClient.get<AuthCheckoutData>(AUTH_CHECKOUT_DATA_PATH) as AuthApiDataResponse<AuthCheckoutData>;
    return normalizeAuthApiData(response, 'checkoutData');
  },

  async getDeliveryAddresses() {
    const response = await apiClient.get<AuthDeliveryAddress[]>(AUTH_DELIVERY_ADDRESSES_PATH) as AuthApiDataResponse<AuthDeliveryAddress[]>;
    return normalizeAuthApiData(response, 'deliveryAddresses');
  },

  async createDeliveryAddress(data: CreateAuthDeliveryAddressData) {
    const response = await apiClient.post<AuthDeliveryAddress>(AUTH_DELIVERY_ADDRESSES_PATH, data) as AuthApiDataResponse<AuthDeliveryAddress>;
    return normalizeAuthApiData(response, 'deliveryAddress');
  },

  async updateDeliveryAddress(id: string, data: UpdateAuthDeliveryAddressData) {
    const response = await apiClient.patch<AuthDeliveryAddress>(`${AUTH_DELIVERY_ADDRESSES_PATH}/${encodeURIComponent(id)}`, data) as AuthApiDataResponse<AuthDeliveryAddress>;
    return normalizeAuthApiData(response, 'deliveryAddress');
  },

  async deleteDeliveryAddress(id: string) {
    const response = await apiClient.delete<AuthWalletDeleteResponse>(`${AUTH_DELIVERY_ADDRESSES_PATH}/${encodeURIComponent(id)}`) as AuthApiDataResponse<AuthWalletDeleteResponse>;
    return normalizeAuthApiData(response, 'deliveryAddress');
  },

  async setDefaultDeliveryAddress(id: string) {
    const response = await apiClient.patch<AuthDeliveryAddress>(`${AUTH_DELIVERY_ADDRESSES_PATH}/${encodeURIComponent(id)}/default`) as AuthApiDataResponse<AuthDeliveryAddress>;
    return normalizeAuthApiData(response, 'deliveryAddress');
  },

  async getInvoiceProfiles() {
    const response = await apiClient.get<AuthInvoiceProfile[]>(AUTH_INVOICE_PROFILES_PATH) as AuthApiDataResponse<AuthInvoiceProfile[]>;
    return normalizeAuthApiData(response, 'invoiceProfiles');
  },

  async createInvoiceProfile(data: CreateAuthInvoiceProfileData) {
    const response = await apiClient.post<AuthInvoiceProfile>(AUTH_INVOICE_PROFILES_PATH, data) as AuthApiDataResponse<AuthInvoiceProfile>;
    return normalizeAuthApiData(response, 'invoiceProfile');
  },

  async updateInvoiceProfile(id: string, data: UpdateAuthInvoiceProfileData) {
    const response = await apiClient.patch<AuthInvoiceProfile>(`${AUTH_INVOICE_PROFILES_PATH}/${encodeURIComponent(id)}`, data) as AuthApiDataResponse<AuthInvoiceProfile>;
    return normalizeAuthApiData(response, 'invoiceProfile');
  },

  async deleteInvoiceProfile(id: string) {
    const response = await apiClient.delete<AuthWalletDeleteResponse>(`${AUTH_INVOICE_PROFILES_PATH}/${encodeURIComponent(id)}`) as AuthApiDataResponse<AuthWalletDeleteResponse>;
    return normalizeAuthApiData(response, 'invoiceProfile');
  },

  async setDefaultInvoiceProfile(id: string) {
    const response = await apiClient.patch<AuthInvoiceProfile>(`${AUTH_INVOICE_PROFILES_PATH}/${encodeURIComponent(id)}/default`) as AuthApiDataResponse<AuthInvoiceProfile>;
    return normalizeAuthApiData(response, 'invoiceProfile');
  },

  logout() {
    apiClient.setToken(null);
  },
};
