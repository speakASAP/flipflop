/**
 * Notification Service
 * Service to send notifications via notifications-microservice
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from '../logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  SendNotificationDto,
  NotificationResponse,
  NotificationChannel,
  SendOrderConfirmationParams,
} from './notification.interface';
import { CircuitBreakerService } from '../resilience/circuit-breaker.service';
import { RetryService } from '../resilience/retry.service';
import { FallbackService } from '../resilience/fallback.service';
import { ResilienceMonitor } from '../resilience/resilience.monitor';

@Injectable()
export class NotificationService {
  private readonly notificationServiceUrl: string;
  private readonly logger: LoggerService;
  private readonly circuitBreakerService: CircuitBreakerService;
  private readonly retryService: RetryService;
  private readonly fallbackService: FallbackService;
  private readonly resilienceMonitor: ResilienceMonitor;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    logger: LoggerService,
    circuitBreakerService: CircuitBreakerService,
    retryService: RetryService,
    fallbackService: FallbackService,
    resilienceMonitor: ResilienceMonitor,
  ) {
    this.notificationServiceUrl =
      this.configService.get<string>('NOTIFICATION_SERVICE_URL') ||
      'https://notifications.alfares.cz';
    this.logger = logger;
    this.circuitBreakerService = circuitBreakerService;
    this.retryService = retryService;
    this.fallbackService = fallbackService;
    this.resilienceMonitor = resilienceMonitor;
  }

  private hashSyntheticAssertionValue(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
  }

  private resolveSyntheticEmailAssertionPath(): string | null {
    const source = process.env.SYNTHETIC_EMAIL_ASSERTION_SOURCE || '';
    const prefix = 'synthetic-email-jsonl:';
    if (!source.startsWith(prefix)) {
      return null;
    }
    const relativePath = source.slice(prefix.length).trim();
    const segments = relativePath.split(/[\\/]+/).filter(Boolean);
    if (!relativePath || path.isAbsolute(relativePath) || segments.includes('..')) {
      this.logger.warn('Synthetic email assertion source ignored because path is not repo-relative', {
        sourcePrefix: prefix,
      });
      return null;
    }
    return path.resolve(process.cwd(), relativePath);
  }

  private captureSyntheticEmailAssertion(dto: SendNotificationDto): NotificationResponse | null {
    const assertionPath = this.resolveSyntheticEmailAssertionPath();
    if (!assertionPath || dto.channel !== 'email') {
      return null;
    }
    const recipient = String(dto.recipient || '').trim().toLowerCase();
    const assertionDomain = (process.env.SYNTHETIC_EMAIL_ASSERTION_DOMAIN || 'example.invalid').trim().toLowerCase();
    if (!recipient.endsWith(`@${assertionDomain}`)) {
      this.logger.warn('Synthetic email assertion source refused non-synthetic recipient domain', {
        channel: dto.channel,
        type: dto.type,
        recipientHash: this.hashSyntheticAssertionValue(recipient),
      });
      return null;
    }

    const assertionId = `synthetic-email-${Date.now()}-${this.hashSyntheticAssertionValue(recipient) || 'unknown'}`;
    const templateData = dto.templateData || {};
    const record = {
      assertion_source: 'synthetic-email-jsonl',
      assertion_id: assertionId,
      generated_at: new Date().toISOString(),
      status: 'captured_not_sent',
      channel: dto.channel,
      type: dto.type,
      recipient_hash: this.hashSyntheticAssertionValue(recipient),
      subject_hash: this.hashSyntheticAssertionValue(dto.subject),
      message_hash: this.hashSyntheticAssertionValue(dto.message),
      order_id_hash: this.hashSyntheticAssertionValue(templateData.orderId),
      order_number_hash: this.hashSyntheticAssertionValue(templateData.orderNumber),
      template_keys: Object.keys(templateData).sort(),
      raw_recipient_output: false,
      raw_message_output: false,
      secret_output: false,
    };
    try {
      fs.mkdirSync(path.dirname(assertionPath), { recursive: true });
      fs.appendFileSync(assertionPath, `${JSON.stringify(record)}\n`, 'utf8');
      this.logger.log('Synthetic email assertion captured without delivery', {
        channel: dto.channel,
        type: dto.type,
        assertionId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Synthetic email assertion capture failed without delivery', {
        channel: dto.channel,
        type: dto.type,
        assertionId,
        message,
      });
    }
    return {
      success: true,
      data: {
        id: assertionId,
        status: 'captured_not_sent',
        channel: dto.channel,
        recipient: 'synthetic-recipient-redacted',
      },
    };
  }

  /**
   * Internal method to send notification via HTTP
   */
  private async sendNotificationHttp(dto: SendNotificationDto): Promise<NotificationResponse> {
    const response = await firstValueFrom(
      this.httpService.post<NotificationResponse>(
        `${this.notificationServiceUrl}/notifications/send`,
        dto,
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
   * Send notification via notifications-microservice with resilience patterns
   */
  async sendNotification(
    dto: SendNotificationDto,
  ): Promise<NotificationResponse> {
    const syntheticAssertion = this.captureSyntheticEmailAssertion(dto);
    if (syntheticAssertion) {
      return syntheticAssertion;
    }

    // Create a function that captures the dto in closure
    const callFn = async () => this.sendNotificationHttp(dto);

    // Get or create circuit breaker (reuses same instance by service name)
    const breaker = this.circuitBreakerService.create(
      'notification-service',
      callFn,
    );

    // Check if circuit breaker is open
    if (this.circuitBreakerService.isOpen('notification-service')) {
      this.logger.warn('Notification service circuit breaker is open, using fallback', {
        channel: dto.channel,
        type: dto.type,
        recipient: dto.recipient,
      });

      const fallbackResult = await this.fallbackService.handleNotificationFallback(dto);
      this.resilienceMonitor.recordFallback('notification-service', 'queue');

      return {
        success: true,
        data: {
          id: `fallback-${Date.now()}`,
          status: 'queued',
          channel: dto.channel,
          recipient: dto.recipient,
        },
      };
    }

    try {
      // Use retry service with circuit breaker
      const response = await this.retryService.execute(
        async () => {
          return await breaker.fire(callFn);
        },
        {
          retryable: (error: any) => {
            // Don't retry on validation errors
            return error.code !== 'VALIDATION_ERROR' && error.code !== 'NOT_FOUND';
          },
        },
      );

      // Record successful retry
      this.resilienceMonitor.recordRetryAttempt('notification-service', true);

      this.logger.log(`Notification sent successfully`, {
        channel: dto.channel,
        type: dto.type,
        recipient: dto.recipient,
        notificationId: (response as NotificationResponse)?.data?.id,
      });

      return (response as NotificationResponse) || {
        success: true,
        data: {
          id: `sent-${Date.now()}`,
          status: 'sent',
          channel: dto.channel,
          recipient: dto.recipient,
        },
      };
    } catch (error: any) {
      // Record failed retry
      this.resilienceMonitor.recordRetryAttempt('notification-service', false);

      // Log error but don't throw - notifications are non-critical
      this.logger.error('Failed to send notification', {
        error: error.message,
        channel: dto.channel,
        type: dto.type,
        recipient: dto.recipient,
        stack: error.stack,
      });

      // Use fallback strategy
      const fallbackResult = await this.fallbackService.handleNotificationFallback(dto);
      this.resilienceMonitor.recordFallback('notification-service', 'queue');

      // Return success even if queued (non-blocking)
      return {
        success: true,
        data: {
          id: `fallback-${Date.now()}`,
          status: 'queued',
          channel: dto.channel,
          recipient: dto.recipient,
        },
      };
    }
  }

  /**
   * Send order confirmation notification (notifications-microservice: type order_confirmation)
   */
  async sendOrderConfirmation(
    params: SendOrderConfirmationParams,
    channel: NotificationChannel = 'email',
  ): Promise<NotificationResponse> {
    const currency = params.currency ?? 'CZK';
    return this.sendNotification({
      channel,
      type: 'order_confirmation',
      recipient: params.to,
      subject: `Potvrzení objednávky ${params.orderNumber}`,
      message: `Vaše objednávka {{orderNumber}} byla úspěšně potvrzena. Celková částka: {{total}} {{currency}}.`,
      templateData: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        items: params.items,
        total: params.total.toFixed(2),
        currency,
      },
    });
  }

  /**
   * Send payment confirmation notification
   */
  async sendPaymentConfirmation(
    recipient: string,
    orderNumber: string,
    paymentAmount: number,
    channel: NotificationChannel = 'email',
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      channel,
      type: 'payment_confirmation',
      recipient,
      subject: `Potvrzení platby za objednávku ${orderNumber}`,
      message: `Platba za objednávku {{orderNumber}} byla úspěšně přijata. Částka: {{paymentAmount}} Kč.`,
      templateData: {
        orderNumber,
        paymentAmount: paymentAmount.toFixed(2),
      },
    });
  }

  /**
   * Send order status update notification
   */
  async sendOrderStatusUpdate(
    recipient: string,
    orderNumber: string,
    status: string,
    channel: NotificationChannel = 'email',
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      channel,
      type: 'order_status_update',
      recipient,
      subject: `Aktualizace stavu objednávky ${orderNumber}`,
      message: `Stav vaší objednávky {{orderNumber}} byl aktualizován na: {{status}}.`,
      templateData: {
        orderNumber,
        status,
      },
    });
  }

  /**
   * Send shipment tracking notification
   */
  async sendShipmentTracking(
    recipient: string,
    orderNumber: string,
    trackingNumber: string,
    channel: NotificationChannel = 'email',
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      channel,
      type: 'shipment_tracking',
      recipient,
      subject: `Informace o odeslání objednávky ${orderNumber}`,
      message: `Vaše objednávka {{orderNumber}} byla odeslána. Sledovací číslo: {{trackingNumber}}.`,
      templateData: {
        orderNumber,
        trackingNumber,
      },
    });
  }

  /**
   * Marketing campaign email (notifications-ms: type custom; marketing_email is not in upstream enum).
   */
  async sendMarketingEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      await this.sendNotification({
        channel: 'email',
        type: 'custom',
        recipient: to,
        subject,
        message: body,
        templateData: { campaignType: 'seasonal_sale' },
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('sendMarketingEmail failed', {
        timestamp: new Date().toISOString(),
        recipient: to,
        error: err.message,
        stack: err.stack,
      });
    }
  }
}
