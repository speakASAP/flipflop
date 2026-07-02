'use client';

/**
 * Admin Catalog Preview Page
 * Read-only Catalog canonical connector preview for FlipFlop products.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, CatalogContentPreview } from '@/lib/api/admin';
import { productsApi, Product } from '@/lib/api/products';
import LoadingSpinner from '@/components/LoadingSpinner';

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Neni k dispozici';
  }
  if (typeof value === 'boolean') {
    return value ? 'Ano' : 'Ne';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return 'Neni k dispozici';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function AdminSyncPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [preview, setPreview] = useState<CatalogContentPreview | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );
  const selectedCatalogProductId = selectedProduct?.catalogProductId || selectedProduct?.id || '';

  const loadCatalogProducts = useCallback(async () => {
    setLoadingProducts(true);
    setError(null);
    try {
      const response = await productsApi.getProducts({
        limit: 20,
        source: 'catalog',
        catalogScope: 'effective',
        includeWarehouse: false,
      });

      if (!response.success || !response.data) {
        setError(response.error?.message || 'Nepodarilo se nacist produkty z Catalogu.');
        setProducts([]);
        setSelectedProductId('');
        return;
      }

      const items = response.data.items || [];
      setProducts(items);
      setSelectedProductId((current) => current || items[0]?.id || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nepodarilo se nacist produkty z Catalogu.');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadPreview = useCallback(async (productId: string) => {
    if (!productId) {
      setPreview(null);
      return;
    }

    setLoadingPreview(true);
    setError(null);
    try {
      const product = products.find((item) => item.id === productId);
      const catalogProductId = product?.catalogProductId || productId;
      const response = await adminApi.getCatalogContentPreview(catalogProductId);
      if (response.success && response.data) {
        setPreview(response.data);
      } else {
        setPreview(null);
        setError(response.error?.message || 'Nahled z Catalogu neni k dispozici.');
      }
    } catch (err: unknown) {
      setPreview(null);
      setError(err instanceof Error ? err.message : 'Nahled z Catalogu neni k dispozici.');
    } finally {
      setLoadingPreview(false);
    }
  }, [products]);

  useEffect(() => {
    loadCatalogProducts();
  }, [loadCatalogProducts]);

  useEffect(() => {
    if (selectedProductId) {
      loadPreview(selectedProductId);
    }
  }, [loadPreview, selectedProductId]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
              Catalog obsah pro FlipFlop
            </h1>
            <p className="text-gray-600">
              Read-only nahled kanonickeho obsahu z Catalog connectoru pro marketplace flipflop.
            </p>
          </div>
          <button
            onClick={loadCatalogProducts}
            disabled={loadingProducts}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loadingProducts ? 'Nacitam...' : 'Obnovit produkty'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
          <h2 className="text-red-800 font-bold">Chyba nahledu</h2>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Catalog produkty</h2>
            <span className="text-sm text-gray-500">{products.length} zobrazeno</span>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Produkt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Akce
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className={product.id === selectedProductId ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.sku}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.id}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedProductId(product.id)}
                          disabled={product.id === selectedProductId}
                          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-blue-200 disabled:cursor-not-allowed"
                        >
                          Zobrazit nahled
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Zadne Catalog produkty k zobrazeni</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 min-h-[460px]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">FlipFlop connector preview</h2>
              {selectedProduct && (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedProduct.name} ({selectedProduct.sku})
                  {selectedCatalogProductId && selectedCatalogProductId !== selectedProduct.id && (
                    <span className="block text-xs text-gray-500">
                      Catalog ID: {selectedCatalogProductId}
                    </span>
                  )}
                </p>
              )}
            </div>
            {selectedProductId && (
              <button
                onClick={() => loadPreview(selectedProductId)}
                disabled={loadingPreview}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loadingPreview ? 'Nacitam...' : 'Obnovit nahled'}
              </button>
            )}
          </div>

          {loadingPreview ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : preview ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 p-5">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                    {preview.marketplace}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    {preview.format}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    {preview.label}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  {preview.content.title}
                </h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {preview.content.plainText}
                </p>
              </div>

              {preview.content.html && (
                <details className="rounded-xl border border-gray-200 p-5">
                  <summary className="cursor-pointer font-semibold text-slate-900">
                    HTML vystup
                  </summary>
                  <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-50 whitespace-pre-wrap">
                    {preview.content.html}
                  </pre>
                </details>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-bold text-slate-900 mb-3">Source</h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-500">Version</dt>
                      <dd className="font-medium text-gray-900">
                        {formatValue(preview.source.canonicalDocumentVersion)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Fallback legacy popisu</dt>
                      <dd className="font-medium text-gray-900">
                        {formatValue(preview.source.legacyDescriptionFallback)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Source hash</dt>
                      <dd className="font-mono text-xs text-gray-900 break-all">
                        {formatValue(preview.source.sourceHash)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Generated at</dt>
                      <dd className="font-medium text-gray-900">
                        {formatDate(preview.source.generatedAt)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-bold text-slate-900 mb-3">Connector metadata</h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-500">Overrides</dt>
                      <dd className="font-mono text-xs text-gray-900 whitespace-pre-wrap">
                        {formatValue(preview.overridesApplied)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Blocks</dt>
                      <dd className="font-medium text-gray-900">
                        {preview.content.blocks?.length ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Sections</dt>
                      <dd className="font-medium text-gray-900">
                        {preview.content.sections?.length ?? 0}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {preview.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="font-bold text-amber-900 mb-3">Warnings</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-amber-800">
                    {preview.warnings.map((warning, index) => (
                      <li key={`${warning}-${index}`}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              Vyberte Catalog produkt pro nacteni connector preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
