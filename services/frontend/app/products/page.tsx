import { productsApi } from '@/lib/api/products';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Všechny produkty | flipflop.alfares.cz',
  description: 'Prohlédněte si náš kompletní sortiment. Rychlé doručení, snadné platby, kvalitní zboží za skvělé ceny.',
  openGraph: {
    title: 'Všechny produkty | flipflop.alfares.cz',
    description: 'Prohlédněte si náš kompletní sortiment.',
    type: 'website',
    locale: 'cs_CZ',
    siteName: 'flipflop.alfares.cz',
  },
};

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
    categoryId?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

const parsePriceFilter = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.page || '1');
  const selectedCategory = resolvedSearchParams.category?.trim() || undefined;
  const search = resolvedSearchParams.search?.trim() || undefined;
  const minPrice = parsePriceFilter(resolvedSearchParams.minPrice);
  const maxPrice = parsePriceFilter(resolvedSearchParams.maxPrice);
  const filters = {
    page,
    limit: 20,
    search,
    categoryId: resolvedSearchParams.categoryId,
    category: selectedCategory,
    minPrice,
    maxPrice,
    includeWarehouse: true, // Always include real warehouse stock data
  };

  const response = await productsApi.getProducts(filters);
  const products = response.success ? response.data?.items || [] : [];
  const pagination = response.success ? response.data?.pagination : null;

  const productsHref = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set('page', String(targetPage));

    if (search) params.set('search', search);
    if (selectedCategory) params.set('category', selectedCategory);
    if (resolvedSearchParams.categoryId) params.set('categoryId', resolvedSearchParams.categoryId);
    if (resolvedSearchParams.minPrice) params.set('minPrice', resolvedSearchParams.minPrice);
    if (resolvedSearchParams.maxPrice) params.set('maxPrice', resolvedSearchParams.maxPrice);

    return `/products?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-4 md:py-6">
        {products.length > 0 ? (
          <>
            <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 md:gap-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mb-8 flex items-center justify-center gap-3">
                {pagination.hasPrev && (
                  <Link
                    href={productsHref(pagination.page - 1)}
                    className="border-2 border-gray-300 bg-white px-6 py-3 font-semibold shadow-sm transition-all hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
                  >
                    ← Předchozí
                  </Link>
                )}
                <span className="bg-blue-600 px-6 py-3 font-bold text-white shadow-lg">
                  Stránka {pagination.page} z {pagination.totalPages}
                </span>
                {pagination.hasNext && (
                  <Link
                    href={productsHref(pagination.page + 1)}
                    className="border-2 border-gray-300 bg-white px-6 py-3 font-semibold shadow-sm transition-all hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
                  >
                    Další →
                  </Link>
                )}
              </div>
            )}
          </>
        ) : !response.success ? (
          <div className="border border-amber-200 bg-white py-20 text-center shadow-lg">
            <div className="mb-4 text-6xl">!</div>
            <h2 className="mb-2 text-2xl font-bold text-gray-800">Katalog je dočasně nedostupný</h2>
            <p className="mb-6 text-gray-600">Zkuste stránku obnovit za chvíli.</p>
            <Link
              href="/products"
              className="inline-block bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-blue-700 hover:shadow-xl"
            >
              Znovu načíst katalog
            </Link>
          </div>
        ) : (
          <div className="bg-white py-20 text-center shadow-lg">
            <div className="mb-4 text-6xl">🔍</div>
            <h2 className="mb-2 text-2xl font-bold text-gray-800">Žádné produkty nenalezeny</h2>
            <p className="mb-6 text-gray-600">Zkuste upravit vyhledávací kritéria</p>
            <Link
              href="/products"
              className="inline-block bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-blue-700 hover:shadow-xl"
            >
              Zobrazit všechny produkty
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
