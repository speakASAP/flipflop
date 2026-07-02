'use client';

/**
 * Admin Orders List Page
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useVisiblePolling } from "@/lib/hooks/useVisiblePolling";
import {
  formatOrderMoney,
  getOrderDisplayData,
  Order,
  OrderStatus,
  ordersApi,
  PaymentStatus,
} from '@/lib/api/orders';
import { PaginatedResponse } from '@/lib/api/products';
import LoadingSpinner from '@/components/LoadingSpinner';

function normalizeStatus(status?: string) {
  return (status || '').toLowerCase();
}

function getStatusColor(status?: string) {
  switch (normalizeStatus(status)) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
    case 'accepted':
      return 'bg-blue-100 text-blue-800';
    case 'processing':
      return 'bg-purple-100 text-purple-800';
    case 'shipped':
      return 'bg-indigo-100 text-indigo-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
    case 'failed':
    case 'central_orders_failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusText(status?: string) {
  const statusMap: Record<string, string> = {
    pending: 'Čeká',
    confirmed: 'Potvrzeno',
    accepted: 'Přijato',
    processing: 'Zpracovává se',
    shipped: 'Odesláno',
    delivered: 'Doručeno',
    cancelled: 'Zrušeno',
    refunded: 'Vráceno',
    paid: 'Zaplaceno',
    failed: 'Selhalo',
    central_orders_failed: 'Orders chyba',
    unknown: 'Nedostupné',
  };
  return statusMap[normalizeStatus(status)] || status || 'Nedostupné';
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
    return 'Objednávka nemá centrální Orders metadata.';
  }
  return central.error || '[MISSING: Orders lifecycle read endpoint]';
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '' as OrderStatus | '',
    paymentStatus: '' as PaymentStatus | '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadOrders = useCallback(async (options: { background?: boolean } = {}) => {
    if (!options.background) {
      setLoading(true);
    }
    try {
      const response = await ordersApi.getAdminOrders({
        ...filters,
        status: filters.status || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        page,
        limit: 20,
      });
      if (response.success && response.data) {
        const data = response.data as PaginatedResponse<Order>;
        if (data.items) {
          setOrders(data.items);
          setTotalPages(data.pagination?.totalPages || 1);
          setTotal(data.pagination?.total || 0);
        } else {
          setOrders(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      if (!options.background) {
        setLoading(false);
      }
    }
  }, [page, filters]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useVisiblePolling(() => {
    void loadOrders({ background: true });
  }, 30000, true);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-xl font-semibold text-gray-600 mt-4">Načítání objednávek...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Objednávky</h1>
        <p className="text-xl text-blue-50">Správa všech objednávek ({total} celkem)</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-extrabold text-slate-900 mb-4">Filtry</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status objednávky
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value as OrderStatus | '' })
              }
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              <option value="">Všechny</option>
              <option value={OrderStatus.PENDING}>Čeká na potvrzení</option>
              <option value={OrderStatus.CONFIRMED}>Potvrzeno</option>
              <option value={OrderStatus.PROCESSING}>Zpracovává se</option>
              <option value={OrderStatus.SHIPPED}>Odesláno</option>
              <option value={OrderStatus.DELIVERED}>Doručeno</option>
              <option value={OrderStatus.CANCELLED}>Zrušeno</option>
              <option value={OrderStatus.REFUNDED}>Vráceno</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status platby
            </label>
            <select
              value={filters.paymentStatus}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  paymentStatus: e.target.value as PaymentStatus | '',
                })
              }
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              <option value="">Všechny</option>
              <option value={PaymentStatus.PENDING}>Čeká na platbu</option>
              <option value={PaymentStatus.PAID}>Zaplaceno</option>
              <option value={PaymentStatus.FAILED}>Selhalo</option>
              <option value={PaymentStatus.REFUNDED}>Vráceno</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        {orders.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Číslo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Zákazník
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Celkem
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Lifecycle
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Platba
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Doručení
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
                  {orders.map((order) => {
                    const display = getOrderDisplayData(order);
                    const notice = getCentralNotice(order);
                    const address = display.deliveryAddress;
                    const customer = address?.name || [address?.firstName, address?.lastName].filter(Boolean).join(' ');

                    return (
                      <tr key={order.id} className="hover:bg-blue-50/50 transition-colors align-top">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            #{order.orderNumber}
                          </Link>
                          {display.central?.id && (
                            <p className="text-xs text-gray-500 mt-1">{display.central.id}</p>
                          )}
                          {notice && (
                            <p className="mt-2 max-w-xs rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                              {notice}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {customer || 'Neuvedeno'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                          {formatOrderMoney(display.total, display.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${getStatusColor(display.lifecycleStage)}`}>
                            {getStatusText(display.lifecycleStage)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${getStatusColor(display.paymentStatus)}`}>
                            {getStatusText(display.paymentStatus)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {getStatusText(display.exceptionStatus || display.deliveryStatus || display.fulfillmentStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString('cs-CZ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
                          >
                            Zobrazit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm font-semibold text-gray-700">
                  Zobrazeno {orders.length} z {total} objednávek
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-6 py-2 bg-white border-2 border-gray-300 rounded-xl font-semibold hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Předchozí
                  </button>
                  <span className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg">
                    Stránka {page} z {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-6 py-2 bg-white border-2 border-gray-300 rounded-xl font-semibold hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Další
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Žádné objednávky nenalezeny</h2>
            <p className="text-gray-600">Zkuste upravit filtry</p>
          </div>
        )}
      </div>
    </div>
  );
}
