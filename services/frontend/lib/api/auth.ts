/**
 * Authentication API
 */

import { apiClient, ApiResponse } from './client';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isAdmin?: boolean;
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

  async updateProfile(data: Partial<User>) {
    return apiClient.put<User>('/users/profile', data);
  },

  logout() {
    apiClient.setToken(null);
  },
};
