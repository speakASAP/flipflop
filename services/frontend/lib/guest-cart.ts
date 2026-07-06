import type { ProductVariant } from './api/products';

const STORAGE_KEY = 'flipflop_guest_cart_v1';
const BUNDLE_INTENT_KEY = 'flipflop_bundle_intent_v1';
const JOURNEY_EVENTS_KEY = 'flipflop_journey_events_v1';
const JOURNEY_SESSION_ID_KEY = 'flipflop_journey_session_id_v1';
const JOURNEY_ID_KEY = 'flipflop_journey_id_v1';
const JOURNEY_CORRELATION_ID_KEY = 'flipflop_journey_correlation_id_v1';
const JOURNEY_SESSION_STARTED_KEY = 'flipflop_journey_session_started_v1';
const MAX_JOURNEY_EVENTS = 100;
export const GUEST_CART_UPDATED_EVENT = 'flipflop:guest-cart-updated';
export const JOURNEY_EVENT_RECORDED_EVENT = 'flipflop:journey-event-recorded';

export interface GuestCartProduct {
  id: string;
  name: string;
  price: number;
  stockQuantity?: number;
  brand?: string;
  mainImageUrl?: string;
  imageUrls?: string[];
  images?: string[];
}

export type GuestCartVariant = Pick<
  ProductVariant,
  'id' | 'productId' | 'name' | 'price' | 'stockQuantity'
>;

export interface GuestCartItem {
  id: string;
  productId: string;
  product: GuestCartProduct;
  variantId?: string;
  variant?: GuestCartVariant;
  quantity: number;
  price: number;
}

export interface GuestCart {
  items: GuestCartItem[];
  total: number;
  itemCount: number;
}

export interface GuestBundleIntent {
  source: 'product_detail_buy_together';
  sourceProductId: string;
  productIds: string[];
  estimatedSavings?: number;
  catalogCandidateId?: string;
  bundleId?: string;
  currency: 'CZK';
  createdAt: string;
}

export type JourneyEventType =
  | 'session_started'
  | 'product_viewed'
  | 'cart_item_added'
  | 'checkout_started'
  | 'shipping_option_selected'
  | 'cart_validated';

export interface CustomerJourneyContext {
  journeyId: string;
  correlationId: string;
  sessionId: string;
}

export interface JourneyEvent {
  id: string;
  journeyId: string;
  correlationId: string;
  sessionId: string;
  type: JourneyEventType;
  payload: Record<string, unknown>;
  url: string;
  createdAt: string;
}

export type GuestCartAddStatus = 'added' | 'already-in-cart' | 'insufficient-stock';

export interface GuestCartAddResult {
  cart: GuestCart;
  status: GuestCartAddStatus;
  availableStock?: number;
}

interface AddGuestCartItemInput {
  product: GuestCartProduct;
  variant?: GuestCartVariant;
  quantity?: number;
}

const isBrowser = () => typeof window !== 'undefined';

const createJourneyId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const createContractId = (prefix: 'journey' | 'corr' | 'session') => (
  `${prefix}_${createJourneyId().replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`
);

const CONTRACT_ID_PATTERNS = {
  journey: /^journey_[a-z0-9][a-z0-9_-]{8,127}$/,
  corr: /^corr_[a-z0-9][a-z0-9_-]{8,127}$/,
  session: /^session_[a-z0-9][a-z0-9_-]{8,127}$/,
};

const isValidContractId = (value: string, prefix: keyof typeof CONTRACT_ID_PATTERNS) => (
  CONTRACT_ID_PATTERNS[prefix].test(value)
);

const getStoredOrCreateId = (key: string, create: () => string, validate?: (value: string) => boolean) => {
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing && (!validate || validate(existing))) return existing;
    const next = create();
    window.sessionStorage.setItem(key, next);
    return next;
  } catch {
    const existing = window.localStorage.getItem(key);
    if (existing && (!validate || validate(existing))) return existing;
    const next = create();
    window.localStorage.setItem(key, next);
    return next;
  }
};

