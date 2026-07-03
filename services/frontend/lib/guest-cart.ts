import type { Product, ProductVariant } from './api/products';

const STORAGE_KEY = 'flipflop_guest_cart_v1';
const BUNDLE_INTENT_KEY = 'flipflop_bundle_intent_v1';
export const GUEST_CART_UPDATED_EVENT = 'flipflop:guest-cart-updated';

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
  return { cart: getGuestCart(), status: 'added', availableStock };
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
