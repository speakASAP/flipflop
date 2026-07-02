'use client';

import { useEffect, useState } from 'react';
import { cartApi, CartItem } from '@/lib/api/cart';
import { productsApi } from '@/lib/api/products';
import { useAuth } from '@/contexts/AuthContext';
import {
  clearGuestCart,
  getGuestCart,
  GuestCart,
  GuestCartItem,
  removeGuestCartItem,
  replaceGuestCartItems,
  updateGuestCartQuantity,
} from '@/lib/guest-cart';
import Link from 'next/link';

type CartView = {
  items: Array<CartItem | GuestCartItem>;
  total: number;
  itemCount: number;
};

type CartMessage = {
  text: string;
  tone: 'warning' | 'error';
};

const getCartItemProduct = (item: CartItem | GuestCartItem) => (
  (item as any).product || (item as any).products
);

const getCartItemStockQuantity = (item: CartItem | GuestCartItem) => {
  const stockQuantity = (item as any).variant?.stockQuantity ?? getCartItemProduct(item)?.stockQuantity;
  return typeof stockQuantity === 'number' && Number.isFinite(stockQuantity)
    ? Math.floor(stockQuantity)
    : undefined;
};

const getCartItemProductHref = (item: CartItem | GuestCartItem) => {
  const product = getCartItemProduct(item);
  return `/products/${encodeURIComponent(product?.id || item.productId)}`;
};

const getProductSummary = (product: any) => (
  product?.shortDescription ||
  product?.description ||
  product?.seoData?.metaDescription ||
  ''
);

const getProductCategories = (product: any) => (
  Array.isArray(product?.categories)
    ? product.categories.map((category: any) => category?.name).filter(Boolean)
    : []
);

const getVariantAttributes = (item: CartItem | GuestCartItem) => {
  const attributes = (item as any).variant?.attributes;
  if (!attributes || typeof attributes !== 'object') return [];
  return Object.entries(attributes).filter(([, value]) => value !== undefined && value !== null && value !== '');
};

const isAlreadyInCartResponse = (result: any) => (
  !result.success &&
  (
    result.error?.details?.status === 409 ||
    (
      typeof result.error?.message === 'string' &&
      (
        result.error.message.toLowerCase().includes('already in your cart') ||
        result.error.message.toLowerCase().includes('status code 409')
      )
    )
  )
);

