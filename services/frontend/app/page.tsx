import Link from 'next/link';
import { productsApi } from '@/lib/api/products';

export default async function HomePage() {
  // Fetch featured products
  const productsResponse = await productsApi.getProducts({ limit: 8 });
  const products = productsResponse.success ? productsResponse.data?.items || [] : [];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4">Vítejte na flipflop.statex.cz</h1>
          <p className="text-xl mb-8">Moderní e-shop s automatizovanou správou produktů</p>
          <Link
            href="/products"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Prohlédnout produkty
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Doporučené produkty</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.length > 0 ? (
              products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="border rounded-lg p-4 hover:shadow-lg transition"
                >
                  <div className="aspect-square bg-gray-200 rounded mb-4"></div>
                  <h3 className="font-semibold mb-2">{product.name}</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {product.price.toFixed(2)} Kč
                  </p>
                </Link>
              ))
            ) : (
              <p className="col-span-4 text-center text-gray-500">
                Žádné produkty k zobrazení
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-100 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold mb-2">Rychlé doručení</h3>
              <p className="text-gray-600">Expresní doručení po celé České republice</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">Bezpečné platby</h3>
              <p className="text-gray-600">Zabezpečené platby přes PayU</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2">AI Asistent</h3>
              <p className="text-gray-600">Inteligentní asistent pro nákup</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
