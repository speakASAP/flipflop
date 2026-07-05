'use client';

/**
 * Admin Order Detail Page
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  DeliveryAddress,
  formatOrderMoney,
  getOrderDisplayData,
  getOrderLifecycleColor,
  isCentralAuthorityOrder,
  getOrderLifecycleLabel,
  Order,
  OrderStatus,
  ordersApi,
  PaymentStatus,
} from '@/lib/api/orders';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';
import { useVisiblePolling } from "@/lib/hooks/useVisiblePolling";

function getStatusText(status?: string) {
  return getOrderLifecycleLabel(status, 'Nedostupné');
}

function getStatusColor(status?: string) {
  return getOrderLifecycleColor(status);
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

function addressName(address: DeliveryAddress | null | undefined) {
  if (!address) return '';
  return address.name || [address.firstName, address.lastName].filter(Boolean).join(' ');
}

function isCentralStatusLocked(order: Order) {
  return (
    isCentralAuthorityOrder(order) &&
    Boolean(order.centralOrder?.id || order.centralOrder?.externalOrderId)
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [updating, setUpdating] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: '' as string,
    paymentStatus: '' as string,
    notes: '',
  });

  const loadOrder = useCallback(async (options: { background?: boolean; syncForm?: boolean } = {}) => {
    if (options.background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await ordersApi.getAdminOrder(orderId);
      if (response.success && response.data) {
        setOrder(response.data);
        setLastRefreshedAt(new Date());
        if (options.syncForm !== false) {
          const display = getOrderDisplayData(response.data);
          setStatusForm({
            status: String(display.status || response.data.status || ""),
            paymentStatus: String(display.paymentStatus || response.data.paymentStatus || ""),
            notes: "",
          });
        }
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
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      void loadOrder();
    }
  }, [orderId, loadOrder]);

  useVisiblePolling(() => {
    void loadOrder({ background: true, syncForm: false });
  }, 30000, Boolean(orderId) && !updating);

  const centralStatusLocked = order ? isCentralStatusLocked(order) : false;

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const currentDisplay = order ? getOrderDisplayData(order) : null;
      const selectedStatus = statusForm.status || undefined;
      const currentStatus = currentDisplay?.status ? String(currentDisplay.status) : '';
      const centralStatusChanged =
        Boolean(selectedStatus) &&
        selectedStatus!.toLowerCase() !== currentStatus.toLowerCase();
      const response = await ordersApi.updateAdminOrderStatus(orderId, {
        status: centralStatusLocked
          ? (centralStatusChanged ? selectedStatus : undefined)
          : selectedStatus,
        ...(centralStatusLocked
          ? {}
          : { paymentStatus: statusForm.paymentStatus || undefined }),
        notes: statusForm.notes || undefined,
      });
      if (response.success) {
        void loadOrder();
        alert('Status objednávky byl aktualizován');
      } else {
        alert('Nepodařilo se aktualizovat status');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Nepodařilo se aktualizovat status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Objednávka nenalezena</p>
        <Link
          href="/admin/orders"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Zpět na seznam
        </Link>
      </div>
    );
  }

  const display = getOrderDisplayData(order);
  const notice = getCentralNotice(order);
  const address = display.deliveryAddress;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Objednávka {order.orderNumber}
          </h1>
          <p className="text-gray-600 mt-1">
            Vytvořeno: {new Date(order.createdAt).toLocaleString('cs-CZ')}
          </p>
          {display.central?.id && (
            <p className="text-sm text-gray-500 mt-1">Central Orders: {display.central.id}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-500">
            {refreshing ? 'Aktualizuji stav...' : lastRefreshedAt ? `Aktualizováno ${lastRefreshedAt.toLocaleTimeString('cs-CZ')}` : 'Čeká na první načtení'}
          </span>
          <button
            type="button"
            onClick={() => void loadOrder({ background: Boolean(order), syncForm: false })}
            disabled={refreshing || updating}
            className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:opacity-60"
          >
            {refreshing ? 'Aktualizuji...' : 'Aktualizovat'}
          </button>
          <Link
            href="/admin/orders"
            className="text-gray-600 hover:text-gray-700 font-medium"
          >
            Zpět na seznam
          </Link>
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
          <p className="font-bold">Centrální Orders stav není aktuální</p>
          <p className="text-sm mt-1">{notice}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg bg-white shadow-md p-5">
          <p className="text-sm font-semibold text-gray-500">Lifecycle</p>
          <p className={`mt-2 inline-flex px-3 py-1.5 text-xs font-bold rounded-full ${getStatusColor(display.lifecycleStage)}`}>
            {getStatusText(display.lifecycleStage)}
          </p>
        </div>
        <div className="rounded-lg bg-white shadow-md p-5">
          <p className="text-sm font-semibold text-gray-500">Platba</p>
          <p className={`mt-2 inline-flex px-3 py-1.5 text-xs font-bold rounded-full ${getStatusColor(display.paymentStatus)}`}>
            {getStatusText(display.paymentStatus)}
          </p>
        </div>
        <div className="rounded-lg bg-white shadow-md p-5">
          <p className="text-sm font-semibold text-gray-500">Doručení</p>
          <p className="mt-2 text-lg font-bold text-gray-900">
            {getStatusText(display.deliveryStatus || display.fulfillmentStatus)}
          </p>
        </div>
        <div className="rounded-lg bg-white shadow-md p-5">
          <p className="text-sm font-semibold text-gray-500">Výjimky</p>
          <p className={`mt-2 inline-flex px-3 py-1.5 text-xs font-bold rounded-full ${getStatusColor(display.exceptionStatus)}`}>
            {getStatusText(display.exceptionStatus)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Položky objednávky
            </h2>
            <div className="space-y-4">
              {display.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    {item.productSku && <p className="text-sm text-gray-500">SKU: {item.productSku}</p>}
                    <p className="text-sm text-gray-500">
                      Množství: {item.quantity} x {formatOrderMoney(item.unitPrice, display.currency)}
                    </p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {formatOrderMoney(item.totalPrice, display.currency)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mezisoučet</span>
                <span className="text-gray-900">{formatOrderMoney(display.subtotal, display.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">DPH</span>
                <span className="text-gray-900">{formatOrderMoney(display.tax, display.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Doprava</span>
                <span className="text-gray-900">{formatOrderMoney(display.shippingCost, display.currency)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sleva</span>
                  <span className="text-red-600">-{formatOrderMoney(order.discount, display.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span className="text-gray-900">Celkem</span>
                <span className="text-gray-900">{formatOrderMoney(display.total, display.currency)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Dodací adresa
            </h2>
            {address ? (
              <div className="space-y-2 text-gray-700">
                <p>
                  <strong>{addressName(address)}</strong>
                </p>
                <p>{address.street}</p>
                <p>
                  {address.city}, {address.postalCode}
                </p>
                <p>{address.country}</p>
                {address.phone && <p>Tel: {address.phone}</p>}
              </div>
            ) : (
              <p className="text-gray-700">Adresa není dostupná.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Aktualizovat status
            </h2>
            {centralStatusLocked && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Centrální Orders vlastní životní cyklus této objednávky. Změna statusu se odesílá do Orders; lokální změny platby jsou vypnuté a poznámky zůstávají lokální.
              </div>
            )}
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status objednávky
                </label>
                <select
                  value={statusForm.status}
                  onChange={(e) =>
                    setStatusForm({
                      ...statusForm,
                      status: e.target.value,
                    })
                  }
                  disabled={updating}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value={OrderStatus.PENDING}>Čeká na potvrzení</option>
                  <option value={OrderStatus.CONFIRMED}>Potvrzeno</option>
                  <option value={OrderStatus.PROCESSING}>Zpracovává se</option>
                  <option value={OrderStatus.SHIPPED}>Odesláno</option>
                  <option value={OrderStatus.DELIVERED}>Doručeno</option>
                  <option value={OrderStatus.CANCELLED}>Zrušeno</option>
                  {!centralStatusLocked && <option value={OrderStatus.REFUNDED}>Vráceno</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status platby
                </label>
                <select
                  value={statusForm.paymentStatus}
                  onChange={(e) =>
                    setStatusForm({
                      ...statusForm,
                      paymentStatus: e.target.value,
                    })
                  }
                  disabled={centralStatusLocked}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value={PaymentStatus.PENDING}>Čeká na platbu</option>
                  <option value={PaymentStatus.PAID}>Zaplaceno</option>
                  <option value={PaymentStatus.FAILED}>Selhalo</option>
                  <option value={PaymentStatus.REFUNDED}>Vráceno</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poznámky
                </label>
                <textarea
                  value={statusForm.notes}
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={updating}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {updating ? 'Ukládání...' : centralStatusLocked ? 'Odeslat do Orders' : 'Uložit změny'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