const getJourneySessionId = () => {
  if (!isBrowser()) return '';
  return getStoredOrCreateId(
    JOURNEY_SESSION_ID_KEY,
    () => createContractId('session'),
    (value) => isValidContractId(value, 'session'),
  );
};

export const isValidCustomerJourneyContext = (
  context: CustomerJourneyContext | null | undefined,
): context is CustomerJourneyContext => (
  Boolean(
    context &&
    isValidContractId(context.journeyId, 'journey') &&
    isValidContractId(context.correlationId, 'corr') &&
    isValidContractId(context.sessionId, 'session')
  )
);

export const getCustomerJourneyContext = (): CustomerJourneyContext | null => {
  if (!isBrowser()) return null;
  const sessionId = getJourneySessionId();
  return {
    journeyId: getStoredOrCreateId(
      JOURNEY_ID_KEY,
      () => createContractId('journey'),
      (value) => isValidContractId(value, 'journey'),
    ),
    correlationId: getStoredOrCreateId(
      JOURNEY_CORRELATION_ID_KEY,
      () => createContractId('corr'),
      (value) => isValidContractId(value, 'corr'),
    ),
    sessionId,
  };
};

const readJourneyEvents = (): JourneyEvent[] => {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(JOURNEY_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((event): event is JourneyEvent => (
      event &&
      typeof event === 'object' &&
      typeof event.id === 'string' &&
      typeof event.journeyId === 'string' &&
      typeof event.correlationId === 'string' &&
      typeof event.sessionId === 'string' &&
      typeof event.type === 'string' &&
      typeof event.createdAt === 'string'
    )) : [];
  } catch {
    return [];
  }
};

const forbiddenJourneyPayloadKeys = new Set([
  'email',
  'phone',
  'firstName',
  'lastName',
  'name',
  'street',
  'city',
  'postalCode',
  'address',
  'password',
  'token',
  'cookie',
  'card',
].map((key) => key.toLowerCase()));

const sanitizeJourneyPayload = (payload: Record<string, unknown>) => (
  Object.fromEntries(Object.entries(payload).filter(([key]) => !forbiddenJourneyPayloadKeys.has(key.toLowerCase())))
);

const appendJourneyEvent = (event: JourneyEvent) => {
  const events = [...readJourneyEvents(), event].slice(-MAX_JOURNEY_EVENTS);
  window.localStorage.setItem(JOURNEY_EVENTS_KEY, JSON.stringify(events));
  window.dispatchEvent(new CustomEvent(JOURNEY_EVENT_RECORDED_EVENT, { detail: event }));
};

const markJourneySessionStarted = (sessionId: string) => {
  try {
    window.sessionStorage.setItem(JOURNEY_SESSION_STARTED_KEY, sessionId);
  } catch {
    window.localStorage.setItem(JOURNEY_SESSION_STARTED_KEY, sessionId);
  }
};

const hasJourneySessionStarted = (sessionId: string) => {
  try {
    return window.sessionStorage.getItem(JOURNEY_SESSION_STARTED_KEY) === sessionId;
  } catch {
    return window.localStorage.getItem(JOURNEY_SESSION_STARTED_KEY) === sessionId;
  }
};

