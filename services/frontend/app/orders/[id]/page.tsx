'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DeliveryAddress,
  formatOrderMoney,
  getOrderDisplayData,
  getOrderLifecycleColor,
  getOrderLifecycleLabel,
  Order,
  ordersApi,
} from '@/lib/api/orders';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useVisiblePolling } from "@/lib/hooks/useVisiblePolling";

function getStatusColor(status?: string) {
  return getOrderLifecycleColor(status);
}

function getStatusText(status?: string) {
  return getOrderLifecycleLabel(status, 'Stav není dostupný');
}

function getCentralNotice(order: Order) {
  const central = order.centralOrder;
  if (!central || central.readStatus === 'available') {
    return null;
  }
  if (central.readStatus === 'forward_failed') {
    return central.error || 'Centrální Orders objednávku nepřijaly.';
  }
  if (central.readStatus === 'not_forwarded') {
    return 'Objednávka zatím nemá potvrzený centrální Orders stav.';
  }
  return central.error || '[MISSING: Orders lifecycle read endpoint]';
}

function addressName(address: DeliveryAddress | null | undefined) {
  if (!address) return '';
  return address.name || [address.firstName, address.lastName].filter(Boolean).join(' ');
}

export default function OrderDetailPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();

  const loadOrder = useCallback(async (id: string, options: { background?: boolean } = {}) => {
    if (options.background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await ordersApi.getOrder(id);
      if (response.success && response.data) {
        setOrder(response.data);
        setLastRefreshedAt(new Date());
      }
    } catch (error) {
      console.error("Failed to load order:", error);
    } finally {
      if (options.background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (params.id) {
      void loadOrder(params.id as string);
    }
  }, [isAuthenticated, loadOrder, params.id, router]);

  useVisiblePolling(() => {
    if (params.id) {
      void loadOrder(params.id as string, { background: true });
    }
  }, 30000, isAuthenticated && Boolean(params.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">...</div>
          <p className="text-xl font-semibold text-gray-600">Načítání objednávky...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl shadow-xl p-12">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Objednávka nenalezena</h1>
            <Link href="/orders" className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
              Zpět na objednávky
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const display = getOrderDisplayData(order);
  const notice = getCentralNotice(order);
  const address = display.deliveryAddress;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/orders" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors">
            Zpět na objednávky
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-500">
              {refreshing ? 'Aktualizuji stav...' : lastRefreshedAt ? `Aktualizováno ${lastRefreshedAt.toLocaleTimeString('cs-CZ')}` : 'Čeká na první načtení'}
            </span>
            <button
              type="button"
              onClick={() => params.id && void loadOrder(params.id as string, { background: Boolean(order) })}
              disabled={refreshing}
              className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:opacity-60"
            >
              {refreshing ? 'Aktualizuji...' : 'Aktualizovat'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-slate-900">
                Objednávka #{order.orderNumber}
              </h1>
              <p className="text-gray-600 text-lg">
                Datum: {new Date(order.createdAt).toLocaleDateString('cs-CZ', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {display.central?.id && (
                <p className="text-sm text-gray-500 mt-2">Central Orders: {display.central.id}</p>
              )}
            </div>
            <span className={`px-6 py-3 rounded-xl text-lg font-bold shadow-lg ${getStatusColor(display.status)}`}>
              {getStatusText(display.status)}
            </span>
          </div>

          {notice && (
            <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
              <p className="font-bold">Centrální Orders stav není aktuální</p>
              <p className="text-sm mt-1">{notice}</p>
            </div>
          )}

          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-500">Lifecycle</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{getStatusText(display.lifecycleStage)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-500">Platba</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{getStatusText(display.paymentStatus)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-500">Doručení / výjimky</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {display.exceptionStatus
                  ? getStatusText(display.exceptionStatus)
                  : getStatusText(display.deliveryStatus || display.fulfillmentStatus)}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold mb-6 text-slate-900">Položky objednávky</h2>
            <div className="space-y-4">
              {display.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-4 border-b border-gray-200 last:border-0">
                  <div>
                    <p className="font-bold text-lg text-slate-900">{item.productName}</p>
                    {item.productSku && <p className="text-sm text-gray-600 mt-1">SKU: {item.productSku}</p>}
                    <p className="text-sm text-gray-600">Množství: {item.quantity} ks</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-xl text-blue-600">
                      {formatOrderMoney(item.totalPrice, display.currency)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatOrderMoney(item.unitPrice, display.currency)} / ks
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <h2 className="text-2xl font-extrabold mb-4 text-slate-900">Dodací adresa</h2>
            {address ? (
              <div>
                <p className="font-bold text-lg text-slate-900 mb-2">{addressName(address)}</p>
                <p className="text-gray-700">{address.street}</p>
                <p className="text-gray-700">
                  {address.city}, {address.postalCode}
                </p>
                <p className="text-gray-700">{address.country}</p>
                {address.phone && <p className="text-gray-700 mt-2">Tel: {address.phone}</p>}
              </div>
            ) : (
              <p className="text-gray-700">Adresa není dostupná.</p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-2xl font-extrabold mb-6 text-slate-900">Souhrn</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">Mezisoučet:</span>
                <span className="font-bold">{formatOrderMoney(display.subtotal, display.currency)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">DPH:</span>
                <span className="font-bold">{formatOrderMoney(display.tax, display.currency)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">Doprava:</span>
                <span className="font-bold">{formatOrderMoney(display.shippingCost, display.currency)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-lg text-green-600">
                  <span>Sleva:</span>
                  <span className="font-bold">-{formatOrderMoney(order.discount, display.currency)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between text-3xl font-extrabold">
                  <span className="text-slate-900">Celkem:</span>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {formatOrderMoney(display.total, display.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="font-bold text-lg mb-2 text-slate-900">Poznámka:</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-xl">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
