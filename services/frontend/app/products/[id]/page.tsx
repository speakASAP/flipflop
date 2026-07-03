import { productsApi } from '@/lib/api/products';
import { notFound } from 'next/navigation';
import AddToCartButton from '@/components/AddToCartButton';
import ProductImageGallery from '@/components/ProductImageGallery';
import ProductCard from '@/components/ProductCard';
import AddBundleToCartButton from '@/components/AddBundleToCartButton';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Product } from '@/lib/api/products';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Helper function to get product emoji
const getProductEmoji = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('notebook') || lowerName.includes('laptop')) return '💻';
  if (lowerName.includes('sluchátka') || lowerName.includes('headphone')) return '🎧';
  if (lowerName.includes('telefon') || lowerName.includes('phone')) return '📱';
  if (lowerName.includes('boty') || lowerName.includes('shoe')) return '👟';
  if (lowerName.includes('hodinky') || lowerName.includes('watch')) return '⌚';
  if (lowerName.includes('kávovar') || lowerName.includes('coffee')) return '☕';
  if (lowerName.includes('náramek') || lowerName.includes('fitness')) return '⌚';
  if (lowerName.includes('tablet')) return '📱';
  return '📦';
};

// Helper function to get gradient
const getGradient = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('notebook') || lowerName.includes('laptop') || lowerName.includes('telefon') || lowerName.includes('tablet')) {
    return 'from-blue-100 via-indigo-50 to-purple-100';
  } else if (lowerName.includes('sluchátka') || lowerName.includes('headphone')) {
    return 'from-pink-100 via-rose-50 to-purple-100';
  } else if (lowerName.includes('boty') || lowerName.includes('shoe')) {
    return 'from-orange-100 via-amber-50 to-yellow-100';
  } else if (lowerName.includes('hodinky') || lowerName.includes('watch') || lowerName.includes('náramek')) {
    return 'from-slate-100 via-gray-50 to-zinc-100';
  } else if (lowerName.includes('kávovar') || lowerName.includes('coffee')) {
    return 'from-amber-100 via-orange-50 to-brown-100';
  }
  return 'from-gray-100 via-slate-50 to-gray-200';
};

const getPublishableSeoData = (product: Product) => {
  const seoData = product.seoData;
  if (!seoData) return null;
  if (seoData.reviewStatus === 'draft') return null;
  return seoData;
};

const isDisplayableBrand = (brand?: string) => {
  if (!brand) return false;
  const normalized = brand.trim().toLocaleLowerCase("cs-CZ");
  return !["zadna znacka", "žádná značka", "no brand", "none", "unknown"].includes(normalized);
};

const getProductGalleryImages = (product: Product) => {
  return [product.mainImageUrl, ...(product.imageUrls ?? []), ...(product.images ?? [])].filter(
    (image, index, allImages): image is string => Boolean(image) && allImages.indexOf(image) === index,
  );
};

