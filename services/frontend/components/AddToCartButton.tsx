'use client';

import { useState } from 'react';
import { cartApi } from '@/lib/api/cart';
import { useAuth } from '@/contexts/AuthContext';
import { addGuestCartItem, GuestCartProduct, GuestCartVariant } from '@/lib/guest-cart';

interface AddToCartButtonProps {
  productId: string;
  product?: GuestCartProduct;
  variant?: GuestCartVariant;
  variantId?: string;
  quantity?: number;
  className?: string;
  label?: string;
}

export default function AddToCartButton({
  productId,
  product,
  variant,
  variantId,
  quantity = 1,
  className,
  label = '🛒 Přidat do košíku',
}: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { isAuthenticated, loading: authLoading } = useAuth();

  const showMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAddToCart = async () => {
    setLoading(true);
    setMessage('');

    try {
      if (!isAuthenticated) {
        if (!product) {
          showMessage('Nepodařilo se připravit košík');
          return;
        }

        addGuestCartItem({
          product,
          variant,
          quantity,
        });
        showMessage('Produkt přidán do košíku');
        return;
      }

      const response = await cartApi.addToCart({
        productId,
        variantId: variant?.id || variantId,
        quantity,
      });

      if (response.success) {
        showMessage('Produkt přidán do košíku');
      } else {
        showMessage('Nepodařilo se přidat produkt do košíku');
      }
    } catch {
      showMessage('Došlo k chybě');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleAddToCart}
        disabled={loading || authLoading}
        className={className || 'w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'}
      >
        {loading ? 'Přidávání...' : label}
      </button>
      {message && (
        <div className={`mt-3 p-3 rounded-xl font-semibold text-sm ${
          message.includes('přidán')
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 text-green-700'
            : 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
