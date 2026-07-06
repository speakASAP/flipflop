import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { createHash } from 'crypto';
import { LoggerService } from '../logger/logger.service';
import { PrismaService } from '../database/prisma.service';

const TERMINAL_STATUSES = ['SUCCEEDED', 'FAILED', 'BLOCKED', 'SKIPPED'] as const;
const SECRET_KEYS = ['authorization', 'token', 'accessToken', 'refreshToken', 'clientSecret', 'secret', 'apiKey', 'password'];

const DISABLE_EVENT_TYPES = [
  'catalog.product.archived.v1',
  'catalog.product.deleted.v1',
] as const;

const SAFE_REFRESH_EVENT_TYPES = [
  'catalog.product.upserted.v1',
  'catalog.product.updated.v1',
  'catalog.product.category_changed.v1',
] as const;

type CatalogProductEvent = {
  type?: string;
  eventType?: string;
  routingKey?: string;
  eventId?: string;
  id?: string;
  productId?: string;
  catalogProductId?: string;
  occurredAt?: string;
  updatedAt?: string;
  timestamp?: string;
  afterSellable?: boolean;
  beforeSellable?: boolean;
  sellable?: boolean;
  isSellable?: boolean;
  isActive?: boolean;
  product?: Record<string, any>;
  payload?: Record<string, any>;
  data?: Record<string, any>;
  after?: Record<string, any>;
  [key: string]: unknown;
};

type CatalogProductRow = {
  id: string;
  sku?: string | null;
  catalogProductId?: string | null;
  isActive?: boolean | null;
  updatedAt?: Date | string | null;
};

type CatalogAttemptRow = {
  id: string;
  status: string;
  idempotencyKey: string;
  eventType: string;
  eventId?: string | null;
  catalogProductId?: string | null;
  matchedProductCount?: number;
};

