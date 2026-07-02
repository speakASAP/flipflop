/**
 * Auth Service Interfaces
 */

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthContactInfo {
  type: string;
  value: string;
  isPrimary?: boolean;
}

export interface AuthProfileAddress {
  firstName?: string;
  lastName?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
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

export interface CreateAuthDeliveryAddressDto {
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

export type UpdateAuthDeliveryAddressDto = Partial<CreateAuthDeliveryAddressDto>;

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

export interface CreateAuthInvoiceProfileDto {
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

export type UpdateAuthInvoiceProfileDto = Partial<CreateAuthInvoiceProfileDto>;

export interface AuthCheckoutData {
  user?: AuthUser;
  deliveryAddresses: AuthDeliveryAddress[];
  invoiceProfiles: AuthInvoiceProfile[];
  defaultDeliveryAddress?: AuthDeliveryAddress | null;
  defaultInvoiceProfile?: AuthInvoiceProfile | null;
}

export interface AuthWalletDeleteResponse {
  success: boolean;
  id?: string;
}

export interface UpdateAuthProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: AuthProfileAddress;
  profile?: Record<string, unknown>;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  contactInfo?: AuthContactInfo[];
  profileAddress?: AuthProfileAddress;
  perApplicationPreferences?: Record<string, unknown>;
  isActive: boolean;
  isVerified: boolean;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  user?: AuthUser;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface MagicLinkRequestDto {
  email: string;
  return_url: string;
  client_id?: string;
  state?: string;
  app_domain?: string;
}

export interface MagicLinkResponse {
  success: boolean;
}