const formatMoney = (value: number) => `${Math.round(value).toLocaleString('cs-CZ')} Kč`;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const response = await productsApi.getProduct(id);
  if (!response.success || !response.data) {
    return { title: 'Produkt nenalezen | flipflop.alfares.cz' };
  }

  const product = response.data;
  const seoData = getPublishableSeoData(product);
  const description = seoData?.metaDescription
    ? seoData.metaDescription.slice(0, 160)
    : product.description
    ? product.description.slice(0, 160)
    : `Koupit ${product.name} za ${product.price.toLocaleString('cs-CZ')} Kč. Rychlé doručení po celé ČR.`;
  const title = seoData?.metaTitle
    ? seoData.metaTitle
    : isDisplayableBrand(product.brand)
    ? `${product.brand} ${product.name} | flipflop.alfares.cz`
    : `${product.name} | flipflop.alfares.cz`;
  const image = product.mainImageUrl ?? product.imageUrls?.[0] ?? product.images?.[0];
  const keywords = Array.isArray(seoData?.keywords) ? seoData.keywords : product.tags;

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'cs_CZ',
      siteName: 'flipflop.alfares.cz',
      ...(image ? { images: [{ url: image, width: 800, height: 800, alt: product.name }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const response = await productsApi.getProduct(id);

  if (!response.success || !response.data) {
    notFound();
  }

  const product = response.data;
  const recommendationsResponse = await productsApi.getProductRecommendations(id);
  const recommendations = recommendationsResponse.success ? recommendationsResponse.data : null;
  const relatedProducts = recommendations?.relatedProducts ?? [];
  const bundle = recommendations?.bundle ?? null;
  const catalogBundle = bundle?.catalogBundle?.status === 'available' ? bundle.catalogBundle : null;
  const galleryImages = getProductGalleryImages(product);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link 
          href="/products" 
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6 transition-colors"
        >
          ← Zpět na produkty
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <ProductImageGallery
            productName={product.name}
            images={galleryImages}
            fallbackEmoji={getProductEmoji(product.name)}
            gradientClass={getGradient(product.name)}
          />

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {isDisplayableBrand(product.brand) && (
                <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-2">
                  {product.brand}
                </p>
              )}
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {product.price.toLocaleString('cs-CZ')} Kč
                </span>
              </div>
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-bold mb-4 text-slate-900">Varianty</h2>
                <div className="space-y-3">
                  {product.variants.map((variant) => (
                    <div key={variant.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50 transition-all">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900">{variant.name}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {variant.price.toLocaleString('cs-CZ')} Kč
                          </p>
                        </div>
                        <div className="text-right">
                          {variant.stockQuantity <= 0 && (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                              Vyprodáno
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-stretch gap-2">
                <AddToCartButton
                  productId={product.id}
                  product={product}
                  label="Koupit hned"
                  redirectTo="/checkout"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-4 text-center text-base font-extrabold text-white shadow-md transition-all duration-300 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                />
                <AddToCartButton
                  productId={product.id}
                  product={product}
                  label={
                    <span className="flex items-center justify-center gap-0.5" aria-hidden="true">
                      <span className="text-lg leading-none">🛒</span>
                      <span className="text-base font-black leading-none">+</span>
                    </span>
                  }
                  ariaLabel="Přidat do košíku"
                  className="flex h-14 w-16 shrink-0 items-center justify-center border-2 border-blue-200 bg-white text-blue-700 shadow-sm transition-all duration-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-bold mb-4 text-slate-900">Popis produktu</h2>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Buy Together Set */}
        {bundle && bundle.products.length > 1 && (
          <section className="mt-12 border border-emerald-200 bg-white p-6 shadow-lg" aria-labelledby="buy-together-heading">
            <div className="grid gap-6 lg:grid-cols-[280px_1fr_240px] lg:items-center">
              <div className="border-l-8 border-emerald-500 bg-emerald-50 p-5">
                <p className="text-sm font-black uppercase tracking-wide text-emerald-700">Výhodný set</p>
                <p className="mt-2 text-4xl font-black text-emerald-800">Ušetříte {formatMoney(bundle.totalSavings)}</p>
                {bundle.shippingSavings > 0 && (
                  <p className="mt-3 text-sm font-bold text-emerald-900">Set překročí hranici dopravy zdarma.</p>
                )}
              </div>

              <div>
                <h2 id="buy-together-heading" className="text-2xl font-black text-slate-900">Často kupované společně</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {bundle.products.map((bundleProduct) => (
                    <Link key={bundleProduct.id} href={`/products/${bundleProduct.id}`} className="group flex gap-3 border border-gray-200 bg-gray-50 p-3 transition hover:border-blue-300 hover:bg-blue-50">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-white">
                        {(bundleProduct.mainImageUrl || bundleProduct.imageUrls?.[0] || bundleProduct.images?.[0]) ? (
                          <img src={bundleProduct.mainImageUrl || bundleProduct.imageUrls?.[0] || bundleProduct.images?.[0]} alt={bundleProduct.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-3xl">{getProductEmoji(bundleProduct.name)}</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-black text-slate-900 group-hover:text-blue-700">{bundleProduct.name}</p>
                        <p className="mt-2 text-sm font-extrabold text-blue-700">{formatMoney(bundleProduct.price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 bg-gray-50 p-5">
                <div className="space-y-2 text-sm font-bold text-slate-700">
                  <div className="flex justify-between gap-3"><span>Produkty</span><span>{formatMoney(bundle.subtotal)}</span></div>
                  <div className="flex justify-between gap-3 text-emerald-700"><span>Sleva setu</span><span>-{formatMoney(bundle.merchandiseSavings)}</span></div>
                  {bundle.shippingSavings > 0 && <div className="flex justify-between gap-3 text-emerald-700"><span>Doprava</span><span>-{formatMoney(bundle.shippingSavings)}</span></div>}
                </div>
                {catalogBundle && (
                  <div className="mt-4 border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-900">
                    <p>{catalogBundle.displayName || 'Katalogovy set'} · {catalogBundle.contractVersion}</p>
                    <p className="mt-1 break-all">Bundle ID: {catalogBundle.bundleId}</p>
                    <p className="mt-1 text-blue-800">Katalogovy bundleId se predava do Orders pouze jako bounded bundleEvidence. Ceny, sklad i platba zustavaji serverove autoritativni.</p>
                  </div>
                )}
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <AddBundleToCartButton products={bundle.products} sourceProductId={product.id} estimatedSavings={bundle.totalSavings} catalogCandidateId={bundle.catalogCandidateId} bundleId={catalogBundle?.bundleId} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-12" aria-labelledby="related-products-heading">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 id="related-products-heading" className="text-2xl font-black text-slate-900">Související produkty</h2>
                <p className="mt-1 text-sm font-semibold text-gray-600">Podobné produkty a další možnosti z aktuální nabídky.</p>
              </div>
              <Link href="/products" className="hidden text-sm font-black text-blue-700 hover:text-blue-800 sm:inline">Zobrazit vše</Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.slice(0, 4).map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        {product.categories && product.categories.length > 0 && (
          <div className="mt-12 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-slate-900">Kategorie</h2>
            <div className="flex flex-wrap gap-3">
              {product.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${encodeURIComponent(category.slug || category.name.toLowerCase())}`}
                  className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl font-semibold text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all shadow-sm hover:shadow-md"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
