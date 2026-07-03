'use client';

import { useCallback, useEffect, useState } from "react";
import {
  formatOrderMoney,
  getOrderDisplayData,
  getOrderLifecycleColor,
  getOrderLifecycleLabel,
  Order,
  ordersApi,
} from '@/lib/api/orders';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const loadOrders = useCallback(async (options: { background?: boolean } = {}) => {
    if (options.background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await ordersApi.getOrders();
      if (response.success && response.data) {
        setOrders(response.data);
        setLastRefreshedAt(new Date());
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
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

    void loadOrders();
  }, [isAuthenticated, loadOrders, router]);

  useVisiblePolling(() => {
    void loadOrders({ background: true });
  }, 30000, isAuthenticated);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">...</div>
          <p className="text-xl font-semibold text-gray-600">Načítání objednávek...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">Moje objednávky</h1>
            <p className="mt-2 text-sm font-semibold text-gray-500">
              {refreshing ? 'Aktualizuji stav...' : lastRefreshedAt ? `Aktualizováno ${lastRefreshedAt.toLocaleTimeString('cs-CZ')}` : 'Čeká na první načtení'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadOrders({ background: orders.length > 0 })}
            disabled={refreshing}
            className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:opacity-60"
          >
            {refreshing ? 'Aktualizuji...' : 'Aktualizovat'}
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl shadow-xl p-12">
            <div className="text-8xl mb-6">Box</div>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Nemáte žádné objednávky</h2>
            <p className="text-xl text-gray-600 mb-8">Začněte nakupovat a vaše objednávky se zde zobrazí</p>
            <Link
              href="/products"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Prohlédnout produkty
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const display = getOrderDisplayData(order);
              const notice = getCentralNotice(order);
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all transform hover:scale-[1.01]"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h3 className="text-2xl font-extrabold text-slate-900">
                          Objednávka #{order.orderNumber}
                        </h3>
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${getStatusColor(display.status)}`}>
                          {getStatusText(display.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">
                        Datum: {new Date(order.createdAt).toLocaleDateString('cs-CZ', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-gray-600">
                        Položek: {display.items.length}
                      </p>
                      {display.central?.id && (
                        <p className="text-sm text-gray-500 mt-1">
                          Central Orders: {display.central.id}
                        </p>
                      )}
                      {notice && (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                          {notice}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {formatOrderMoney(display.total, display.currency)}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">Celkem</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