export const recordJourneyEvent = (type: JourneyEventType, payload: Record<string, unknown> = {}) => {
  if (!isBrowser()) return;

  const context = getCustomerJourneyContext();
  if (!isValidCustomerJourneyContext(context)) return;
  const sessionId = context.sessionId;

  if (type !== 'session_started' && !hasJourneySessionStarted(sessionId)) {
    appendJourneyEvent({
      id: createJourneyId(),
      journeyId: context.journeyId,
      correlationId: context.correlationId,
      sessionId,
      type: 'session_started',
      payload: { journeyId: context.journeyId, correlationId: context.correlationId, sessionId },
      url: `${window.location.pathname}${window.location.search}`,
      createdAt: new Date().toISOString(),
    });
    markJourneySessionStarted(sessionId);
  }

  appendJourneyEvent({
    id: createJourneyId(),
    journeyId: context.journeyId,
    correlationId: context.correlationId,
    sessionId,
    type,
    payload: sanitizeJourneyPayload({ ...payload, journeyId: context.journeyId, correlationId: context.correlationId, sessionId }),
    url: `${window.location.pathname}${window.location.search}`,
    createdAt: new Date().toISOString(),
  });

  if (type === 'session_started') {
    markJourneySessionStarted(sessionId);
  }
};

export const getStoredJourneyEvents = () => readJourneyEvents();

const getItemId = (productId: string, variantId?: string) => (
  `${productId}:${variantId || 'default'}`
);

const emitGuestCartUpdated = () => {
  if (isBrowser()) {
    window.dispatchEvent(new Event(GUEST_CART_UPDATED_EVENT));
  }
};

const normalizeQuantity = (quantity: unknown) => {
  return typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0
    ? Math.floor(quantity)
    : 1;
};

const normalizeStockQuantity = (quantity: unknown) => {
  return typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 0
    ? Math.floor(quantity)
    : undefined;
};

const normalizePrice = (price: unknown) => {
  return typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : 0;
};

const readStoredItems = (): GuestCartItem[] => {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item): GuestCartItem[] => {
      if (!item || typeof item !== 'object') return [];

      const candidate = item as Partial<GuestCartItem>;
      if (
        typeof candidate.productId !== 'string' ||
        !candidate.product ||
        typeof candidate.product.id !== 'string' ||
        typeof candidate.product.name !== 'string'
      ) {
        return [];
      }

      const variantId = typeof candidate.variantId === 'string' ? candidate.variantId : undefined;
      return [{
        id: getItemId(candidate.productId, variantId),
        productId: candidate.productId,
        product: {
          id: candidate.product.id,
          name: candidate.product.name,
          price: normalizePrice(candidate.product.price),
          stockQuantity: normalizeStockQuantity(candidate.product.stockQuantity),
          brand: candidate.product.brand,
          mainImageUrl: candidate.product.mainImageUrl,
          imageUrls: candidate.product.imageUrls,
          images: candidate.product.images,
        },
        variantId,
        variant: candidate.variant,
        quantity: normalizeQuantity(candidate.quantity),
        price: normalizePrice(candidate.price),
      }];
    });
  } catch {
    return [];
  }
};

