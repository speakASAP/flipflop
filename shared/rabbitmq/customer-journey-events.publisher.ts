import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { LoggerService } from '../logger/logger.service';

export type CustomerJourneyEventName =
  | 'session_started'
  | 'product_viewed'
  | 'cart_item_added'
  | 'checkout_started'
  | 'customer_identity_resolved'
  | 'shipping_option_selected'
  | 'cart_validated'
  | 'payment_attempt_started'
  | 'payment_succeeded'
  | 'order_created'
  | 'order_confirmation_email_queued'
  | 'order_confirmation_email_sent'
  | 'marketing_handoff_requested'
  | 'marketing_handoff_accepted';

export type CustomerJourneyMoney = {
  amount?: number;
  currency?: 'CZK' | string;
  precision?: number;
};

export type CustomerJourneyItem = {
  product_id: string;
  sku?: string;
  variant_id?: string | null;
  quantity?: number;
  unit_price?: CustomerJourneyMoney;
};

export type CustomerJourneyEventEnvelope = {
  event_id: string;
  event_name: CustomerJourneyEventName;
  version: '1.0.0';
  occurred_at: string;
  processed_at?: string;
  journey_id: string;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  source: {
    service: 'flipflop';
    component: string;
    producer: string;
    route?: string;
  };
  environment: {
    name: string;
    release?: string;
    commit_sha?: string;
  };
  identifiers: {
    anonymous_id?: string;
    session_id?: string;
    customer_id?: string;
    auth_subject?: string;
    cart_id?: string;
    checkout_id?: string;
    payment_id?: string;
    payment_provider_reference?: string;
    order_id?: string;
    email_message_id?: string;
    marketing_handoff_id?: string;
    storefront_id: 'flipflop';
  };
  commercial?: {
    currency: 'CZK' | string;
    subtotal_amount?: number;
    discount_amount?: number;
    shipping_amount?: number;
    tax_amount?: number;
    total_amount?: number;
    precision: number;
    item_count?: number;
    coupon_ids?: string[];
  };
  items?: CustomerJourneyItem[];
  metadata: Record<string, unknown> & {
    channel: string;
    synthetic: boolean;
  };
};

/**
 * Publishes successful customer journey observability events.
 * Fire-and-forget friendly: failures are logged and never block checkout/payment flows.
 */
@Injectable()
export class CustomerJourneyEventsPublisher implements OnModuleDestroy {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = 'flipflop.customer_journey.events.v1';
  private connectPromise: Promise<void> | null = null;

  constructor(private readonly logger: LoggerService) {}

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.channel) {
        await (this.channel as any).close();
      }
    } catch {
      // ignore
    }
    try {
      if (this.connection) {
        await this.connection.close();
      }
    } catch {
      // ignore
    }
    this.channel = null;
    this.connection = null;
  }

  private async ensureConnected(): Promise<amqp.Channel | null> {
    if (this.channel) {
      return this.channel;
    }
    if (this.connectPromise) {
      await this.connectPromise;
      return this.channel;
    }
    this.connectPromise = (async () => {
      try {
        const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
        const conn = await amqp.connect(url);
        this.connection = conn;
        this.connection.on('error', (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`CustomerJourneyEventsPublisher: connection error: ${message}`, 'CustomerJourneyEventsPublisher');
        });
        this.connection.on('close', () => {
          this.logger.warn('CustomerJourneyEventsPublisher: connection closed', 'CustomerJourneyEventsPublisher');
          this.channel = null;
          this.connection = null;
        });
        const ch = await this.connection.createChannel();
        this.channel = ch as unknown as amqp.Channel;
        this.channel.on('error', (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`CustomerJourneyEventsPublisher: channel error: ${message}`, 'CustomerJourneyEventsPublisher');
        });
        this.channel.on('close', () => {
          this.logger.warn('CustomerJourneyEventsPublisher: channel closed', 'CustomerJourneyEventsPublisher');
          this.channel = null;
        });
        await ch.assertExchange(this.exchangeName, 'topic', { durable: true });
        this.logger.log(
          `CustomerJourneyEventsPublisher: exchange ${this.exchangeName} ready`,
          'CustomerJourneyEventsPublisher',
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`CustomerJourneyEventsPublisher: connect failed: ${message}`, 'CustomerJourneyEventsPublisher');
        this.channel = null;
        this.connection = null;
      } finally {
        this.connectPromise = null;
      }
    })();
    await this.connectPromise;
    return this.channel;
  }

  async publish(event: CustomerJourneyEventEnvelope): Promise<boolean> {
    try {
      const ch = await this.ensureConnected();
      if (!ch) {
        return false;
      }
      const routingKey = `customer_journey.${event.event_name}`;
      const body = Buffer.from(JSON.stringify(event));
      ch.publish(this.exchangeName, routingKey, body, {
        persistent: true,
        contentType: 'application/json',
        messageId: event.event_id,
        correlationId: event.correlation_id,
        timestamp: Math.floor(Date.parse(event.occurred_at) / 1000),
        headers: {
          event_name: event.event_name,
          version: event.version,
          journey_id: event.journey_id,
          idempotency_key: event.idempotency_key,
        },
      });
      this.logger.log(
        `Published ${routingKey} journey=present order=${event.identifiers.order_id ? "present" : "none"}` ,
        'CustomerJourneyEventsPublisher',
      );
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`CustomerJourneyEventsPublisher: publish failed: ${message}`, 'CustomerJourneyEventsPublisher');
      return false;
    }
  }
}
