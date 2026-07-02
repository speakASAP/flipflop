'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { getGuestCart, GUEST_CART_UPDATED_EVENT } from '@/lib/guest-cart';

type StorefrontFilters = {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
};

const emptyFilters: StorefrontFilters = {
  search: '',
  category: '',
  minPrice: '',
  maxPrice: '',
};

const categoryLinks = [
  { label: 'Elektronika', value: 'elektronika' },
  { label: 'Móda', value: 'moda' },
  { label: 'Sport', value: 'sport' },
];

const readFiltersFromLocation = (): StorefrontFilters => {
  if (typeof window === 'undefined') {
    return emptyFilters;
  }

  const params = new URLSearchParams(window.location.search);
  return {
    search: params.get('search') || '',
    category: params.get('category') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
  };
};

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [guestItemCount, setGuestItemCount] = useState(0);
  const [filters, setFilters] = useState<StorefrontFilters>(emptyFilters);
  const router = useRouter();
  const pathname = usePathname();
  const cartItemCount = isAuthenticated ? 0 : guestItemCount;
  const isProductsPath = pathname === '/products';

  useEffect(() => {
    setFilters(readFiltersFromLocation());
  }, [pathname]);

  useEffect(() => {
    const refreshGuestCartCount = () => {
      setGuestItemCount(getGuestCart().itemCount);
    };

    refreshGuestCartCount();
    window.addEventListener('storage', refreshGuestCartCount);
    window.addEventListener(GUEST_CART_UPDATED_EVENT, refreshGuestCartCount);

    return () => {
      window.removeEventListener('storage', refreshGuestCartCount);
      window.removeEventListener(GUEST_CART_UPDATED_EVENT, refreshGuestCartCount);
    };
  }, []);

  const filterHref = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.category) params.set('category', filters.category);
    if (filters.minPrice.trim()) params.set('minPrice', filters.minPrice.trim());
    if (filters.maxPrice.trim()) params.set('maxPrice', filters.maxPrice.trim());

    const query = params.toString();
    return query ? `/products?${query}` : '/products';
  }, [filters]);

  useEffect(() => {
    if (!isProductsPath) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace(filterHref, { scroll: false });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [filterHref, isProductsPath, router]);

  const updateFilter = (key: keyof StorefrontFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = () => {
    router.push(filterHref, { scroll: false });
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    router.push('/products', { scroll: false });
  };

  const selectCategory = (category: string) => {
    const nextFilters = { ...filters, category };
    setFilters(nextFilters);

    const params = new URLSearchParams();
    if (nextFilters.search.trim()) params.set('search', nextFilters.search.trim());
    if (category) params.set('category', category);
    if (nextFilters.minPrice.trim()) params.set('minPrice', nextFilters.minPrice.trim());
    if (nextFilters.maxPrice.trim()) params.set('maxPrice', nextFilters.maxPrice.trim());

    const query = params.toString();
    router.push(query ? `/products?${query}` : '/products', { scroll: false });
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-3 py-2">
          <Link href="/" className="text-xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent transition-all md:text-2xl">
            flipflop.alfares.cz
          </Link>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link href="/cart" className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <span className="text-xl">🛒</span>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartItemCount}</span>
                </Link>
                <Link href="/orders" className="text-slate-700 font-medium hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50 hidden sm:block">
                  Objednávky
                </Link>
                {user?.isAdmin && (
                  <Link href="/admin" className="text-purple-700 font-medium hover:text-purple-800 transition-colors px-3 py-2 rounded-lg hover:bg-purple-50 hidden sm:block border border-purple-300">
                    Admin
                  </Link>
                )}
                <Link href="/profile" className="text-slate-700 font-medium hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50 hidden sm:block">
                  {user?.firstName || 'Profil'}
                </Link>
                <Link href="/profile/invoice-profiles" className="text-slate-700 font-medium hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50 hidden lg:block">
                  Fakturace
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Odhlásit
                </button>
              </>
            ) : (
              <>
                <Link href="/cart" className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <span className="text-xl">🛒</span>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartItemCount}</span>
                </Link>
                <Link href="/login" className="px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:text-blue-600">
                  Přihlásit
                </Link>
              </>
            )}
          </div>
        </div>

        <nav className="flex flex-wrap items-end gap-2 border-t border-gray-100 py-2 text-sm">
          <button
            type="button"
            onClick={() => selectCategory('')}
            className="flex h-10 items-center gap-1.5 whitespace-nowrap px-2 font-semibold text-slate-700 transition hover:text-blue-600"
          >
            <span className="text-lg">📦</span>
            <span>Všechny produkty</span>
          </button>
          {categoryLinks.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => selectCategory(category.value)}
              className="hidden h-10 whitespace-nowrap px-2 font-semibold text-slate-700 transition hover:text-blue-600 md:block"
            >
              {category.label}
            </button>
          ))}

          <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-[minmax(170px,1.2fr)_minmax(145px,0.8fr)_92px_92px_auto_auto] md:items-end">
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold text-gray-600">Název</span>
              <input
                type="text"
                name="search"
                placeholder="Název produktu"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                className="h-10 w-full border border-gray-300 px-3 text-sm text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold text-gray-600">Typ produktu</span>
              <select
                name="category"
                value={filters.category}
                onChange={(event) => updateFilter('category', event.target.value)}
                className="h-10 w-full border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Všechny typy</option>
                {categoryLinks.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </label>

            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold text-gray-600">Cena od</span>
              <input
                type="number"
                name="minPrice"
                min="0"
                step="1"
                value={filters.minPrice}
                onChange={(event) => updateFilter('minPrice', event.target.value)}
                className="h-10 w-full border border-gray-300 px-3 text-sm text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold text-gray-600">Cena do</span>
              <input
                type="number"
                name="maxPrice"
                min="0"
                step="1"
                value={filters.maxPrice}
                onChange={(event) => updateFilter('maxPrice', event.target.value)}
                className="h-10 w-full border border-gray-300 px-3 text-sm text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <button
              type="button"
              onClick={applyFilters}
              className="h-10 self-end bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Filtrovat
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 self-end border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Vyčistit
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