const writeStoredItems = (items: GuestCartItem[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emitGuestCartUpdated();
};

export const getGuestCart = (): GuestCart => {
  const items = readStoredItems();
  return {
    items,
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
};

const getAvailableStock = (product: GuestCartProduct, variant?: GuestCartVariant) => {
  return normalizeStockQuantity(variant?.stockQuantity ?? product.stockQuantity);
};

export const addGuestCartItem = ({
  product,
  variant,
  quantity = 1,
}: AddGuestCartItemInput): GuestCartAddResult => {
  const items = readStoredItems();
  const variantId = variant?.id;
  const id = getItemId(product.id, variantId);
  const existing = items.find((item) => item.id === id);
  const safeQuantity = normalizeQuantity(quantity);
  const price = normalizePrice(variant?.price ?? product.price);
  const availableStock = getAvailableStock(product, variant);

  if (existing) {
    return { cart: getGuestCart(), status: 'already-in-cart', availableStock };
  }

  if (availableStock !== undefined && safeQuantity > availableStock) {
    return { cart: getGuestCart(), status: 'insufficient-stock', availableStock };
  }

  items.push({
    id,
    productId: product.id,
    product,
    variantId,
    variant,
    quantity: safeQuantity,
    price,
  });

  writeStoredItems(items);
  const cart = getGuestCart();
  recordJourneyEvent('cart_item_added', {
    productId: product.id,
    variantId,
    quantity: safeQuantity,
    price,
    cartItemCount: cart.itemCount,
    cartTotal: cart.total,
  });
  return { cart, status: 'added', availableStock };
};

export const updateGuestCartQuantity = (itemId: string, quantity: number): GuestCart => {
  const requestedQuantity = Math.floor(quantity);
  const items = requestedQuantity < 1
    ? readStoredItems().filter((item) => item.id !== itemId)
    : readStoredItems().map((item) => {
        if (item.id !== itemId) return item;

        const availableStock = getAvailableStock(item.product, item.variant);
        const safeQuantity = availableStock === undefined
          ? requestedQuantity
          : Math.min(requestedQuantity, availableStock);
        return { ...item, quantity: safeQuantity };
      });

  writeStoredItems(items);
  return getGuestCart();
};

export const replaceGuestCartItems = (items: GuestCartItem[]): GuestCart => {
  writeStoredItems(items);
  return getGuestCart();
};

export const removeGuestCartItem = (itemId: string): GuestCart => {
  writeStoredItems(readStoredItems().filter((item) => item.id !== itemId));
  return getGuestCart();
};

export const clearGuestCart = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  emitGuestCartUpdated();
};


export const setGuestBundleIntent = (intent: Omit<GuestBundleIntent, 'source' | 'currency' | 'createdAt'>) => {
  if (!isBrowser()) return;
  const productIds = Array.from(new Set(intent.productIds.filter(Boolean)));
  if (!intent.sourceProductId || productIds.length < 2) return;
  window.localStorage.setItem(BUNDLE_INTENT_KEY, JSON.stringify({
    source: 'product_detail_buy_together',
    sourceProductId: intent.sourceProductId,
    productIds,
    estimatedSavings: normalizePrice(intent.estimatedSavings),
    ...(typeof intent.catalogCandidateId === 'string' && intent.catalogCandidateId.trim() ? { catalogCandidateId: intent.catalogCandidateId.trim() } : {}),
    ...(typeof intent.bundleId === 'string' && intent.bundleId.trim() ? { bundleId: intent.bundleId.trim() } : {}),
    currency: 'CZK',
    createdAt: new Date().toISOString(),
  } satisfies GuestBundleIntent));
};

export const getGuestBundleIntent = (): GuestBundleIntent | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(BUNDLE_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestBundleIntent>;
    if (
      parsed?.source !== 'product_detail_buy_together' ||
      typeof parsed.sourceProductId !== 'string' ||
      !Array.isArray(parsed.productIds)
    ) {
      return null;
    }
    const productIds = Array.from(new Set(parsed.productIds.filter((id): id is string => typeof id === 'string' && Boolean(id))));
    if (productIds.length < 2 || !productIds.includes(parsed.sourceProductId)) return null;
    return {
      source: 'product_detail_buy_together',
      sourceProductId: parsed.sourceProductId,
      productIds,
      estimatedSavings: normalizePrice(parsed.estimatedSavings),
      ...(typeof parsed.catalogCandidateId === 'string' && parsed.catalogCandidateId.trim() ? { catalogCandidateId: parsed.catalogCandidateId.trim() } : {}),
      ...(typeof parsed.bundleId === 'string' && parsed.bundleId.trim() ? { bundleId: parsed.bundleId.trim() } : {}),
      currency: 'CZK',
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
    };
  } catch {
    return null;
  }
};

export const getGuestBundleIntentForProductIds = (cartProductIds: string[]): GuestBundleIntent | null => {
  const intent = getGuestBundleIntent();
  if (!intent) return null;
  const cartIds = new Set(cartProductIds);
  return intent.productIds.every((productId) => cartIds.has(productId)) ? intent : null;
};

export const clearGuestBundleIntent = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(BUNDLE_INTENT_KEY);
};