@Injectable()
export class CatalogEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = process.env.FLIPFLOP_CATALOG_EVENTS_EXCHANGE || 'catalog.events';
  private readonly queueName = process.env.FLIPFLOP_CATALOG_EVENTS_QUEUE || 'catalog.flipflop-service';
  private readonly routingKeys = [
    ...DISABLE_EVENT_TYPES,
    'catalog.product.sellability_changed.v1',
    ...SAFE_REFRESH_EVENT_TYPES,
  ];

  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.ensureAttemptTable();
    await this.connect();
    await this.subscribe();
  }

  async onModuleDestroy() {
    try {
      if (this.channel) await (this.channel as any).close();
      if (this.connection) await this.connection.close();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Error closing RabbitMQ connection: ${errorMessage}`, 'CatalogEventsSubscriber');
    }
  }

  private async connect() {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
      this.logger.log(`Connecting to RabbitMQ: ${url}`, 'CatalogEventsSubscriber');

      const conn = await amqp.connect(url);
      this.connection = conn;
      if (!this.connection) throw new Error('Failed to establish RabbitMQ connection');
      const ch = await this.connection.createChannel();
      this.channel = ch as unknown as amqp.Channel;
      if (!this.channel) throw new Error('Failed to create RabbitMQ channel');

      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      await this.channel.assertQueue(this.queueName, { durable: true });
      for (const routingKey of this.routingKeys) {
        await this.channel.bindQueue(this.queueName, this.exchangeName, routingKey);
      }

      this.logger.log(`Connected to RabbitMQ catalog events exchange ${this.exchangeName}`, 'CatalogEventsSubscriber');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to connect to RabbitMQ catalog events: ${errorMessage}`, errorStack, 'CatalogEventsSubscriber');
    }
  }

  private async subscribe() {
    if (!this.channel) return;

    try {
      await this.channel.consume(
        this.queueName,
        async (msg) => {
          if (!msg) return;

          try {
            const event = JSON.parse(msg.content.toString()) as CatalogProductEvent;
            await this.handleCatalogEvent(event, msg.fields.routingKey);
            this.channel?.ack(msg);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error processing catalog event: ${errorMessage}`, errorStack, 'CatalogEventsSubscriber');
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.logger.log('Subscribed to catalog events queue', 'CatalogEventsSubscriber');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to subscribe to catalog events: ${errorMessage}`, errorStack, 'CatalogEventsSubscriber');
    }
  }

  async handleCatalogEvent(event: CatalogProductEvent, routingKey?: string) {
    const eventType = this.eventType(event, routingKey);
    const catalogProductId = this.catalogProductId(event);

    if (!catalogProductId) {
      this.logger.warn(`Ignoring catalog event without catalogProductId: ${JSON.stringify(this.redact(event))}`, 'CatalogEventsSubscriber');
      return;
    }
    if (!this.isUuid(catalogProductId)) {
      await this.recordInvalidCatalogProductId(event, eventType, catalogProductId);
      return;
    }

    if (this.shouldDisableOffer(event, eventType)) {
      await this.disableLocalOffers(event, eventType, catalogProductId);
      return;
    }

    await this.recordSafeRefreshPolicyMissing(event, eventType, catalogProductId);
  }

  private async disableLocalOffers(event: CatalogProductEvent, eventType: string, catalogProductId: string) {
    const products = await this.prisma.product.findMany({
      where: { catalogProductId },
      select: { id: true, sku: true, name: true, catalogProductId: true, isActive: true, stockQuantity: true, updatedAt: true },
      orderBy: { id: 'asc' },
    });
    const attempt = await this.createCatalogAttempt(event, eventType, catalogProductId, 'disable_local_offer', products);
    if ((TERMINAL_STATUSES as readonly string[]).includes(attempt.status)) {
      this.logger.log(`Catalog event idempotency hit for ${catalogProductId}: ${attempt.status}`, 'CatalogEventsSubscriber');
      return;
    }

    if (products.length === 0) {
      await this.updateCatalogAttempt(attempt.id, {
        status: 'BLOCKED',
        completedAt: new Date(),
        blockedReasons: [{ gate: 'linked-product', reason: 'No FlipFlop products linked by catalogProductId' }],
        remediationContext: { nextAction: 'No local FlipFlop offer can be disabled until a local product is linked to the Catalog product.' },
      });
      this.logger.warn(`No FlipFlop products found with catalogProductId ${catalogProductId}`, 'CatalogEventsSubscriber');
      return;
    }

    await this.updateCatalogAttempt(attempt.id, { status: 'RUNNING', startedAt: new Date() });

    const eventTimestamp = this.parseEventTimestamp(event);
    const updatedProducts: any[] = [];
    const skippedProducts: any[] = [];
    try {
      for (const product of products) {
        if (this.isStaleEvent(eventTimestamp, product.updatedAt)) {
          skippedProducts.push({
            id: product.id,
            sku: product.sku,
            reason: 'stale_event',
            eventTimestamp: eventTimestamp?.toISOString() || null,
            productUpdatedAt: this.dateToIso(product.updatedAt),
          });
          continue;
        }

        const updated = await this.prisma.product.update({
          where: { id: product.id },
          data: {
            isActive: false,
            updatedAt: new Date(),
          },
          select: { id: true, sku: true, catalogProductId: true, isActive: true, stockQuantity: true, updatedAt: true },
        });
        updatedProducts.push(updated);
      }

      await this.updateCatalogAttempt(attempt.id, {
        status: updatedProducts.length > 0 ? 'SUCCEEDED' : 'SKIPPED',
        completedAt: new Date(),
        resultSnapshot: this.redact({
          action: 'disable_local_offer',
          eventType,
          updatedProducts,
          skippedProducts,
          sellabilityPolicy: 'Catalog non-sellable event sets FlipFlop local product isActive=false without mutating Catalog, Warehouse, or external marketplaces.',
        }),
      });
      this.logger.log(`Disabled ${updatedProducts.length} FlipFlop product(s) for Catalog event ${eventType}; skipped ${skippedProducts.length}`, 'CatalogEventsSubscriber');
    } catch (error: any) {
      await this.updateCatalogAttempt(attempt.id, {
        status: 'FAILED',
        completedAt: new Date(),
        resultSnapshot: this.redact({ updatedProducts, skippedProducts }),
        failureContext: this.redact({ code: error?.code || 'FLIPFLOP_CATALOG_EVENT_DISABLE_FAILED', message: error?.message || 'Catalog event disable failed', details: error?.meta || null }),
        remediationContext: { nextAction: 'Review Catalog event payload, linked product records, database availability, and retry with Catalog as source of truth.' },
      });
      throw error;
    }
  }

  private async recordSafeRefreshPolicyMissing(event: CatalogProductEvent, eventType: string, catalogProductId: string) {
    const products = await this.prisma.product.findMany({
      where: { catalogProductId },
      select: { id: true, sku: true, catalogProductId: true, isActive: true, updatedAt: true },
      orderBy: { id: 'asc' },
    });
    const attempt = await this.createCatalogAttempt(event, eventType, catalogProductId, 'safe_refresh_policy_missing', products);
    if ((TERMINAL_STATUSES as readonly string[]).includes(attempt.status)) {
      this.logger.log(`Catalog event refresh-policy idempotency hit for ${catalogProductId}: ${attempt.status}`, 'CatalogEventsSubscriber');
      return;
    }

    await this.updateCatalogAttempt(attempt.id, {
      status: 'BLOCKED',
      completedAt: new Date(),
      blockedReasons: [{
        gate: 'safe-refresh-policy',
        reason: '[MISSING: safe FlipFlop catalog-event refresh policy]',
      }],
      remediationContext: {
        nextAction: '[MISSING: safe FlipFlop catalog-event refresh policy] Define whether sellable Catalog upsert/update/category events may refresh local cache, which fields are authoritative, and how to avoid blind publication.',
      },
      resultSnapshot: this.redact({
        action: 'no_publish_no_refresh',
        eventType,
        matchedProductIds: products.map((product: CatalogProductRow) => product.id),
        mutatesFlipFlopProductCache: false,
        mutatesCatalog: false,
        mutatesWarehouse: false,
        mutatesExternalMarketplace: false,
      }),
    });

    this.logger.warn('[MISSING: safe FlipFlop catalog-event refresh policy] Catalog event acknowledged without local publication or refresh', {
      context: 'CatalogEventsSubscriber',
      eventType,
      catalogProductId,
      matchedProductCount: products.length,
    });
  }

  private async recordInvalidCatalogProductId(event: CatalogProductEvent, eventType: string, catalogProductId: string) {
    const attempt = await this.createCatalogAttempt(event, eventType, catalogProductId, 'invalid_catalog_product_id', []);
    if ((TERMINAL_STATUSES as readonly string[]).includes(attempt.status)) return;

    await this.updateCatalogAttempt(attempt.id, {
      status: 'BLOCKED',
      completedAt: new Date(),
      blockedReasons: [{ gate: 'event-contract', reason: '[MISSING: valid UUID catalogProductId]' }],
      remediationContext: { nextAction: 'Catalog product events must include a UUID catalogProductId/productId matching FlipFlop products.catalogProductId.' },
      resultSnapshot: this.redact({ action: 'ignored_invalid_catalog_product_id', eventType, catalogProductId }),
    });
    this.logger.warn(`Ignoring catalog event with non-UUID catalogProductId ${catalogProductId}`, 'CatalogEventsSubscriber');
  }

  private shouldDisableOffer(event: CatalogProductEvent, eventType: string): boolean {
    if ((DISABLE_EVENT_TYPES as readonly string[]).includes(eventType)) return true;
    if (eventType !== 'catalog.product.sellability_changed.v1') return false;
    return this.afterSellable(event) === false;
  }

  private afterSellable(event: CatalogProductEvent): boolean | undefined {
    const candidates = [
      event.afterSellable,
      event.after?.sellable,
      event.after?.isSellable,
      event.payload?.afterSellable,
      event.payload?.after?.sellable,
      event.payload?.after?.isSellable,
      event.data?.afterSellable,
      event.data?.change?.afterSellable,
      event.data?.after?.sellable,
      event.data?.after?.isSellable,
      event.data?.product?.sellable,
      event.data?.product?.isSellable,
      event.product?.sellable,
      event.product?.isSellable,
      event.sellable,
      event.isSellable,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'boolean') return candidate;
    }
    if (typeof event.isActive === 'boolean') return event.isActive;
    if (typeof event.product?.isActive === 'boolean') return event.product.isActive;
    if (typeof event.data?.product?.isActive === 'boolean') return event.data.product.isActive;
    return undefined;
  }

  private eventType(event: CatalogProductEvent, routingKey?: string): string {
    return String(event.type || event.eventType || event.routingKey || routingKey || '').trim();
  }

  private catalogProductId(event: CatalogProductEvent): string | null {
    const candidates = [
      event.catalogProductId,
      event.productId,
      event.product?.catalogProductId,
      event.product?.id,
      event.payload?.catalogProductId,
      event.payload?.productId,
      event.payload?.product?.id,
      event.data?.catalogProductId,
      event.data?.productId,
      event.data?.product?.id,
      event.after?.id,
    ];
    const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
    return value ? String(value).trim() : null;
  }

  private async createCatalogAttempt(
    event: CatalogProductEvent,
    eventType: string,
    catalogProductId: string,
    action: string,
    products: CatalogProductRow[],
  ): Promise<CatalogAttemptRow> {
    const idempotencyKey = this.buildIdempotencyKey(event, eventType, catalogProductId, action, products.map((product: CatalogProductRow) => product.id));
    const existingRows = await (this.prisma.$queryRawUnsafe(
      'SELECT * FROM "flipflop_catalog_event_attempts" WHERE "idempotencyKey" = $1 LIMIT 1',
      idempotencyKey,
    ) as Promise<CatalogAttemptRow[]>);
    if (existingRows[0]) return existingRows[0];

    const rows = await (this.prisma.$queryRawUnsafe(
      `INSERT INTO "flipflop_catalog_event_attempts" (
        "status", "idempotencyKey", "eventType", "eventId", "catalogProductId",
        "matchedProductCount", "requestPayload", "policySnapshot", "queuedAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, now(), now())
      RETURNING *`,
      'QUEUED',
      idempotencyKey,
      eventType || 'unknown',
      event.eventId || null,
      catalogProductId,
      products.length,
      JSON.stringify(this.redact(event) || {}),
      JSON.stringify({
        contractVersion: 'flipflop.catalog-event-orchestration.v1',
        sourceOfTruth: 'catalog',
        action,
        triggers: [...DISABLE_EVENT_TYPES, 'catalog.product.sellability_changed.v1'],
        noBlindPublishTriggers: [...SAFE_REFRESH_EVENT_TYPES, 'catalog.product.sellability_changed.v1'],
        approvalRequired: false,
        approvalMode: 'automatic_execute_for_disable_only',
        mutatesCatalog: false,
        mutatesWarehouse: false,
        mutatesExternalMarketplace: false,
        mutatesFlipFlopProductCache: action === 'disable_local_offer',
        outOfOrderPolicy: 'skip_when_event_timestamp_is_older_than_local_product_updatedAt; process_fail_closed_when_event_timestamp_missing',
        unavailableFacts: [
          '[MISSING: confirmed Catalog producer exchange/routing key contract]',
          '[MISSING: safe FlipFlop catalog-event refresh policy]',
        ],
      }),
    ) as Promise<CatalogAttemptRow[]>);
    return rows[0];
  }

  private async updateCatalogAttempt(id: string, data: {
    status: string;
    startedAt?: Date;
    completedAt?: Date;
    matchedProductCount?: number;
    blockedReasons?: unknown;
    resultSnapshot?: unknown;
    failureContext?: unknown;
    remediationContext?: unknown;
  }): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `UPDATE "flipflop_catalog_event_attempts" SET
        "status" = $1,
        "startedAt" = COALESCE($2, "startedAt"),
        "completedAt" = COALESCE($3, "completedAt"),
        "matchedProductCount" = COALESCE($4, "matchedProductCount"),
        "blockedReasons" = COALESCE($5::jsonb, "blockedReasons"),
        "resultSnapshot" = COALESCE($6::jsonb, "resultSnapshot"),
        "failureContext" = COALESCE($7::jsonb, "failureContext"),
        "remediationContext" = COALESCE($8::jsonb, "remediationContext"),
        "updatedAt" = now()
      WHERE "id" = $9::uuid`,
      data.status,
      data.startedAt || null,
      data.completedAt || null,
      data.matchedProductCount ?? null,
      data.blockedReasons === undefined ? null : JSON.stringify(data.blockedReasons),
      data.resultSnapshot === undefined ? null : JSON.stringify(data.resultSnapshot),
      data.failureContext === undefined ? null : JSON.stringify(data.failureContext),
      data.remediationContext === undefined ? null : JSON.stringify(data.remediationContext),
      id,
    );
  }

  private async ensureAttemptTable() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "flipflop_catalog_event_attempts" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "status" VARCHAR(50) NOT NULL,
        "idempotencyKey" VARCHAR(180) NOT NULL,
        "eventType" VARCHAR(100) NOT NULL,
        "eventId" VARCHAR(255),
        "catalogProductId" VARCHAR(255),
        "matchedProductCount" INTEGER NOT NULL DEFAULT 0,
        "requestPayload" JSONB,
        "policySnapshot" JSONB NOT NULL,
        "blockedReasons" JSONB,
        "resultSnapshot" JSONB,
        "failureContext" JSONB,
        "remediationContext" JSONB,
        "queuedAt" TIMESTAMP(6),
        "startedAt" TIMESTAMP(6),
        "completedAt" TIMESTAMP(6),
        "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "flipflop_catalog_event_attempts_pkey" PRIMARY KEY ("id")
      );
    `);
    await this.prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "flipflop_catalog_event_attempts_idempotencyKey_key" ON "flipflop_catalog_event_attempts"("idempotencyKey");');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_catalog_event_attempts_status" ON "flipflop_catalog_event_attempts"("status");');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_catalog_event_attempts_catalogProductId" ON "flipflop_catalog_event_attempts"("catalogProductId");');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_catalog_event_attempts_eventType" ON "flipflop_catalog_event_attempts"("eventType");');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_catalog_event_attempts_createdAt" ON "flipflop_catalog_event_attempts"("createdAt");');
  }

  private buildIdempotencyKey(event: CatalogProductEvent, eventType: string, catalogProductId: string, action: string, productIds: string[]): string {
    return `ff-cat-${createHash('sha256').update(this.stableStringify({
      eventId: event.eventId || null,
      eventType,
      catalogProductId,
      action,
      eventTimestamp: this.parseEventTimestamp(event)?.toISOString() || null,
      productIds,
      payload: event.eventId ? null : this.redact(event),
    })).digest('hex').slice(0, 48)}`;
  }

  private parseEventTimestamp(event: CatalogProductEvent): Date | null {
    const value = event.occurredAt || event.updatedAt || event.timestamp || event.product?.updatedAt || event.payload?.updatedAt || event.data?.updatedAt;
    if (!value) return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private isStaleEvent(eventTimestamp: Date | null, productUpdatedAt: unknown): boolean {
    if (!eventTimestamp || !productUpdatedAt) return false;
    const productTimestamp = productUpdatedAt instanceof Date
      ? productUpdatedAt
      : new Date(String(productUpdatedAt));
    if (Number.isNaN(productTimestamp.getTime())) return false;
    return productTimestamp.getTime() > eventTimestamp.getTime();
  }

  private dateToIso(value: unknown): string | null {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private stableStringify(value: unknown): string {
    return JSON.stringify(this.sortJson(value));
  }

  private sortJson(value: any): any {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => this.sortJson(item));
    if (!value || typeof value !== 'object') return value;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) sorted[key] = this.sortJson(value[key]);
    return sorted;
  }

  private redact(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.redact(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        const lowerKey = key.toLowerCase();
        if (SECRET_KEYS.some((secretKey) => lowerKey.includes(secretKey.toLowerCase()))) return [key, '[REDACTED]'];
        return [key, this.redact(item)];
      }));
    }
    return value;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
