import { createHash } from 'crypto';
import { OrderStatus, PaymentStatus } from '@flipflop/shared';

export const FLIPFLOP_AFFINITY_REPLAY_CONTRACT = 'marketplace.order_affinity_replay_candidates.v1' as const;
export const FLIPFLOP_AFFINITY_SOURCE_OWNER = 'flipflop-service' as const;
export const FLIPFLOP_AFFINITY_CONSUMER_OWNER = 'marketing-microservice' as const;
export const FLIPFLOP_AFFINITY_CHANNEL = 'flipflop' as const;

export const FLIPFLOP_AFFINITY_REPLAY_ELIGIBLE_ORDER_STATUSES = [
  OrderStatus.confirmed,
  OrderStatus.processing,
  OrderStatus.shipped,
  OrderStatus.delivered,
] as const;

export const FLIPFLOP_AFFINITY_REPLAY_ELIGIBLE_PAYMENT_STATUSES = [
  PaymentStatus.paid,
] as const;

export type FlipFlopAffinityReplayOrderLine = {
  productId?: string | null;
  productSku?: string | null;
  quantity?: number | null;
  unitPrice?: unknown;
  totalPrice?: unknown;
  catalogProductId?: string | null;
  products?: {
    catalogProductId?: string | null;
  } | null;
};

export type FlipFlopAffinityReplayOrder = {
  id?: string | null;
  orderNumber?: string | null;
  createdAt?: Date | string | null;
  status?: OrderStatus | string | null;
  paymentStatus?: PaymentStatus | string | null;
  order_items?: FlipFlopAffinityReplayOrderLine[] | null;
};

export type FlipFlopAffinityReplayCandidateItem = {
  productId: string;
  sku?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
};

export type FlipFlopAffinityReplayCandidate = {
  sourceOwner: typeof FLIPFLOP_AFFINITY_SOURCE_OWNER;
  consumerOwner: typeof FLIPFLOP_AFFINITY_CONSUMER_OWNER;
  contract: typeof FLIPFLOP_AFFINITY_REPLAY_CONTRACT;
  channel: typeof FLIPFLOP_AFFINITY_CHANNEL;
  replayRef: string;
  currency: 'CZK';
  items: FlipFlopAffinityReplayCandidateItem[];
};

export type FlipFlopAffinityReplayEligibility = {
  eligible: boolean;
  reason:
    | 'eligible'
    | 'order_status_not_paid_processable'
    | 'payment_status_not_paid'
    | 'missing_order_lines'
    | 'insufficient_distinct_catalog_products';
  candidate?: FlipFlopAffinityReplayCandidate;
  diagnostics: {
    mappedCatalogProductCount: number;
    distinctCatalogProductCount: number;
    unmappedLineCount: number;
    emittedItemCount: number;
  };
};

const eligibleOrderStatuses = new Set<string>(FLIPFLOP_AFFINITY_REPLAY_ELIGIBLE_ORDER_STATUSES);
const eligiblePaymentStatuses = new Set<string>(FLIPFLOP_AFFINITY_REPLAY_ELIGIBLE_PAYMENT_STATUSES);

function normalizedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizedStatus(value: unknown): string {
  return normalizedString(value).toLowerCase();
}

function optionalPositiveNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

function catalogProductIdForLine(line: FlipFlopAffinityReplayOrderLine): string {
  return normalizedString(line.catalogProductId ?? line.products?.catalogProductId);
}

function syntheticReplayRef(order: FlipFlopAffinityReplayOrder): string {
  const basis = [order.id, order.orderNumber, order.createdAt]
    .map((value) => (value instanceof Date ? value.toISOString() : normalizedString(value)))
    .filter(Boolean)
    .join('|');
  const digest = createHash('sha256').update(basis || 'flipflop-affinity-missing-order-ref').digest('hex');
  return `flipflop-affinity:${digest.slice(0, 32)}`;
}

export function getFlipFlopAffinityReplayEligibility(
  order: FlipFlopAffinityReplayOrder,
): FlipFlopAffinityReplayEligibility {
  const lines = Array.isArray(order.order_items) ? order.order_items : [];
  const diagnostics = {
    mappedCatalogProductCount: 0,
    distinctCatalogProductCount: 0,
    unmappedLineCount: 0,
    emittedItemCount: 0,
  };

  if (!eligibleOrderStatuses.has(normalizedStatus(order.status))) {
    return { eligible: false, reason: 'order_status_not_paid_processable', diagnostics };
  }

  if (!eligiblePaymentStatuses.has(normalizedStatus(order.paymentStatus))) {
    return { eligible: false, reason: 'payment_status_not_paid', diagnostics };
  }

  if (lines.length === 0) {
    return { eligible: false, reason: 'missing_order_lines', diagnostics };
  }

  const byCatalogProductId = new Map<string, FlipFlopAffinityReplayCandidateItem>();
  for (const line of lines) {
    const catalogProductId = catalogProductIdForLine(line);
    if (!catalogProductId) {
      diagnostics.unmappedLineCount += 1;
      continue;
    }

    diagnostics.mappedCatalogProductCount += 1;
    const quantity = optionalPositiveNumber(line.quantity) ?? 1;
    const totalPrice = optionalPositiveNumber(line.totalPrice);
    const existing = byCatalogProductId.get(catalogProductId);
    if (existing) {
      existing.quantity += quantity;
      if (totalPrice !== undefined) {
        existing.totalPrice = (existing.totalPrice ?? 0) + totalPrice;
      }
      continue;
    }

    const sku = normalizedString(line.productSku);
    const unitPrice = optionalPositiveNumber(line.unitPrice);
    byCatalogProductId.set(catalogProductId, {
      productId: catalogProductId,
      ...(sku ? { sku } : {}),
      quantity,
      ...(unitPrice !== undefined ? { unitPrice } : {}),
      ...(totalPrice !== undefined ? { totalPrice } : {}),
    });
  }

  diagnostics.distinctCatalogProductCount = byCatalogProductId.size;
  diagnostics.emittedItemCount = byCatalogProductId.size;

  if (byCatalogProductId.size < 2) {
    return { eligible: false, reason: 'insufficient_distinct_catalog_products', diagnostics };
  }

  return {
    eligible: true,
    reason: 'eligible',
    candidate: {
      sourceOwner: FLIPFLOP_AFFINITY_SOURCE_OWNER,
      consumerOwner: FLIPFLOP_AFFINITY_CONSUMER_OWNER,
      contract: FLIPFLOP_AFFINITY_REPLAY_CONTRACT,
      channel: FLIPFLOP_AFFINITY_CHANNEL,
      replayRef: syntheticReplayRef(order),
      currency: 'CZK',
      items: Array.from(byCatalogProductId.values()),
    },
    diagnostics,
  };
}