export default function CartPage() {
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartMessage, setCartMessage] = useState<CartMessage | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const { isAuthenticated, loading: authLoading } = useAuth();

  const showCartMessage = (text: string, tone: CartMessage['tone'] = 'error') => {
    setCartMessage({ text, tone });
    setTimeout(() => setCartMessage(null), 3000);
  };

  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      loadAuthenticatedCart();
    } else {
      loadGuestCart();
    }
  }, [authLoading, isAuthenticated]);

  const mergeGuestCartIntoServerCart = async () => {
    const guestCart = getGuestCart();
    if (guestCart.items.length === 0) return;

    const results = [];
    for (const item of guestCart.items) {
      results.push(await cartApi.addToCart({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      }));
    }

    if (results.every((result) => result.success || isAlreadyInCartResponse(result))) {
      clearGuestCart();
    }
  };

  const loadGuestCart = async () => {
    setLoading(true);
    try {
      const guestCart = getGuestCart();
      const refreshedItems: GuestCartItem[] = [];
      let changed = false;

      for (const item of guestCart.items) {
        const response = await productsApi.getProduct(item.productId, true);
        if (!response.success || !response.data) {
          changed = true;
          continue;
        }

        const liveProduct = response.data;
        const liveVariant = item.variantId
          ? liveProduct.variants?.find((variant) => variant.id === item.variantId)
          : undefined;
        const stockValue = liveVariant?.stockQuantity ?? liveProduct.stockQuantity;
        const availableStock = typeof stockValue === 'number' && Number.isFinite(stockValue)
          ? Math.floor(stockValue)
          : 0;

        if (availableStock <= 0) {
          changed = true;
          continue;
        }

        const quantity = Math.min(item.quantity, availableStock);
        changed = changed || quantity !== item.quantity || item.product.stockQuantity !== liveProduct.stockQuantity;
        refreshedItems.push({
          ...item,
          quantity,
          product: {
            ...item.product,
            name: liveProduct.name,
            price: liveProduct.price,
            stockQuantity: liveProduct.stockQuantity,
            brand: liveProduct.brand,
            mainImageUrl: liveProduct.mainImageUrl,
            imageUrls: liveProduct.imageUrls,
            images: liveProduct.images,
          },
          variant: item.variant
            ? {
                ...item.variant,
                stockQuantity: liveVariant?.stockQuantity ?? item.variant.stockQuantity,
              }
            : undefined,
        });
      }

      setCart(changed ? replaceGuestCartItems(refreshedItems) : guestCart);
      if (changed) {
        showCartMessage('Nedostupné položky byly z košíku odebrány a množství bylo upraveno podle skladu.', 'warning');
      }
    } catch (error) {
      console.error('Failed to refresh guest cart:', error);
      setCart(getGuestCart());
    } finally {
      setLoading(false);
    }
  };

  const loadAuthenticatedCart = async () => {
    try {
      await mergeGuestCartIntoServerCart();
      const response = await cartApi.getCart();
      if (response.success && response.data) {
        setCart(response.data);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    const item = cart?.items.find((cartItem) => cartItem.id === itemId);
    const stockQuantity = item ? getCartItemStockQuantity(item) : undefined;

    if (stockQuantity !== undefined && quantity > stockQuantity) {
      showCartMessage(`Skladem je pouze ${stockQuantity} ks`, 'warning');
      return;
    }

    if (!isAuthenticated) {
      const nextCart: GuestCart = updateGuestCartQuantity(itemId, quantity);
      setCart(nextCart);
      return;
    }

    if (quantity < 1) {
      await removeItem(itemId);
      return;
    }

    try {
      const response = await cartApi.updateCartItem(itemId, quantity);
      if (!response.success) {
        showCartMessage(
          response.error?.details?.status === 400 ||
            response.error?.message?.toLowerCase().includes('insufficient stock')
            ? 'Nelze přidat více kusů, než je skladem'
            : 'Nepodařilo se aktualizovat košík',
          'error',
        );
        return;
      }
      loadAuthenticatedCart();
    } catch (error) {
      console.error('Failed to update cart item:', error);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!isAuthenticated) {
      const nextCart: GuestCart = removeGuestCartItem(itemId);
      setCart(nextCart);
      return;
    }

    try {
      await cartApi.removeFromCart(itemId);
      loadAuthenticatedCart();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Načítání košíku...</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl shadow-xl p-12">
            <div className="text-8xl mb-6">🛒</div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Váš košík je prázdný</h1>
            <p className="text-xl text-gray-600 mb-8">Začněte nakupovat a přidejte produkty do košíku</p>
            <Link
              href="/products"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Prohlédnout produkty
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-slate-900">Košík</h1>

        {cartMessage && (
          <div className={`mb-6 p-4 rounded-xl border-2 font-semibold ${
            cartMessage.tone === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-red-50 border-red-300 text-red-700'
          }`}>
            {cartMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => {
              const product = getCartItemProduct(item);
              if (!product) return null;

              const stockQuantity = getCartItemStockQuantity(item);
              const isAtStockLimit = stockQuantity !== undefined && item.quantity >= stockQuantity;
              const productImageUrl = product.mainImageUrl ||
                                     product.imageUrls?.[0] ||
                                     product.images?.[0] ||
                                     null;
              const productHref = getCartItemProductHref(item);
              const isExpanded = expandedItemId === item.id;
              const productSummary = getProductSummary(product);
              const categories = getProductCategories(product);
              const variantAttributes = getVariantAttributes(item);
              return (
              <div key={item.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <a
                    href={productHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0 rounded-xl -m-2 p-2 hover:bg-blue-50/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {productImageUrl ? (
                        <img
                          src={productImageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span className={`text-5xl ${productImageUrl ? 'hidden' : ''}`}>📦</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">{product.name}</h3>
                      {item.variant && (
                        <p className="text-sm text-gray-600 mb-2">{item.variant.name}</p>
                      )}
                      {stockQuantity !== undefined && (
                        <p className="text-sm text-gray-500 mb-2">Skladem: {stockQuantity} ks</p>
                      )}
                      <p className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {item.price.toLocaleString('cs-CZ')} Kč
                      </p>
                    </div>
                  </a>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-10 h-10 border-2 border-gray-300 rounded-xl font-bold hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
                    >
                      −
                    </button>
                    <span className="w-16 text-center font-bold text-lg">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={isAtStockLimit}
                      title={isAtStockLimit ? `Skladem je pouze ${stockQuantity} ks` : undefined}
                      className="w-10 h-10 border-2 border-gray-300 rounded-xl font-bold hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 disabled:hover:shadow-sm"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:text-red-700 font-semibold px-4 py-2 rounded-xl hover:bg-red-50 transition-all"
                  >
                    🗑️ Odstranit
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span className="text-gray-600">Celkem za položku:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {(item.price * item.quantity).toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    className="self-start sm:self-auto text-sm font-bold text-blue-700 px-4 py-2 rounded-xl border border-blue-200 hover:bg-blue-50 transition-all"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? 'Skrýt detaily' : 'Více detailů'}
                  </button>
                </div>
                <div className={`grid transition-all duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 space-y-3">
                      {productSummary ? (
                        <p className="leading-relaxed">{productSummary}</p>
                      ) : (
                        <p className="leading-relaxed">Základní informace o produktu jsou dostupné v detailu produktu.</p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {product.brand && (
                          <div>
                            <span className="block text-xs font-bold uppercase text-slate-500">Značka</span>
                            <span className="font-semibold text-slate-900">{product.brand}</span>
                          </div>
                        )}
                        {(product as any).sku && (
                          <div>
                            <span className="block text-xs font-bold uppercase text-slate-500">SKU</span>
                            <span className="font-semibold text-slate-900">{(product as any).sku}</span>
                          </div>
                        )}
                        {categories.length > 0 && (
                          <div>
                            <span className="block text-xs font-bold uppercase text-slate-500">Kategorie</span>
                            <span className="font-semibold text-slate-900">{categories.join(', ')}</span>
                          </div>
                        )}
                        {stockQuantity !== undefined && (
                          <div>
                            <span className="block text-xs font-bold uppercase text-slate-500">Dostupnost</span>
                            <span className="font-semibold text-slate-900">Skladem {stockQuantity} ks</span>
                          </div>
                        )}
                      </div>
                      {variantAttributes.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {variantAttributes.map(([key, value]) => (
                            <span key={String(key)} className="rounded-full bg-white border border-slate-200 px-3 py-1 font-semibold text-slate-700">
                              {String(key)}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 sticky top-4">
              <h2 className="text-2xl font-extrabold mb-6 text-slate-900">Souhrn objednávky</h2>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Položek:</span>
                  <span className="font-bold">{cart.itemCount}</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-2xl font-extrabold">
                    <span className="text-slate-900">Celkem:</span>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {cart.total.toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href="/checkout"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-center block"
              >
                Pokračovat k pokladně →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
