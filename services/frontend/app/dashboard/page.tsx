'use client';

/**
 * User Dashboard Page
 * Overview with user statistics, recent orders, and quick actions
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi, Order } from '@/lib/api/orders';
import { SellerCatalogProduct, SellerCatalogPublishResponse, sellerCatalogApi } from '@/lib/api/products';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function UserDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [sellerProducts, setSellerProducts] = useState<SellerCatalogProduct[]>([]);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerMessage, setSellerMessage] = useState<string | null>(null);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [sellerSearch, setSellerSearch] = useState('');
  const [catalogSources, setCatalogSources] = useState<string[]>(['own', 'alfares', 'community']);
  const [selectedSellerProductIds, setSelectedSellerProductIds] = useState<string[]>([]);
  const [publishingProducts, setPublishingProducts] = useState(false);
  const [resaleUpdatingId, setResaleUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading, router]);

  const loadDashboardData = async () => {
    try {
      const response = await ordersApi.getOrders();
      if (response.success && response.data) {
        const orders = response.data;
        setRecentOrders(orders.slice(0, 5));
        setOrderCount(orders.length);
        const total = orders.reduce((sum: number, order: Order) => sum + order.total, 0);
        setTotalSpent(total);
      }
      await loadSellerCatalog();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sourceLabels: Record<string, string> = {
    own: 'Moje produkty',
    alfares: 'Alfares',
    community: 'Ostatni prodejci',
  };

  const catalogSourceQuery = catalogSources.join(',');

  const loadSellerCatalog = async (searchOverride?: string, sourcesOverride?: string[]) => {
    setSellerLoading(true);
    setSellerError(null);
    try {
      const sources = sourcesOverride || catalogSources;
      const response = await sellerCatalogApi.getProducts({
        page: 1,
        limit: 12,
        search: searchOverride ?? sellerSearch,
        catalogSources: sources.join(','),
      });
      if (response.success && response.data) {
        setSellerProducts(response.data.items || []);
        setSelectedSellerProductIds((current) => current.filter((id) => response.data?.items.some((item) => item.id === id)));
      } else {
        setSellerError(response.error?.message || 'Catalog produkty se nepodarilo nacist.');
      }
    } catch (error) {
      setSellerError(error instanceof Error ? error.message : 'Catalog produkty se nepodarilo nacist.');
    } finally {
      setSellerLoading(false);
    }
  };

  const toggleCatalogSource = (source: string) => {
    setCatalogSources((current) => {
      const next = current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source];
      const normalized = next.length ? next : [source];
      loadSellerCatalog(sellerSearch, normalized);
      return normalized;
    });
  };

  const toggleSellerProductSelection = (id: string) => {
    setSelectedSellerProductIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  };

  const publishSelectedProducts = async () => {
    if (!selectedSellerProductIds.length) return;
    setPublishingProducts(true);
    setSellerError(null);
    setSellerMessage(null);
    try {
      const response = await sellerCatalogApi.publishProducts(selectedSellerProductIds);
      if (response.success && response.data) {
        const result = response.data as SellerCatalogPublishResponse;
        setSellerMessage(`Publikovano ${result.totals?.succeeded || 0} z ${result.totals?.requested || selectedSellerProductIds.length} produktu na FlipFlop.`);
        setSelectedSellerProductIds([]);
        await loadSellerCatalog();
      } else {
        setSellerError(response.error?.message || 'Publikace na FlipFlop selhala.');
      }
    } catch (error) {
      setSellerError(error instanceof Error ? error.message : 'Publikace na FlipFlop selhala.');
    } finally {
      setPublishingProducts(false);
    }
  };

  const updateProductResale = async (product: SellerCatalogProduct) => {
    const nextValue = !(product.resaleEnabled === true || product.source?.resaleEnabled === true);
    setResaleUpdatingId(product.id);
    setSellerError(null);
    setSellerMessage(null);
    try {
      const response = await sellerCatalogApi.updateResale(product.id, nextValue);
      if (response.success && response.data?.product) {
        setSellerProducts((current) => current.map((item) => item.id === product.id ? response.data!.product : item));
        setSellerMessage(nextValue ? 'Produkt je sdilen pro resale.' : 'Produkt uz neni sdilen pro resale.');
      } else {
        setSellerError(response.error?.message || 'Resale nastaveni se nepodarilo ulozit.');
      }
    } catch (error) {
      setSellerError(error instanceof Error ? error.message : 'Resale nastaveni se nepodarilo ulozit.');
    } finally {
      setResaleUpdatingId(null);
    }
  };

  const productSourceLabel = (product: SellerCatalogProduct) => {
    const sourceType = product.source?.type || (product.ownerUserId === null ? 'alfares' : product.resaleEnabled ? 'community' : 'own');
    return sourceLabels[sourceType] || 'Catalog';
  };

  const isOwnedSellerProduct = (product: SellerCatalogProduct) => {
    const owner = String(product.ownerUserId || product.source?.ownerUserId || '').trim().toLowerCase();
    const userIds = [user?.id, user?.email].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
    return Boolean(owner && userIds.includes(owner));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800';
      case 'SHIPPED':
        return 'bg-indigo-100 text-indigo-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'Čeká na potvrzení',
      CONFIRMED: 'Potvrzeno',
      PROCESSING: 'Zpracovává se',
      SHIPPED: 'Odesláno',
      DELIVERED: 'Doručeno',
      CANCELLED: 'Zrušeno',
    };
    return statusMap[status] || status;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
          <p className="text-xl font-semibold text-gray-600">Načítání dashboardu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">
            Vítejte, {user?.firstName || 'Uživateli'}! 👋
          </h1>
          <p className="text-xl text-blue-50">
            Přehled vašich objednávek a aktivit
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">Celkem utraceno</p>
                <p className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency: 'CZK',
                  }).format(totalSpent)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl shadow-md">
                <span className="text-3xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">Počet objednávek</p>
                <p className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {orderCount}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl shadow-md">
                <span className="text-3xl">🛒</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">Průměrná objednávka</p>
                <p className="text-3xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {orderCount > 0
                    ? new Intl.NumberFormat('cs-CZ', {
                        style: 'currency',
                        currency: 'CZK',
                      }).format(totalSpent / orderCount)
                    : '0 Kč'}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl shadow-md">
                <span className="text-3xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">⚡ Rychlé akce</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link
              href="/products"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all shadow-sm hover:shadow-md transform hover:scale-105"
            >
              <span className="text-4xl mb-3">🛍️</span>
              <span className="text-sm font-bold text-gray-700">Nakupovat</span>
            </Link>
            <Link
              href="/orders"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all shadow-sm hover:shadow-md transform hover:scale-105"
            >
              <span className="text-4xl mb-3">📦</span>
              <span className="text-sm font-bold text-gray-700">Objednávky</span>
            </Link>
            <Link
              href="/profile"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all shadow-sm hover:shadow-md transform hover:scale-105"
            >
              <span className="text-4xl mb-3">👤</span>
              <span className="text-sm font-bold text-gray-700">Profil</span>
            </Link>
            <Link
              href="/profile/addresses"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all shadow-sm hover:shadow-md transform hover:scale-105"
            >
              <span className="text-4xl mb-3">📍</span>
              <span className="text-sm font-bold text-gray-700">Adresy</span>
            </Link>
            <Link
              href="/profile/invoice-profiles"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all shadow-sm hover:shadow-md transform hover:scale-105"
            >
              <span className="text-4xl mb-3">🧾</span>
              <span className="text-sm font-bold text-gray-700">Fakturace</span>
            </Link>
          </div>
        </div>

        {/* Seller Catalog */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">FlipFlop seller katalog</h2>
              <p className="mt-2 text-sm text-gray-600">
                Vyberte vlastni, Alfares nebo komunitni Catalog produkty a publikujte je do FlipFlop storefrontu.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="https://catalog.alfares.cz/dashboard/products/new" className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50">
                Novy Catalog produkt
              </Link>
              <Link href="https://catalog.alfares.cz/dashboard/settings" className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50">
                Zdroje a resale
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-5">
            <div className="flex flex-wrap gap-3">
              {(['own', 'alfares', 'community'] as const).map((source) => (
                <label key={source} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={catalogSources.includes(source)}
                    onChange={() => toggleCatalogSource(source)}
                    className="h-4 w-4"
                  />
                  {sourceLabels[source]}
                </label>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                loadSellerCatalog(sellerSearch, catalogSources);
              }}
            >
              <input
                value={sellerSearch}
                onChange={(event) => setSellerSearch(event.target.value)}
                className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Hledat v Catalogu"
              />
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white" disabled={sellerLoading}>
                Hledat
              </button>
            </form>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">Aktivni zdroje: {catalogSourceQuery || 'own,alfares,community'}</p>
            <button
              type="button"
              onClick={publishSelectedProducts}
              disabled={!selectedSellerProductIds.length || publishingProducts}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {publishingProducts ? 'Publikuji...' : `Publikovat vybrane (${selectedSellerProductIds.length})`}
            </button>
          </div>

          {sellerMessage && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{sellerMessage}</div>}
          {sellerError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{sellerError}</div>}

          {sellerLoading ? (
            <div className="py-10 text-center text-sm font-semibold text-gray-500">Nacitam seller katalog...</div>
          ) : sellerProducts.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sellerProducts.map((product) => {
                const selected = selectedSellerProductIds.includes(product.id);
                const resaleOn = product.resaleEnabled === true || product.source?.resaleEnabled === true;
                const ownedByUser = isOwnedSellerProduct(product);
                return (
                  <article key={product.id} className={`rounded-xl border p-4 ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex gap-3">
                      {product.mainImageUrl ? (
                        <img src={product.mainImageUrl} alt={product.name} className="h-20 w-20 rounded-lg object-cover" />
                      ) : (
                        <div className="h-20 w-20 rounded-lg bg-gray-100" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-extrabold text-gray-900">{product.name}</h3>
                        <p className="mt-1 text-xs text-gray-500">{product.sku}</p>
                        <p className="mt-2 text-xs font-bold text-blue-700">{productSourceLabel(product)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-bold text-gray-700">
                        <input type="checkbox" checked={selected} onChange={() => toggleSellerProductSelection(product.id)} />
                        Prodat na FlipFlop
                      </label>
                      <span className="text-sm font-extrabold text-blue-700">{new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(product.price || 0)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      <span>Community resale</span>
                      <button
                        type="button"
                        onClick={() => updateProductResale(product)}
                        disabled={!ownedByUser || resaleUpdatingId === product.id}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        title={ownedByUser ? 'Owner-only Catalog update' : 'Pouze vlastnik Catalog produktu muze menit resale'}
                      >
                        {resaleUpdatingId === product.id ? 'Ukladam' : resaleOn ? 'Zapnuto' : 'Vypnuto'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm font-semibold text-gray-500">
              Catalog zatim nevratil produkty pro vybrane zdroje.
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900">📦 Nedávné objednávky</h2>
            <Link
              href="/orders"
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-2 group"
            >
              Zobrazit všechny
              <span className="transform group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Číslo objednávky
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Celkem
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Akce
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                        {new Intl.NumberFormat('cs-CZ', {
                          style: 'currency',
                          currency: 'CZK',
                        }).format(order.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('cs-CZ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
                        >
                          👁️ Zobrazit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-extrabold text-gray-800 mb-2">Zatím nemáte žádné objednávky</h3>
              <p className="text-gray-600 mb-6">Začněte nákupem produktů</p>
              <Link
                href="/products"
                className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                🛍️ Začít nakupovat
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

