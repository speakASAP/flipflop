'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/api/products';
import { cartApi } from '@/lib/api/cart';
import { useAuth } from '@/contexts/AuthContext';
import { addGuestCartItem } from '@/lib/guest-cart';

interface AddBundleToCartButtonProps {
  products: Product[];
  redirectTo?: string;
  className?: string;
}

type MessageTone = 'success' | 'warning' | 'error';

export default function AddBundleToCartButton({
  products,
  redirectTo = '/checkout',
  className,
}: AddBundleToCartButtonProps) {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('success');

  const showMessage = (nextMessage: string, tone: MessageTone = 'success') => {
    setMessage(nextMessage);
    setMessageTone(tone);
    setTimeout(() => setMessage(''), 3500);
  };

  const addBundle = async () => {
    setLoading(true);
    setMessage('');

    try {
      let added = 0;
      let skipped = 0;

      for (const product of products) {
        const availableStock = Math.floor(Number(product.stockQuantity) || 0);
        if (availableStock <= 0) {
          skipped += 1;
          continue;
        }

        if (isAuthenticated) {
          const response = await cartApi.addToCart({ productId: product.id, quantity: 1 });
          if (response.success) {
            added += 1;
          } else {
            skipped += 1;
          }
          continue;
        }

        const result = addGuestCartItem({ product, quantity: 1 });
        if (result.status === 'added') {
          added += 1;
        } else {
          skipped += 1;
        }
      }

      if (added > 0) {
        showMessage(skipped > 0 ? 'Set je v košíku, některé položky už tam byly.' : 'Set je v košíku.');
        router.push(redirectTo);
      } else {
        showMessage('Tyto produkty už v košíku máte nebo nejsou skladem.', 'warning');
      }
    } catch {
      showMessage('Set se nepodařilo přidat do košíku.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={addBundle}
        disabled={loading || authLoading || products.length < 2}
        className={className || 'w-full bg-slate-900 px-5 py-4 text-center text-base font-extrabold text-white shadow-md transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'}
      >
        {loading ? 'Přidávání setu...' : 'Koupit celý set'}
      </button>
      {message && (
        <div className={`mt-3 border px-4 py-3 text-sm font-bold ${
          messageTone === 'success'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : messageTone === 'warning'
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-red-300 bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
