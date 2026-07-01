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
          return await breaker.fire();
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
          return await breaker.fire();
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
          return await breaker.fire();
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
          return await breaker.fire();
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
          return await breaker.fire();
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
