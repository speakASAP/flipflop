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

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
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

