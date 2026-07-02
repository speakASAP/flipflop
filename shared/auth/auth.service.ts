/**
 * Auth Service
 * Service to handle authentication via 'auth-microservice'
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  ValidateTokenResponse,
  RefreshTokenDto,
  AuthUser,
  UpdateAuthProfileDto,
  AuthCheckoutData,
  AuthDeliveryAddress,
  CreateAuthDeliveryAddressDto,
  UpdateAuthDeliveryAddressDto,
  AuthInvoiceProfile,
  CreateAuthInvoiceProfileDto,
  UpdateAuthInvoiceProfileDto,
  AuthWalletDeleteResponse,
  MagicLinkRequestDto,
  MagicLinkResponse,
} from './auth.interface';
import { LoggerService } from '../logger/logger.service';
import { CircuitBreakerService } from '../resilience/circuit-breaker.service';
import { RetryService } from '../resilience/retry.service';
import { ResilienceMonitor } from '../resilience/resilience.monitor';

@Injectable()
export class AuthService {
  private readonly authServiceUrl: string;
  private readonly logger: LoggerService;
  private readonly circuitBreakerService: CircuitBreakerService;
  private readonly retryService: RetryService;
  private readonly resilienceMonitor: ResilienceMonitor;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    logger: LoggerService,
    circuitBreakerService: CircuitBreakerService,
    retryService: RetryService,
    resilienceMonitor: ResilienceMonitor,
  ) {
    this.authServiceUrl =
      this.configService.get<string>('AUTH_SERVICE_URL') ||
      'https://auth.alfares.cz';
    this.logger = logger;
    this.circuitBreakerService = circuitBreakerService;
    this.retryService = retryService;
    this.resilienceMonitor = resilienceMonitor;
  }

  /**
   * Internal method to call 'auth-microservice' via HTTP
   */
  private async callAuthService<T>(
    endpoint: string,
    data?: any,
  ): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.post<T>(
        `${this.authServiceUrl}${endpoint}`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      ),
    );
    return response.data;
  }


  private async callAuthProfileResource<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    accessToken: string,
    data?: unknown,
  ): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.request<T>({
        method,
        url: `${this.authServiceUrl}${endpoint}`,
        data,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }),
    );
    return response.data;
  }

  private unwrapAuthProfileResponse<T>(response: unknown, key: string): T {
    if (response && typeof response === 'object') {
      const payload = response as Record<string, unknown>;
      if (payload.data !== undefined) {
        return payload.data as T;
      }
      if (payload[key] !== undefined) {
        return payload[key] as T;
      }
    }

    return response as T;
  }

  /**
   * Register a new user
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const callFn = async () => this.callAuthService<AuthResponse>('/auth/register', dto);

    const breaker = this.circuitBreakerService.create(
      'auth-microservice',
      callFn,
    );

    if (this.circuitBreakerService.isOpen('auth-microservice')) {
      this.logger.warn('Auth service circuit breaker is open', {
        action: 'register',
        email: dto.email,
      });
      throw new UnauthorizedException('Authentication service is temporarily unavailable');
    }

    try {
      const response = await this.retryService.execute(
        async () => {
          return await breaker.fire(callFn);
        },
        {
          retryable: (error: any) => {
            return error.code !== 'VALIDATION_ERROR' && error.code !== 'CONFLICT';
          },
        },
      );

      this.resilienceMonitor.recordRetryAttempt('auth-microservice', true);

      this.logger.log(`User registered successfully`, {
        email: dto.email,
        userId: (response as AuthResponse)?.user?.id,
      });

      return response as AuthResponse;
    } catch (error: any) {
      this.resilienceMonitor.recordRetryAttempt('auth-microservice', false);

      this.logger.error('Failed to register user', {
        error: error.message,
        email: dto.email,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Request a passwordless magic-link account activation/login email.
   * Auth owns token generation and email delivery; callers should treat this as best-effort.
   */
  async requestMagicLink(dto: MagicLinkRequestDto): Promise<MagicLinkResponse> {
    const callFn = async () => this.callAuthService<MagicLinkResponse>('/auth/magic-link/request', dto);

    const breaker = this.circuitBreakerService.create(
      'auth-microservice',
      callFn,
    );

    if (this.circuitBreakerService.isOpen('auth-microservice')) {
      this.logger.warn('Auth service circuit breaker is open', {
        action: 'requestMagicLink',
        email: dto.email,
      });
      throw new UnauthorizedException('Authentication service is temporarily unavailable');
    }

    try {
      const response = await this.retryService.execute(
        async () => {
          return await breaker.fire(callFn);
        },
        {
          retryable: (error: any) => {
            return error.statusCode !== 400 && error.statusCode !== 429;
          },
        },
      );

      this.resilienceMonitor.recordRetryAttempt('auth-microservice', true);
      this.logger.log('Magic-link requested successfully', {
        email: dto.email,
      });
      return response as MagicLinkResponse;
    } catch (error: any) {
      this.resilienceMonitor.recordRetryAttempt('auth-microservice', false);
      this.logger.error('Failed to request magic-link', {
        error: error.message,
        email: dto.email,
      });
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const callFn = async () => this.callAuthService<AuthResponse>('/auth/login', dto);

    const breaker = this.circuitBreakerService.create(
      'auth-microservice',
      callFn,
    );

    if (this.circuitBreakerService.isOpen('auth-microservice')) {
      this.logger.warn('Auth service circuit breaker is open', {
        action: 'login',
        email: dto.email,
      });
      throw new UnauthorizedException('Authentication service is temporarily unavailable');
    }

    try {
      const response = await this.retryService.execute(
        async () => {
          return await breaker.fire(callFn);
        },
        {
          retryable: (error: any) => {
            return error.code !== 'VALIDATION_ERROR' && error.statusCode !== 401;
          },
        },
      );

      this.resilienceMonitor.recordRetryAttempt('auth-microservice', true);

      this.logger.log(`User logged in successfully`, {
        email: dto.email,
        userId: (response as AuthResponse)?.user?.id,
      });

      return response as AuthResponse;
    } catch (error: any) {
      this.resilienceMonitor.recordRetryAttempt('auth-microservice', false);

      this.logger.error('Failed to login user', {
        error: error.message,
        email: dto.email,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<AuthUser> {
    const callFn = async () => {
      const response = await this.callAuthService<ValidateTokenResponse>(
        '/auth/validate',
        { token },
      );
      if (!response.valid || !response.user) {
        throw new UnauthorizedException('Invalid token');
      }
      return response.user;
    };

    const breaker = this.circuitBreakerService.create(
      'auth-microservice',
      callFn,
    );

    if (this.circuitBreakerService.isOpen('auth-microservice')) {
      this.logger.warn('Auth service circuit breaker is open', {
        action: 'validateToken',
      });
      throw new UnauthorizedException('Authentication service is temporarily unavailable');
    }

    try {
      const user = await this.retryService.execute(
        async () => {
          return await breaker.fire(callFn);
        },
        {
          retryable: (error: any) => {
            return error.statusCode !== 401;
          },
        },
      );

      this.resilienceMonitor.recordRetryAttempt('auth-microservice', true);

      return user as AuthUser;
    } catch (error: any) {
      this.resilienceMonitor.recordRetryAttempt('auth-microservice', false);

      this.logger.error('Failed to validate token', {
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Read the canonical Auth-owned profile for a validated browser token.
   */
  async getProfile(accessToken: string): Promise<AuthUser> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ user: AuthUser }>(
          `${this.authServiceUrl}/auth/profile`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            timeout: 10000,
          },
        ),
      );

      if (!response.data?.user) {
        throw new UnauthorizedException('Invalid profile response');
      }

      return response.data.user;
    } catch (error: any) {
      this.logger.error('Failed to read Auth profile', {
        error: error.message,
      });
      throw error;
    }
  }


  /**
   * Update the canonical Auth-owned profile for a validated browser token.
   */
  async updateProfile(accessToken: string, dto: UpdateAuthProfileDto): Promise<AuthUser> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch<{ user: AuthUser }>(
          `${this.authServiceUrl}/auth/profile`,
          dto,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        ),
      );

      if (!response.data?.user) {
        throw new UnauthorizedException('Invalid profile update response');
      }

      return response.data.user;
    } catch (error: any) {
      this.logger.error('Failed to update Auth profile', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Read Auth-owned checkout data for the validated browser token.
   */
  async getCheckoutData(accessToken: string): Promise<AuthCheckoutData> {
    const response = await this.callAuthProfileResource<unknown>(
      'GET',
      '/auth/profile/checkout-data',
      accessToken,
    );
    return this.unwrapAuthProfileResponse<AuthCheckoutData>(response, 'checkoutData');
  }

  /**
   * Read Auth-owned delivery addresses for the validated browser token.
   */
  async getDeliveryAddresses(accessToken: string): Promise<AuthDeliveryAddress[]> {
    const response = await this.callAuthProfileResource<unknown>(
      'GET',
      '/auth/profile/delivery-addresses',
      accessToken,
    );
    return this.unwrapAuthProfileResponse<AuthDeliveryAddress[]>(response, 'deliveryAddresses');
  }

  async createDeliveryAddress(
    accessToken: string,
    dto: CreateAuthDeliveryAddressDto,
  ): Promise<AuthDeliveryAddress> {
    const response = await this.callAuthProfileResource<unknown>(
      'POST',
      '/auth/profile/delivery-addresses',
      accessToken,
      dto,
    );
    return this.unwrapAuthProfileResponse<AuthDeliveryAddress>(response, 'deliveryAddress');
  }

  async updateDeliveryAddress(
    accessToken: string,
    id: string,
    dto: UpdateAuthDeliveryAddressDto,
  ): Promise<AuthDeliveryAddress> {
    const response = await this.callAuthProfileResource<unknown>(
      'PATCH',
      `/auth/profile/delivery-addresses/${encodeURIComponent(id)}`,
      accessToken,
      dto,
    );
    return this.unwrapAuthProfileResponse<AuthDeliveryAddress>(response, 'deliveryAddress');
  }

  async deleteDeliveryAddress(
    accessToken: string,
    id: string,
  ): Promise<AuthWalletDeleteResponse> {
    const response = await this.callAuthProfileResource<unknown>(
      'DELETE',
      `/auth/profile/delivery-addresses/${encodeURIComponent(id)}`,
      accessToken,
    );
    return this.unwrapAuthProfileResponse<AuthWalletDeleteResponse>(response, 'deliveryAddress');
  }

  async setDefaultDeliveryAddress(
    accessToken: string,
    id: string,
  ): Promise<AuthDeliveryAddress> {
    const response = await this.callAuthProfileResource<unknown>(
      'PATCH',
      `/auth/profile/delivery-addresses/${encodeURIComponent(id)}/default`,
      accessToken,
    );
    return this.unwrapAuthProfileResponse<AuthDeliveryAddress>(response, 'deliveryAddress');
  }

  /**
   * Read Auth-owned invoice profiles for the validated browser token.
   */
  async getInvoiceProfiles(accessToken: string): Promise<AuthInvoiceProfile[]> {
    const response = await this.callAuthProfileResource<unknown>(
      'GET',
      '/auth/profile/invoice-profiles',
      accessToken,
    );
    return this.unwrapAuthProfileResponse<AuthInvoiceProfile[]>(response, 'invoiceProfiles');
  }

  async createInvoiceProfile(
    accessToken: string,
    dto: CreateAuthInvoiceProfileDto,
  ): Promise<AuthInvoiceProfile> {
    const response = await this.callAuthProfileResource<unknown>(
      'POST',
      '/auth/profile/invoice-profiles',
      accessToken,
      dto,
    );
    return this.unwrapAuthProfileResponse<AuthInvoiceProfile>(response, 'invoiceProfile');
  }

  async updateInvoiceProfile(
    accessToken: string,
    id: string,
    dto: UpdateAuthInvoiceProfileDto,
  ): Promise<AuthInvoiceProfile> {
    const response = await this.callAuthProfileResource<unknown>(
      'PATCH',
      `/auth/profile/invoice-profiles/${encodeURIComponent(id)}`,
      accessToken,
      dto,
    );
    return this.unwrapAuthProfileResponse<AuthInvoiceProfile>(response, 'invoiceProfile');
  }

  async deleteInvoiceProfile(
    accessToken: string,
    id: string,
  ): Promise<AuthWalletDeleteResponse> {
    const response = await this.callAuthProfileResource<unknown>(
      'DELETE',
      `/auth/profile/invoice-profiles/${encodeURIComponent(id)}`,
      accessToken,
    );
    return this.unwrapAuthProfileResponse<AuthWalletDeleteResponse>(response, 'invoiceProfile');
  }

  async setDefaultInvoiceProfile(
    accessToken: string,
    id: string,
  ): Promise<AuthInvoiceProfile> {
    const response = await this.callAuthProfileResource<unknown>(
      'PATCH',
      `/auth/profile/invoice-profiles/${encodeURIComponent(id)}/default`,
      accessToken,
    );
    return this.unwrapAuthProfileResponse<AuthInvoiceProfile>(response, 'invoiceProfile');
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const callFn = async () =>
      this.callAuthService<AuthResponse>('/auth/refresh', { refreshToken });

    const breaker = this.circuitBreakerService.create(
      'auth-microservice',
      callFn,
    );

    if (this.circuitBreakerService.isOpen('auth-microservice')) {
      this.logger.warn('Auth service circuit breaker is open', {
        action: 'refreshToken',
      });
      throw new UnauthorizedException('Authentication service is temporarily unavailable');
    }

    try {
      const response = await this.retryService.execute(
        async () => {
          return await breaker.fire(callFn);
        },
        {
          retryable: (error: any) => {
            return error.statusCode !== 401;
          },
        },
      );

      this.resilienceMonitor.recordRetryAttempt('auth-microservice', true);

      this.logger.log(`Token refreshed successfully`, {
        userId: (response as AuthResponse)?.user?.id,
      });

      return response as AuthResponse;
    } catch (error: any) {
      this.resilienceMonitor.recordRetryAttempt('auth-microservice', false);

      this.logger.error('Failed to refresh token', {
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }
}
